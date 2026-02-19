import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function listUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, lastLogin: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role || 'EDITOR' },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  res.status(201).json(user);
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { role, active } = req.body;

  if (id === req.user!.id) {
    res.status(400).json({ error: 'Cannot modify your own account' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: String(id) },
    data: { ...(role !== undefined && { role }), ...(active !== undefined && { active }) },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.json(user);
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const id = String(req.params.id);

  if (id === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
