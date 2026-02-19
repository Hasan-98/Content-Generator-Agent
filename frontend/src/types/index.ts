export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type Status = 'DRAFT' | 'READY' | 'PROGRESS' | 'DONE' | 'PUBLISHED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface GeneratedResult {
  id: string;
  keywordText: string;
  title: string;
  status: Status;
  keywordId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Keyword {
  id: string;
  keyword: string;
  goal: string;
  audience: string;
  topLevelId: string;
  results: GeneratedResult[];
  createdAt: string;
  updatedAt: string;
}

export interface TopLevel {
  id: string;
  name: string;
  order: number;
  userId: string;
  keywords: Keyword[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
