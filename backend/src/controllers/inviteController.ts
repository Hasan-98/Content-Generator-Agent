import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { sendInviteEmail } from '../services/emailService';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// POST /api/invites — Admin sends invite email
export async function sendInvite(req: AuthRequest, res: Response): Promise<void> {
  const { email, role } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' });
    return;
  }

  // Invalidate any previous unused invites for this email
  await prisma.invite.updateMany({
    where: { email, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      email,
      role: role || 'EDITOR',
      invitedById: req.user!.id,
      expiresAt,
    },
    include: { invitedBy: { select: { name: true } } },
  });

  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${appUrl}?invite=${invite.token}`;

  try {
    await sendInviteEmail({
      toEmail: email,
      inviterName: invite.invitedBy.name,
      role: invite.role,
      inviteLink,
    });
  } catch (err) {
    // Delete the invite if email fails so admin can retry
    await prisma.invite.delete({ where: { id: invite.id } });
    console.error('Email send failed:', err);
    res.status(500).json({ error: 'Failed to send invite email. Check SMTP configuration.' });
    return;
  }

  res.status(201).json({ message: 'Invite sent', email, expiresAt });
}

// GET /api/invites/:token — Validate token (public)
export async function validateInvite(req: Request, res: Response): Promise<void> {
  const token = req.params.token as string;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { invitedBy: { select: { name: true } } },
  });

  if (!invite) {
    res.status(404).json({ error: 'Invalid invite link' });
    return;
  }
  if (invite.usedAt) {
    res.status(410).json({ error: 'This invite has already been used' });
    return;
  }
  if (invite.expiresAt < new Date()) {
    res.status(410).json({ error: 'This invite has expired' });
    return;
  }

  res.json({
    email: invite.email,
    role: invite.role,
    invitedBy: invite.invitedBy.name,
  });
}

// POST /api/invites/:token/accept — Create account from invite (public)
export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const token = req.params.token as string;
  const { name, password } = req.body;

  if (!name || !password) {
    res.status(400).json({ error: 'Name and password are required' });
    return;
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { invitedBy: { select: { name: true } } },
  });

  if (!invite) {
    res.status(404).json({ error: 'Invalid invite link' });
    return;
  }
  if (invite.usedAt) {
    res.status(410).json({ error: 'This invite has already been used' });
    return;
  }
  if (invite.expiresAt < new Date()) {
    res.status(410).json({ error: 'This invite has expired' });
    return;
  }

  // Check email not already taken (race condition guard)
  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: invite.email,
      passwordHash,
      role: invite.role,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  // Mark invite as used
  await prisma.invite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });

  res.status(201).json({ token: jwtToken, user });
}
