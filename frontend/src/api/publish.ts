import client from './client';

export async function publish(
  articleId: string,
  platform: 'wordpress' | 'shopify'
): Promise<{ success: boolean; postUrl: string | null }> {
  const res = await client.post('/publish', { articleId, platform });
  return res.data;
}
