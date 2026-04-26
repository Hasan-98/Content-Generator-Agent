import { Response } from 'express';
import { PrismaClient, HeygenAvatarStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getUserApiKey } from './apiConfigController';
import {
  uploadAssetToHeygen,
  createAvatarGroup,
} from '../services/heygenService';

const prisma = new PrismaClient();

// POST /api/heygen-avatars — create a new avatar (WF0 synchronous flow)
//
// Accepts multipart/form-data with:
//   - `file` (image or video file — kept in memory, never saved to disk)
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
  if (!file || !file.buffer) {
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

  // Create DB row as PENDING (imageUrl will be updated with HeyGen URL after upload)
  const row = await prisma.heygenTrainedAvatar.create({
    data: {
      userId: req.user!.id,
      avatarType,
      name,
      imageUrl: '',
      fileName: file.originalname,
      status: HeygenAvatarStatus.PENDING,
    },
  });

  try {
    const apiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

    // Step 1: Upload buffer directly to HeyGen (no local disk storage)
    const { assetKey, hostedUrl } = await uploadAssetToHeygen(file.buffer, file.mimetype, apiKey);

    if (avatarType === 'photo') {
      // Step 2 (photo only): Create avatar group — group_id = talking_photo_id
      const { groupId, heygenImageUrl } = await createAvatarGroup(name, assetKey, apiKey);

      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: {
          imageKey: assetKey,
          groupId,
          avatarId: groupId,
          imageUrl: heygenImageUrl || hostedUrl,
          status: HeygenAvatarStatus.READY,
        },
      });
      res.status(201).json(updated);
    } else {
      // Video path: store HeyGen-hosted URL directly
      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: {
          imageKey: assetKey,
          imageUrl: hostedUrl,
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

// POST /api/heygen-avatars/:id/retry — reset a FAILED avatar
// Note: retry requires re-uploading the file since we no longer store locally
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

  // Since we don't store files locally anymore, retry needs a new file upload
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file || !file.buffer) {
    res.status(400).json({ error: 'File must be re-uploaded for retry (files are not stored locally)' });
    return;
  }

  await prisma.heygenTrainedAvatar.update({
    where: { id: row.id },
    data: { status: HeygenAvatarStatus.PENDING, errorMsg: null, groupId: null, imageKey: null, avatarId: null },
  });

  try {
    const apiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;
    const { assetKey, hostedUrl } = await uploadAssetToHeygen(file.buffer, file.mimetype, apiKey);

    if (row.avatarType === 'photo') {
      const { groupId, heygenImageUrl } = await createAvatarGroup(row.name, assetKey, apiKey);
      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: {
          imageKey: assetKey,
          groupId,
          avatarId: groupId,
          imageUrl: heygenImageUrl || hostedUrl,
          fileName: file.originalname,
          status: HeygenAvatarStatus.READY,
        },
      });
      res.json(updated);
    } else {
      const updated = await prisma.heygenTrainedAvatar.update({
        where: { id: row.id },
        data: {
          imageKey: assetKey,
          imageUrl: hostedUrl,
          fileName: file.originalname,
          status: HeygenAvatarStatus.READY,
        },
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
