import api from './client';

export async function sendInvite(email: string, role: string): Promise<{ message: string; email: string; expiresAt: string }> {
  const { data } = await api.post('/invites', { email, role });
  return data;
}

export async function validateInvite(token: string): Promise<{ email: string; role: string; invitedBy: string }> {
  const { data } = await api.get(`/invites/${token}`);
  return data;
}

export async function acceptInvite(token: string, name: string, password: string): Promise<{ token: string; user: { id: string; name: string; email: string; role: string } }> {
  const { data } = await api.post(`/invites/${token}/accept`, { name, password });
  return data;
}
