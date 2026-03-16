import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../services/crypto';

const prisma = new PrismaClient();

const API_KEY_FIELDS = [
  'claudeApi',
  'openaiApi',
  'geminiApi',
  'googleApi',
  'metaApi',
  'kieApi',
  'pieapi',
] as const;

type ApiKeyName = (typeof API_KEY_FIELDS)[number];

function encryptedField(name: ApiKeyName): string {
  return name === 'pieapi' ? 'pieapiEncrypted' : `${name}Encrypted`;
}

// GET /api/api-config — returns which keys are set (boolean flags only)
export async function getApiConfig(req: AuthRequest, res: Response): Promise<void> {
  const config = await prisma.apiConfig.findUnique({
    where: { userId: req.user!.id },
  });

  if (!config) {
    const result: Record<string, boolean> = {};
    for (const key of API_KEY_FIELDS) result[key] = false;
    res.json(result);
    return;
  }

  const result: Record<string, boolean> = {};
  for (const key of API_KEY_FIELDS) {
    const field = encryptedField(key) as keyof typeof config;
    result[key] = !!config[field];
  }
  res.json(result);
}

// PUT /api/api-config — upsert one or more API keys
export async function upsertApiConfig(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const data: Record<string, string> = {};

  for (const key of API_KEY_FIELDS) {
    const value = req.body[key];
    if (typeof value === 'string' && value.trim()) {
      data[encryptedField(key)] = encrypt(value.trim());
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid API keys provided' });
    return;
  }

  const existing = await prisma.apiConfig.findUnique({ where: { userId } });

  if (existing) {
    await prisma.apiConfig.update({ where: { userId }, data });
  } else {
    await prisma.apiConfig.create({ data: { userId, ...data } });
  }

  // Return updated status
  const updated = await prisma.apiConfig.findUnique({ where: { userId } });
  const result: Record<string, boolean> = {};
  for (const key of API_KEY_FIELDS) {
    const field = encryptedField(key) as keyof typeof updated;
    result[key] = !!(updated && updated[field]);
  }
  res.json(result);
}

// DELETE /api/api-config/:key — remove a specific API key
export async function deleteApiKey(req: AuthRequest, res: Response): Promise<void> {
  const keyName = req.params.key as ApiKeyName;

  if (!API_KEY_FIELDS.includes(keyName)) {
    res.status(400).json({ error: `Invalid key name: ${keyName}` });
    return;
  }

  const userId = req.user!.id;
  const existing = await prisma.apiConfig.findUnique({ where: { userId } });

  if (!existing) {
    res.status(404).json({ error: 'No API config found' });
    return;
  }

  await prisma.apiConfig.update({
    where: { userId },
    data: { [encryptedField(keyName)]: null },
  });

  res.json({ success: true });
}

// Helper: get a decrypted API key for a user (used by services)
export async function getUserApiKey(userId: string, keyName: ApiKeyName): Promise<string | null> {
  const config = await prisma.apiConfig.findUnique({ where: { userId } });
  if (!config) return null;

  const field = encryptedField(keyName) as keyof typeof config;
  const encrypted = config[field] as string | null;
  if (!encrypted) return null;

  return decrypt(encrypted);
}
