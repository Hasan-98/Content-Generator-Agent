import client from './client';
import type { GeneratedResult, Article, ArticleSection, ArticleImage } from '../types';

export async function generateResults(keywordId: string, signal?: AbortSignal): Promise<GeneratedResult[]> {
  const res = await client.post('/generate', { keywordId }, { signal });
  return res.data;
}

export async function generatePersona(resultId: string): Promise<GeneratedResult> {
  const res = await client.post('/generate/persona', { resultId });
  return res.data;
}

export async function regenerateField(
  resultId: string,
  fieldKey: string,
  instruction?: string
): Promise<GeneratedResult> {
  const res = await client.post('/generate/persona-field', { resultId, fieldKey, instruction });
  return res.data;
}

export async function generateArticle(resultId: string): Promise<Article> {
  const res = await client.post('/generate/article', { resultId });
  return res.data;
}

export async function regenerateSection(
  articleId: string,
  sectionIndex: number,
  instruction?: string
): Promise<ArticleSection> {
  const res = await client.post('/generate/article-section', { articleId, sectionIndex, instruction });
  return res.data;
}

export async function regenerateSectionHeading(
  articleId: string,
  sectionIndex: number,
): Promise<ArticleSection> {
  const res = await client.post('/generate/article-section-heading', { articleId, sectionIndex });
  return res.data;
}

export async function generateImage(
  articleId: string,
  imageIndex: number
): Promise<ArticleImage> {
  const res = await client.post('/generate/image', { articleId, imageIndex });
  return res.data;
}

export async function generateImagesBulk(articleId: string): Promise<ArticleImage[]> {
  const res = await client.post('/generate/images-bulk', { articleId });
  return res.data;
}

export async function formatArticle(articleId: string): Promise<{
  formatted: { title: string; body_html: string; tags: string; excerpt: string };
  uploadMeta: import('../types').UploadMeta;
}> {
  const res = await client.post('/generate/format-article', { articleId });
  return res.data;
}
