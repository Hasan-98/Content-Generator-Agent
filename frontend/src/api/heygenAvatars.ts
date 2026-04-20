import client from './client';
import type { HeygenTrainedAvatar } from '../types';

export async function listHeygenAvatars(): Promise<HeygenTrainedAvatar[]> {
  const res = await client.get('/heygen-avatars');
  return res.data;
}

export async function createHeygenAvatar(data: { name: string; imageFile?: File; imageUrl?: string }): Promise<HeygenTrainedAvatar> {
  if (data.imageFile) {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('image', data.imageFile);
    const res = await client.post('/heygen-avatars', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
  const res = await client.post('/heygen-avatars', { name: data.name, imageUrl: data.imageUrl });
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
