import client from './client';

export interface WpConfigResponse {
  id: string;
  wpUrl: string;
  wpUser: string;
  wpPasswordSet: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WpTestResult {
  success: boolean;
  siteName?: string;
  siteUrl?: string;
  error?: string;
}

export async function getWpConfig(): Promise<WpConfigResponse | null> {
  const res = await client.get('/wp-config');
  return res.data;
}

export async function upsertWpConfig(data: {
  wpUrl: string;
  wpUser: string;
  wpPassword?: string;
}): Promise<WpConfigResponse> {
  const res = await client.put('/wp-config', data);
  return res.data;
}

export async function deleteWpConfig(): Promise<{ success: boolean }> {
  const res = await client.delete('/wp-config');
  return res.data;
}

export async function testWpConnection(): Promise<WpTestResult> {
  const res = await client.post('/wp-config/test');
  return res.data;
}
