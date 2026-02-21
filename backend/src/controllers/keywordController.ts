import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function createKeyword(req: AuthRequest, res: Response): Promise<void> {
  const { topLevelId, keyword, goal, audience } = req.body;
  console.log(`[keywords] createKeyword → keyword: "${keyword}", topLevelId: ${topLevelId}`);

  if (!topLevelId || !keyword) {
    console.log('[keywords] createKeyword failed → topLevelId and keyword are required');
    res.status(400).json({ error: 'topLevelId and keyword are required' });
    return;
  }

  const topLevel = await prisma.topLevel.findFirst({ where: { id: String(topLevelId), userId: req.user!.id } });
  if (!topLevel) {
    console.log(`[keywords] createKeyword failed → topLevel not found: ${topLevelId}`);
    res.status(404).json({ error: 'TopLevel not found' });
    return;
  }

  const kw = await prisma.keyword.create({
    data: { keyword, goal: goal || '', audience: audience || '', topLevelId: String(topLevelId) },
    include: { results: true },
  });
  console.log(`[keywords] createKeyword success → id: ${kw.id}, keyword: "${kw.keyword}"`);
  res.status(201).json(kw);
}

export async function updateKeyword(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { keyword, goal, audience } = req.body;
  console.log(`[keywords] updateKeyword → id: ${id}, keyword: "${keyword}"`);

  const existing = await prisma.keyword.findFirst({
    where: { id },
    include: { topLevel: true },
  });
  if (!existing || existing.topLevel.userId !== req.user!.id) {
    console.log(`[keywords] updateKeyword failed → not found or unauthorized, id: ${id}`);
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
  console.log(`[keywords] updateKeyword success → id: ${kw.id}`);
  res.json(kw);
}

export async function deleteKeyword(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  console.log(`[keywords] deleteKeyword → id: ${id}`);

  const existing = await prisma.keyword.findFirst({
    where: { id },
    include: { topLevel: true },
  });
  if (!existing || existing.topLevel.userId !== req.user!.id) {
    console.log(`[keywords] deleteKeyword failed → not found or unauthorized, id: ${id}`);
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.keyword.delete({ where: { id } });
  console.log(`[keywords] deleteKeyword success → id: ${id}`);
  res.status(204).send();
}
