import axios from 'axios';

export interface ShopifyPublishInput {
  title: string;
  content: string;
  tags: string;
  publishStatus: 'published' | 'draft';
  scheduleDate?: string;
}

export async function publishToShopify(input: ShopifyPublishInput): Promise<string | null> {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    console.log('[shopifyService] Shopify credentials not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `https://${shopDomain}/admin/api/2024-01/articles.json`,
      {
        article: {
          title: input.title,
          body_html: input.content,
          tags: input.tags,
          published: input.publishStatus === 'published',
          ...(input.scheduleDate ? { published_at: input.scheduleDate } : {}),
        },
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const articleId = response.data?.article?.id;
    return articleId ? `https://${shopDomain}/blogs/news/${articleId}` : null;
  } catch (err) {
    console.error('[shopifyService] publishToShopify error:', err);
    return null;
  }
}
