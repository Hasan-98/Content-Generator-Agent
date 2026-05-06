import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Response } from 'express';
import { PrismaClient, MediaKind } from '@prisma/client';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';
import { getUserApiKey } from './apiConfigController';
import {
  searchPexelsPhotos,
  searchUnsplashPhotos,
  searchPexelsVideos,
  type PhotoProvider,
} from '../services/mediaSearchService';
import { generateAiImage, type AiImageModel, type ReferenceImage } from '../services/imageService';

const prisma = new PrismaClient();

// On-disk media library lives at backend/uploads/media/
const MEDIA_DIR = path.join(__dirname, '..', '..', 'uploads', 'media');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

function publicMediaUrl(filename: string): string {
  // Served via the existing /uploads static mount in server.ts
  return `/uploads/media/${filename}`;
}

// ───── Search ────────────────────────────────────────────────────────────

// GET /api/media/search/photos?q=&provider=pexels|unsplash&page=&perPage=&orientation=
export async function searchPhotos(req: AuthRequest, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    res.status(400).json({ error: 'q (query) is required' });
    return;
  }
  const provider = (String(req.query.provider ?? 'pexels').toLowerCase()) as PhotoProvider;
  const page = Number(req.query.page ?? 1);
  const perPage = Math.min(Number(req.query.perPage ?? 24), 80);
  const orientation = (req.query.orientation as 'landscape' | 'portrait' | 'square' | undefined) || undefined;

  const userId = req.user!.id;
  const apiKey =
    (await getUserApiKey(userId, provider === 'pexels' ? 'pexelsApi' : 'unsplashApi')) ||
    (provider === 'pexels' ? process.env.PEXELS_API_KEY : process.env.UNSPLASH_ACCESS_KEY) ||
    '';
  if (!apiKey) {
    res.status(400).json({ error: `${provider} API key not configured. Set it under Settings → API Keys.` });
    return;
  }

  try {
    const result = provider === 'pexels'
      ? await searchPexelsPhotos({ query, page, perPage, orientation, apiKey })
      : await searchUnsplashPhotos({ query, page, perPage, orientation, apiKey });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

// GET /api/media/search/videos?q=&page=&perPage=&orientation=
export async function searchVideos(req: AuthRequest, res: Response): Promise<void> {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    res.status(400).json({ error: 'q (query) is required' });
    return;
  }
  const page = Number(req.query.page ?? 1);
  const perPage = Math.min(Number(req.query.perPage ?? 16), 60);
  const orientation = (req.query.orientation as 'landscape' | 'portrait' | 'square' | undefined) || undefined;

  const userId = req.user!.id;
  const apiKey = (await getUserApiKey(userId, 'pexelsApi')) || process.env.PEXELS_API_KEY || '';
  if (!apiKey) {
    res.status(400).json({ error: 'Pexels API key not configured (videos use the Pexels key).' });
    return;
  }

  try {
    const result = await searchPexelsVideos({ query, page, perPage, orientation, apiKey });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

// ───── AI image generation ──────────────────────────────────────────────

// POST /api/media/generate/image  body: { model, prompt, size?, n?, referenceImages?: [{ src }], saveToLibrary?, folder? }
export async function generateImage(req: AuthRequest, res: Response): Promise<void> {
  const { model, prompt, size, n, referenceImages, saveToLibrary, folder } = req.body as {
    model: AiImageModel;
    prompt: string;
    size?: string;
    n?: number;
    referenceImages?: ReferenceImage[];
    saveToLibrary?: boolean;
    folder?: string;
  };

  if (!model || !prompt || !prompt.trim()) {
    res.status(400).json({ error: 'model and prompt are required' });
    return;
  }

  const userId = req.user!.id;
  let apiKey: string | null = null;
  if (model.startsWith('openai-')) apiKey = await getUserApiKey(userId, 'openaiApi');
  else if (model.startsWith('kie-')) apiKey = await getUserApiKey(userId, 'kieApi');

  // Env fallback for the existing nano-banana-pro flow
  if (!apiKey && model === 'kie-nano-banana-pro') apiKey = process.env.KIE_AI_API_KEY ?? null;

  if (!apiKey) {
    res.status(400).json({ error: `API key for ${model} is not configured.` });
    return;
  }

  try {
    const results = await generateAiImage({
      model,
      prompt: prompt.trim(),
      size,
      n,
      referenceImages,
      apiKey,
    });

    if (!saveToLibrary) {
      res.json({ results });
      return;
    }

    // Persist generated images to library so the user can re-pick later.
    const saved = [];
    for (const r of results) {
      try {
        const buf = await sourceToBuffer(r.url);
        const item = await persistMediaFile({
          userId,
          buffer: buf,
          ext: 'png',
          mimeType: 'image/png',
          originalName: `ai-${Date.now()}.png`,
          folder: folder || 'AI Generated',
          source: 'ai',
          sourceUrl: r.isDataUrl ? null : r.url,
          kind: MediaKind.IMAGE,
        });
        saved.push({ url: publicMediaUrl(item.filename), libraryId: item.id, originalGenerated: r.url });
      } catch {
        saved.push({ url: r.url, libraryId: null, originalGenerated: r.url });
      }
    }
    res.json({ results, saved });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

// ───── Library: upload / list / delete ───────────────────────────────────

// POST /api/media/library  multipart: file
export async function uploadLibrary(req: AuthRequest, res: Response): Promise<void> {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  const folder = String(req.body?.folder ?? '');
  const kind: MediaKind = file.mimetype.startsWith('video/') ? MediaKind.VIDEO : MediaKind.IMAGE;

  const item = await persistMediaFile({
    userId: req.user!.id,
    buffer: file.buffer,
    ext: extFromName(file.originalname) || extFromMime(file.mimetype) || 'bin',
    mimeType: file.mimetype,
    originalName: file.originalname,
    folder,
    source: 'upload',
    sourceUrl: null,
    kind,
  });

  res.json({ ...itemToDTO(item), url: publicMediaUrl(item.filename) });
}

// POST /api/media/library/from-url  body: { url, folder?, originalName? }
// Downloads a remote URL and stores it as a library item — used when the user picks from search.
export async function importFromUrl(req: AuthRequest, res: Response): Promise<void> {
  const { url, folder, originalName } = req.body as { url?: string; folder?: string; originalName?: string };
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  try {
    const r = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 60000 });
    const mimeType = (r.headers?.['content-type'] as string) ?? 'application/octet-stream';
    const buf = Buffer.from(r.data);
    const kind: MediaKind = mimeType.startsWith('video/') ? MediaKind.VIDEO : MediaKind.IMAGE;
    const item = await persistMediaFile({
      userId: req.user!.id,
      buffer: buf,
      ext: extFromMime(mimeType) || extFromName(url) || 'png',
      mimeType,
      originalName: originalName ?? path.basename(url.split('?')[0]) ?? 'import',
      folder: folder ?? '',
      source: detectSourceFromUrl(url),
      sourceUrl: url,
      kind,
    });
    res.json({ ...itemToDTO(item), url: publicMediaUrl(item.filename) });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

// GET /api/media/library?folder=
export async function listLibrary(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const folder = req.query.folder !== undefined ? String(req.query.folder) : undefined;

  const items = await prisma.mediaLibraryItem.findMany({
    where: { userId, ...(folder !== undefined ? { folder } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Aggregate folder list for sidebar.
  const folders = await prisma.mediaLibraryItem.groupBy({
    by: ['folder'],
    where: { userId },
    _count: { _all: true },
  });

  res.json({
    items: items.map((i) => ({ ...itemToDTO(i), url: publicMediaUrl(i.filename) })),
    folders: folders.map((f) => ({ name: f.folder, count: f._count._all })),
  });
}

// DELETE /api/media/library/:id
export async function deleteLibraryItem(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const item = await prisma.mediaLibraryItem.findUnique({ where: { id } });
  if (!item || item.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    fs.unlinkSync(path.join(MEDIA_DIR, item.filename));
  } catch {
    // file may already be gone; still delete row
  }
  await prisma.mediaLibraryItem.delete({ where: { id } });
  res.json({ success: true });
}

// ───── Helpers ──────────────────────────────────────────────────────────

interface PersistOpts {
  userId: string;
  buffer: Buffer;
  ext: string;
  mimeType: string;
  originalName: string;
  folder: string;
  source: string;
  sourceUrl: string | null;
  kind: MediaKind;
}

async function persistMediaFile(opts: PersistOpts) {
  const id = crypto.randomBytes(8).toString('hex');
  const filename = `${id}.${opts.ext.replace(/^\./, '')}`;
  fs.writeFileSync(path.join(MEDIA_DIR, filename), opts.buffer);

  return prisma.mediaLibraryItem.create({
    data: {
      userId: opts.userId,
      folder: opts.folder,
      kind: opts.kind,
      filename,
      originalName: opts.originalName,
      mimeType: opts.mimeType,
      sizeBytes: opts.buffer.length,
      source: opts.source,
      sourceUrl: opts.sourceUrl,
    },
  });
}

function itemToDTO(i: { id: string; folder: string; kind: MediaKind; filename: string; originalName: string; mimeType: string; sizeBytes: number; width: number | null; height: number | null; durationSec: number | null; source: string; sourceUrl: string | null; createdAt: Date }) {
  return {
    id: i.id,
    folder: i.folder,
    kind: i.kind,
    filename: i.filename,
    originalName: i.originalName,
    mimeType: i.mimeType,
    sizeBytes: i.sizeBytes,
    width: i.width,
    height: i.height,
    durationSec: i.durationSec,
    source: i.source,
    sourceUrl: i.sourceUrl,
    createdAt: i.createdAt,
  };
}

async function sourceToBuffer(src: string): Promise<Buffer> {
  if (src.startsWith('data:')) {
    const idx = src.indexOf('base64,');
    if (idx < 0) throw new Error('Invalid data URL');
    return Buffer.from(src.slice(idx + 7), 'base64');
  }
  const r = await axios.get<ArrayBuffer>(src, { responseType: 'arraybuffer', timeout: 60000 });
  return Buffer.from(r.data);
}

function extFromName(name: string): string {
  const m = name.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : '';
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  return '';
}

function detectSourceFromUrl(url: string): string {
  if (url.includes('pexels.com')) return 'pexels';
  if (url.includes('unsplash.com')) return 'unsplash';
  if (url.includes('kie.ai')) return 'kie';
  return 'remote';
}
