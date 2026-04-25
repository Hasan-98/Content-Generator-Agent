import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');
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
  try {
    const u = new URL(wpUrl);
    return u.origin;
  } catch {
    return wpUrl
      .replace(/\/wp-json\/wp\/v2.*$/i, '')
      .replace(/\?rest_route=.*$/i, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Build the WP REST API URL for a given route.
 * Try /wp-json/wp/v2 first; if it 404s fall back to ?rest_route=.
 * Caches the working style per baseUrl so we only probe once.
 */
const restStyleCache = new Map<string, 'pretty' | 'query'>();

async function wpApiRequest(
  method: 'get' | 'post',
  baseUrl: string,
  route: string,          // e.g. "/posts", "/media", "/posts/123"
  auth: string,
  data?: any,
  extraHeaders?: Record<string, string>,
  timeout = 30000,
  maxBodyLength?: number,
): Promise<any> {
  const cached = restStyleCache.get(baseUrl);
  const styles: Array<'pretty' | 'query'> = cached
    ? [cached]
    : ['pretty', 'query'];

  for (const style of styles) {
    const url = style === 'pretty'
      ? `${baseUrl}/wp-json/wp/v2${route}`
      : `${baseUrl}/?rest_route=/wp/v2${route}`;

    try {
      const config: any = {
        headers: { Authorization: `Basic ${auth}`, ...extraHeaders },
        timeout,
      };
      if (maxBodyLength) config.maxBodyLength = maxBodyLength;

      let response;
      if (method === 'get') {
        config.params = data;
        response = await axios.get(url, config);
      } else {
        response = await axios.post(url, data, config);
      }

      // It worked — cache this style
      restStyleCache.set(baseUrl, style);
      console.log(`[wordpressService] ${method.toUpperCase()} ${url} → ${response.status}`);
      return response;
    } catch (err: any) {
      const status = err?.response?.status;
      // If 404 and we have another style to try, continue
      if (status === 404 && styles.length > 1 && style === styles[0]) {
        console.log(`[wordpressService] ${url} returned 404, trying fallback style...`);
        continue;
      }
      // Otherwise rethrow
      throw err;
    }
  }
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

    // Use multipart form upload — SiteGuard WAF blocks raw binary POSTs
    const form = new FormData();
    form.append('file', buffer, { filename, contentType });

    const response = await wpApiRequest('post', baseUrl, '/media', auth, form, form.getHeaders(), 60000, Infinity);

    const mediaId = response.data?.id || null;
    console.log(`[wordpressService] Media uploaded, ID: ${mediaId}`);
    return mediaId;
  } catch (err: any) {
    console.error('[wordpressService] uploadMediaFromUrl FAILED:', err?.message || err);
    if (err?.response?.data) {
      const respStr = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
      console.error('[wordpressService] WP response:', respStr.slice(0, 500));
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
    const searchRes = await wpApiRequest('get', baseUrl, '/posts', auth, { slug: postSlug, per_page: 1 }, undefined, 15000);

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
    await wpApiRequest('post', baseUrl, `/posts/${postId}`, auth, { featured_media: mediaId }, { 'Content-Type': 'application/json' }, 15000);

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

    const postBody = {
      title: input.title,
      content: input.content,
      slug: input.slug,
      excerpt: input.excerpt,
      status: input.publishStatus,
      ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
      ...(input.publishStatus === 'future' && input.scheduleDate
        ? { date: input.scheduleDate }
        : {}),
    };
    const response = await wpApiRequest('post', baseUrl, '/posts', auth, postBody, { 'Content-Type': 'application/json' });

    const data = response.data || {};
    console.log(`[wordpressService] Post created — id: ${data.id}, link: ${data.link}, guid: ${data.guid?.rendered || data.guid}, slug: ${data.slug}`);

    const link = data.link || data.guid?.rendered || data.url || null;
    if (typeof link === 'string') return link;

    // Fallback: construct URL from baseUrl + slug
    const slug = data.slug || input.slug;
    if (slug) return `${baseUrl}/${slug}/`;

    return null;
  } catch (err: any) {
    console.error('[wordpressService] publishToWordpress FAILED:', err?.message || err);
    if (err?.response?.status) {
      console.error('[wordpressService] Status:', err.response.status);
    }
    if (err?.response?.data) {
      const respStr = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
      console.error('[wordpressService] WP response:', respStr.slice(0, 800));
    }
    return null;
  }
}
