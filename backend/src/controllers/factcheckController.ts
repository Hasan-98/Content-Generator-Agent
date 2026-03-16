import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { searchForFactCheck } from '../services/googleSearchService';
import { verifyDemoSizeEstimate } from '../services/claudeService';
import { getUserApiKey } from './apiConfigController';

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
    type PersonaCheck = {
      persona: string;
      demoSize: string | null;
      searchResults: { title: string; link: string; snippet: string }[];
      verified: boolean;
      verdict: 'confirmed' | 'uncertain' | 'incorrect';
      reason: string;
    };
    const factCheckData: Record<string, PersonaCheck> = {};
    const personas = [
      { key: 'persona1', size: existing.demoSize1, value: existing.persona1 },
      { key: 'persona2', size: existing.demoSize2, value: existing.persona2 },
      { key: 'persona3', size: existing.demoSize3, value: existing.persona3 },
    ];

    const claudeApi = (await getUserApiKey(req.user!.id, 'claudeApi')) || undefined;

    for (const p of personas) {
      if (!p.value) continue;
      const query = `${existing.keywordText} ${p.size || ''} ${existing.demographic || ''}`.trim();
      const searchResults = await searchForFactCheck(query);
      const { verdict, reason } = await verifyDemoSizeEstimate(
        existing.keywordText,
        existing.demographic || '',
        p.value,
        p.size || '',
        searchResults,
        claudeApi
      );
      factCheckData[p.key] = {
        persona: p.value,
        demoSize: p.size,
        searchResults,
        verified: verdict === 'confirmed',
        verdict,
        reason,
      };
    }

    // Determine target decision from Claude verdicts
    const entries = Object.values(factCheckData);
    const confirmedCount = entries.filter(v => v.verdict === 'confirmed').length;
    const reasons = entries.map(v => v.reason).filter(Boolean).join(' / ');
    const targetDecision = confirmedCount >= 2
      ? `ターゲット確定: ${reasons}`
      : `ターゲット要確認: ${reasons}`;

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
