import { Response } from 'express';
import { PrismaClient, ResultStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const STATUS_CYCLE: ResultStatus[] = [
  'DRAFT', 'READY', 'KW_DONE', 'PERSONA_WIP', 'PERSONA_DONE',
  'STRUCT_WIP', 'STRUCT_DONE', 'PUBLISHED',
];

async function findResultWithAuth(id: string, userId: string) {
  return prisma.generatedResult.findFirst({
    where: { id },
    include: { keyword: { include: { topLevel: true } } },
  }).then(r => (r && r.keyword.topLevel.userId === userId ? r : null));
}

export async function updateResult(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { title, status, ...personaStructFields } = req.body;

  const existing = await findResultWithAuth(id, req.user!.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  let nextStatus: ResultStatus | undefined = status;
  if (status === 'cycle') {
    const idx = STATUS_CYCLE.indexOf(existing.status as ResultStatus);
    nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  }

  // Allowed persona/structure fields for direct update
  const allowedFields = [
    'demographic', 'persona1', 'persona2', 'persona3',
    'demoSize1', 'demoSize2', 'demoSize3',
    'structIntro', 'structNayami', 'structP1', 'structP2', 'structP3',
    'structCommon', 'structCta', 'structMatome', 'structH2',
    'factCheck', 'targetDecision',
  ];

  const extraData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (personaStructFields[key] !== undefined) {
      extraData[key] = personaStructFields[key];
    }
  }

  const result = await prisma.generatedResult.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(nextStatus !== undefined && { status: nextStatus }),
      ...extraData,
    },
  });
  res.json(result);
}

export async function deleteResult(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await findResultWithAuth(id, req.user!.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.generatedResult.delete({ where: { id } });
  res.status(204).send();
}

export async function skipResult(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await findResultWithAuth(id, req.user!.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  if (existing.status === 'SKIPPED') {
    res.status(400).json({ error: 'Already skipped' });
    return;
  }

  const result = await prisma.generatedResult.update({
    where: { id },
    data: { previousStatus: existing.status as ResultStatus, status: 'SKIPPED' },
  });
  res.json(result);
}

export async function restoreResult(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  const existing = await findResultWithAuth(id, req.user!.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  if (existing.status !== 'SKIPPED') {
    res.status(400).json({ error: 'Not skipped' });
    return;
  }

  const restoreStatus = (existing.previousStatus as ResultStatus) || 'DRAFT';
  const result = await prisma.generatedResult.update({
    where: { id },
    data: { status: restoreStatus, previousStatus: null },
  });
  res.json(result);
}
