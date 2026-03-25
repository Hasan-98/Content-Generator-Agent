import { Response } from 'express';
import { PrismaClient, ImageTaste } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

async function findArticleWithAuth(id: string, userId: string) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      result: { include: { keyword: { include: { topLevel: true } } } },
      sections: { orderBy: { index: 'asc' } },
      images: { orderBy: { index: 'asc' }, include: { history: { orderBy: { createdAt: 'desc' } } } },
      uploadMeta: true,
    },
  });
  return article && article.result.keyword.topLevel.userId === userId ? article : null;
}

export async function getArticle(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const article = await findArticleWithAuth(id, req.user!.id);
  if (!article) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(article);
}

export async function updateArticle(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const article = await findArticleWithAuth(id, req.user!.id);
  if (!article) { res.status(404).json({ error: 'Not found' }); return; }

  const { status } = req.body;
  const updated = await prisma.article.update({ where: { id }, data: { ...(status && { status }) } });
  res.json(updated);
}

export async function updateSection(req: AuthRequest, res: Response): Promise<void> {
  const articleId = String(req.params.id);
  const sectionIndex = parseInt(String(req.params.index), 10);

  const article = await findArticleWithAuth(articleId, req.user!.id);
  if (!article) { res.status(404).json({ error: 'Not found' }); return; }

  const section = article.sections.find(s => s.index === sectionIndex);
  if (!section) { res.status(404).json({ error: 'Section not found' }); return; }

  const { heading, content } = req.body;
  const updated = await prisma.articleSection.update({
    where: { id: section.id },
    data: {
      ...(heading !== undefined && { heading }),
      ...(content !== undefined && { content }),
    },
  });
  res.json(updated);
}

export async function updateImage(req: AuthRequest, res: Response): Promise<void> {
  const articleId = String(req.params.id);
  const imageIndex = parseInt(String(req.params.index), 10);

  const article = await findArticleWithAuth(articleId, req.user!.id);
  if (!article) { res.status(404).json({ error: 'Not found' }); return; }

  const image = article.images.find(img => img.index === imageIndex);
  if (!image) { res.status(404).json({ error: 'Image not found' }); return; }

  const { enabled, taste, prompt, imageUrl } = req.body;
  const updated = await prisma.articleImage.update({
    where: { id: image.id },
    data: {
      ...(enabled !== undefined && { enabled }),
      ...(taste !== undefined && { taste: taste as ImageTaste }),
      ...(prompt !== undefined && { prompt }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });
  res.json(updated);
}

export async function selectHistoryImage(req: AuthRequest, res: Response): Promise<void> {
  const articleId = String(req.params.id);
  const imageIndex = parseInt(String(req.params.index), 10);
  const { historyId } = req.body;
  if (!historyId) { res.status(400).json({ error: 'historyId is required' }); return; }

  const article = await findArticleWithAuth(articleId, req.user!.id);
  if (!article) { res.status(404).json({ error: 'Not found' }); return; }

  const image = article.images.find(img => img.index === imageIndex);
  if (!image) { res.status(404).json({ error: 'Image not found' }); return; }

  const historyEntry = await prisma.imageHistory.findFirst({
    where: { id: historyId, imageId: image.id },
  });
  if (!historyEntry) { res.status(404).json({ error: 'History entry not found' }); return; }

  // Save current image to history before swapping
  if (image.imageUrl) {
    await prisma.imageHistory.create({
      data: { imageUrl: image.imageUrl, prompt: image.prompt, imageId: image.id },
    });
  }

  // Remove the selected history entry and set it as current
  await prisma.imageHistory.delete({ where: { id: historyId } });

  const updated = await prisma.articleImage.update({
    where: { id: image.id },
    data: { imageUrl: historyEntry.imageUrl, prompt: historyEntry.prompt },
    include: { history: { orderBy: { createdAt: 'desc' } } },
  });
  res.json(updated);
}

export async function upsertUploadMeta(req: AuthRequest, res: Response): Promise<void> {
  const articleId = String(req.params.id);

  const article = await findArticleWithAuth(articleId, req.user!.id);
  if (!article) { res.status(404).json({ error: 'Not found' }); return; }

  const { slug, excerpt, tags, category, publishStatus, scheduleDate } = req.body;

  const meta = await prisma.uploadMeta.upsert({
    where: { articleId },
    create: {
      articleId,
      slug: slug || '',
      excerpt: excerpt || '',
      tags: tags || '',
      category: category || '',
      publishStatus: publishStatus || 'DRAFT',
      scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
    },
    update: {
      ...(slug !== undefined && { slug }),
      ...(excerpt !== undefined && { excerpt }),
      ...(tags !== undefined && { tags }),
      ...(category !== undefined && { category }),
      ...(publishStatus !== undefined && { publishStatus }),
      ...(scheduleDate !== undefined && { scheduleDate: scheduleDate ? new Date(scheduleDate) : null }),
    },
  });
  res.json(meta);
}
