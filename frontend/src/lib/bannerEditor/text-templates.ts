/**
 * テキストテンプレート（フォント・サイズ倍率・揃え系）の定義と CRUD。
 *
 * - 「テンプレート」はテキストの見た目（フォント・太さ・サイズ・揃え）のみ
 * - 色は ColorTheme、テキスト本文は BannerInputs に分離
 * - localStorage に保存（プリセットも初回投入後はユーザー編集可能）
 */
import type { TextStyle } from "./build-banner-template";
import { FONT_OPTIONS } from "./fonts";

const F = (id: string) =>
  FONT_OPTIONS.find((f) => f.id === id)?.family ?? FONT_OPTIONS[0].family;

export interface TextTemplate {
  id: string;
  name: string;
  badgeStyle: TextStyle;
  subtitleStyle: TextStyle;
  titleStyle: TextStyle;
  bodyStyle: TextStyle;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "image-creator/text-templates/v1";
const SEED_FLAG_KEY = "image-creator/text-templates/seeded/v1";

export function genId(): string {
  return (
    "txt_" +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

/**
 * プリセット定義。
 * id は固定（"txt_preset_<slug>"）にしておき、ensureSeeded() で
 * 「localStorage にない id のものだけ追加」する方式。
 * → 新規プリセットを増やしてもアプリ再読み込みで自動補充される。
 * → ユーザーが削除したプリセットは復活しない。
 */
const PRESETS: Array<Omit<TextTemplate, "createdAt" | "updatedAt" | "isPreset">> = [
  {
    id: "txt_preset_basic",
    name: "ベーシック",
    badgeStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-sans-jp"), fontWeight: 700, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_thick_impact",
    name: "極太インパクト",
    badgeStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-sans-jp"), fontWeight: 700, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, fontSize: 1.4, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 500, textAlign: "center" },
  },
  {
    id: "txt_preset_serif_chic",
    name: "明朝シック",
    badgeStyle:    { fontFamily: F("noto-serif-jp"), fontWeight: 700, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-serif-jp"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-serif-jp"), fontWeight: 900, textAlign: "center" },
    bodyStyle:     { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_serif_classic",
    name: "明朝クラシック",
    badgeStyle:    { fontFamily: F("kaisei-decol"), fontWeight: 700, textAlign: "center" },
    subtitleStyle: { fontFamily: F("kaisei-decol"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("kaisei-decol"), fontWeight: 700, fontSize: 1.1, textAlign: "center" },
    bodyStyle:     { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_rounded",
    name: "丸ゴシック",
    badgeStyle:    { fontFamily: F("mplus-rounded-1c"), fontWeight: 900, textAlign: "center" },
    subtitleStyle: { fontFamily: F("mplus-rounded-1c"), fontWeight: 500, textAlign: "center" },
    titleStyle:    { fontFamily: F("mplus-rounded-1c"), fontWeight: 900, textAlign: "center" },
    bodyStyle:     { fontFamily: F("mplus-rounded-1c"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_soft_round",
    name: "やわらか丸ゴシック",
    badgeStyle:    { fontFamily: F("zen-maru-gothic"), fontWeight: 700, textAlign: "center" },
    subtitleStyle: { fontFamily: F("zen-maru-gothic"), fontWeight: 500, textAlign: "center" },
    titleStyle:    { fontFamily: F("zen-maru-gothic"), fontWeight: 900, textAlign: "center" },
    bodyStyle:     { fontFamily: F("zen-maru-gothic"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_modern",
    name: "モダンゴシック",
    badgeStyle:    { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 900, textAlign: "center" },
    subtitleStyle: { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 500, textAlign: "center" },
    titleStyle:    { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 900, textAlign: "center" },
    bodyStyle:     { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_handwriting",
    name: "手書きポップ",
    badgeStyle:    { fontFamily: F("yusei-magic"), fontWeight: 400, textAlign: "center" },
    subtitleStyle: { fontFamily: F("yusei-magic"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("yusei-magic"), fontWeight: 400, textAlign: "center" },
    bodyStyle:     { fontFamily: F("mplus-rounded-1c"), fontWeight: 700, textAlign: "center" },
  },
  {
    id: "txt_preset_dot",
    name: "ドット・ピクセル",
    badgeStyle:    { fontFamily: F("dot-gothic-16"), fontWeight: 400, textAlign: "center" },
    subtitleStyle: { fontFamily: F("dot-gothic-16"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("dot-gothic-16"), fontWeight: 400, fontSize: 1.2, textAlign: "center" },
    bodyStyle:     { fontFamily: F("dot-gothic-16"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_rock",
    name: "ロックンロール",
    badgeStyle:    { fontFamily: F("rocknroll-one"), fontWeight: 400, textAlign: "center" },
    subtitleStyle: { fontFamily: F("rocknroll-one"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("rocknroll-one"), fontWeight: 400, fontSize: 1.2, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 700, textAlign: "center" },
  },
  {
    id: "txt_preset_left_modern",
    name: "左寄せモダン",
    badgeStyle:    { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 900, textAlign: "left" },
    subtitleStyle: { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 500, textAlign: "left" },
    titleStyle:    { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 900, textAlign: "left" },
    bodyStyle:     { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 400, textAlign: "left" },
  },
  {
    id: "txt_preset_left_serif",
    name: "左寄せ明朝",
    badgeStyle:    { fontFamily: F("noto-serif-jp"), fontWeight: 700, textAlign: "left" },
    subtitleStyle: { fontFamily: F("noto-serif-jp"), fontWeight: 400, textAlign: "left" },
    titleStyle:    { fontFamily: F("noto-serif-jp"), fontWeight: 900, textAlign: "left" },
    bodyStyle:     { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "left" },
  },
  {
    id: "txt_preset_right_elegant",
    name: "右寄せエレガント",
    badgeStyle:    { fontFamily: F("kaisei-decol"), fontWeight: 700, textAlign: "right" },
    subtitleStyle: { fontFamily: F("kaisei-decol"), fontWeight: 400, textAlign: "right" },
    titleStyle:    { fontFamily: F("kaisei-decol"), fontWeight: 700, textAlign: "right" },
    bodyStyle:     { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "right" },
  },
  {
    id: "txt_preset_minimal",
    name: "ミニマル",
    badgeStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 500, fontSize: 0.85, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-sans-jp"), fontWeight: 400, fontSize: 0.85, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 500, fontSize: 0.9, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 400, fontSize: 0.85, textAlign: "center" },
  },
  {
    id: "txt_preset_giant_title",
    name: "巨大タイトル",
    badgeStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, fontSize: 0.85, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-sans-jp"), fontWeight: 700, fontSize: 0.85, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, fontSize: 1.8, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 400, fontSize: 0.85, textAlign: "center" },
  },
  {
    id: "txt_preset_serif_x_sans",
    name: "セリフ × ゴシック",
    badgeStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-sans-jp"), fontWeight: 500, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-serif-jp"), fontWeight: 900, fontSize: 1.1, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_sans_x_serif",
    name: "ゴシック × 明朝",
    badgeStyle:    { fontFamily: F("noto-serif-jp"), fontWeight: 700, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-serif-jp"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-sans-jp"), fontWeight: 900, fontSize: 1.2, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-serif-jp"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_pop_round",
    name: "ポップ × 角丸",
    badgeStyle:    { fontFamily: F("rocknroll-one"), fontWeight: 400, textAlign: "center" },
    subtitleStyle: { fontFamily: F("mplus-rounded-1c"), fontWeight: 500, textAlign: "center" },
    titleStyle:    { fontFamily: F("yusei-magic"), fontWeight: 400, fontSize: 1.1, textAlign: "center" },
    bodyStyle:     { fontFamily: F("mplus-rounded-1c"), fontWeight: 700, textAlign: "center" },
  },
  {
    id: "txt_preset_delicate_serif",
    name: "繊細な明朝",
    badgeStyle:    { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "center" },
    subtitleStyle: { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "center" },
    titleStyle:    { fontFamily: F("sawarabi-mincho"), fontWeight: 400, fontSize: 1.1, textAlign: "center" },
    bodyStyle:     { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "center" },
  },
  {
    id: "txt_preset_double_impact",
    name: "ダブルインパクト",
    badgeStyle:    { fontFamily: F("rocknroll-one"), fontWeight: 400, fontSize: 1.1, textAlign: "center" },
    subtitleStyle: { fontFamily: F("noto-sans-jp"), fontWeight: 700, textAlign: "center" },
    titleStyle:    { fontFamily: F("rocknroll-one"), fontWeight: 400, fontSize: 1.5, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"), fontWeight: 500, textAlign: "center" },
  },
  // ─── 「上下に離れた」配置 ─────────────────────────────────────────────
  {
    id: "txt_preset_split_default",
    name: "上下分離（タイトル上・本文下）",
    badgeStyle:    { fontFamily: F("noto-sans-jp"),     fontWeight: 900, textAlign: "center", offsetY: -350 },
    subtitleStyle: { fontFamily: F("noto-sans-jp"),     fontWeight: 700, textAlign: "center", offsetY: -300 },
    titleStyle:    { fontFamily: F("noto-sans-jp"),     fontWeight: 900, textAlign: "center", offsetY: -200 },
    bodyStyle:     { fontFamily: F("noto-sans-jp"),     fontWeight: 400, textAlign: "center", offsetY: 350 },
  },
  {
    id: "txt_preset_split_serif",
    name: "上下分離・明朝",
    badgeStyle:    { fontFamily: F("noto-serif-jp"),    fontWeight: 700, textAlign: "center", offsetY: -350 },
    subtitleStyle: { fontFamily: F("noto-serif-jp"),    fontWeight: 400, textAlign: "center", offsetY: -300 },
    titleStyle:    { fontFamily: F("noto-serif-jp"),    fontWeight: 900, textAlign: "center", offsetY: -200 },
    bodyStyle:     { fontFamily: F("sawarabi-mincho"),  fontWeight: 400, textAlign: "center", offsetY: 350 },
  },
  {
    id: "txt_preset_split_extreme",
    name: "バッジ上端・本文下端",
    badgeStyle:    { fontFamily: F("rocknroll-one"),    fontWeight: 400, textAlign: "center", offsetY: -400 },
    subtitleStyle: { fontFamily: F("noto-sans-jp"),     fontWeight: 700, textAlign: "center" },
    titleStyle:    { fontFamily: F("noto-sans-jp"),     fontWeight: 900, fontSize: 1.2, textAlign: "center" },
    bodyStyle:     { fontFamily: F("noto-sans-jp"),     fontWeight: 400, textAlign: "center", offsetY: 400 },
  },
  {
    id: "txt_preset_tall_spaced",
    name: "縦長：間隔広め",
    badgeStyle:    { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 900, textAlign: "center", offsetY: -200 },
    subtitleStyle: { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 500, textAlign: "center", offsetY: -100 },
    titleStyle:    { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 900, fontSize: 1.1, textAlign: "center" },
    bodyStyle:     { fontFamily: F("zen-kaku-gothic-new"), fontWeight: 400, textAlign: "center", offsetY: 200 },
  },
  {
    id: "txt_preset_top_badge",
    name: "上にバッジ・タイトル中央",
    badgeStyle:    { fontFamily: F("mplus-rounded-1c"), fontWeight: 900, textAlign: "center", offsetY: -300 },
    subtitleStyle: { fontFamily: F("mplus-rounded-1c"), fontWeight: 500, textAlign: "center" },
    titleStyle:    { fontFamily: F("mplus-rounded-1c"), fontWeight: 900, fontSize: 1.3, textAlign: "center" },
    bodyStyle:     { fontFamily: F("mplus-rounded-1c"), fontWeight: 400, textAlign: "center" },
  },
];

// ───── Storage ───────────────────────────────────────────────────────────────

function readAll(): TextTemplate[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as TextTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: TextTemplate[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * プリセット ID を見て、まだ localStorage に無いものだけ追加する。
 * → 新しい PRESETS を増やしたら、再読み込み時に自動補充される。
 * → ユーザーが削除したプリセットは復活しない（ID が削除済みリストに入る）。
 */
function ensureSeeded(): void {
  if (typeof window === "undefined") return;

  const existing = readAll();
  const existingIds = new Set(existing.map((t) => t.id));

  // 削除済みプリセット ID（復活させない用）
  const deletedRaw = window.localStorage.getItem(DELETED_PRESET_IDS_KEY);
  const deletedIds: Set<string> = new Set(
    deletedRaw ? (JSON.parse(deletedRaw) as string[]) : [],
  );

  const now = Date.now();
  const toAdd: TextTemplate[] = PRESETS.filter(
    (p) => !existingIds.has(p.id) && !deletedIds.has(p.id),
  ).map((p, i) => ({
    ...p,
    isPreset: true,
    createdAt: now + i,
    updatedAt: now + i,
  }));

  if (toAdd.length > 0) writeAll([...existing, ...toAdd]);
  // SEED_FLAG_KEY は使わない（毎回チェックして不足分を追加）
  window.localStorage.setItem(SEED_FLAG_KEY, "1");
}

const DELETED_PRESET_IDS_KEY = "image-creator/text-templates/deleted-preset-ids/v1";

function rememberDeletedPreset(id: string): void {
  if (typeof window === "undefined") return;
  if (!id.startsWith("txt_preset_")) return;
  const raw = window.localStorage.getItem(DELETED_PRESET_IDS_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(id)) {
    ids.push(id);
    window.localStorage.setItem(DELETED_PRESET_IDS_KEY, JSON.stringify(ids));
  }
}

// ───── Public API ────────────────────────────────────────────────────────────

export function listTextTemplates(): TextTemplate[] {
  ensureSeeded();
  // ユーザー作成（!isPreset）を先頭に新しい順、その後にプリセットを元の順で並べる。
  return readAll().sort((a, b) => {
    const aUser = !a.isPreset;
    const bUser = !b.isPreset;
    if (aUser && bUser) return b.createdAt - a.createdAt; // 新しい順
    if (aUser) return -1; // ユーザー作成を先に
    if (bUser) return 1;
    return a.createdAt - b.createdAt; // プリセットは元の順
  });
}

export function getTextTemplate(id: string): TextTemplate | undefined {
  return readAll().find((t) => t.id === id);
}

export function createTextTemplate(
  name: string,
  styles: Omit<TextTemplate, "id" | "name" | "createdAt" | "updatedAt" | "isPreset">,
): TextTemplate {
  const t: TextTemplate = {
    id: genId(),
    name,
    badgeStyle: styles.badgeStyle,
    subtitleStyle: styles.subtitleStyle,
    titleStyle: styles.titleStyle,
    bodyStyle: styles.bodyStyle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = readAll();
  list.push(t);
  writeAll(list);
  return t;
}

export function updateTextTemplate(id: string, patch: Partial<TextTemplate>): TextTemplate | undefined {
  const list = readAll();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return undefined;
  list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
  writeAll(list);
  return list[i];
}

export function deleteTextTemplate(id: string): boolean {
  const list = readAll();
  const next = list.filter((t) => t.id !== id);
  rememberDeletedPreset(id); // プリセット ID なら復活させない
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

export function resetTextTemplates(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SEED_FLAG_KEY);
  ensureSeeded();
}
