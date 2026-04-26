import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient, HeygenAvatarStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getUserApiKey } from './apiConfigController';
import {
  uploadAssetToHeygen,
  createAvatarGroup,
} from '../services/heygenService';

const prisma = new PrismaClient();

/**
 * Detect MIME type from file buffer magic bytes.
 */
function detectMime(buffer: Buffer): string {
  if (buffer.length < 12) return 'application/octet-stream';
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  // WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  // MP4/MOV (ftyp box at offset 4)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return 'video/mp4';
  // WebM (EBML header)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return 'video/webm';
  return 'application/octet-stream';
}

// POST /api/heygen-avatars — create a new avatar (WF0 synchronous flow)
//
// Accepts multipart/form-data with:
//   - `file` (image or video file)
//   - `name` (avatar name)
//   - `avatarType` ("photo" or "video", default "photo")
//
// Photo path: upload → create avatar group → avatarId=groupId → READY
// Video path: upload → save video_key → READY
export async function createAvatar(req: AuthRequest, res: Response): Promise<void> {
  const name = (req.body?.name as string || '').trim();
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const avatarType = ((req.body?.avatarType as string) || 'photo').trim().toLowerCase();
  if (!['photo', 'video'].includes(avatarType)) {
    res.status(400).json({ error: 'avatarType must be "photo" or "video"' });
    return;
  }

  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }

  // Validate file type matches avatarType
  if (avatarType === 'photo' && !file.mimetype.startsWith('image/')) {
    res.status(400).json({ error: 'Photo avatar requires an image file (JPG/PNG)' });
    return;
  }
  if (avatarType === 'video' && !file.mimetype.startsWith('video/')) {
    res.status(400).json({ error: 'Video avatar requires a video file (MP4/MOV/WebM)' });
    return;
  }

  // Create DB row as PENDING
  const fileUrl = `/uploads/${file.filename}`;
  const row = await prisma.heygenTrainedAvatar.create({
    data: {
      userId: req.user!.id,
      avatarType,
      name,
      imageUrl: fileUrl,
      fileName: file.originalname,
      status: HeygenAvatarStatus.PENDING,
    },
  });

  // Run the WF0 pipeline synchronously
  try {
    const apiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

    // Read file from disk
    const filePath = path.join(__dirname, '..', '..', 'uploads', file.filename);
    const buffer = fs.readFileSync(filePath);
    const contentType = file.mimetype || detectMime(buffer);

    // Step 1: Upload to HeyGen
    const assetKey = await uploadAssetToHeygen(buffer, contentType, apiKey);

    if (avatarType === 'photo') {
      // Step 2 (photo only): Create avatar group — group_id = talking_photo_id
      const groupId = await createAvatarGroup(name, assetKey, apiKey);

      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: {
          imageKey: assetKey,
          groupId,
          avatarId: groupId, // group_id is usable as talking_photo_id
          status: HeygenAvatarStatus.READY,
        },
      });
      res.status(201).json(updated);
    } else {
      // Video path: just save the asset key, no group creation
      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: {
          imageKey: assetKey,
          status: HeygenAvatarStatus.READY,
        },
      });
      res.status(201).json(updated);
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error during avatar creation';
    console.error(`[heygenAvatar] createAvatar failed for ${row.id}:`, errorMsg);
    const failed = await prisma.heygenTrainedAvatar.update({
      where: { id: row.id },
      data: { status: HeygenAvatarStatus.FAILED, errorMsg: errorMsg.slice(0, 1000) },
    });
    res.status(500).json(failed);
  }
}

// GET /api/heygen-avatars — list the current user's avatars
export async function listAvatars(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.heygenTrainedAvatar.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
}

// GET /api/heygen-avatars/:id — fetch a single avatar
export async function getAvatar(req: AuthRequest, res: Response): Promise<void> {
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  res.json(row);
}

// POST /api/heygen-avatars/:id/retry — reset a FAILED avatar and re-run the WF0 pipeline
export async function retryAvatar(req: AuthRequest, res: Response): Promise<void> {
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  if (row.status !== HeygenAvatarStatus.FAILED) {
    res.status(400).json({ error: 'Only failed avatars can be retried' });
    return;
  }

  // Reset fields
  await prisma.heygenTrainedAvatar.update({
    where: { id: row.id },
    data: { status: HeygenAvatarStatus.PENDING, errorMsg: null, groupId: null, imageKey: null, avatarId: null },
  });

  try {
    const apiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

    // Read file from local uploads
    const localPath = path.join(__dirname, '..', '..', row.imageUrl.startsWith('/') ? row.imageUrl.slice(1) : row.imageUrl);
    if (!fs.existsSync(localPath)) {
      throw new Error('Original upload file not found — please create a new avatar');
    }
    const buffer = fs.readFileSync(localPath);
    const contentType = detectMime(buffer);
    const assetKey = await uploadAssetToHeygen(buffer, contentType, apiKey);

    if (row.avatarType === 'photo') {
      const groupId = await createAvatarGroup(row.name, assetKey, apiKey);
      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: { imageKey: assetKey, groupId, avatarId: groupId, status: HeygenAvatarStatus.READY },
      });
      res.json(updated);
    } else {
      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: { imageKey: assetKey, status: HeygenAvatarStatus.READY },
      });
      res.json(updated);
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown error during retry';
    const failed = await prisma.heygenTrainedAvatar.update({
      where: { id: row.id },
      data: { status: HeygenAvatarStatus.FAILED, errorMsg: errorMsg.slice(0, 1000) },
    });
    res.status(500).json(failed);
  }
}

// POST /api/heygen-avatars/:id/refresh — kept for backward compat with legacy TRAINING rows
export async function refreshAvatar(req: AuthRequest, res: Response): Promise<void> {
  const { getAvatarGroupStatus } = await import('../services/heygenService');
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  if (!row.groupId) {
    res.status(400).json({ error: 'Avatar has no group_id yet' });
    return;
  }
  const apiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;
  try {
    const { avatarId } = await getAvatarGroupStatus(row.groupId, apiKey);
    const updated = await prisma.heygenTrainedAvatar.update({
      where: { id: row.id },
      data: avatarId ? { avatarId, status: HeygenAvatarStatus.READY, errorMsg: null } : {},
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to refresh avatar' });
  }
}

// DELETE /api/heygen-avatars/:id
export async function deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  await prisma.heygenTrainedAvatar.delete({ where: { id: row.id } });
  res.json({ success: true });
}
