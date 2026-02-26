import axios from 'axios';

export interface WpPublishInput {
  title: string;
  content: string;
  slug: string;
  excerpt: string;
  tags: string;
  category: string;
  publishStatus: 'publish' | 'draft' | 'future';
  scheduleDate?: string;
}

export async function publishToWordpress(input: WpPublishInput): Promise<string | null> {
  const wpUrl = process.env.WP_API_URL;
  const wpUser = process.env.WP_USER;
  const wpPassword = process.env.WP_PASSWORD;

  if (!wpUrl || !wpUser || !wpPassword) {
    console.log('[wordpressService] WordPress credentials not configured');
    return null;
  }

  try {
    const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');
    const response = await axios.post(
      `${wpUrl}/wp-json/wp/v2/posts`,
      {
        title: input.title,
        content: input.content,
        slug: input.slug,
        excerpt: input.excerpt,
        status: input.publishStatus,
        ...(input.publishStatus === 'future' && input.scheduleDate
          ? { date: input.scheduleDate }
          : {}),
      },
      {
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    return response.data?.link || null;
  } catch (err) {
    console.error('[wordpressService] publishToWordpress error:', err);
    return null;
  }
}
