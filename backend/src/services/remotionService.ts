import axios from 'axios';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '';
const REMOTION_RENDER_URL = process.env.REMOTION_RENDER_URL || '';

// WF4 keyword mapping — English keywords from WF1's `background_keyword` field
// get rewritten into Japan-themed Pexels queries so the visual style matches
// the Japanese narration. Copied verbatim from the n8n WF4 Code node.
const JAPANESE_KEYWORDS: Record<string, string> = {
  'cemetery':         'japanese temple graveyard',
  'graveyard':        'japanese buddhist temple stone',
  'cityscape':        'tokyo skyline buildings',
  'process':          'japanese zen stone garden',
  'cost':             'japanese yen money',
  'bones transfer':   'japanese temple altar',
  'family agreement': 'japanese family traditional',
  'thank you':        'japanese cherry blossom sakura',
  'nature':           'japanese garden kyoto',
  'temple':           'japanese shrine torii',
  'funeral':          'japanese incense buddhist',
  'document':         'japanese calligraphy paper',
};

// WF4 fallback list — used when the primary search returns zero photos.
// Rotates through a curated set of Japan-themed stock queries.
const JAPANESE_FALLBACKS: string[] = [
  'japanese temple kyoto',
  'japanese garden zen',
  'japanese cherry blossom',
  'japanese shrine torii gate',
  'mount fuji japan',
  'japanese bamboo forest',
  'japanese autumn leaves momiji',
  'japanese traditional house',
];

/**
 * Resolve a raw `background_keyword` into a Japan-aware Pexels search query.
 * Mirrors the WF4 Code node's resolution chain:
 *   1. Exact match in JAPANESE_KEYWORDS
 *   2. If already contains "japan", use as-is
 *   3. Otherwise prefix with "japan "
 */
export function resolveJapaneseKeyword(raw: string): string {
  const keyword = (raw || 'nature').toLowerCase().trim();
  const mapped = JAPANESE_KEYWORDS[keyword];
  if (mapped) return mapped;
  if (keyword.includes('japan')) return keyword;
  return `japan ${keyword}`;
}

/**
 * Low-level Pexels search — returns up to `perPage` photos (randomized pick).
 */
async function searchPexels(
  query: string,
  orientation: 'landscape' | 'portrait',
  perPage: number
): Promise<string> {
  if (!PEXELS_API_KEY) return '';
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, orientation, per_page: perPage },
      headers: { Authorization: PEXELS_API_KEY },
      timeout: 15000,
    });
    const photos = response.data?.photos;
    if (photos && photos.length > 0) {
      // Match WF4: pick a random photo from the top results (first 5)
      const pickFrom = Math.min(photos.length, 5);
      const idx = Math.floor(Math.random() * pickFrom);
      return photos[idx].src?.landscape || photos[idx].src?.large || photos[idx].src?.original || '';
    }
  } catch {
    // Silently swallow — background image is optional.
  }
  return '';
}

/**
 * Fetch a background image from Pexels for a given keyword, with WF4's
 * Japan-aware mapping and fallback logic.
 *
 * @param rawKeyword  Raw keyword (WF1's `background_keyword`)
 * @param orientation 'horizontal' (default) or 'vertical'
 * @param sectionIndex Used to rotate the fallback list — keeps sequential
 *                    sections from all landing on the same fallback image.
 */
export async function fetchBackgroundImage(
  rawKeyword: string,
  orientation: string = 'horizontal',
  sectionIndex: number = 0
): Promise<string> {
  if (!PEXELS_API_KEY) return '';

  const pexelsOrientation = orientation === 'vertical' ? 'portrait' : 'landscape';
  const primary = resolveJapaneseKeyword(rawKeyword);

  // Primary search — up to 5 photos, random pick
  const primaryUrl = await searchPexels(primary, pexelsOrientation, 5);
  if (primaryUrl) return primaryUrl;

  // Fallback — rotate through the curated Japan-themed fallback list
  const fallbackKeyword = JAPANESE_FALLBACKS[sectionIndex % JAPANESE_FALLBACKS.length];
  const fallbackUrl = await searchPexels(fallbackKeyword, pexelsOrientation, 3);
  return fallbackUrl || '';
}

// ============================================================================
// Multi-result search — returns arrays of images/videos for the picker UI
// ============================================================================

export interface BackgroundResult {
  url: string;          // direct link to image or video file
  thumbnail: string;    // small preview
  source: 'pexels_photo' | 'pexels_video' | 'pixabay_video';
  width: number;
  height: number;
  duration?: number;    // seconds, videos only
}

/**
 * Search Pexels photos — returns multiple results for the picker.
 */
export async function searchPexelsPhotos(
  query: string,
  orientation: 'landscape' | 'portrait',
  perPage: number = 12
): Promise<BackgroundResult[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, orientation, per_page: perPage },
      headers: { Authorization: PEXELS_API_KEY },
      timeout: 15000,
    });
    const photos = response.data?.photos || [];
    return photos.map((p: any) => ({
      url: p.src?.landscape || p.src?.large || p.src?.original || '',
      thumbnail: p.src?.medium || p.src?.small || '',
      source: 'pexels_photo' as const,
      width: p.width || 0,
      height: p.height || 0,
    })).filter((r: BackgroundResult) => r.url);
  } catch {
    return [];
  }
}

/**
 * Search Pexels videos — returns multiple results for the picker.
 */
