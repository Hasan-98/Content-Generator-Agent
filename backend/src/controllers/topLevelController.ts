import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function listTopLevels(req: AuthRequest, res: Response): Promise<void> {
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
  res.json(topLevels);
}

export async function createTopLevel(req: AuthRequest, res: Response): Promise<void> {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const count = await prisma.topLevel.count({ where: { userId: req.user!.id } });
  const topLevel = await prisma.topLevel.create({
    data: { name, userId: req.user!.id, order: count },
    include: { keywords: { include: { results: true } } },
  });
  res.status(201).json(topLevel);
}

export async function updateTopLevel(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { name } = req.body;

  const existing = await prisma.topLevel.findFirst({ where: { id, userId: req.user!.id } });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const topLevel = await prisma.topLevel.update({
    where: { id },
    data: { ...(name !== undefined && { name }) },
    include: { keywords: { include: { results: true } } },
  });
  res.json(topLevel);
}

export async function deleteTopLevel(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await prisma.topLevel.findFirst({ where: { id, userId: req.user!.id } });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.topLevel.delete({ where: { id } });
  res.status(204).send();
}
