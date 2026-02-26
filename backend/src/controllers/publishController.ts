import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { publishToWordpress } from '../services/wordpressService';
import { publishToShopify } from '../services/shopifyService';

const prisma = new PrismaClient();

function buildHtml(
  title: string,
  sections: { heading: string; content: string }[],
  images: { index: number; imageUrl: string | null; enabled: boolean }[]
): string {
  const imageMap = new Map(images.filter(i => i.enabled && i.imageUrl).map(i => [i.index, i.imageUrl]));

  let html = `<h1>${title}</h1>\n`;
  sections.forEach((s, i) => {
    if (imageMap.has(i)) {
      html += `<img src="${imageMap.get(i)}" alt="${s.heading}" />\n`;
    }
    html += `<h2>${s.heading}</h2>\n<p>${s.content}</p>\n`;
  });
  return html;
}

export async function publish(req: AuthRequest, res: Response): Promise<void> {
  const { articleId, platform } = req.body;
  if (!articleId || !platform) {
    res.status(400).json({ error: 'articleId and platform are required' });
    return;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      result: { include: { keyword: { include: { topLevel: true } } } },
      sections: { orderBy: { index: 'asc' } },
      images: { orderBy: { index: 'asc' } },
      uploadMeta: true,
    },
  });

  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  if (!article.uploadMeta) {
    res.status(400).json({ error: 'Upload meta required before publishing' });
    return;
  }

  const htmlContent = buildHtml(article.result.title, article.sections, article.images);
  let postUrl: string | null = null;

  if (platform === 'wordpress') {
    const wpStatus =
      article.uploadMeta.publishStatus === 'PUBLISH' ? 'publish'
      : article.uploadMeta.publishStatus === 'SCHEDULE' ? 'future'
      : 'draft';

    postUrl = await publishToWordpress({
      title: article.result.title,
      content: htmlContent,
      slug: article.uploadMeta.slug,
      excerpt: article.uploadMeta.excerpt,
      tags: article.uploadMeta.tags,
      category: article.uploadMeta.category,
      publishStatus: wpStatus,
      scheduleDate: article.uploadMeta.scheduleDate?.toISOString(),
    });
  } else if (platform === 'shopify') {
    const shopifyStatus =
      article.uploadMeta.publishStatus === 'PUBLISH' ? 'published' : 'draft';

    postUrl = await publishToShopify({
      title: article.result.title,
      content: htmlContent,
      tags: article.uploadMeta.tags,
      publishStatus: shopifyStatus,
      scheduleDate: article.uploadMeta.scheduleDate?.toISOString(),
    });
  } else {
    res.status(400).json({ error: 'Invalid platform. Use wordpress or shopify' });
    return;
  }

  // Update article and result status
  await prisma.article.update({
    where: { id: articleId },
    data: { status: 'UPLOADED', platform, uploadedAt: new Date() },
  });
  await prisma.generatedResult.update({
    where: { id: article.resultId },
    data: { status: 'PUBLISHED' },
  });

  res.json({ success: true, postUrl });
}
