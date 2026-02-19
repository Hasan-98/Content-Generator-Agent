import client from './client';
import { GeneratedResult } from '../types';

export async function updateResult(
  id: string,
  data: { title?: string; status?: string }
): Promise<GeneratedResult> {
  const res = await client.patch(`/results/${id}`, data);
  return res.data;
}

export async function deleteResult(id: string): Promise<void> {
  await client.delete(`/results/${id}`);
}
