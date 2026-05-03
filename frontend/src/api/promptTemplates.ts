import client from './client';

export interface PromptTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listPromptTemplates(): Promise<PromptTemplate[]> {
  const res = await client.get('/prompt-templates');
  return res.data;
}

export async function createPromptTemplate(data: {
  name: string;
  content: string;
  isDefault?: boolean;
}): Promise<PromptTemplate> {
  const res = await client.post('/prompt-templates', data);
  return res.data;
}

export async function updatePromptTemplate(
  id: string,
  data: { name?: string; content?: string; isDefault?: boolean }
): Promise<PromptTemplate> {
  const res = await client.patch(`/prompt-templates/${id}`, data);
  return res.data;
}

export async function deletePromptTemplate(id: string): Promise<void> {
  await client.delete(`/prompt-templates/${id}`);
}
