import client from './client';
import type { GeneratedResult } from '../types';

export async function generateResults(keywordId: string): Promise<GeneratedResult[]> {
  const res = await client.post('/generate', { keywordId });
  return res.data;
}
