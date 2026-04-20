import axios from 'axios';
import path from 'path';

export interface WpPublishInput {
  title: string;
  content: string;
  slug: string;
  excerpt: string;
  tags: string;
  category: string;
  publishStatus: 'publish' | 'draft' | 'future';
  scheduleDate?: string;
  featuredImageUrl?: string;
}

export interface WpCredentials {
  wpUrl: string;
  wpUser: string;
  wpPassword: string;
}

function deriveBaseUrl(wpUrl: string): string {
  return wpUrl
    .replace(/\/wp-json\/wp\/v2.*$/i, '')
    .replace(/\?rest_route=.*$/i, '')
    .replace(/\/+$/, '');
}

/**
 * Upload an image from a URL to the WordPress media library.
 * Returns the media ID to use as featured_media.
 */
async function uploadMediaFromUrl(
  imageUrl: string,
  baseUrl: string,
  auth: string,
  _altText?: string
): Promise<number | null> {
  try {
    // Download the image
    const imgResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const buffer = Buffer.from(imgResponse.data);
    const contentType = imgResponse.headers['content-type'] || 'image/jpeg';

    // Derive filename from URL
    const urlPath = new URL(imageUrl).pathname;
    let filename = path.basename(urlPath) || 'featured-image.jpg';
    // Ensure it has an extension
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
      filename += ext;
    }

    const mediaEndpoint = `${baseUrl}/?rest_route=/wp/v2/media`;
    const response = await axios.post(mediaEndpoint, buffer, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      timeout: 60000,
    });

    return response.data?.id || null;
  } catch (err) {
    console.error('[wordpressService] uploadMediaFromUrl error:', err);
    return null;
  }
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
    const baseUrl = deriveBaseUrl(wpUrl);
    const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

    // Upload featured image if provided
    let featuredMediaId: number | null = null;
    if (input.featuredImageUrl) {
      featuredMediaId = await uploadMediaFromUrl(
        input.featuredImageUrl,
        baseUrl,
        auth,
        input.title
      );
    }

    // Use ?rest_route= format — works on all WP sites regardless of permalink settings
    const endpoint = `${baseUrl}/?rest_route=/wp/v2/posts`;
    const response = await axios.post(
      endpoint,
      {
        title: input.title,
        content: input.content,
        slug: input.slug,
        excerpt: input.excerpt,
        status: input.publishStatus,
        ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
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
