import client from './client';
import type { User } from '../types';

export async function getUsers(): Promise<User[]> {
  const res = await client.get('/users');
  return res.data;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<User> {
  const res = await client.post('/users', data);
  return res.data;
}

export async function updateUser(id: string, data: { role?: string; active?: boolean }): Promise<User> {
  const res = await client.patch(`/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await client.delete(`/users/${id}`);
}
