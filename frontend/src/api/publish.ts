import client from './client';

export async function publish(
  articleId: string,
  platform: 'wordpress' | 'shopify'
): Promise<{ success: boolean; postUrl: string | null }> {
  const res = await client.post('/publish', { articleId, platform });
  return res.data;
}

export async function fixThumbnail(articleId: string): Promise<{ success: boolean; error?: string }> {
  const res = await client.post('/publish/fix-thumbnail', { articleId });
  return res.data;
}

export async function fixAllThumbnails(): Promise<{ total: number; fixed: number; failed: number }> {
  const res = await client.post('/publish/fix-all-thumbnails');
  return res.data;
}
