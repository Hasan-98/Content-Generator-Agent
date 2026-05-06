/**
 * AI 画像生成用のプロンプトプリセット。
 *
 * - 「本格写真風」「イラスト風」など、ユーザーがよく使うスタイルを定型化
 * - styleSuffix がプロンプト末尾に自動付加される
 * - localStorage に保存、組み込みプリセットは ID 不重複で自動補充
 */

export type PromptKind = "image" | "video";

export interface PromptPreset {
  id: string;
  /** "image" = AI 画像生成用 / "video" = AI 動画生成用。既存データは "image" 扱い */
  kind: PromptKind;
  label: string;
  /** プロンプト末尾に自動付加されるスタイル指定 */
  styleSuffix: string;
  /** 任意の negative prompt（API が対応する場合のみ使用） */
  negativePrompt?: string;
  hint?: string;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "image-creator/prompt-presets/v1";
const DELETED_PRESET_IDS_KEY = "image-creator/prompt-presets/deleted-preset-ids/v1";
const DEFAULT_ID_KEY_LEGACY = "image-creator/prompt-presets/default-id/v1";
const DEFAULT_ID_KEY_IMAGE = "image-creator/prompt-presets/default-id/image/v1";
const DEFAULT_ID_KEY_VIDEO = "image-creator/prompt-presets/default-id/video/v1";

function defaultIdKey(kind: PromptKind): string {
  return kind === "video" ? DEFAULT_ID_KEY_VIDEO : DEFAULT_ID_KEY_IMAGE;
}

/** 起動時 / タブ初回表示時に選択されるプリセット ID（未設定時は最初の組込み） */
export function getDefaultPresetId(kind: PromptKind = "image"): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(defaultIdKey(kind));
  if (v) return v;
  // 旧キー（kind 未対応時代）からの自動マイグレーション： image だけ拾う
  if (kind === "image") {
    const legacy = window.localStorage.getItem(DEFAULT_ID_KEY_LEGACY);
    if (legacy) {
      window.localStorage.setItem(DEFAULT_ID_KEY_IMAGE, legacy);
      window.localStorage.removeItem(DEFAULT_ID_KEY_LEGACY);
      return legacy;
    }
  }
  return null;
}

export function setDefaultPresetId(id: string | null, kind: PromptKind = "image"): void {
  if (typeof window === "undefined") return;
  const key = defaultIdKey(kind);
  if (!id) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, id);
}

const PRESETS: Array<Omit<PromptPreset, "createdAt" | "updatedAt" | "isPreset">> = [
  // ─── 画像用 ───────────────────────────
  {
    id: "pp_realistic",
    kind: "image",
    label: "本格写真風",
    styleSuffix:
      "photorealistic, 4K, professional photography, sharp focus, natural lighting, high detail",
    negativePrompt: "cartoon, illustration, painting, sketch, low quality",
    hint: "リアルな商品撮影・人物写真に",
  },
  {
    id: "pp_illustration",
    kind: "image",
    label: "イラスト風",
    styleSuffix:
      "digital illustration, vibrant colors, hand-drawn aesthetic, smooth shading, art book quality",
    hint: "やわらかいタッチのイラスト",
  },
  {
    id: "pp_infographic",
    kind: "image",
    label: "インフォグラフィック風",
    styleSuffix:
      "infographic style, flat design, clean vectors, isometric, simple shapes, business presentation",
    hint: "プレゼン資料・解説バナー",
  },
  {
    id: "pp_anime",
    kind: "image",
    label: "アニメ風",
    styleSuffix:
      "anime style, manga, cel shading, dynamic composition, vivid colors, Studio Ghibli inspired",
    hint: "アニメ・マンガ風の表現",
  },
  {
    id: "pp_minimal",
    kind: "image",
    label: "ミニマル",
    styleSuffix:
      "minimalist, simple, clean composition, lots of white space, monochromatic, elegant",
    hint: "シンプルで洗練された印象",
  },
  {
    id: "pp_3d",
    kind: "image",
    label: "3D レンダー",
    styleSuffix:
      "3D render, cinema 4D, octane render, soft lighting, smooth surfaces, studio quality",
    hint: "立体的な CG ビジュアル",
  },
  {
    id: "pp_watercolor",
    kind: "image",
    label: "水彩画風",
    styleSuffix:
      "watercolor painting, soft brushstrokes, paper texture, gentle color bleeding, artistic",
    hint: "やわらかい水彩タッチ",
  },

  // ─── 動画用 ───────────────────────────
  {
    id: "pp_video_cinematic",
    kind: "video",
    label: "シネマティック",
    styleSuffix:
      "cinematic shot, smooth camera movement, film grain, 4K, dramatic lighting, depth of field",
    hint: "映画的な構図とカメラワーク",
  },
  {
    id: "pp_video_timelapse",
    kind: "video",
    label: "タイムラプス",
    styleSuffix:
      "time-lapse, fast motion, dynamic transitions, golden hour, moving clouds",
    hint: "時間経過を圧縮した映像",
  },
  {
    id: "pp_video_slowmo",
    kind: "video",
    label: "スローモーション",
    styleSuffix:
      "slow motion, 240fps, high speed capture, dramatic, smooth, fluid motion",
    hint: "迫力のあるスロー演出",
  },
  {
    id: "pp_video_tracking",
    kind: "video",
    label: "カメラ追従",
    styleSuffix:
      "tracking shot, smooth follow camera, dynamic, gimbal stabilized, dolly movement",
    hint: "被写体を追いかける動的なショット",
  },
  {
    id: "pp_video_static",
    kind: "video",
    label: "静止カメラ",
    styleSuffix:
      "static shot, locked-off camera, documentary style, observational, minimal movement",
    hint: "落ち着いた固定カメラの映像",
  },
];

