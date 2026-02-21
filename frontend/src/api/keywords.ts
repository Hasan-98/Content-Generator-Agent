import client from './client';
import type { Keyword } from '../types';

export async function createKeyword(data: {
  topLevelId: string;
  keyword: string;
  goal?: string;
  audience?: string;
}): Promise<Keyword> {
  const res = await client.post('/keywords', data);
  return res.data;
}

export async function updateKeyword(
  id: string,
  data: { keyword?: string; goal?: string; audience?: string }
): Promise<Keyword> {
  const res = await client.patch(`/keywords/${id}`, data);
  return res.data;
}

export async function deleteKeyword(id: string): Promise<void> {
  await client.delete(`/keywords/${id}`);
}
