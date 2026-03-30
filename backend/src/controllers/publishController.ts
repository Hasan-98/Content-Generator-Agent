import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { publishToWordpress } from '../services/wordpressService';
import { publishToShopify } from '../services/shopifyService';
import { decrypt } from '../services/crypto';

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

  // Use AI-formatted HTML if available, otherwise fall back to simple buildHtml
  const htmlContent = article.uploadMeta.formattedHtml
    || buildHtml(article.result.title, article.sections, article.images);
  const publishTitle = article.uploadMeta.aiTitle || article.result.title;
  let postUrl: string | null = null;

  if (platform === 'wordpress') {
    // Load per-topic WordPress credentials
    const topLevelId = article.result.keyword.topLevelId;
    const wpConfig = await prisma.wordpressConfig.findUnique({
      where: { topLevelId },
    });

    let credentials;
    if (wpConfig) {
      credentials = {
        wpUrl: wpConfig.wpUrl,
        wpUser: decrypt(wpConfig.wpUserEncrypted),
        wpPassword: decrypt(wpConfig.wpPassEncrypted),
      };
    }
    // Falls back to env vars if no per-user config exists

    const wpStatus =
      article.uploadMeta.publishStatus === 'PUBLISH' ? 'publish'
      : article.uploadMeta.publishStatus === 'SCHEDULE' ? 'future'
      : 'draft';

    postUrl = await publishToWordpress(
      {
        title: publishTitle,
        content: htmlContent,
        slug: article.uploadMeta.slug,
        excerpt: article.uploadMeta.excerpt,
        tags: article.uploadMeta.tags,
        category: article.uploadMeta.category,
        publishStatus: wpStatus,
        scheduleDate: article.uploadMeta.scheduleDate?.toISOString(),
      },
      credentials
    );
  } else if (platform === 'shopify') {
    const shopifyStatus =
      article.uploadMeta.publishStatus === 'PUBLISH' ? 'published' : 'draft';

    postUrl = await publishToShopify({
      title: publishTitle,
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
    data: { status: 'UPLOADED', platform, publishedUrl: postUrl, uploadedAt: new Date() },
  });
  await prisma.generatedResult.update({
    where: { id: article.resultId },
    data: { status: 'PUBLISHED' },
  });

  res.json({ success: true, postUrl });
}
