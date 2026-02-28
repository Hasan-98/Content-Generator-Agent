import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  console.log(`[auth] login attempt → email: ${email}`);

  if (!email || !password) {
    console.log('[auth] login failed → missing email or password');
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    console.log(`[auth] login failed → user not found or inactive for: ${email}`);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.log(`[auth] login failed → wrong password for: ${email}`);
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  console.log(`[auth] login success → ${user.email} (${user.role})`);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function impersonate(req: AuthRequest, res: Response): Promise<void> {
  const { userId } = req.params;
  console.log(`[auth] impersonate → superadmin: ${req.user!.id} → target: ${userId}`);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  if (!target || !target.active) {
    res.status(404).json({ error: 'User not found or inactive' });
    return;
  }

  if (target.role === 'SUPERADMIN') {
    res.status(403).json({ error: 'Cannot impersonate another super admin' });
    return;
  }

  const token = jwt.sign(
    { id: target.id, email: target.email, role: target.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  console.log(`[auth] impersonate success → now acting as ${target.email} (${target.role})`);
  res.json({ token, user: { id: target.id, name: target.name, email: target.email, role: target.role } });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  console.log(`[auth] me → userId: ${req.user!.id}`);
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, active: true, lastLogin: true },
  });
  if (!user) {
    console.log(`[auth] me → user not found: ${req.user!.id}`);
    res.status(404).json({ error: 'User not found' });
    return;
  }
  console.log(`[auth] me → returning user: ${user.email}`);
  res.json(user);
}
