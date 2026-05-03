import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { ARTICLE_BASE_PROMPT_SUMMARY } from '../services/claudeService';

const prisma = new PrismaClient();

export async function getBasePrompt(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ content: ARTICLE_BASE_PROMPT_SUMMARY });
}

export async function listPromptTemplates(req: AuthRequest, res: Response): Promise<void> {
  const templates = await prisma.promptTemplate.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  res.json(templates);
}

export async function createPromptTemplate(req: AuthRequest, res: Response): Promise<void> {
  const { name, content, isDefault } = req.body;
  if (!name?.trim() || !content?.trim()) {
    res.status(400).json({ error: 'name and content are required' });
    return;
  }

  if (isDefault) {
    await prisma.promptTemplate.updateMany({
      where: { userId: req.user!.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.promptTemplate.create({
    data: {
      userId: req.user!.id,
      name: name.trim(),
      content: content.trim(),
      isDefault: !!isDefault,
    },
  });
  res.json(template);
}

export async function updatePromptTemplate(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { name, content, isDefault } = req.body;

  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  if (isDefault === true) {
    await prisma.promptTemplate.updateMany({
      where: { userId: req.user!.id, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.promptTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(isDefault !== undefined && { isDefault: !!isDefault }),
    },
  });
  res.json(updated);
}

export async function deletePromptTemplate(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  await prisma.promptTemplate.delete({ where: { id } });
  res.json({ success: true });
}