export async function searchPexelsVideos(
  query: string,
  orientation: 'landscape' | 'portrait',
  perPage: number = 8
): Promise<BackgroundResult[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const response = await axios.get('https://api.pexels.com/videos/search', {
      params: { query, orientation, per_page: perPage },
      headers: { Authorization: PEXELS_API_KEY },
      timeout: 15000,
    });
    const videos = response.data?.videos || [];
    return videos.map((v: any) => {
      // Pick the best quality file (HD preferred)
      const files = v.video_files || [];
      const hd = files.find((f: any) => f.quality === 'hd') || files[0];
      return {
        url: hd?.link || '',
        thumbnail: v.image || '',
        source: 'pexels_video' as const,
        width: hd?.width || v.width || 0,
        height: hd?.height || v.height || 0,
        duration: v.duration || 0,
      };
    }).filter((r: BackgroundResult) => r.url);
  } catch {
    return [];
  }
}

/**
 * Search Pixabay videos — returns multiple results for the picker.
 */
export async function searchPixabayVideos(
  query: string,
  perPage: number = 8
): Promise<BackgroundResult[]> {
  if (!PIXABAY_API_KEY) return [];
  try {
    const response = await axios.get('https://pixabay.com/api/videos/', {
      params: { key: PIXABAY_API_KEY, q: query, per_page: perPage },
      timeout: 15000,
    });
    const hits = response.data?.hits || [];
    return hits.map((h: any) => {
      const medium = h.videos?.medium || h.videos?.small || {};
      return {
        url: medium.url || '',
        thumbnail: `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`,
        source: 'pixabay_video' as const,
        width: medium.width || 0,
        height: medium.height || 0,
        duration: h.duration || 0,
      };
    }).filter((r: BackgroundResult) => r.url);
  } catch {
    return [];
  }
}

/**
 * Search all sources in parallel and return combined results.
 * Japan-aware keyword mapping is applied automatically.
 */
export async function searchBackgrounds(
  rawKeyword: string,
  orientation: string = 'horizontal'
): Promise<BackgroundResult[]> {
  const query = resolveJapaneseKeyword(rawKeyword);
  const pexelsOrientation = orientation === 'vertical' ? 'portrait' : 'landscape';

  const [photos, pexelsVids, pixabayVids] = await Promise.all([
    searchPexelsPhotos(query, pexelsOrientation, 12),
    searchPexelsVideos(query, pexelsOrientation, 8),
    searchPixabayVideos(query, 6),
  ]);

  return [...photos, ...pexelsVids, ...pixabayVids];
}

/**
 * Calculate duration in frames (30fps) based on narration character count.
 * Min 5 seconds, max 25 seconds.
 */
export function calculateDurationFrames(narration: string): number {
  const charCount = narration.length;
  const seconds = Math.max(5, Math.min(25, charCount / 5));
  return Math.round(seconds * 30);
}

export interface RenderSection {
  heading: string;
  points: string;
  narration: string;
  type: string;
  durationFrames: number;
  bgImageUrl: string;
  visual_type: string;
}

/**
 * Build section data with background images, duration, and visual_type for
 * Remotion rendering. Matches n8n WF4b's "レンダリングデータ構築" code node.
 *
 * `visual_type` comes from WF1 and controls per-section layout on the Remotion
 * side (avatar vs. scenery vs. closeup vs. split).
 */
export async function buildRenderSections(
  sections: {
    heading: string;
    points: string;
    narration: string;
    type: string;
    backgroundKeyword: string;
    imageUrl?: string | null;
    visualType?: string;
  }[],
  orientation: string = 'horizontal'
): Promise<RenderSection[]> {
  const results: RenderSection[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Use custom image if set, otherwise fall back to Pexels search (WF4 Japan-aware)
    const bgImageUrl = section.imageUrl || await fetchBackgroundImage(section.backgroundKeyword, orientation, i);
    const durationFrames = calculateDurationFrames(section.narration);

    results.push({
      heading: section.heading,
      points: section.points,
      narration: section.narration,
      type: section.type || 'general',
      durationFrames,
      bgImageUrl,
      visual_type: section.visualType || 'avatar',
    });
  }

  return results;
}

/**
 * Send a render request to the Remotion server.
 * Returns the job ID.
 *
 * Body matches n8n WF4b exactly: `{ videoUrl, title, sections, pattern }`.
 * `orientation` and `theme` are passed alongside for richer client-side control;
 * the VPS endpoint treats them as optional (spec in CLAUDE.md confirms).
 */
export async function startRemotion(
  videoUrl: string,
  title: string,
  sections: RenderSection[],
  pattern: string = 'formal',
  orientation: string = 'horizontal',
  theme: string = 'modern-dark'
): Promise<{ jobId: string; status: string }> {
  if (!REMOTION_RENDER_URL) {
    throw new Error('REMOTION_RENDER_URL not configured');
  }

  const response = await axios.post(
    REMOTION_RENDER_URL,
    { videoUrl, title, sections, pattern, orientation, theme },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 300000, // 5 min timeout
    }
  );

  return {
    jobId: response.data.jobId || '',
    status: response.data.status || 'processing',
  };
}

/**
 * Check Remotion render status.
 */
export async function checkRemotionStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  downloadUrl: string;
  error: string;
}> {
  const baseUrl = REMOTION_RENDER_URL.replace('/render-avatar', '');

  const response = await axios.get(`${baseUrl}/render/${jobId}`);
  const data = response.data;

  const downloadUrl =
    data.status === 'done' ? `${baseUrl}/render/${jobId}/download` : '';

  return {
    status: data.status || 'unknown',
    progress: data.progress || 0,
    downloadUrl,
    error: data.error || '',
  };
}
