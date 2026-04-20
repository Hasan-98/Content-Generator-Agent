import client from './client';
import type { Article, ArticleSection, ArticleImage, UploadMeta } from '../types';

export async function getArticle(id: string): Promise<Article> {
  const res = await client.get(`/articles/${id}`);
  return res.data;
}

export async function updateArticle(id: string, data: { status?: string }): Promise<Article> {
  const res = await client.patch(`/articles/${id}`, data);
  return res.data;
}

export async function updateSection(
  articleId: string,
  index: number,
  data: { heading?: string; content?: string }
): Promise<ArticleSection> {
  const res = await client.patch(`/articles/${articleId}/sections/${index}`, data);
  return res.data;
}

export async function updateImage(
  articleId: string,
  index: number,
  data: { enabled?: boolean; taste?: string; prompt?: string; imageUrl?: string; textInside?: boolean }
): Promise<ArticleImage> {
  const res = await client.patch(`/articles/${articleId}/images/${index}`, data);
  return res.data;
}

export async function selectHistoryImage(
  articleId: string,
  index: number,
  historyId: string
): Promise<ArticleImage> {
  const res = await client.post(`/articles/${articleId}/images/${index}/select-history`, { historyId });
  return res.data;
}

export async function upsertUploadMeta(
  articleId: string,
  data: {
    slug?: string;
    excerpt?: string;
    tags?: string;
    category?: string;
    publishStatus?: string;
    scheduleDate?: string;
  }
): Promise<UploadMeta> {
  const res = await client.put(`/articles/${articleId}/upload-meta`, data);
  return res.data;
}
