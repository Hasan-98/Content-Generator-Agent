import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { searchKeyword } from '../services/serpService';
import {
  generateTitles,
  generatePersonaAndStructure,
  regenerateField,
  generateArticle,
  regenerateSection,
  regenerateSectionHeading,
  generateTitleImagePrompt,
  generateInfographicPrompt,
  formatArticleForPublish,
} from '../services/claudeService';
import { generateImageWithKie } from '../services/imageService';
import { getUserApiKey } from './apiConfigController';

const prisma = new PrismaClient();

// Helper: fetch user's custom API keys (Claude + Kie)
async function getUserKeys(userId: string) {
  const [claudeApi, kieApi] = await Promise.all([
    getUserApiKey(userId, 'claudeApi'),
    getUserApiKey(userId, 'kieApi'),
  ]);
  return { claudeApi: claudeApi || undefined, kieApi: kieApi || undefined };
}

// Default image prompts per taste
const DEFAULT_PROMPTS: Record<string, string> = {
  PHOTO: 'Realistic photo of a person reading content on a laptop, modern office setting, natural lighting',
  TEXT_OVERLAY: 'Clean minimalist background with typography space for Japanese text overlay',
  INFOGRAPHIC: 'Flat design infographic layout with icons and data visualization elements',
  ILLUSTRATION: 'Colorful digital illustration of a concept related to the article topic',
  CINEMATIC: 'Cinematic wide shot with dramatic lighting, shallow depth of field',
};

// STEP 01 — Generate keyword+title pairs
export async function generate(req: AuthRequest, res: Response): Promise<void> {
  const { keywordId } = req.body;
  if (!keywordId) { res.status(400).json({ error: 'keywordId is required' }); return; }

  const kwRecord = await prisma.keyword.findFirst({
    where: { id: keywordId },
    include: { topLevel: true },
  });
  if (!kwRecord || kwRecord.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Keyword not found' });
    return;
  }

  const { claudeApi } = await getUserKeys(req.user!.id);
  const serpData = await searchKeyword(kwRecord.keyword);
  const pairs = await generateTitles(kwRecord.keyword, kwRecord.goal, kwRecord.audience, serpData, claudeApi);

  const results = await Promise.all(
    pairs.map((pair) =>
      prisma.generatedResult.create({
        data: { keywordText: pair.keyword, title: pair.title, keywordId: kwRecord.id, status: 'READY' },
      })
    )
  );
  res.status(201).json(results);
}

// STEP 02 — Generate full persona + structure for a result
export async function generatePersona(req: AuthRequest, res: Response): Promise<void> {
  const { resultId } = req.body;
  if (!resultId) { res.status(400).json({ error: 'resultId is required' }); return; }

  const existing = await prisma.generatedResult.findFirst({
    where: { id: resultId },
    include: { keyword: { include: { topLevel: true } } },
  });
  if (!existing || existing.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Result not found' });
    return;
  }

  // Set to PERSONA_WIP while processing
  await prisma.generatedResult.update({ where: { id: resultId }, data: { status: 'PERSONA_WIP' } });

  const { claudeApi } = await getUserKeys(req.user!.id);

  try {
    const personaData = await generatePersonaAndStructure(
      existing.keywordText,
      existing.keyword.goal,
      existing.keyword.audience,
      existing.title,
      claudeApi
    );

    const result = await prisma.generatedResult.update({
      where: { id: resultId },
      data: { ...personaData, status: 'PERSONA_DONE' },
    });
    res.json(result);
  } catch (err) {
    // Rollback status on error
    await prisma.generatedResult.update({ where: { id: resultId }, data: { status: 'READY' } });
    throw err;
  }
}

// STEP 02 — Regenerate a single field
export async function regenerateFieldHandler(req: AuthRequest, res: Response): Promise<void> {
  const { resultId, fieldKey, instruction } = req.body;
  if (!resultId || !fieldKey) {
    res.status(400).json({ error: 'resultId and fieldKey are required' });
    return;
  }

  const existing = await prisma.generatedResult.findFirst({
    where: { id: resultId },
    include: { keyword: { include: { topLevel: true } } },
  });
  if (!existing || existing.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Result not found' });
    return;
  }

  const { claudeApi } = await getUserKeys(req.user!.id);
  const currentValue = (existing as Record<string, unknown>)[fieldKey] as string || '';
  const newValue = await regenerateField(
    existing.keywordText,
    existing.title,
    fieldKey,
    currentValue,
    instruction,
    claudeApi
  );

  const result = await prisma.generatedResult.update({
    where: { id: resultId },
    data: { [fieldKey]: newValue },
  });
  res.json(result);
}

