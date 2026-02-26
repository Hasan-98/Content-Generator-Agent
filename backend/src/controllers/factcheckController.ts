import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { searchForFactCheck } from '../services/googleSearchService';

const prisma = new PrismaClient();

export async function factCheck(req: AuthRequest, res: Response): Promise<void> {
  const { resultId } = req.body;
  if (!resultId) { res.status(400).json({ error: 'resultId is required' }); return; }

  const existing = await prisma.generatedResult.findFirst({
    where: { id: resultId },
    include: { keyword: { include: { topLevel: true } } },
  });
  if (!existing || existing.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Result not found' });
    return;
  }

  // Set STRUCT_WIP while processing
  await prisma.generatedResult.update({ where: { id: resultId }, data: { status: 'STRUCT_WIP' } });

  try {
    type PersonaCheck = { persona: string; demoSize: string | null; searchResults: { title: string; link: string; snippet: string }[]; verified: boolean };
    const factCheckData: Record<string, PersonaCheck> = {};
    const personas = [
      { key: 'persona1', size: existing.demoSize1, value: existing.persona1 },
      { key: 'persona2', size: existing.demoSize2, value: existing.persona2 },
      { key: 'persona3', size: existing.demoSize3, value: existing.persona3 },
    ];

    for (const p of personas) {
      if (!p.value) continue;
      const query = `${existing.keywordText} ${p.size || ''} ${existing.demographic || ''}`.trim();
      const searchResults = await searchForFactCheck(query);
      factCheckData[p.key] = {
        persona: p.value,
        demoSize: p.size,
        searchResults,
        verified: searchResults.length > 0,
      };
    }

    // Determine target decision
    const verifiedCount = Object.values(factCheckData).filter(v => v.verified).length;
    const targetDecision = verifiedCount >= 2
      ? 'ターゲット確定: 複数のペルソナが検索データで確認されました'
      : 'ターゲット要確認: 検索データでの確認が不十分です';

    const result = await prisma.generatedResult.update({
      where: { id: resultId },
      data: {
        factCheck: factCheckData as object,
        targetDecision,
        status: 'STRUCT_DONE',
      },
    });
    res.json(result);
  } catch (err) {
    await prisma.generatedResult.update({ where: { id: resultId }, data: { status: 'PERSONA_DONE' } });
    throw err;
  }
}
