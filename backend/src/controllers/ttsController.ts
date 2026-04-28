import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { applyDictionary, generateTtsAudio, TTS_VOICES, type TtsVoice } from '../services/ttsService';
import { getUserApiKey } from './apiConfigController';
import { uploadAudioBufferToHeygen } from '../services/heygenService';

const prisma = new PrismaClient();

// POST /api/video-scripts/:id/tts — generate TTS audio for a video script
export async function generateTts(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);

  const script = await prisma.videoScript.findUnique({
    where: { id: scriptId },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  if (!script) {
    res.status(404).json({ error: 'Video script not found' });
    return;
  }

  // Combine all narrations
  const fullNarration = script.sections.map((s) => s.narration).join('。');

  // Get reading dictionary for this user
  const dictionary = await prisma.ttsDictionary.findMany({
    where: { userId: req.user!.id },
  });

  // Apply dictionary replacements
  const ttsNarration = applyDictionary(fullNarration, dictionary);

  // Get API keys
  const openaiKey = (await getUserApiKey(req.user!.id, 'openaiApi')) || undefined;
  const heygenKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

  // Update status to generating
  await prisma.videoScript.update({
    where: { id: scriptId },
    data: { audioStatus: 'generating' },
  });

  try {
    const voice = (TTS_VOICES.includes(script.voice as TtsVoice) ? script.voice : 'onyx') as TtsVoice;

    // Generate TTS → get raw MP3 buffer (no local file)
    const audioBuffer = await generateTtsAudio(ttsNarration, scriptId, openaiKey, voice);

    // Upload buffer directly to HeyGen → get hosted URL + asset ID
    const { assetId, hostedUrl } = await uploadAudioBufferToHeygen(audioBuffer, heygenKey);

    if (!assetId) {
      throw new Error('HeyGen audio upload returned no asset id');
    }

    // Store the HeyGen hosted URL for browser playback
    // If HeyGen didn't return a URL, fall back to asset ID reference
    const audioUrl = hostedUrl || `heygen-asset:${assetId}`;

    const updated = await prisma.videoScript.update({
      where: { id: scriptId },
      data: { audioUrl, audioStatus: 'done' },
      include: { sections: { orderBy: { sectionNumber: 'asc' } } },
    });

    res.json(updated);
  } catch (error: any) {
    await prisma.videoScript.update({
      where: { id: scriptId },
      data: { audioStatus: 'failed' },
    });
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
}

// POST /api/video-scripts/:id/upload-audio — upload a custom audio file (recording or file)
export async function uploadAudio(req: AuthRequest, res: Response): Promise<void> {
  const scriptId = String(req.params.id);
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    res.status(400).json({ error: 'audio file is required' });
    return;
  }

  const script = await prisma.videoScript.findUnique({ where: { id: scriptId } });
  if (!script) {
    res.status(404).json({ error: 'Video script not found' });
    return;
  }

  // Read the file buffer (works with both disk and memory storage)
  let audioBuffer: Buffer;
  if (file.buffer) {
    audioBuffer = file.buffer;
  } else {
    const fs = await import('fs');
    audioBuffer = fs.readFileSync(file.path);
  }

  // Upload to HeyGen — force audio/mpeg for compatibility (HeyGen rejects webm)
  const heygenKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;
  const { assetId, hostedUrl } = await uploadAudioBufferToHeygen(audioBuffer, heygenKey, 'audio/mpeg');

  const audioUrl = hostedUrl || `heygen-asset:${assetId}`;

  const updated = await prisma.videoScript.update({
    where: { id: scriptId },
    data: {
      customAudioUrl: audioUrl,
      audioUrl,
      audioStatus: 'done',
    },
    include: { sections: { orderBy: { sectionNumber: 'asc' } } },
  });

  res.json(updated);
}

// POST /api/video-scripts/voice-preview — generate a short voice sample
export async function voicePreview(req: AuthRequest, res: Response): Promise<void> {
  const { voice } = req.body;
  if (!voice || !TTS_VOICES.includes(voice as TtsVoice)) {
    res.status(400).json({ error: 'Invalid voice' });
    return;
  }

  const openaiKey = (await getUserApiKey(req.user!.id, 'openaiApi')) || undefined;

  try {
    const sampleText = 'こんにちは、この声で動画のナレーションを作成します。いかがでしょうか。';
    const audioBuffer = await generateTtsAudio(sampleText, 'preview', openaiKey, voice as TtsVoice);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(audioBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Voice preview failed' });
  }
}

// --- TTS Dictionary CRUD ---

// GET /api/tts-dictionary — list all dictionary entries for user
export async function listDictionary(req: AuthRequest, res: Response): Promise<void> {
  const entries = await prisma.ttsDictionary.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(entries);
}

// POST /api/tts-dictionary — add dictionary entry
export async function addDictionaryEntry(req: AuthRequest, res: Response): Promise<void> {
  const { kanji, reading } = req.body;
  if (!kanji || !reading) {
    res.status(400).json({ error: 'kanji and reading are required' });
    return;
  }

  const entry = await prisma.ttsDictionary.create({
    data: { kanji, reading, userId: req.user!.id },
  });
  res.json(entry);
}

// PATCH /api/tts-dictionary/:id — update dictionary entry
export async function updateDictionaryEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { kanji, reading } = req.body;

  const updated = await prisma.ttsDictionary.update({
    where: { id },
    data: {
      ...(kanji !== undefined && { kanji }),
      ...(reading !== undefined && { reading }),
    },
  });
  res.json(updated);
}

// DELETE /api/tts-dictionary/:id — delete dictionary entry
export async function deleteDictionaryEntry(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  await prisma.ttsDictionary.delete({ where: { id } });
  res.json({ success: true });
}
