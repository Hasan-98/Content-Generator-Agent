import client from './client';
import type { TopLevel } from '../types';

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

export interface CampaignDefaults {
  imageTaste: string;
  videoBgSource: 'free' | 'ai';
}

export async function getCampaignDefaults(topLevelId: string): Promise<CampaignDefaults> {
  const res = await client.get(`/top-levels/${topLevelId}/defaults`);
  return res.data;
}

export async function upsertCampaignDefaults(topLevelId: string, data: Partial<CampaignDefaults>): Promise<CampaignDefaults> {
  const res = await client.put(`/top-levels/${topLevelId}/defaults`, data);
  return res.data;
}
