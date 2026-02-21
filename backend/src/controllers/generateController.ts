import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { searchKeyword } from '../services/serpService';
import { generateTitles } from '../services/claudeService';

const prisma = new PrismaClient();

export async function generate(req: AuthRequest, res: Response): Promise<void> {
  const { keywordId } = req.body;
  console.log(`[generate] generate → keywordId: ${keywordId}`);

  if (!keywordId) {
    console.log('[generate] generate failed → keywordId is required');
    res.status(400).json({ error: 'keywordId is required' });
    return;
  }

  const kwRecord = await prisma.keyword.findFirst({
    where: { id: keywordId },
    include: { topLevel: true },
  });

  if (!kwRecord || kwRecord.topLevel.userId !== req.user!.id) {
    console.log(`[generate] generate failed → keyword not found or unauthorized: ${keywordId}`);
    res.status(404).json({ error: 'Keyword not found' });
    return;
  }

  console.log(`[generate] calling ValueSERP for keyword: "${kwRecord.keyword}"`);
  const serpData = await searchKeyword(kwRecord.keyword);
  console.log(`[generate] ValueSERP returned ${serpData.length} results`);

  console.log(`[generate] calling Claude API → keyword: "${kwRecord.keyword}", goal: "${kwRecord.goal}", audience: "${kwRecord.audience}"`);
  const pairs = await generateTitles(kwRecord.keyword, kwRecord.goal, kwRecord.audience, serpData);
  console.log(`[generate] Claude returned ${pairs.length} pairs:`, pairs.map(p => p.title));

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

  console.log(`[generate] saved ${results.length} results to DB`);
  res.status(201).json(results);
}
