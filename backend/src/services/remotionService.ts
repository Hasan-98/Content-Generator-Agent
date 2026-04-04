import axios from 'axios';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const REMOTION_RENDER_URL = process.env.REMOTION_RENDER_URL || '';

/**
 * Fetch a landscape background image from Pexels for a given keyword.
 */
export async function fetchBackgroundImage(keyword: string, orientation: string = 'horizontal'): Promise<string> {
  if (!PEXELS_API_KEY) return '';

  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query: keyword || 'japanese nature',
        orientation: orientation === 'vertical' ? 'portrait' : 'landscape',
        per_page: 1,
      },
      headers: { Authorization: PEXELS_API_KEY },
    });

    const photos = response.data.photos;
    if (photos && photos.length > 0) {
      return photos[0].src.landscape || photos[0].src.large;
    }
  } catch {
    // Silently fail — background image is optional
  }

  return '';
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

/**
 * Build section data with background images and duration for Remotion rendering.
 */
export async function buildRenderSections(
  sections: {
    heading: string;
    points: string;
    narration: string;
    type: string;
    backgroundKeyword: string;
    imageUrl?: string | null;
  }[],
  orientation: string = 'horizontal'
): Promise<
  {
    heading: string;
    points: string;
    narration: string;
    type: string;
    durationFrames: number;
    bgImageUrl: string;
  }[]
> {
  const results = [];

  for (const section of sections) {
    // Use custom image if set, otherwise fall back to Pexels search
    const bgImageUrl = section.imageUrl || await fetchBackgroundImage(section.backgroundKeyword, orientation);
    const durationFrames = calculateDurationFrames(section.narration);

    results.push({
      heading: section.heading,
      points: section.points,
      narration: section.narration,
      type: section.type,
      durationFrames,
      bgImageUrl,
    });
  }

  return results;
}

/**
 * Send a render request to the Remotion server.
 * Returns the job ID.
 */
export async function startRemotion(
  videoUrl: string,
  title: string,
  sections: {
    heading: string;
    points: string;
    narration: string;
    type: string;
    durationFrames: number;
    bgImageUrl: string;
  }[],
  theme: string = 'modern-dark',
  orientation: string = 'horizontal'
): Promise<{ jobId: string; status: string }> {
  if (!REMOTION_RENDER_URL) {
    throw new Error('REMOTION_RENDER_URL not configured');
  }

  const response = await axios.post(
    REMOTION_RENDER_URL,
    { videoUrl, title, sections, theme, orientation },
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