// STEP A — Generate article sections and image scaffolding
export async function generateArticleHandler(req: AuthRequest, res: Response): Promise<void> {
  const { resultId } = req.body;
  if (!resultId) { res.status(400).json({ error: 'resultId is required' }); return; }

  const existing = await prisma.generatedResult.findFirst({
    where: { id: resultId },
    include: { keyword: { include: { topLevel: true } }, article: true },
  });
  if (!existing || existing.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Result not found' });
    return;
  }

  if (existing.article) {
    res.status(400).json({ error: 'Article already exists' });
    return;
  }

  const { claudeApi } = await getUserKeys(req.user!.id);
  const sections = await generateArticle(existing, claudeApi);

  const article = await prisma.article.create({
    data: {
      resultId,
      status: 'WRITING',
      sections: {
        create: sections.map((s, i) => ({
          index: i,
          type: s.type,
          heading: s.heading,
          content: s.content,
        })),
      },
      images: {
        create: sections.map((_, i) => ({
          index: i,
          enabled: true,
          taste: i === 0 ? 'TEXT_OVERLAY' : 'INFOGRAPHIC',
          prompt: i === 0 ? DEFAULT_PROMPTS.TEXT_OVERLAY : DEFAULT_PROMPTS.INFOGRAPHIC,
        })),
      },
    },
    include: { sections: true, images: true },
  });

  await prisma.generatedResult.update({ where: { id: resultId }, data: { status: 'PUBLISHED' } });

  res.status(201).json(article);
}

// STEP A — Regenerate a single article section
export async function regenerateSectionHandler(req: AuthRequest, res: Response): Promise<void> {
  const { articleId, sectionIndex, instruction } = req.body;
  if (articleId === undefined || sectionIndex === undefined) {
    res.status(400).json({ error: 'articleId and sectionIndex are required' });
    return;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { result: { include: { keyword: { include: { topLevel: true } } } }, sections: true },
  });
  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  const section = article.sections.find(s => s.index === sectionIndex);
  if (!section) { res.status(404).json({ error: 'Section not found' }); return; }

  const { claudeApi } = await getUserKeys(req.user!.id);
  const newContent = await regenerateSection(
    { type: section.type, heading: section.heading, content: section.content },
    article.result.title,
    instruction,
    claudeApi
  );

  const updated = await prisma.articleSection.update({
    where: { id: section.id },
    data: { content: newContent },
  });
  res.json(updated);
}

// STEP A2 — Regenerate a single section heading
export async function regenerateSectionHeadingHandler(req: AuthRequest, res: Response): Promise<void> {
  const { articleId, sectionIndex } = req.body;
  if (articleId === undefined || sectionIndex === undefined) {
    res.status(400).json({ error: 'articleId and sectionIndex are required' });
    return;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { result: { include: { keyword: { include: { topLevel: true } } } }, sections: true },
  });
  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  const section = article.sections.find(s => s.index === sectionIndex);
  if (!section) { res.status(404).json({ error: 'Section not found' }); return; }

  const { claudeApi } = await getUserKeys(req.user!.id);
  const newHeading = await regenerateSectionHeading(
    { type: section.type, heading: section.heading, content: section.content },
    article.result.title,
    claudeApi
  );

  const updated = await prisma.articleSection.update({
    where: { id: section.id },
    data: { heading: newHeading },
  });
  res.json(updated);
}

// STEP B — Generate single image
export async function generateImageHandler(req: AuthRequest, res: Response): Promise<void> {
  const { articleId, imageIndex } = req.body;
  if (articleId === undefined || imageIndex === undefined) {
    res.status(400).json({ error: 'articleId and imageIndex are required' });
    return;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { result: { include: { keyword: { include: { topLevel: true } } } }, images: true },
  });
  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  const image = article.images.find(img => img.index === imageIndex);
  if (!image) { res.status(404).json({ error: 'Image not found' }); return; }

  // Save current image to history before overwriting
  if (image.imageUrl) {
    await prisma.imageHistory.create({
      data: { imageUrl: image.imageUrl, prompt: image.prompt, imageId: image.id },
    });
  }

  const { kieApi } = await getUserKeys(req.user!.id);
  const aspectRatio = image.index === 0 ? '16:9' : '1:1';
  const imageUrl = await generateImageWithKie(image.prompt, aspectRatio, kieApi);

  const updated = await prisma.articleImage.update({
    where: { id: image.id },
    data: { imageUrl: imageUrl || undefined },
    include: { history: { orderBy: { createdAt: 'desc' } } },
  });
  res.json(updated);
}

