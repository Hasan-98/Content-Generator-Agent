import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function listTopLevels(req: AuthRequest, res: Response): Promise<void> {
  console.log(`[topLevels] listTopLevels → userId: ${req.user!.id}`);
  const topLevels = await prisma.topLevel.findMany({
    where: { userId: req.user!.id },
    include: {
      keywords: {
        include: { results: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });
  console.log(`[topLevels] listTopLevels → returning ${topLevels.length} top-levels`);
  res.json(topLevels);
}

export async function createTopLevel(req: AuthRequest, res: Response): Promise<void> {
  const { name } = req.body;
  console.log(`[topLevels] createTopLevel → name: "${name}", userId: ${req.user!.id}`);

  if (!name) {
    console.log('[topLevels] createTopLevel failed → name is required');
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const count = await prisma.topLevel.count({ where: { userId: req.user!.id } });
  const topLevel = await prisma.topLevel.create({
    data: { name, userId: req.user!.id, order: count },
    include: { keywords: { include: { results: true } } },
  });
  console.log(`[topLevels] createTopLevel success → id: ${topLevel.id}, name: "${topLevel.name}"`);
  res.status(201).json(topLevel);
}

export async function updateTopLevel(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { name } = req.body;
  console.log(`[topLevels] updateTopLevel → id: ${id}, name: "${name}"`);

  const existing = await prisma.topLevel.findFirst({ where: { id, userId: req.user!.id } });
  if (!existing) {
    console.log(`[topLevels] updateTopLevel failed → not found or unauthorized, id: ${id}`);
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const topLevel = await prisma.topLevel.update({
    where: { id },
    data: { ...(name !== undefined && { name }) },
    include: { keywords: { include: { results: true } } },
  });
  console.log(`[topLevels] updateTopLevel success → id: ${topLevel.id}`);
  res.json(topLevel);
}

export async function deleteTopLevel(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  console.log(`[topLevels] deleteTopLevel → id: ${id}`);

  const existing = await prisma.topLevel.findFirst({ where: { id, userId: req.user!.id } });
  if (!existing) {
    console.log(`[topLevels] deleteTopLevel failed → not found or unauthorized, id: ${id}`);
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.topLevel.delete({ where: { id } });
  console.log(`[topLevels] deleteTopLevel success → id: ${id}`);
  res.status(204).send();
}
