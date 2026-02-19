import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { searchKeyword } from '../services/serpService';
import { generateTitles } from '../services/claudeService';

const prisma = new PrismaClient();

export async function generate(req: AuthRequest, res: Response): Promise<void> {
  const { keywordId } = req.body;
  if (!keywordId) {
    res.status(400).json({ error: 'keywordId is required' });
    return;
  }

  const kwRecord = await prisma.keyword.findFirst({
    where: { id: keywordId },
    include: { topLevel: true },
  });

  if (!kwRecord || kwRecord.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Keyword not found' });
    return;
  }

  const serpData = await searchKeyword(kwRecord.keyword);
  const pairs = await generateTitles(kwRecord.keyword, kwRecord.goal, kwRecord.audience, serpData);

  const results = await Promise.all(
    pairs.map((pair) =>
      prisma.generatedResult.create({
        data: {
          keywordText: pair.keyword,
          title: pair.title,
          keywordId: kwRecord.id,
          status: 'DRAFT',
        },
      })
    )
  );

  res.status(201).json(results);
}
