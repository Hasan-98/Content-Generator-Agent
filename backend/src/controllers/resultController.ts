import { Response } from 'express';
import { PrismaClient, Status } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const STATUS_CYCLE: Status[] = ['DRAFT', 'READY', 'PROGRESS', 'DONE', 'PUBLISHED'];

export async function updateResult(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { title, status } = req.body;

  const existing = await prisma.generatedResult.findFirst({
    where: { id },
    include: { keyword: { include: { topLevel: true } } },
  });
  if (!existing || existing.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  let nextStatus: Status | undefined = status;
  if (status === 'cycle') {
    const currentIndex = STATUS_CYCLE.indexOf(existing.status);
    nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
  }

  const result = await prisma.generatedResult.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(nextStatus !== undefined && { status: nextStatus }),
    },
  });
  res.json(result);
}

export async function deleteResult(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await prisma.generatedResult.findFirst({
    where: { id },
    include: { keyword: { include: { topLevel: true } } },
  });
  if (!existing || existing.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.generatedResult.delete({ where: { id } });
  res.status(204).send();
}
