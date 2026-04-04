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

export interface WpCredentials {
  wpUrl: string;
  wpUser: string;
  wpPassword: string;
}

export async function publishToWordpress(
  input: WpPublishInput,
  credentials?: WpCredentials
): Promise<string | null> {
  // Use provided credentials (per-user) or fall back to env vars
  const wpUrl = credentials?.wpUrl || process.env.WP_API_URL;
  const wpUser = credentials?.wpUser || process.env.WP_USER;
  const wpPassword = credentials?.wpPassword || process.env.WP_PASSWORD;

  if (!wpUrl || !wpUser || !wpPassword) {
    console.log('[wordpressService] WordPress credentials not configured');
    return null;
  }

  try {
    // Derive the base site URL, stripping any REST API path the user may have included
    const baseUrl = wpUrl
      .replace(/\/wp-json\/wp\/v2.*$/i, '')
      .replace(/\?rest_route=.*$/i, '')
      .replace(/\/+$/, '');
    // Use ?rest_route= format — works on all WP sites regardless of permalink settings
    const endpoint = `${baseUrl}/?rest_route=/wp/v2/posts`;
    const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');
    const response = await axios.post(
      endpoint,
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
