import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getUserApiKey } from './apiConfigController';
import { applyDictionary } from '../services/ttsService';
import {
  generateAndUploadSectionAudio,
  createHeygenVideo,
  checkHeygenStatus,
  listTalkingPhotos,
} from '../services/heygenService';
import {
  buildRenderSections,
  startRemotion,
  checkRemotionStatus,
} from '../services/remotionService';

const prisma = new PrismaClient();

// GET /api/video-scripts/avatars — list available HeyGen talking photos
export async function listAvatars(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const avatars = await listTalkingPhotos();
    res.json(avatars);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list avatars' });
  }
}

// PATCH /api/video-scripts/:id/settings — update avatar, orientation, theme
export async function updateVideoSettings(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);
  const { avatarId, orientation, theme } = req.body;

  const updated = await prisma.videoScript.update({
    where: { id: scriptId },
    data: {
      ...(avatarId !== undefined && { avatarId }),
      ...(orientation !== undefined && { orientation }),
      ...(theme !== undefined && { theme }),
    },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  res.json(updated);
}

// POST /api/video-scripts/:id/heygen — generate HeyGen avatar video
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

  // Get reading dictionary for TTS
  const dictionary = await prisma.ttsDictionary.findMany({
    where: { userId: req.user!.id },
  });

  // Apply dictionary to narrations
  const sectionsWithTts = script.sections.map((s) => ({
    narration: applyDictionary(s.narration, dictionary),
  }));

  const apiKey = (await getUserApiKey(req.user!.id, 'openaiApi')) || undefined;

  // Update status
  await prisma.videoScript.update({
    where: { id: scriptId },
    data: { heygenStatus: 'generating' },
  });

  try {
    // Step 1: Generate TTS per section and upload to HeyGen
    const assetIds = await generateAndUploadSectionAudio(sectionsWithTts, scriptId, apiKey);

    // Step 2: Create HeyGen video
    const { videoId } = await createHeygenVideo(script.title, assetIds, script.avatarId || undefined, script.orientation);

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: {
        heygenVideoId: videoId,
        heygenStatus: 'processing',
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
export async function checkHeygenVideoStatus(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);

  const script = await prisma.videoScript.findUnique({ where: { id: scriptId } });
  if (!script || !script.heygenVideoId) {
    res.status(404).json({ error: 'No HeyGen video found' });
    return;
  }

  try {
    const result = await checkHeygenStatus(script.heygenVideoId);

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: {
        heygenStatus: result.status === 'completed' ? 'done' : result.status,
        heygenVideoUrl: result.videoUrl || script.heygenVideoUrl,
      },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check HeyGen status' });
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
    // Step 1: Build render sections with Pexels background images
    const renderSections = await buildRenderSections(
      script.sections.map((s) => ({
        heading: s.heading,
        points: s.points,
        narration: s.narration,
        type: s.type,
        backgroundKeyword: s.backgroundKeyword,
      })),
      script.orientation
    );

    // Step 2: Start Remotion rendering
    const { jobId } = await startRemotion(script.heygenVideoUrl, script.title, renderSections, script.theme, script.orientation);

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
