import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function createKeyword(req: AuthRequest, res: Response): Promise<void> {
  const { topLevelId, keyword, goal, audience } = req.body;
  if (!topLevelId || !keyword) {
    res.status(400).json({ error: 'topLevelId and keyword are required' });
    return;
  }

  const topLevel = await prisma.topLevel.findFirst({ where: { id: String(topLevelId), userId: req.user!.id } });
  if (!topLevel) {
    res.status(404).json({ error: 'TopLevel not found' });
    return;
  }

  const kw = await prisma.keyword.create({
    data: { keyword, goal: goal || '', audience: audience || '', topLevelId: String(topLevelId) },
    include: { results: true },
  });
  res.status(201).json(kw);
}

export async function updateKeyword(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { keyword, goal, audience } = req.body;

  const existing = await prisma.keyword.findFirst({
    where: { id },
    include: { topLevel: true },
  });
  if (!existing || existing.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const kw = await prisma.keyword.update({
    where: { id },
    data: {
      ...(keyword !== undefined && { keyword }),
      ...(goal !== undefined && { goal }),
      ...(audience !== undefined && { audience }),
    },
    include: { results: true },
  });
  res.json(kw);
}

export async function deleteKeyword(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await prisma.keyword.findFirst({
    where: { id },
    include: { topLevel: true },
  });
  if (!existing || existing.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.keyword.delete({ where: { id } });
  res.status(204).send();
}
