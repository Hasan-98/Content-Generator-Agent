import client from './client';

export interface WpConfigResponse {
  id: string;
  wpUrl: string;
  wpUser: string;
  wpPasswordSet: boolean;
  topLevelId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WpTestResult {
  success: boolean;
  siteName?: string;
  siteUrl?: string;
  error?: string;
}

export async function getWpConfig(topLevelId: string): Promise<WpConfigResponse | null> {
  const res = await client.get(`/wp-config/${topLevelId}`);
  return res.data;
}

export async function upsertWpConfig(topLevelId: string, data: {
  wpUrl: string;
  wpUser: string;
  wpPassword?: string;
}): Promise<WpConfigResponse> {
  const res = await client.put(`/wp-config/${topLevelId}`, data);
  return res.data;
}

export async function deleteWpConfig(topLevelId: string): Promise<{ success: boolean }> {
  const res = await client.delete(`/wp-config/${topLevelId}`);
  return res.data;
}

export async function testWpConnection(topLevelId: string): Promise<WpTestResult> {
  const res = await client.post(`/wp-config/${topLevelId}/test`);
  return res.data;
}
