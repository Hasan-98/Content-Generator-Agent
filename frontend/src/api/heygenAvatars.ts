import client from './client';
import type { HeygenTrainedAvatar, HeygenAvatarType } from '../types';

export async function listHeygenAvatars(): Promise<HeygenTrainedAvatar[]> {
  const res = await client.get('/heygen-avatars');
  return res.data;
}

export async function createHeygenAvatar(data: {
  name: string;
  avatarType: HeygenAvatarType;
  file: File;
}): Promise<HeygenTrainedAvatar> {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('avatarType', data.avatarType);
  formData.append('file', data.file);
  const res = await client.post('/heygen-avatars', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
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

export async function retryHeygenAvatar(id: string): Promise<HeygenTrainedAvatar> {
  const res = await client.post(`/heygen-avatars/${id}/retry`);
  return res.data;
}

export async function deleteHeygenAvatar(id: string): Promise<void> {
  await client.delete(`/heygen-avatars/${id}`);
}
