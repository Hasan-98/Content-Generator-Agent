import { Response } from 'express';
import { PrismaClient, HeygenAvatarStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getUserApiKey } from './apiConfigController';
import {
  downloadImage,
  uploadImageToHeygen,
  createAvatarGroup,
  trainAvatarGroup,
  getAvatarGroupStatus,
} from '../services/heygenService';

const prisma = new PrismaClient();

// Polling configuration — HeyGen photo_avatar training typically takes 5-15 min.
const POLL_INTERVAL_MS = 60_000;      // 60s between polls
const POLL_MAX_ATTEMPTS = 30;         // 30 * 60s = 30 minutes max

/**
 * Background worker that drives the WF0 pipeline for a single avatar row.
 * Runs after the HTTP request has already returned 201 to the client.
 */
async function runAvatarCreationWorker(avatarRowId: string, userId: string): Promise<void> {
  const apiKey = (await getUserApiKey(userId, 'heygenApi')) || undefined;

  const fail = async (msg: string) => {
    console.error(`[heygenAvatarWorker] ${avatarRowId} failed:`, msg);
    await prisma.heygenTrainedAvatar.update({
      where: { id: avatarRowId },
      data: { status: HeygenAvatarStatus.FAILED, errorMsg: msg.slice(0, 1000) },
    }).catch(() => { /* row may have been deleted */ });
  };

  try {
    const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: avatarRowId } });
    if (!row) return;

    // ---- Step 1: Download + upload to HeyGen ----
    await prisma.heygenTrainedAvatar.update({
      where: { id: avatarRowId },
      data: { status: HeygenAvatarStatus.UPLOADING },
    });

    const { buffer, contentType } = await downloadImage(row.imageUrl);
    const imageKey = await uploadImageToHeygen(buffer, contentType, apiKey);

    await prisma.heygenTrainedAvatar.update({
      where: { id: avatarRowId },
      data: { imageKey },
    });

    // ---- Step 2: Create avatar group ----
    const groupId = await createAvatarGroup(row.name, imageKey, apiKey);

    await prisma.heygenTrainedAvatar.update({
      where: { id: avatarRowId },
      data: { groupId, status: HeygenAvatarStatus.TRAINING },
    });

    // ---- Step 3: Kick off training ----
    await trainAvatarGroup(groupId, apiKey);

    // ---- Step 4: Poll until ready ----
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      // Bail out if the row was deleted mid-flight
      const stillExists = await prisma.heygenTrainedAvatar.findUnique({ where: { id: avatarRowId } });
      if (!stillExists) return;

      try {
        const { avatarId } = await getAvatarGroupStatus(groupId, apiKey);
        if (avatarId) {
          await prisma.heygenTrainedAvatar.update({
            where: { id: avatarRowId },
            data: { avatarId, status: HeygenAvatarStatus.READY, errorMsg: null },
          });
          console.log(`[heygenAvatarWorker] ${avatarRowId} ready → avatar_id=${avatarId}`);
          return;
        }
      } catch (pollErr: any) {
        console.warn(`[heygenAvatarWorker] poll attempt ${attempt + 1} error:`, pollErr?.message);
      }
    }

    await fail('Training polling timed out after 30 minutes');
  } catch (err: any) {
    await fail(err?.message || 'Unknown error during avatar training');
  }
}

// POST /api/heygen-avatars — create a new avatar and start training
// Accepts either:
//   - multipart/form-data with `image` file + `name` field (file upload)
//   - JSON body with `name` + `imageUrl` (legacy URL mode)
export async function createAvatar(req: AuthRequest, res: Response): Promise<void> {
  const name = (req.body?.name as string) || '';
  if (!name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  // Determine image URL: uploaded file takes priority over imageUrl body field
  let imageUrl: string;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (file) {
    // File was uploaded — build a server-relative URL
    imageUrl = `/uploads/${file.filename}`;
  } else if (typeof req.body?.imageUrl === 'string' && req.body.imageUrl.trim()) {
    imageUrl = req.body.imageUrl.trim();
    try { new URL(imageUrl); } catch {
      res.status(400).json({ error: 'imageUrl must be a valid URL' });
      return;
    }
  } else {
    res.status(400).json({ error: 'image file or imageUrl is required' });
    return;
  }

  const row = await prisma.heygenTrainedAvatar.create({
    data: {
      userId: req.user!.id,
      name: name.trim(),
      imageUrl,
      status: HeygenAvatarStatus.PENDING,
    },
  });

  // Fire-and-forget background worker. The HTTP response returns immediately.
  setImmediate(() => { void runAvatarCreationWorker(row.id, req.user!.id); });

  res.status(201).json(row);
}

// GET /api/heygen-avatars — list the current user's avatars
export async function listAvatars(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.heygenTrainedAvatar.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
}

// GET /api/heygen-avatars/:id — fetch a single avatar (used for polling)
export async function getAvatar(req: AuthRequest, res: Response): Promise<void> {
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  res.json(row);
}

// POST /api/heygen-avatars/:id/refresh — manually re-poll HeyGen for status.
// Useful if training completed after the worker's polling window expired.
export async function refreshAvatar(req: AuthRequest, res: Response): Promise<void> {
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  if (!row.groupId) {
    res.status(400).json({ error: 'Avatar has no group_id yet — still uploading' });
    return;
  }

  const apiKey = (await getUserApiKey(req.user!.id, 'heygenApi')) || undefined;

  try {
    const { avatarId } = await getAvatarGroupStatus(row.groupId, apiKey);
    const updated = await prisma.heygenTrainedAvatar.update({
      where: { id: row.id },
      data: avatarId
        ? { avatarId, status: HeygenAvatarStatus.READY, errorMsg: null }
        : {},
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to refresh avatar' });
  }
}

// POST /api/heygen-avatars/:id/retry — reset a FAILED avatar and re-run the worker
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

  const updated = await prisma.heygenTrainedAvatar.update({
    where: { id: row.id },
    data: { status: HeygenAvatarStatus.PENDING, errorMsg: null, groupId: null, imageKey: null, avatarId: null },
  });

  setImmediate(() => { void runAvatarCreationWorker(row.id, req.user!.id); });

  res.json(updated);
}

// DELETE /api/heygen-avatars/:id — remove the avatar row (HeyGen-side is left alone)
export async function deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
  const row = await prisma.heygenTrainedAvatar.findUnique({ where: { id: String(req.params.id) } });
  if (!row || row.userId !== req.user!.id) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  await prisma.heygenTrainedAvatar.delete({ where: { id: row.id } });
  res.json({ success: true });
}
