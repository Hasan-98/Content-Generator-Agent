import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { generateVideoScript } from '../services/claudeService';
import { getUserApiKey } from './apiConfigController';
import { generateImageWithKie } from '../services/imageService';

const prisma = new PrismaClient();

// GET /api/video-scripts — list all video scripts for user's articles
export async function listVideoScripts(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const scripts = await prisma.videoScript.findMany({
    where: {
      article: {
        result: {
          keyword: {
            topLevel: { userId },
          },
        },
      },
    },
    include: {
      sections: { orderBy: { sectionNumber: 'asc' } },
      article: {
        include: {
          result: { select: { keywordText: true, title: true } },
          sections: { orderBy: { index: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(scripts);
}

// GET /api/video-scripts/:id — get single video script
export async function getVideoScript(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const script = await prisma.videoScript.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { sectionNumber: 'asc' } },
      article: {
        include: {
          result: { select: { keywordText: true, title: true } },
          sections: { orderBy: { index: 'asc' } },
        },
      },
    },
  });

  if (!script) {
    res.status(404).json({ error: 'Video script not found' });
    return;
  }

  res.json(script);
}

// POST /api/video-scripts/generate — generate video script from article
export async function generateVideoScriptHandler(req: AuthRequest, res: Response): Promise<void> {
  const { articleId } = req.body;
  if (!articleId) {
    res.status(400).json({ error: 'articleId is required' });
    return;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      result: { select: { keywordText: true, title: true } },
      sections: { orderBy: { index: 'asc' } },
    },
  });

  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  // Build article content from sections
  const articleContent = article.sections
    .map((s) => `【${s.heading}】\n${s.content}`)
    .join('\n\n');

  const apiKey = (await getUserApiKey(req.user!.id, 'openaiApi')) || undefined;

  const scriptData = await generateVideoScript(
    article.result.title,
    articleContent,
    apiKey
  );

  // Delete existing video script if regenerating
  const existing = await prisma.videoScript.findUnique({ where: { articleId } });
  if (existing) {
    await prisma.videoScript.delete({ where: { id: existing.id } });
  }

  const videoScript = await prisma.videoScript.create({
    data: {
      title: scriptData.title,
      articleId,
      sections: {
        create: scriptData.sections.map((s, i) => ({
          sectionNumber: i,
          section: s.section,
          heading: s.heading,
          points: s.points,
          type: s.type,
          narration: s.narration,
          backgroundKeyword: s.background_keyword || '',
          visualType: s.visual_type || 'avatar',
          visualNote: s.visual_note || '',
        })),
      },
    },
    include: {
      sections: { orderBy: { sectionNumber: 'asc' } },
      article: {
        include: {
          result: { select: { keywordText: true, title: true } },
        },
      },
    },
  });

  res.json(videoScript);
}

// PATCH /api/video-scripts/sections/:id — update a section
export async function updateVideoScriptSection(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { heading, narration, points, type, backgroundKeyword, section, visualType, visualNote, imagePrompt } = req.body;

  const updated = await prisma.videoScriptSection.update({
    where: { id },
    data: {
      ...(heading !== undefined && { heading }),
      ...(narration !== undefined && { narration }),
      ...(points !== undefined && { points }),
      ...(type !== undefined && { type }),
      ...(backgroundKeyword !== undefined && { backgroundKeyword }),
      ...(section !== undefined && { section }),
      ...(visualType !== undefined && { visualType }),
      ...(visualNote !== undefined && { visualNote }),
      ...(imagePrompt !== undefined && { imagePrompt }),
    },
  });

  res.json(updated);
}

// POST /api/video-scripts/sections/:id/generate-image — generate image from prompt
export async function generateSectionImage(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const section = await prisma.videoScriptSection.findUnique({ where: { id } });
  if (!section) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }

  const kieApi = (await getUserApiKey(req.user!.id, 'kieApi')) || undefined;
  const imageUrl = await generateImageWithKie(prompt.trim(), '16:9', kieApi);

  if (!imageUrl) {
    res.status(500).json({ error: 'Image generation failed' });
    return;
  }

  const updated = await prisma.videoScriptSection.update({
    where: { id },
    data: { imageUrl, imagePrompt: prompt.trim() },
  });

  res.json(updated);
}

// DELETE /api/video-scripts/:id — delete a video script
export async function deleteVideoScript(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  await prisma.videoScript.delete({ where: { id } });
  res.json({ success: true });
}
