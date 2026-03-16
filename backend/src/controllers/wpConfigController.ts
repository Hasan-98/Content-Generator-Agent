import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/crypto';

const prisma = new PrismaClient();

// GET /api/wp-config — get current user's WordPress config (masked password)
export async function getWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const config = await prisma.wordpressConfig.findUnique({
    where: { userId: req.user!.id },
  });

  if (!config) {
    res.json(null);
    return;
  }

  res.json({
    id: config.id,
    wpUrl: config.wpUrl,
    wpUser: decrypt(config.wpUserEncrypted),
    wpPasswordSet: true, // Never send password back, just indicate it's set
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

// PUT /api/wp-config — create or update WordPress config
export async function upsertWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const { wpUrl, wpUser, wpPassword } = req.body;

  if (!wpUrl || !wpUser) {
    res.status(400).json({ error: 'wpUrl and wpUser are required' });
    return;
  }

  const userId = req.user!.id;
  const existing = await prisma.wordpressConfig.findUnique({ where: { userId } });

  const data = {
    wpUrl: wpUrl.replace(/\/+$/, ''), // strip trailing slash
    wpUserEncrypted: encrypt(wpUser),
    // Only update password if provided (allows updating URL/user without re-entering password)
    ...(wpPassword ? { wpPassEncrypted: encrypt(wpPassword) } : {}),
  };

  if (existing) {
    if (!wpPassword && !existing.wpPassEncrypted) {
      res.status(400).json({ error: 'wpPassword is required for first setup' });
      return;
    }
    const config = await prisma.wordpressConfig.update({
      where: { userId },
      data,
    });
    res.json({ id: config.id, wpUrl: config.wpUrl, wpUser, wpPasswordSet: true });
  } else {
    if (!wpPassword) {
      res.status(400).json({ error: 'wpPassword is required for first setup' });
      return;
    }
    const config = await prisma.wordpressConfig.create({
      data: { userId, ...data, wpPassEncrypted: encrypt(wpPassword) },
    });
    res.status(201).json({ id: config.id, wpUrl: config.wpUrl, wpUser, wpPasswordSet: true });
  }
}

// DELETE /api/wp-config — remove WordPress config
export async function deleteWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const existing = await prisma.wordpressConfig.findUnique({ where: { userId } });

  if (!existing) {
    res.status(404).json({ error: 'No WordPress config found' });
    return;
  }

  await prisma.wordpressConfig.delete({ where: { userId } });
  res.json({ success: true });
}

// POST /api/wp-config/test — test connection to WordPress
export async function testWpConfig(req: AuthRequest, res: Response): Promise<void> {
  const config = await prisma.wordpressConfig.findUnique({
    where: { userId: req.user!.id },
  });

  if (!config) {
    res.status(400).json({ error: 'WordPress config not set up yet' });
    return;
  }

  try {
    const wpUrl = config.wpUrl;
    const wpUser = decrypt(config.wpUserEncrypted);
    const wpPass = decrypt(config.wpPassEncrypted);
    const auth = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');

    const axios = (await import('axios')).default;
    const response = await axios.get(`${wpUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 10000,
    });

    res.json({
      success: true,
      siteName: response.data?.name || 'Connected',
      siteUrl: wpUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    res.status(400).json({ success: false, error: message });
  }
}
