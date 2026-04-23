import axios from 'axios';
import fs from 'fs';
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
    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (imageUrl.startsWith('/uploads/')) {
      // Local file — read directly from disk
      const localPath = path.join(__dirname, '..', '..', imageUrl.slice(1));
      console.log(`[wordpressService] Reading local file: ${localPath}`);
      buffer = fs.readFileSync(localPath);
      // Detect content type from extension
      const ext = path.extname(localPath).toLowerCase();
      contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      filename = path.basename(localPath);
    } else {
      // External URL — download
      console.log(`[wordpressService] Downloading image: ${imageUrl}`);
      const imgResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      buffer = Buffer.from(imgResponse.data);
      contentType = imgResponse.headers['content-type'] || 'image/jpeg';

      // Derive filename from URL
      try {
        const urlPath = new URL(imageUrl).pathname;
        filename = path.basename(urlPath) || 'featured-image.jpg';
      } catch {
        filename = 'featured-image.jpg';
      }
    }

    // Ensure filename has an extension
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
      filename += ext;
    }

    console.log(`[wordpressService] Uploading to WP media: ${filename} (${buffer.length} bytes, ${contentType})`);

    const mediaEndpoint = `${baseUrl}/?rest_route=/wp/v2/media`;
    const response = await axios.post(mediaEndpoint, buffer, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      timeout: 60000,
    });

    const mediaId = response.data?.id || null;
    console.log(`[wordpressService] Media uploaded, ID: ${mediaId}`);
    return mediaId;
  } catch (err: any) {
    console.error('[wordpressService] uploadMediaFromUrl FAILED:', err?.message || err);
    if (err?.response?.data) {
      console.error('[wordpressService] WP response:', JSON.stringify(err.response.data).slice(0, 500));
    }
    return null;
  }
}

/**
 * Update an existing WordPress post's featured image (thumbnail).
 * Looks up the post by slug, uploads the image, and sets featured_media.
 */
export async function updateWordpressThumbnail(
  postSlug: string,
  imageUrl: string,
  credentials?: WpCredentials
): Promise<{ success: boolean; mediaId?: number; postId?: number; error?: string }> {
  const wpUrl = credentials?.wpUrl || process.env.WP_API_URL;
  const wpUser = credentials?.wpUser || process.env.WP_USER;
  const wpPassword = credentials?.wpPassword || process.env.WP_PASSWORD;

  if (!wpUrl || !wpUser || !wpPassword) {
    return { success: false, error: 'WordPress credentials not configured' };
  }

  try {
    const baseUrl = deriveBaseUrl(wpUrl);
    const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

    // Find the post by slug
    const searchRes = await axios.get(`${baseUrl}/?rest_route=/wp/v2/posts`, {
      params: { slug: postSlug, per_page: 1 },
      headers: { Authorization: `Basic ${auth}` },
      timeout: 15000,
    });

    const posts = searchRes.data;
    if (!posts || posts.length === 0) {
      return { success: false, error: `No WP post found with slug: ${postSlug}` };
    }
    const postId = posts[0].id;

    // Upload the image
    const mediaId = await uploadMediaFromUrl(imageUrl, baseUrl, auth);
    if (!mediaId) {
      return { success: false, error: 'Failed to upload image to WP media' };
    }

    // Update the post with featured_media
    await axios.post(
      `${baseUrl}/?rest_route=/wp/v2/posts/${postId}`,
      { featured_media: mediaId },
      {
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    console.log(`[wordpressService] Thumbnail updated: post=${postId}, media=${mediaId}`);
    return { success: true, mediaId, postId };
  } catch (err: any) {
    console.error('[wordpressService] updateThumbnail error:', err?.message);
    return { success: false, error: err?.message || 'Unknown error' };
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

    const link = response.data?.link;
    return typeof link === 'string' ? link : null;
  } catch (err) {
    console.error('[wordpressService] publishToWordpress error:', err);
    return null;
  }
}
