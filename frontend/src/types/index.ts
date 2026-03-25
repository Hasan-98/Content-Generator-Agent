export type Role = 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ResultStatus =
  | 'DRAFT'
  | 'READY'
  | 'KW_DONE'
  | 'PERSONA_WIP'
  | 'PERSONA_DONE'
  | 'STRUCT_WIP'
  | 'STRUCT_DONE'
  | 'PUBLISHED'
  | 'SKIPPED';

export type ArticleStatus =
  | 'READY'
  | 'WRITING'
  | 'ARTICLE_DONE'
  | 'IMAGING'
  | 'IMAGE_DONE'
  | 'FORMATTING'
  | 'FORMAT_DONE'
  | 'UPLOADED';

export type ImageTaste =
  | 'PHOTO'
  | 'TEXT_OVERLAY'
  | 'INFOGRAPHIC'
  | 'ILLUSTRATION'
  | 'CINEMATIC';

export type PublishStatus = 'PUBLISH' | 'DRAFT' | 'SCHEDULE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export type AuthUser = User;

export interface GeneratedResult {
  id: string;
  keywordText: string;
  title: string;
  status: ResultStatus;
  previousStatus?: ResultStatus;
  keywordId: string;
  // Persona fields
  demographic?: string;
  persona1?: string;
  persona2?: string;
  persona3?: string;
  demoSize1?: string;
  demoSize2?: string;
  demoSize3?: string;
  // Structure fields
  structIntro?: string;
  structNayami?: string;
  structP1?: string;
  structP2?: string;
  structP3?: string;
  structCommon?: string;
  structCta?: string;
  structMatome?: string;
  structH2?: string;
  // Fact check
  factCheck?: Record<string, {
    persona: string;
    demoSize: string | null;
    populationEstimate?: string;
    searchResults: { title: string; link: string; snippet: string }[];
    verified: boolean;
    verdict?: 'confirmed' | 'uncertain' | 'incorrect';
    reason?: string;
  }>;
  targetDecision?: string;
  article?: Article;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleSection {
  id: string;
  index: number;
  type: string;
  heading: string;
  content: string;
  articleId: string;
}

export interface ImageHistory {
  id: string;
  imageUrl: string;
  prompt: string;
  imageId: string;
  createdAt: string;
}

export interface ArticleImage {
  id: string;
  index: number;
  enabled: boolean;
  taste: ImageTaste;
  prompt: string;
  imageUrl?: string;
  articleId: string;
  history?: ImageHistory[];
}

export interface UploadMeta {
  id: string;
  slug: string;
  excerpt: string;
  tags: string;
  category: string;
  formattedHtml?: string;
  aiTitle?: string;
  publishStatus: PublishStatus;
  scheduleDate?: string;
  articleId: string;
}

export interface Article {
  id: string;
  status: ArticleStatus;
  platform?: string;
  uploadedAt?: string;
  resultId: string;
  sections: ArticleSection[];
  images: ArticleImage[];
  uploadMeta?: UploadMeta;
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
