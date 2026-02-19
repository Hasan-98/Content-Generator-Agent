import client from './client';
import { TopLevel } from '../types';

export async function getTopLevels(): Promise<TopLevel[]> {
  const res = await client.get('/top-levels');
  return res.data;
}

export async function createTopLevel(name: string): Promise<TopLevel> {
  const res = await client.post('/top-levels', { name });
  return res.data;
}

export async function updateTopLevel(id: string, name: string): Promise<TopLevel> {
  const res = await client.patch(`/top-levels/${id}`, { name });
  return res.data;
}

export async function deleteTopLevel(id: string): Promise<void> {
  await client.delete(`/top-levels/${id}`);
}
