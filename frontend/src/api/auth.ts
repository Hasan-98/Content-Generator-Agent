import client from './client';
import type { AuthUser } from '../types';

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await client.post('/auth/login', { email, password });
  return res.data;
}

export async function getMe(): Promise<AuthUser> {
  const res = await client.get('/auth/me');
  return res.data;
}

export async function impersonateUser(userId: string): Promise<{ token: string; user: AuthUser }> {
  const res = await client.post(`/auth/impersonate/${userId}`);
  return res.data;
}

export async function viewAsUser(userId: string): Promise<{ token: string; user: AuthUser }> {
  const res = await client.post(`/auth/view-as/${userId}`);
  return res.data;
}

export async function editAsUser(userId: string): Promise<{ token: string; user: AuthUser }> {
  const res = await client.post(`/auth/edit-as/${userId}`);
  return res.data;
}

export async function updateMe(data: {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<AuthUser> {
  const res = await client.patch('/auth/me', data);
  return res.data;
}
