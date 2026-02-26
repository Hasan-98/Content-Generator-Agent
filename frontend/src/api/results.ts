import client from './client';
import type { GeneratedResult } from '../types';

export async function updateResult(
  id: string,
  data: Record<string, unknown>
): Promise<GeneratedResult> {
  const res = await client.patch(`/results/${id}`, data);
  return res.data;
}

export async function deleteResult(id: string): Promise<void> {
  await client.delete(`/results/${id}`);
}

export async function skipResult(id: string): Promise<GeneratedResult> {
  const res = await client.post(`/results/${id}/skip`);
  return res.data;
}

export async function restoreResult(id: string): Promise<GeneratedResult> {
  const res = await client.post(`/results/${id}/restore`);
  return res.data;
}