// STEP B — Generate all enabled images for an article using kie.ai + Claude prompts
export async function generateImagesBulk(req: AuthRequest, res: Response): Promise<void> {
  const { articleId } = req.body;
  if (!articleId) { res.status(400).json({ error: 'articleId is required' }); return; }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      result: { include: { keyword: { include: { topLevel: true } } } },
      images: { orderBy: { index: 'asc' } },
      sections: { orderBy: { index: 'asc' } },
    },
  });
  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  await prisma.article.update({ where: { id: articleId }, data: { status: 'IMAGING' } });

  const { claudeApi, kieApi } = await getUserKeys(req.user!.id);
  const keyword = article.result.keywordText;
  const title = article.result.title;

  // Build a brief summary from all sections for the title image prompt
  const contentSummary = article.sections
    .map(s => `${s.heading}: ${s.content.slice(0, 100)}`)
    .join('\n');

  const enabledImages = article.images.filter(img => img.enabled);
  const results = [];

  for (const image of enabledImages) {
    let prompt: string;
    let aspectRatio: '16:9' | '1:1';

    if (image.index === 0) {
      // Title thumbnail — 16:9, YouTube style
      aspectRatio = '16:9';
      prompt = await generateTitleImagePrompt(keyword, title, contentSummary, claudeApi);
    } else {
      // Section infographic — 1:1, flat design
      aspectRatio = '1:1';
      const section = article.sections.find(s => s.index === image.index - 1);
      if (section) {
        prompt = await generateInfographicPrompt(keyword, title, section.heading, section.content, claudeApi);
      } else {
        // fallback: use stored prompt if section not found
        prompt = image.prompt;
      }
    }

    // Save current image to history before overwriting
    if (image.imageUrl) {
      await prisma.imageHistory.create({
        data: { imageUrl: image.imageUrl, prompt: image.prompt, imageId: image.id },
      });
    }

    const imageUrl = await generateImageWithKie(prompt, aspectRatio, kieApi);

    const updated = await prisma.articleImage.update({
      where: { id: image.id },
      data: {
        prompt,
        ...(imageUrl && { imageUrl }),
      },
      include: { history: { orderBy: { createdAt: 'desc' } } },
    });
    results.push(updated);
  }

  await prisma.article.update({ where: { id: articleId }, data: { status: 'IMAGE_DONE' } });

  res.json(results);
}

// STEP C — Format article for WordPress/Shopify publishing using AI
export async function formatArticleHandler(req: AuthRequest, res: Response): Promise<void> {
  const { articleId } = req.body;
  if (!articleId) { res.status(400).json({ error: 'articleId is required' }); return; }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      result: { include: { keyword: { include: { topLevel: true } } } },
      sections: { orderBy: { index: 'asc' } },
      images: { orderBy: { index: 'asc' } },
      uploadMeta: true,
    },
  });
  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  await prisma.article.update({ where: { id: articleId }, data: { status: 'FORMATTING' } });

  const { claudeApi } = await getUserKeys(req.user!.id);

  try {
    const formatted = await formatArticleForPublish(
      article.result.title,
      article.result.keywordText,
      article.sections.map(s => ({ type: s.type, heading: s.heading, content: s.content })),
      article.images.map(i => ({ index: i.index, imageUrl: i.imageUrl, enabled: i.enabled })),
      claudeApi
    );

    // Upsert uploadMeta with AI-generated content
    const metaData = {
      formattedHtml: formatted.body_html,
      aiTitle: formatted.title,
      excerpt: formatted.excerpt,
      tags: formatted.tags,
      slug: article.uploadMeta?.slug || article.result.keywordText.replace(/\s+/g, '-').toLowerCase(),
      category: article.uploadMeta?.category || '',
      publishStatus: article.uploadMeta?.publishStatus || 'DRAFT' as const,
    };

    const uploadMeta = await prisma.uploadMeta.upsert({
      where: { articleId },
      update: {
        formattedHtml: metaData.formattedHtml,
        aiTitle: metaData.aiTitle,
        excerpt: metaData.excerpt,
        tags: metaData.tags,
      },
      create: {
        articleId,
        ...metaData,
      },
    });

    await prisma.article.update({ where: { id: articleId }, data: { status: 'FORMAT_DONE' } });

    res.json({ formatted, uploadMeta });
  } catch (err) {
    // Rollback status on error
    await prisma.article.update({ where: { id: articleId }, data: { status: 'IMAGE_DONE' } });
    throw err;
  }
}
