import client from './client';

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '');

/** Convert backend-relative URLs (e.g. `/uploads/media/abc.png`) into absolute URLs the frontend can fetch. */
export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url}`;
}

// ───── Types (mirrored from backend mediaSearchService.ts) ─────

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

export type AiImageModel =
  | 'kie-nano-banana'
  | 'kie-nano-banana-pro'
  | 'openai-gpt-image-1'
  | 'openai-gpt-image-2';

export interface ReferenceImage {
  src: string; // data URL or https URL
}

export interface GeneratedImageResult {
  url: string;
  isDataUrl: boolean;
  meta?: Record<string, unknown>;
}

export interface MediaLibraryItem {
  id: string;
  folder: string;
  kind: 'IMAGE' | 'VIDEO';
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  source: string;
  sourceUrl: string | null;
  createdAt: string;
  /** Public URL served by backend `/uploads/media/<filename>` */
  url: string;
}

export interface PhotoSearchResult {
  items: MediaPhoto[];
  page: number;
  totalHits?: number;
}

export interface VideoSearchResult {
  items: MediaVideo[];
  page: number;
  totalHits?: number;
}

// ───── Calls ─────

export async function searchPhotos(opts: {
  q: string;
  provider?: PhotoProvider;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}): Promise<PhotoSearchResult> {
  const res = await client.get('/media/search/photos', { params: opts });
  return res.data;
}

export async function searchVideos(opts: {
  q: string;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}): Promise<VideoSearchResult> {
  const res = await client.get('/media/search/videos', { params: opts });
  return res.data;
}

export async function generateImage(opts: {
  model: AiImageModel;
  prompt: string;
  size?: string;
  n?: number;
  referenceImages?: ReferenceImage[];
  saveToLibrary?: boolean;
  folder?: string;
}): Promise<{ results: GeneratedImageResult[]; saved?: Array<{ url: string; libraryId: string | null; originalGenerated: string }> }> {
  const res = await client.post('/media/generate/image', opts);
  return res.data;
}

export async function listLibrary(folder?: string): Promise<{ items: MediaLibraryItem[]; folders: { name: string; count: number }[] }> {
  const res = await client.get('/media/library', { params: folder !== undefined ? { folder } : {} });
  return res.data;
}

export async function uploadLibrary(file: File, folder?: string): Promise<MediaLibraryItem> {
  const fd = new FormData();
  fd.append('file', file);
  if (folder !== undefined) fd.append('folder', folder);
  const res = await client.post('/media/library', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function importFromUrl(url: string, folder?: string, originalName?: string): Promise<MediaLibraryItem> {
  const res = await client.post('/media/library/from-url', { url, folder, originalName });
  return res.data;
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await client.delete(`/media/library/${id}`);
}
