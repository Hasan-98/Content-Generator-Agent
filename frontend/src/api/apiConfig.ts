import client from './client';

export interface ApiConfigStatus {
  claudeApi: boolean;
  openaiApi: boolean;
  geminiApi: boolean;
  googleApi: boolean;
  metaApi: boolean;
  kieApi: boolean;
  pieapi: boolean;
}

export type ApiKeyName = keyof ApiConfigStatus;

export async function getApiConfig(): Promise<ApiConfigStatus> {
  const res = await client.get('/api-config');
  return res.data;
}

export async function upsertApiConfig(data: Partial<Record<ApiKeyName, string>>): Promise<ApiConfigStatus> {
  const res = await client.put('/api-config', data);
  return res.data;
}

export async function deleteApiKey(key: ApiKeyName): Promise<{ success: boolean }> {
  const res = await client.delete(`/api-config/${key}`);
  return res.data;
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await client.patch('/auth/me', data);
}
