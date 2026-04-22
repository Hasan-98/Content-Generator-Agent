import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { publishToWordpress, updateWordpressThumbnail } from '../services/wordpressService';
import { publishToShopify } from '../services/shopifyService';
import { decrypt } from '../services/crypto';

const prisma = new PrismaClient();

function buildHtml(
  _title: string,
  sections: { heading: string; content: string }[],
  images: { index: number; imageUrl: string | null; enabled: boolean }[]
): string {
  const imageMap = new Map(images.filter(i => i.enabled && i.imageUrl).map(i => [i.index, i.imageUrl]));

  // Don't include <h1> — WordPress uses the title field as the post heading
  let html = '';
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

    // Use the first enabled image as the featured thumbnail
    const firstImage = article.images.find(img => img.enabled && img.imageUrl);
    const featuredImageUrl = firstImage?.imageUrl || undefined;
    console.log(`[publish] Featured image: index=${firstImage?.index}, url=${featuredImageUrl?.slice(0, 100) || 'NONE'}`);

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
        featuredImageUrl,
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

// POST /api/publish/fix-thumbnail — update thumbnail for an already-published article
export async function fixThumbnail(req: AuthRequest, res: Response): Promise<void> {
  const { articleId } = req.body;
  if (!articleId) {
    res.status(400).json({ error: 'articleId is required' });
    return;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      result: { include: { keyword: { include: { topLevel: true } } } },
      images: { orderBy: { index: 'asc' } },
      uploadMeta: true,
    },
  });

  if (!article || article.result.keyword.topLevel.userId !== req.user!.id) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  if (article.platform !== 'wordpress') {
    res.status(400).json({ error: 'Only WordPress articles can be updated' });
    return;
  }

  const firstImage = article.images.find(img => img.enabled && img.imageUrl);
  if (!firstImage?.imageUrl) {
    res.status(400).json({ error: 'No enabled image with URL found' });
    return;
  }

  const slug = article.uploadMeta?.slug;
  if (!slug) {
    res.status(400).json({ error: 'Article has no slug in upload meta' });
    return;
  }

  // Load per-topic WP credentials
  const topLevelId = article.result.keyword.topLevelId;
  const wpConfig = await prisma.wordpressConfig.findUnique({ where: { topLevelId } });

  let credentials;
  if (wpConfig) {
    credentials = {
      wpUrl: wpConfig.wpUrl,
      wpUser: decrypt(wpConfig.wpUserEncrypted),
      wpPassword: decrypt(wpConfig.wpPassEncrypted),
    };
  }

  console.log(`[publish] Fixing thumbnail for article=${articleId}, slug=${slug}, image=${firstImage.imageUrl.slice(0, 100)}`);
  const result = await updateWordpressThumbnail(slug, firstImage.imageUrl, credentials);

  if (!result.success) {
    res.status(500).json({ error: result.error || 'Failed to update thumbnail' });
    return;
  }

  res.json({ success: true, mediaId: result.mediaId, postId: result.postId });
}

// POST /api/publish/fix-all-thumbnails — batch fix thumbnails for all uploaded WP articles
export async function fixAllThumbnails(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const articles = await prisma.article.findMany({
    where: {
      platform: 'wordpress',
      status: 'UPLOADED',
      result: { keyword: { topLevel: { userId } } },
    },
    include: {
      result: { include: { keyword: { include: { topLevel: true } } } },
      images: { orderBy: { index: 'asc' } },
      uploadMeta: true,
    },
  });

  const results: { articleId: string; slug: string; success: boolean; error?: string }[] = [];

  for (const article of articles) {
    const firstImage = article.images.find(img => img.enabled && img.imageUrl);
    const slug = article.uploadMeta?.slug;

    if (!firstImage?.imageUrl || !slug) {
      results.push({ articleId: article.id, slug: slug || '?', success: false, error: 'No image or slug' });
      continue;
    }

    const topLevelId = article.result.keyword.topLevelId;
    const wpConfig = await prisma.wordpressConfig.findUnique({ where: { topLevelId } });

    let credentials;
    if (wpConfig) {
      credentials = {
        wpUrl: wpConfig.wpUrl,
        wpUser: decrypt(wpConfig.wpUserEncrypted),
        wpPassword: decrypt(wpConfig.wpPassEncrypted),
      };
    }

    console.log(`[publish] Fixing thumbnail: slug=${slug}`);
    const r = await updateWordpressThumbnail(slug, firstImage.imageUrl, credentials);
    results.push({ articleId: article.id, slug, success: r.success, error: r.error });
  }

  const fixed = results.filter(r => r.success).length;
  res.json({ total: articles.length, fixed, failed: articles.length - fixed, results });
}
