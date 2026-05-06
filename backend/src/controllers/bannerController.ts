import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Response } from 'express';
import { PrismaClient, MediaKind } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { renderImage } from '../services/banner/render-helper';
import { buildBannerTemplate, type BannerInputs } from '../services/banner/build-banner-template';
import { getSize, BANNER_SIZES, type BannerSize } from '../services/banner/sizes';

const prisma = new PrismaClient();

const RENDER_OUT_DIR = path.join(__dirname, '..', '..', 'uploads', 'media');
if (!fs.existsSync(RENDER_OUT_DIR)) fs.mkdirSync(RENDER_OUT_DIR, { recursive: true });

// ───── Render ──────────────────────────────────────────────────────────────

// POST /api/banner/render
// body: { sizeId, inputs: BannerInputs, fontSelections?, format?, quality?, saveToLibrary?, folder? }
export async function renderBanner(req: AuthRequest, res: Response): Promise<void> {
  const {
    sizeId,
    inputs,
    format,
    quality,
    saveToLibrary,
    folder,
  } = req.body as {
    sizeId: string;
    inputs: BannerInputs;
    format?: 'png' | 'jpeg';
    quality?: number;
    saveToLibrary?: boolean;
    folder?: string;
  };

  if (!sizeId || !inputs) {
    res.status(400).json({ error: 'sizeId and inputs are required' });
    return;
  }

  let size: BannerSize;
  try {
    size = getSize(sizeId);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    return;
  }

  const id = crypto.randomBytes(8).toString('hex');
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const filename = `banner-${id}.${ext}`;
  const outputPath = path.join(RENDER_OUT_DIR, filename);

  try {
    const template = buildBannerTemplate(size, inputs);
    const result = await renderImage({
      template,
      inputs: {},
      outputPath,
      format: format ?? 'png',
      quality: quality ?? 95,
      onUnresolved: 'warn',
    });

    if (!result.success) {
      res.status(500).json({ error: result.error ?? 'render failed' });
      return;
    }

    const fileUrl = `/uploads/media/${filename}`;
    const dto: { url: string; libraryId?: string; durationMs: number; fileSize?: number } = {
      url: fileUrl,
      durationMs: result.durationMs,
      fileSize: result.fileSize,
    };

    if (saveToLibrary) {
      const stat = fs.statSync(outputPath);
      const item = await prisma.mediaLibraryItem.create({
        data: {
          userId: req.user!.id,
          folder: folder || 'Banners',
          kind: MediaKind.IMAGE,
          filename,
          originalName: `banner-${size.id}-${Date.now()}.${ext}`,
          mimeType: ext === 'jpg' ? 'image/jpeg' : 'image/png',
          sizeBytes: stat.size,
          width: size.width,
          height: size.height,
          source: 'banner',
        },
      });
      dto.libraryId = item.id;
    }

    res.json(dto);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

// GET /api/banner/sizes
export async function listSizes(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ sizes: BANNER_SIZES });
}

// ───── BannerProject CRUD ─────────────────────────────────────────────────

// GET /api/banner/projects
export async function listProjects(req: AuthRequest, res: Response): Promise<void> {
  const items = await prisma.bannerProject.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  res.json(items);
}

// POST /api/banner/projects   body: { name, sizeId, data, thumbUrl? }
export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  const { name, sizeId, data, thumbUrl } = req.body as { name: string; sizeId: string; data: unknown; thumbUrl?: string };
  if (!name || !sizeId || data === undefined) {
    res.status(400).json({ error: 'name, sizeId, data are required' });
    return;
  }
  const item = await prisma.bannerProject.create({
    data: { userId: req.user!.id, name, sizeId, data: data as object, thumbUrl: thumbUrl ?? null },
  });
  res.json(item);
}

// PATCH /api/banner/projects/:id  body: { name?, sizeId?, data?, thumbUrl? }
export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.bannerProject.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { name, sizeId, data, thumbUrl } = req.body as { name?: string; sizeId?: string; data?: unknown; thumbUrl?: string };
  const item = await prisma.bannerProject.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(sizeId !== undefined && { sizeId }),
      ...(data !== undefined && { data: data as object }),
      ...(thumbUrl !== undefined && { thumbUrl }),
    },
  });
  res.json(item);
}

