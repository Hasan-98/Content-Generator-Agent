import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/crypto';

const prisma = new PrismaClient();

// Verify user owns the topLevel
async function verifyOwnership(topLevelId: string, userId: string): Promise<boolean> {
  const tl = await prisma.topLevel.findUnique({ where: { id: topLevelId } });
  return !!tl && tl.userId === userId;
}

// GET /api/wp-config/:topLevelId — get WordPress config for a topic
export async function getWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const config = await prisma.wordpressConfig.findUnique({
    where: { topLevelId },
  });

  if (!config) {
    res.json(null);
    return;
  }

  res.json({
    id: config.id,
    wpUrl: config.wpUrl,
    wpUser: decrypt(config.wpUserEncrypted),
    wpPasswordSet: true,
    topLevelId: config.topLevelId,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

// PUT /api/wp-config/:topLevelId — create or update WordPress config for a topic
export async function upsertWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;
  const { wpUrl, wpUser, wpPassword } = req.body;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  if (!wpUrl || !wpUser) {
    res.status(400).json({ error: 'wpUrl and wpUser are required' });
    return;
  }

  const existing = await prisma.wordpressConfig.findUnique({ where: { topLevelId } });

  const data = {
    wpUrl: wpUrl.replace(/\/+$/, ''),
    wpUserEncrypted: encrypt(wpUser),
    ...(wpPassword ? { wpPassEncrypted: encrypt(wpPassword) } : {}),
  };

  if (existing) {
    if (!wpPassword && !existing.wpPassEncrypted) {
      res.status(400).json({ error: 'wpPassword is required for first setup' });
      return;
    }
    const config = await prisma.wordpressConfig.update({
      where: { topLevelId },
      data,
    });
    res.json({ id: config.id, wpUrl: config.wpUrl, wpUser, wpPasswordSet: true, topLevelId });
  } else {
    if (!wpPassword) {
      res.status(400).json({ error: 'wpPassword is required for first setup' });
      return;
    }
    const config = await prisma.wordpressConfig.create({
      data: { topLevelId, ...data, wpPassEncrypted: encrypt(wpPassword) },
    });
    res.status(201).json({ id: config.id, wpUrl: config.wpUrl, wpUser, wpPasswordSet: true, topLevelId });
  }
}

// DELETE /api/wp-config/:topLevelId — remove WordPress config for a topic
export async function deleteWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const existing = await prisma.wordpressConfig.findUnique({ where: { topLevelId } });

  if (!existing) {
    res.status(404).json({ error: 'No WordPress config found' });
    return;
  }

  await prisma.wordpressConfig.delete({ where: { topLevelId } });
  res.json({ success: true });
}

// POST /api/wp-config/:topLevelId/test — test connection to WordPress
export async function testWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const topLevelId = req.params.topLevelId as string;

  if (!await verifyOwnership(topLevelId, req.user!.id)) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const config = await prisma.wordpressConfig.findUnique({
    where: { topLevelId },
  });

  if (!config) {
    res.status(400).json({ error: 'WordPress config not set up yet' });
    return;
  }

  try {
    const rawUrl = config.wpUrl;
    const baseUrl = rawUrl
      .replace(/\/wp-json\/wp\/v2.*$/i, '')
      .replace(/\?rest_route=.*$/i, '')
      .replace(/\/+$/, '');
    const wpUser = decrypt(config.wpUserEncrypted);
    const wpPass = decrypt(config.wpPassEncrypted);
    const auth = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');

    const axios = (await import('axios')).default;
    const response = await axios.get(`${baseUrl}/?rest_route=/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 10000,
    });

    res.json({
      success: true,
      siteName: response.data?.name || 'Connected',
      siteUrl: baseUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    res.status(400).json({ success: false, error: message });
  }
}
