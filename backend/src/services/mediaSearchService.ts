import axios from 'axios';

export type PhotoProvider = 'pexels' | 'unsplash';

export interface MediaPhoto {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  provider: PhotoProvider;
}

export interface MediaVideo {
  id: string;
  thumbUrl: string;
  videoUrl: string;
  mimeType?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  provider: 'pexels';
}

interface PhotoSearchOpts {
  query: string;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  apiKey: string;
}

interface VideoSearchOpts {
  query: string;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  apiKey: string;
}

// ───── Pexels Photos ─────────────────────────────────────────

interface PexelsPhotoResp {
  total_results: number;
  page: number;
  per_page: number;
  photos: Array<{
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    src: { medium: string; large2x: string; original: string; landscape: string; portrait: string };
  }>;
}

export async function searchPexelsPhotos(opts: PhotoSearchOpts): Promise<{ items: MediaPhoto[]; page: number; totalHits?: number }> {
  const params: Record<string, string | number> = {
    query: opts.query,
    page: opts.page ?? 1,
    per_page: opts.perPage ?? 20,
  };
  if (opts.orientation && opts.orientation !== 'square') params.orientation = opts.orientation;

  const { data } = await axios.get<PexelsPhotoResp>('https://api.pexels.com/v1/search', {
    params,
    headers: { Authorization: opts.apiKey },
    timeout: 15000,
  });

  return {
    items: (data.photos ?? []).map((p) => ({
      id: String(p.id),
      thumbUrl: p.src.medium,
      fullUrl: p.src.large2x ?? p.src.original,
      width: p.width,
      height: p.height,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      sourceUrl: p.url,
      provider: 'pexels' as const,
    })),
    page: data.page,
    totalHits: data.total_results,
  };
}

// ───── Unsplash Photos ────────────────────────────────────────

interface UnsplashResp {
  total: number;
  total_pages: number;
  results: Array<{
    id: string;
    width: number;
    height: number;
    urls: { small: string; regular: string; full: string };
    user: { name: string; links: { html: string } };
    links: { html: string };
  }>;
}

export async function searchUnsplashPhotos(opts: PhotoSearchOpts): Promise<{ items: MediaPhoto[]; page: number; totalHits?: number }> {
  const params: Record<string, string | number> = {
    query: opts.query,
    page: opts.page ?? 1,
    per_page: opts.perPage ?? 20,
  };
  if (opts.orientation === 'landscape') params.orientation = 'landscape';
  else if (opts.orientation === 'portrait') params.orientation = 'portrait';
  else if (opts.orientation === 'square') params.orientation = 'squarish';

  const { data } = await axios.get<UnsplashResp>('https://api.unsplash.com/search/photos', {
    params,
    headers: { Authorization: `Client-ID ${opts.apiKey}` },
    timeout: 15000,
  });

  return {
    items: (data.results ?? []).map((p) => ({
      id: p.id,
      thumbUrl: p.urls.small,
      fullUrl: p.urls.regular,
      width: p.width,
      height: p.height,
      photographer: p.user.name,
      photographerUrl: p.user.links.html,
      sourceUrl: p.links.html,
      provider: 'unsplash' as const,
    })),
    page: opts.page ?? 1,
    totalHits: data.total,
  };
}

// ───── Pexels Videos ─────────────────────────────────────────

interface PexelsVideoResp {
  page: number;
  per_page: number;
  total_results: number;
  videos: Array<{
    id: number;
    width: number;
    height: number;
    duration: number;
    image: string;
    url: string;
    user: { name: string; url: string };
    video_files: Array<{
      id: number;
      quality: string;
      file_type: string;
      width: number | null;
      height: number | null;
      link: string;
    }>;
  }>;
}

export async function searchPexelsVideos(opts: VideoSearchOpts): Promise<{ items: MediaVideo[]; page: number; totalHits?: number }> {
  const params: Record<string, string | number> = {
    query: opts.query,
    page: opts.page ?? 1,
    per_page: opts.perPage ?? 15,
  };
  if (opts.orientation && opts.orientation !== 'square') params.orientation = opts.orientation;

  const { data } = await axios.get<PexelsVideoResp>('https://api.pexels.com/videos/search', {
    params,
    headers: { Authorization: opts.apiKey },
    timeout: 15000,
  });

  return {
    items: (data.videos ?? []).map((v) => {
      const file = pickPreferredVideoFile(v.video_files);
      return {
        id: String(v.id),
        thumbUrl: v.image,
        videoUrl: file?.link ?? '',
        mimeType: file?.file_type,
        durationSec: v.duration,
        width: v.width,
        height: v.height,
        photographer: v.user?.name,
        photographerUrl: v.user?.url,
        sourceUrl: v.url,
        provider: 'pexels' as const,
      };
    }).filter((v) => v.videoUrl),
    page: data.page,
    totalHits: data.total_results,
  };
}

function pickPreferredVideoFile<T extends { quality: string; file_type: string }>(files: T[]): T | undefined {
  if (!files || files.length === 0) return undefined;
  const mp4s = files.filter((f) => f.file_type === 'video/mp4');
  const pool = mp4s.length > 0 ? mp4s : files;
  const score = (q: string) => (q === 'hd' ? 3 : q === 'sd' ? 2 : q === 'uhd' ? 1 : 0);
  return [...pool].sort((a, b) => score(b.quality) - score(a.quality))[0];
}