// ───── Storage ───────────────────────────────────────────

function read(): PromptPreset[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as PromptPreset[]) : [];
  } catch {
    return [];
  }
}

function write(list: PromptPreset[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function rememberDeleted(id: string): void {
  if (typeof window === "undefined") return;
  if (!id.startsWith("pp_")) return;
  const raw = window.localStorage.getItem(DELETED_PRESET_IDS_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(id)) {
    ids.push(id);
    window.localStorage.setItem(DELETED_PRESET_IDS_KEY, JSON.stringify(ids));
  }
}

function ensureSeeded(): void {
  if (typeof window === "undefined") return;
  const existing = read();
  const existingIds = new Set(existing.map((p) => p.id));
  const deletedRaw = window.localStorage.getItem(DELETED_PRESET_IDS_KEY);
  const deletedIds: Set<string> = new Set(
    deletedRaw ? (JSON.parse(deletedRaw) as string[]) : [],
  );
  const now = Date.now();
  const toAdd: PromptPreset[] = PRESETS.filter(
    (p) => !existingIds.has(p.id) && !deletedIds.has(p.id),
  ).map((p, i) => ({
    ...p,
    isPreset: true,
    createdAt: now + i,
    updatedAt: now + i,
  }));

  // 旧データ（kind 未設定）には image を後付け
  let mutated = false;
  const patched = existing.map((p) => {
    if (!p.kind) {
      mutated = true;
      return { ...p, kind: "image" as PromptKind };
    }
    return p;
  });

  if (toAdd.length > 0 || mutated) write([...patched, ...toAdd]);
}

// ───── Public API ────────────────────────────────────────

export function listPromptPresets(kind?: PromptKind): PromptPreset[] {
  ensureSeeded();
  const all = read().map((p) => (p.kind ? p : { ...p, kind: "image" as PromptKind }));
  const filtered = kind ? all.filter((p) => p.kind === kind) : all;
  return filtered.sort((a, b) => {
    // ユーザー追加（!isPreset）を先頭に新しい順、その後にプリセット
    const aUser = !a.isPreset;
    const bUser = !b.isPreset;
    if (aUser && bUser) return b.createdAt - a.createdAt;
    if (aUser) return -1;
    if (bUser) return 1;
    return a.createdAt - b.createdAt;
  });
}

export function getPromptPreset(id: string): PromptPreset | undefined {
  return read().find((p) => p.id === id);
}

export function createPromptPreset(input: {
  kind?: PromptKind;
  label: string;
  styleSuffix: string;
  negativePrompt?: string;
  hint?: string;
}): PromptPreset {
  const id = "ppu_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const p: PromptPreset = {
    id,
    kind: input.kind ?? "image",
    label: input.label,
    styleSuffix: input.styleSuffix,
    negativePrompt: input.negativePrompt,
    hint: input.hint,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  write([...read(), p]);
  return p;
}

export function updatePromptPreset(id: string, patch: Partial<PromptPreset>): PromptPreset | undefined {
  const list = read();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
  write(list);
  return list[i];
}

export function deletePromptPreset(id: string): boolean {
  const list = read();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  write(next);
  rememberDeleted(id);
  return true;
}

/** プロンプト本体 + スタイルサフィックスを結合 */
export function composePrompt(userPrompt: string, preset?: PromptPreset): string {
  const base = userPrompt.trim();
  if (!preset || !preset.styleSuffix) return base;
  if (!base) return preset.styleSuffix;
  return `${base}. ${preset.styleSuffix}`;
}
