import client from './client';
import type { GeneratedResult } from '../types';

export async function runFactCheck(resultId: string): Promise<GeneratedResult> {
  const res = await client.post('/factcheck', { resultId });
  return res.data;
}
