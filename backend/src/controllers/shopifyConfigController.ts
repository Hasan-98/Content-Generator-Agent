import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/crypto';

const prisma = new PrismaClient();

async function verifyOwnership(topLevelId: string, userId: string): Promise<boolean> {
  const tl = await prisma.topLevel.findUnique({ where: { id: topLevelId } });
  return !!tl && tl.userId === userId;
}

// GET /api/shopify-config/:topLevelId
export async function getShopifyConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const config = await prisma.shopifyConfig.findUnique({ where: { topLevelId } });

  if (!config) {
    res.json(null);
    return;
  }

  res.json({
    id: config.id,
    shopDomain: config.shopDomain,
    blogId: config.blogId,
    accessTokenSet: true,
    topLevelId: config.topLevelId,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

// PUT /api/shopify-config/:topLevelId
export async function upsertShopifyConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;
  const { shopDomain, accessToken, blogId } = req.body;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  if (!shopDomain) {
    res.status(400).json({ error: 'shopDomain is required' });
    return;
  }

  const existing = await prisma.shopifyConfig.findUnique({ where: { topLevelId } });

  const data = {
    shopDomain: shopDomain.replace(/\/+$/, ''),
    ...(blogId !== undefined && { blogId }),
    ...(accessToken ? { accessTokenEncrypted: encrypt(accessToken) } : {}),
  };

  if (existing) {
    if (!accessToken && !existing.accessTokenEncrypted) {
      res.status(400).json({ error: 'accessToken is required for first setup' });
      return;
    }
    const config = await prisma.shopifyConfig.update({ where: { topLevelId }, data });
    res.json({ id: config.id, shopDomain: config.shopDomain, blogId: config.blogId, accessTokenSet: true, topLevelId });
  } else {
    if (!accessToken) {
      res.status(400).json({ error: 'accessToken is required for first setup' });
      return;
    }
    const config = await prisma.shopifyConfig.create({
      data: { topLevelId, shopDomain: data.shopDomain, blogId: blogId || '', accessTokenEncrypted: encrypt(accessToken) },
    });
    res.status(201).json({ id: config.id, shopDomain: config.shopDomain, blogId: config.blogId, accessTokenSet: true, topLevelId });
  }
}

// DELETE /api/shopify-config/:topLevelId
export async function deleteShopifyConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const existing = await prisma.shopifyConfig.findUnique({ where: { topLevelId } });
  if (!existing) {
    res.status(404).json({ error: 'No Shopify config found' });
    return;
  }

  await prisma.shopifyConfig.delete({ where: { topLevelId } });
  res.json({ success: true });
}

// POST /api/shopify-config/:topLevelId/test
export async function testShopifyConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const config = await prisma.shopifyConfig.findUnique({ where: { topLevelId } });
  if (!config) {
    res.status(400).json({ error: 'Shopify config not set up yet' });
    return;
  }

  try {
    const token = decrypt(config.accessTokenEncrypted);
    const axios = (await import('axios')).default;
    const response = await axios.get(`https://${config.shopDomain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': token },
      timeout: 10000,
    });

    res.json({
      success: true,
      shopName: response.data?.shop?.name || 'Connected',
      shopDomain: config.shopDomain,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    res.status(400).json({ success: false, error: message });
  }
}