// DELETE /api/banner/projects/:id
export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.bannerProject.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await prisma.bannerProject.delete({ where: { id } });
  res.json({ success: true });
}

// ───── ColorTheme CRUD ────────────────────────────────────────────────────

export async function listColorThemes(req: AuthRequest, res: Response): Promise<void> {
  const items = await prisma.colorTheme.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(items);
}

export async function createColorTheme(req: AuthRequest, res: Response): Promise<void> {
  const { label, colors } = req.body as { label: string; colors: unknown };
  if (!label || colors === undefined) {
    res.status(400).json({ error: 'label and colors required' });
    return;
  }
  const item = await prisma.colorTheme.create({
    data: { userId: req.user!.id, label, colors: colors as object },
  });
  res.json(item);
}

export async function updateColorTheme(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.colorTheme.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { label, colors } = req.body as { label?: string; colors?: unknown };
  const item = await prisma.colorTheme.update({
    where: { id },
    data: { ...(label !== undefined && { label }), ...(colors !== undefined && { colors: colors as object }) },
  });
  res.json(item);
}

export async function deleteColorTheme(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.colorTheme.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await prisma.colorTheme.delete({ where: { id } });
  res.json({ success: true });
}

// ───── TextTemplate CRUD ──────────────────────────────────────────────────

export async function listTextTemplates(req: AuthRequest, res: Response): Promise<void> {
  const items = await prisma.textTemplate.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(items);
}

export async function createTextTemplate(req: AuthRequest, res: Response): Promise<void> {
  const { label, styles } = req.body as { label: string; styles: unknown };
  if (!label || styles === undefined) {
    res.status(400).json({ error: 'label and styles required' });
    return;
  }
  const item = await prisma.textTemplate.create({
    data: { userId: req.user!.id, label, styles: styles as object },
  });
  res.json(item);
}

export async function updateTextTemplate(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.textTemplate.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { label, styles } = req.body as { label?: string; styles?: unknown };
  const item = await prisma.textTemplate.update({
    where: { id },
    data: { ...(label !== undefined && { label }), ...(styles !== undefined && { styles: styles as object }) },
  });
  res.json(item);
}

export async function deleteTextTemplate(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.textTemplate.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await prisma.textTemplate.delete({ where: { id } });
  res.json({ success: true });
}

// ───── CustomFont CRUD ────────────────────────────────────────────────────

const FONTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'fonts');
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

export async function listCustomFonts(req: AuthRequest, res: Response): Promise<void> {
  const items = await prisma.customFont.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items.map((f) => ({ ...f, url: `/uploads/fonts/${f.filename}` })));
}

export async function uploadCustomFont(req: AuthRequest, res: Response): Promise<void> {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  const family = String(req.body?.family ?? path.parse(file.originalname).name);
  const weight = req.body?.weight ? Number(req.body.weight) : 400;
  const style = String(req.body?.style ?? 'normal');

  const id = crypto.randomBytes(8).toString('hex');
  const ext = (path.extname(file.originalname) || '.woff2').replace(/^\./, '');
  const filename = `${id}.${ext}`;
  fs.writeFileSync(path.join(FONTS_DIR, filename), file.buffer);

  const item = await prisma.customFont.create({
    data: {
      userId: req.user!.id,
      family,
      filename,
      mimeType: file.mimetype,
      weight,
      style,
    },
  });
  res.json({ ...item, url: `/uploads/fonts/${filename}` });
}

export async function deleteCustomFont(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const existing = await prisma.customFont.findUnique({ where: { id } });
  if (!existing || existing.userId !== req.user!.id) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    fs.unlinkSync(path.join(FONTS_DIR, existing.filename));
  } catch { /* file may already be gone */ }
  await prisma.customFont.delete({ where: { id } });
  res.json({ success: true });
}
