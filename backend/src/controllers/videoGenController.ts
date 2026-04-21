import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { getUserApiKey } from './apiConfigController';
import {
  uploadAudioToHeygen,
  createHeygenVideo,
  checkHeygenStatus,
  listTalkingPhotos,
  convertHeygenPreview,
} from '../services/heygenService';
import {
  buildRenderSections,
  startRemotion,
  checkRemotionStatus,
  fetchBackgroundImage,
} from '../services/remotionService';
import { generateImageWithKie } from '../services/imageService';

const prisma = new PrismaClient();

const AUDIO_DIR = path.join(__dirname, '..', '..', 'audio');

// GET /api/video-scripts/avatars — list available HeyGen talking photos
// WF3: merges the user's trained photo_avatars (from the アバター管理 equivalent)
// with HeyGen's global talking_photo.list. Trained avatars appear first.
export async function listAvatars(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userApiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

    const trainedRows = await prisma.heygenTrainedAvatar.findMany({
      where: {
        userId: req.user!.id,
        status: 'READY',
        NOT: { avatarId: null },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const trainedAvatars = trainedRows.map((r) => ({
      id: r.avatarId!,
      name: `★ ${r.name}`,
      imageUrl: r.imageUrl,
    }));

    // Global talking_photo.list — optional, tolerate failure (no HeyGen key, etc.)
    let globalAvatars: { id: string; name: string; imageUrl: string }[] = [];
    try {
      globalAvatars = await listTalkingPhotos(userApiKey);
    } catch (err: any) {
      console.warn('[videoGen.listAvatars] global talking_photo.list failed:', err?.message);
    }

    // Deduplicate by id — trained wins over global if the same id appears in both.
    const seen = new Set(trainedAvatars.map((a) => a.id));
    const merged = [
      ...trainedAvatars,
      ...globalAvatars.filter((a) => !seen.has(a.id)),
    ];

    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list avatars' });
  }
}

/**
 * WF3 avatar fallback chain:
 *   1. Explicit avatarId on the script (user-selected)
 *   2. Most-recent READY HeygenTrainedAvatar for this user
 *   3. HEYGEN_TALKING_PHOTO_ID env
 *   4. Hardcoded Hiroshi default (same as n8n WF3)
 */
async function resolveTalkingPhotoId(userId: string, scriptAvatarId: string | null): Promise<string> {
  if (scriptAvatarId) return scriptAvatarId;

  const latest = await prisma.heygenTrainedAvatar.findFirst({
    where: { userId, status: 'READY', NOT: { avatarId: null } },
    orderBy: { updatedAt: 'desc' },
  });
  if (latest?.avatarId) return latest.avatarId;

  return process.env.HEYGEN_TALKING_PHOTO_ID || 'dc6f8523169144439a0414ec787340cd';
}

// PATCH /api/video-scripts/:id/settings — update avatar, orientation, theme, pattern, voice
export async function updateVideoSettings(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);
  const { avatarId, orientation, theme, pattern, voice } = req.body;

  const updated = await prisma.videoScript.update({
    where: { id: scriptId },
    data: {
      ...(avatarId !== undefined && { avatarId }),
      ...(orientation !== undefined && { orientation }),
      ...(theme !== undefined && { theme }),
      ...(pattern !== undefined && { pattern }),
      ...(voice !== undefined && { voice }),
    },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  res.json(updated);
}

// POST /api/video-scripts/:id/heygen — generate HeyGen avatar video (WF3)
//
// Flow mirrors n8n WF3:
//   1. Require that WF2 has already produced a combined mp3 (`script.audioUrl`)
//   2. Resolve the talking_photo_id via the WF3 fallback chain
//   3. Upload that mp3 to HeyGen's asset service (ONE asset, not per-section)
//   4. Call /v2/video/generate with a single video_input (matting + #00FF00)
//   5. Store heygen_video_id and return — the frontend polls /heygen-status
export async function generateHeygenVideo(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);

  const script = await prisma.videoScript.findUnique({
    where: { id: scriptId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  if (!script) {
    res.status(404).json({ error: 'Video script not found' });
    return;
  }

  // WF3 consumes WF2's output. Require the combined audio to exist.
  if (!script.audioUrl) {
    res.status(400).json({ error: 'TTS audio must be generated first (run WF2)' });
    return;
  }

  // Locate audio file on disk. Can be in /audio/ (TTS) or /uploads/ (custom recording).
  let audioFilepath: string;
  if (script.audioUrl.startsWith('/uploads/')) {
    audioFilepath = path.join(__dirname, '..', '..', script.audioUrl);
  } else {
    const audioFilename = script.audioUrl.split('/').pop() || '';
    audioFilepath = path.join(AUDIO_DIR, audioFilename);
  }
  if (!fs.existsSync(audioFilepath)) {
    res.status(400).json({ error: `Audio file not found on disk. Re-generate or re-upload audio.` });
    return;
  }

  const heygenApiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;
  const talkingPhotoId = await resolveTalkingPhotoId(req.user!.id, script.avatarId);

  await prisma.videoScript.update({
    where: { id: scriptId },
    data: { heygenStatus: 'generating' },
  });

  try {
    // Step 1: Upload the combined audio to HeyGen as a single asset
    const assetId = await uploadAudioToHeygen(audioFilepath, heygenApiKey);
    if (!assetId) {
      throw new Error('HeyGen audio upload returned no asset id');
    }

    // Step 2: Create HeyGen video with a single video_input
    const { videoId } = await createHeygenVideo(
      script.title,
      [assetId],
      talkingPhotoId,
      script.orientation,
      heygenApiKey
    );

    if (!videoId) {
      throw new Error('HeyGen /v2/video/generate returned no video_id');
    }

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: {
        heygenVideoId: videoId,
        heygenStatus: 'processing',
        // Reset preview URL so we re-convert once the new video is ready.
        previewVideoUrl: null,
      },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    res.json(updated);
  } catch (error: any) {
    await prisma.videoScript.update({
      where: { id: scriptId },
      data: { heygenStatus: 'failed' },
    });
    res.status(500).json({ error: error.message || 'HeyGen video generation failed' });
  }
}

// POST /api/video-scripts/:id/heygen-status — check HeyGen video status
// WF3 final step: when HeyGen reports `completed`, automatically request a
// web-compatible preview conversion via the VPS /video/convert-preview endpoint.
export async function checkHeygenVideoStatus(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);

  const script = await prisma.videoScript.findUnique({ where: { id: scriptId } });
  if (!script || !script.heygenVideoId) {
    res.status(404).json({ error: 'No HeyGen video found' });
    return;
  }

  const heygenApiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

  try {
    const result = await checkHeygenStatus(script.heygenVideoId, heygenApiKey);

    // Auto-convert to a web-friendly preview on completion (non-fatal on failure).
    let previewVideoUrl: string | null = script.previewVideoUrl;
    if (result.status === 'completed' && result.videoUrl && !previewVideoUrl) {
      previewVideoUrl = await convertHeygenPreview(result.videoUrl);
    }

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: {
        heygenStatus: result.status === 'completed' ? 'done' : result.status,
        heygenVideoUrl: result.videoUrl || script.heygenVideoUrl,
        previewVideoUrl: previewVideoUrl ?? undefined,
      },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check HeyGen status' });
  }
}

// POST /api/video-scripts/:id/build-preview — WF4 preview builder
//
// WF4's job is to populate per-section background images from Pexels using the
// Japan-aware keyword mapping, so the user can review backgrounds BEFORE kicking
// off the expensive WF4b render. This persists each fetched URL on
// VideoScriptSection.imageUrl — the same field the user's manual/AI-generated
// overrides use, so the existing /generate-image endpoint still works for
// per-section replacement.
//
// Safe to re-run: sections with an existing imageUrl are left alone by default
// unless `force=true` is passed in the body.
//
// Campaign defaults: if the campaign's videoBgSource is "ai", uses AI (kie.ai)
// to generate backgrounds from imagePrompt/backgroundKeyword. Otherwise uses
// free Pexels stock images (default).
export async function buildVideoPreview(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);
  const force = req.body?.force === true;
  // Allow overriding source per-request: "free" | "ai"
  const sourceOverride = req.body?.bgSource as string | undefined;

  const script = await prisma.videoScript.findUnique({
    where: { id: scriptId },
    include: {
      sections: { orderBy: { sectionNumber: 'asc' } },
      article: { include: { result: { include: { keyword: true } } } },
    },
  });

  if (!script) {
    res.status(404).json({ error: 'Video script not found' });
    return;
  }

  // Resolve background source from request > campaign defaults > "free"
  let bgSource = sourceOverride || 'free';
  if (!sourceOverride && script.article?.result?.keyword?.topLevelId) {
    const campaignDefaults = await prisma.campaignDefaults.findUnique({
      where: { topLevelId: script.article.result.keyword.topLevelId },
    });
    if (campaignDefaults?.videoBgSource) {
      bgSource = campaignDefaults.videoBgSource;
    }
  }

  const kieApi = (await getUserApiKey(req.user!.id, 'kieApi')) || undefined;

  try {
    const updates = await Promise.all(
      script.sections.map(async (section) => {
        // Respect manually-set or AI-generated per-section images unless force=true.
        if (!force && section.imageUrl) {
          return { id: section.id, imageUrl: section.imageUrl, skipped: true };
        }

        let imageUrl = '';

        if (bgSource === 'ai') {
          // Use AI generation — prefer imagePrompt, fall back to backgroundKeyword
          const prompt = section.imagePrompt?.trim()
            || `Professional background image for: ${section.backgroundKeyword || section.heading}`;
          const aspectRatio = '16:9';
          imageUrl = await generateImageWithKie(prompt, aspectRatio, kieApi) || '';
        } else {
          // Default: free stock from Pexels
          imageUrl = await fetchBackgroundImage(
            section.backgroundKeyword || '',
            script.orientation,
            section.sectionNumber
          );
        }

        if (!imageUrl) {
          return { id: section.id, imageUrl: section.imageUrl, skipped: false };
        }
        await prisma.videoScriptSection.update({
          where: { id: section.id },
          data: { imageUrl },
        });
        return { id: section.id, imageUrl, skipped: false };
      })
    );

    const updated = await prisma.videoScript.findUnique({
      where: { id: scriptId },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    const populatedCount = updates.filter((u) => u.imageUrl && !u.skipped).length;
    res.json({ script: updated, populatedCount, totalSections: script.sections.length, bgSource });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Preview build failed' });
  }
}

// POST /api/video-scripts/:id/remotion — start Remotion subtitle rendering
export async function generateRemotionVideo(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);

  const script = await prisma.videoScript.findUnique({
    where: { id: scriptId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  if (!script) {
    res.status(404).json({ error: 'Video script not found' });
    return;
  }

  if (!script.heygenVideoUrl) {
    res.status(400).json({ error: 'HeyGen video must be generated first' });
    return;
  }

  // Update status
  await prisma.videoScript.update({
    where: { id: scriptId },
    data: { remotionStatus: 'preparing' },
  });

  try {
    // Step 1: Build render sections with Pexels background images + visual_type (WF4b)
    const renderSections = await buildRenderSections(
      script.sections.map((s) => ({
        heading: s.heading,
        points: s.points,
        narration: s.narration,
        type: s.type,
        backgroundKeyword: s.backgroundKeyword,
        imageUrl: s.imageUrl,
        visualType: s.visualType,
      })),
      script.orientation
    );

    // Step 2: Start Remotion rendering — WF4b body: { videoUrl, title, sections, pattern }
    const { jobId } = await startRemotion(
      script.heygenVideoUrl,
      script.title,
      renderSections,
      script.pattern,
      script.orientation,
      script.theme
    );

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: {
        remotionJobId: jobId,
        remotionStatus: 'rendering',
      },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    res.json(updated);
  } catch (error: any) {
    await prisma.videoScript.update({
      where: { id: scriptId },
      data: { remotionStatus: 'failed' },
    });
    res.status(500).json({ error: error.message || 'Remotion rendering failed' });
  }
}

// POST /api/video-scripts/:id/remotion-status — check Remotion render status
export async function checkRemotionVideoStatus(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);

  const script = await prisma.videoScript.findUnique({ where: { id: scriptId } });
  if (!script || !script.remotionJobId) {
    res.status(404).json({ error: 'No Remotion job found' });
    return;
  }

  try {
    const result = await checkRemotionStatus(script.remotionJobId);

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: {
        remotionStatus: result.status === 'done' ? 'done' : result.status,
        remotionVideoUrl: result.downloadUrl || script.remotionVideoUrl,
      },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check Remotion status' });
  }
}
