import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function listUsers(_req: AuthRequest, res: Response): Promise<void> {
  console.log('[users] listUsers → fetching all users');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, lastLogin: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`[users] listUsers → returning ${users.length} users`);
  res.json(users);
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;
  console.log(`[users] createUser → name: ${name}, email: ${email}, role: ${role}`);

  if (!name || !email || !password) {
    console.log('[users] createUser failed → missing required fields');
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[users] createUser failed → email already in use: ${email}`);
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role || 'EDITOR' },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  console.log(`[users] createUser success → id: ${user.id}, email: ${user.email}`);
  res.status(201).json(user);
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { role, active } = req.body;
  console.log(`[users] updateUser → id: ${id}, role: ${role}, active: ${active}`);

  if (id === req.user!.id) {
    console.log('[users] updateUser failed → cannot modify own account');
    res.status(400).json({ error: 'Cannot modify your own account' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: String(id) },
    data: { ...(role !== undefined && { role }), ...(active !== undefined && { active }) },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  console.log(`[users] updateUser success → id: ${user.id}`);
  res.json(user);
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  console.log(`[users] deleteUser → id: ${id}`);

  if (id === req.user!.id) {
    console.log('[users] deleteUser failed → cannot delete own account');
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  await prisma.user.delete({ where: { id } });
  console.log(`[users] deleteUser success → id: ${id}`);
  res.status(204).send();
}
