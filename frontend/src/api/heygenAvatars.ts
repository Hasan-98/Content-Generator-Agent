import client from './client';
import type { HeygenTrainedAvatar } from '../types';

export async function listHeygenAvatars(): Promise<HeygenTrainedAvatar[]> {
  const res = await client.get('/heygen-avatars');
  return res.data;
}

export async function createHeygenAvatar(data: { name: string; imageUrl: string }): Promise<HeygenTrainedAvatar> {
  const res = await client.post('/heygen-avatars', data);
  return res.data;
}

export async function getHeygenAvatar(id: string): Promise<HeygenTrainedAvatar> {
  const res = await client.get(`/heygen-avatars/${id}`);
  return res.data;
}

export async function refreshHeygenAvatar(id: string): Promise<HeygenTrainedAvatar> {
  const res = await client.post(`/heygen-avatars/${id}/refresh`);
  return res.data;
}

export async function deleteHeygenAvatar(id: string): Promise<void> {
  await client.delete(`/heygen-avatars/${id}`);
}
