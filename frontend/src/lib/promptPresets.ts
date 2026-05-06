/**
 * AI image / video prompt-style presets, persisted in localStorage.
 *
 * Ported from image_creator/lib/prompt-presets.ts but trimmed for the
 * Content Creator app: no negative prompts (gpt-image-1/2 ignore them
 * anyway) and a smaller built-in set focused on the article + avatar
 * use cases.
 */

export type PromptKind = 'image' | 'video';

export interface PromptPreset {
  id: string;
  kind: PromptKind;
  label: string;
  /** Suffix automatically appended to the user prompt when this preset is active */
  styleSuffix: string;
  hint?: string;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'cc-studio/prompt-presets/v1';
const DELETED_KEY = 'cc-studio/prompt-presets/deleted/v1';
const DEFAULT_KEY_IMAGE = 'cc-studio/prompt-presets/default/image/v1';
const DEFAULT_KEY_VIDEO = 'cc-studio/prompt-presets/default/video/v1';

const BUILT_INS: Array<Omit<PromptPreset, 'createdAt' | 'updatedAt' | 'isPreset'>> = [
  {
    id: 'pp_realistic',
    kind: 'image',
    label: 'Realistic photo',
    styleSuffix: 'photorealistic, 4K, professional photography, sharp focus, natural lighting, high detail',
    hint: 'Realistic product / lifestyle photos',
  },
  {
    id: 'pp_illustration',
    kind: 'image',
    label: 'Illustration',
    styleSuffix: 'digital illustration, vibrant colors, hand-drawn aesthetic, smooth shading, art-book quality',
    hint: 'Soft hand-drawn illustration',
  },
  {
    id: 'pp_infographic',
    kind: 'image',
    label: 'Infographic',
    styleSuffix: 'infographic style, flat design, clean vectors, isometric, simple shapes, business presentation',
    hint: 'Charts / explainer banners',
  },
  {
    id: 'pp_anime',
    kind: 'image',
    label: 'Anime',
    styleSuffix: 'anime style, manga, cel shading, dynamic composition, vivid colors, Studio Ghibli inspired',
    hint: 'Anime / manga look',
  },
  {
    id: 'pp_minimal',
    kind: 'image',
    label: 'Minimal',
    styleSuffix: 'minimalist, simple, clean composition, lots of white space, monochromatic, elegant',
    hint: 'Magazine-style minimal layout',
  },
  {
    id: 'pp_cinematic',
    kind: 'image',
    label: 'Cinematic',
    styleSuffix: 'cinematic, dramatic lighting, shallow depth of field, film grain, anamorphic',
    hint: 'Film-still aesthetic',
  },
  // ─── Video presets ─────────────────────────────────────
  {
    id: 'pv_cinematic',
    kind: 'video',
    label: 'Cinematic motion',
    styleSuffix: 'cinematic camera move, slow dolly, soft motion blur, atmospheric lighting',
    hint: 'Smooth cinematic shots',
  },
  {
    id: 'pv_loop',
    kind: 'video',
    label: 'Seamless loop',
    styleSuffix: 'subtle ambient motion, seamless loop, gentle parallax, calm pace',
    hint: 'Background loop',
  },
];

interface RawState {
  presets: PromptPreset[];
}

function read(): RawState {
  if (typeof window === 'undefined') return { presets: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { presets: [] };
    const parsed = JSON.parse(raw) as RawState;
    return { presets: parsed.presets ?? [] };
  } catch {
    return { presets: [] };
  }
}

function write(state: RawState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function setDeletedIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
}

/** Returns merged list: built-ins (minus user-deleted) + user-added. */
export function listPromptPresets(kind: PromptKind): PromptPreset[] {
  const state = read();
  const tombstones = deletedIds();
  const now = Date.now();
  const builtin = BUILT_INS
    .filter((b) => b.kind === kind && !tombstones.has(b.id))
    .map<PromptPreset>((b) => ({ ...b, isPreset: true, createdAt: now, updatedAt: now }));
  const user = state.presets.filter((p) => p.kind === kind);
  return [...builtin, ...user];
}

export function addPromptPreset(p: Omit<PromptPreset, 'id' | 'createdAt' | 'updatedAt' | 'isPreset'>): PromptPreset {
  const state = read();
  const item: PromptPreset = {
    ...p,
    id: `pp_user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.presets.push(item);
  write(state);
  return item;
}

export function updatePromptPreset(id: string, patch: Partial<Pick<PromptPreset, 'label' | 'styleSuffix' | 'hint'>>): PromptPreset | null {
  const state = read();
  const idx = state.presets.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  state.presets[idx] = { ...state.presets[idx], ...patch, updatedAt: Date.now() };
  write(state);
  return state.presets[idx];
}

export function removePromptPreset(id: string): void {
  const state = read();
  // For built-ins, we record a tombstone so they don't reappear.
  if (BUILT_INS.some((b) => b.id === id)) {
    const t = deletedIds();
    t.add(id);
    setDeletedIds(t);
  } else {
    state.presets = state.presets.filter((p) => p.id !== id);
    write(state);
  }
}

export function getDefaultPresetId(kind: PromptKind): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(kind === 'video' ? DEFAULT_KEY_VIDEO : DEFAULT_KEY_IMAGE);
}

export function setDefaultPresetId(id: string | null, kind: PromptKind): void {
  if (typeof window === 'undefined') return;
  const k = kind === 'video' ? DEFAULT_KEY_VIDEO : DEFAULT_KEY_IMAGE;
  if (!id) window.localStorage.removeItem(k);
  else window.localStorage.setItem(k, id);
}

export function composePrompt(userPrompt: string, preset: PromptPreset | null | undefined): string {
  const base = userPrompt.trim();
  if (!preset || !preset.styleSuffix.trim()) return base;
  if (!base) return preset.styleSuffix.trim();
  return `${base}, ${preset.styleSuffix.trim()}`;
}
