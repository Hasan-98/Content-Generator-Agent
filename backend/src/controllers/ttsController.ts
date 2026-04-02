import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { applyDictionary, generateTtsAudio, deleteAudioFile } from '../services/ttsService';
import { getUserApiKey } from './apiConfigController';

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

  // Get user's OpenAI API key
  const apiKey = (await getUserApiKey(req.user!.id, 'openaiApi')) || undefined;

  // Delete old audio if regenerating
  if (script.audioUrl) {
    const oldFilename = script.audioUrl.split('/').pop();
    if (oldFilename) deleteAudioFile(oldFilename);
  }

  // Update status to generating
  await prisma.videoScript.update({
    where: { id: scriptId },
    data: { audioStatus: 'generating' },
  });

  try {
    const filename = await generateTtsAudio(ttsNarration, scriptId, apiKey);
    const audioUrl = `/audio/${filename}`;

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
