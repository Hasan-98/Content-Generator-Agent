import client from './client';
import type { BannerInputs } from '../lib/bannerEditor/build-banner-template';
import type { BannerSize } from '../lib/bannerEditor/sizes';

// ───── Types ─────

export interface RenderResult {
  url: string;
  libraryId?: string;
  durationMs: number;
  fileSize?: number;
}

export interface BannerProject {
  id: string;
  userId: string;
  name: string;
  sizeId: string;
  data: unknown;
  thumbUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColorThemeRecord {
  id: string;
  userId: string;
  label: string;
  colors: unknown;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TextTemplateRecord {
  id: string;
  userId: string;
  label: string;
  styles: unknown;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFontRecord {
  id: string;
  userId: string;
  family: string;
  filename: string;
  mimeType: string;
  weight: number;
  style: string;
  createdAt: string;
  /** Resolved relative URL: `/uploads/fonts/<filename>`. Pass through resolveMediaUrl(). */
  url: string;
}

// ───── Render ─────

export async function renderBanner(opts: {
  sizeId: string;
  inputs: Partial<BannerInputs>;
  format?: 'png' | 'jpeg';
  quality?: number;
  saveToLibrary?: boolean;
  folder?: string;
}): Promise<RenderResult> {
  const res = await client.post('/banner/render', opts);
  return res.data;
}

export async function listSizes(): Promise<{ sizes: BannerSize[] }> {
  const res = await client.get('/banner/sizes');
  return res.data;
}

// ───── Projects ─────

export async function listProjects(): Promise<BannerProject[]> {
  const res = await client.get('/banner/projects');
  return res.data;
}

export async function createProject(opts: {
  name: string;
  sizeId: string;
  data: unknown;
  thumbUrl?: string;
}): Promise<BannerProject> {
  const res = await client.post('/banner/projects', opts);
  return res.data;
}

export async function updateProject(
  id: string,
  patch: { name?: string; sizeId?: string; data?: unknown; thumbUrl?: string },
): Promise<BannerProject> {
  const res = await client.patch(`/banner/projects/${id}`, patch);
  return res.data;
}

export async function deleteProject(id: string): Promise<void> {
  await client.delete(`/banner/projects/${id}`);
}

// ───── Color themes ─────

export async function listColorThemes(): Promise<ColorThemeRecord[]> {
  const res = await client.get('/banner/themes');
  return res.data;
}

export async function createColorTheme(opts: { label: string; colors: unknown }): Promise<ColorThemeRecord> {
  const res = await client.post('/banner/themes', opts);
  return res.data;
}

export async function updateColorTheme(
  id: string,
  patch: { label?: string; colors?: unknown },
): Promise<ColorThemeRecord> {
  const res = await client.patch(`/banner/themes/${id}`, patch);
  return res.data;
}

export async function deleteColorTheme(id: string): Promise<void> {
  await client.delete(`/banner/themes/${id}`);
}

// ───── Text templates ─────

export async function listTextTemplates(): Promise<TextTemplateRecord[]> {
  const res = await client.get('/banner/text-templates');
  return res.data;
}

export async function createTextTemplate(opts: { label: string; styles: unknown }): Promise<TextTemplateRecord> {
  const res = await client.post('/banner/text-templates', opts);
  return res.data;
}

export async function updateTextTemplate(
  id: string,
  patch: { label?: string; styles?: unknown },
): Promise<TextTemplateRecord> {
  const res = await client.patch(`/banner/text-templates/${id}`, patch);
  return res.data;
}

export async function deleteTextTemplate(id: string): Promise<void> {
  await client.delete(`/banner/text-templates/${id}`);
}

// ───── Custom fonts ─────

export async function listCustomFonts(): Promise<CustomFontRecord[]> {
  const res = await client.get('/banner/fonts');
  return res.data;
}

export async function uploadCustomFont(
  file: File,
  family: string,
  weight = 400,
  style = 'normal',
): Promise<CustomFontRecord> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('family', family);
  fd.append('weight', String(weight));
  fd.append('style', style);
  const res = await client.post('/banner/fonts', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteCustomFont(id: string): Promise<void> {
  await client.delete(`/banner/fonts/${id}`);
}
