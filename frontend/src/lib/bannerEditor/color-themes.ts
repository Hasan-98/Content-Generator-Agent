/**
 * カラーテーマ（背景色 / 文字色 / バッジ色）の定義と CRUD。
 *
 * - 「テーマ」は色の組み合わせのみ
 * - localStorage に保存（プリセットも初回投入後はユーザー編集可能）
 */

export interface ColorTheme {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  badgeColor: string;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "image-creator/color-themes/v1";
const SEED_FLAG_KEY = "image-creator/color-themes/seeded/v1";

export function genId(): string {
  return (
    "clr_" +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

const PRESETS: Array<Omit<ColorTheme, "id" | "createdAt" | "updatedAt" | "isPreset">> = [
  { name: "ダークネイビー × 赤バッジ", backgroundColor: "#0f172a", textColor: "#ffffff", badgeColor: "#ef4444" },
  { name: "ロイヤルブルー × 黄バッジ", backgroundColor: "#1e3a8a", textColor: "#ffffff", badgeColor: "#fbbf24" },
  { name: "ワインレッド × 金バッジ",   backgroundColor: "#7f1d1d", textColor: "#fef3c7", badgeColor: "#fbbf24" },
  { name: "墨黒 × 金茶バッジ",         backgroundColor: "#1c1917", textColor: "#fafaf9", badgeColor: "#a16207" },
  { name: "森緑 × オレンジバッジ",     backgroundColor: "#064e3b", textColor: "#ecfccb", badgeColor: "#f97316" },
  { name: "ペールピンク × 紫バッジ",   backgroundColor: "#fce7f3", textColor: "#831843", badgeColor: "#a21caf" },
  { name: "クリーム × 茶バッジ",       backgroundColor: "#fef3c7", textColor: "#1c1917", badgeColor: "#92400e" },
  { name: "サニーイエロー × 赤バッジ", backgroundColor: "#fde047", textColor: "#1c1917", badgeColor: "#dc2626" },
  { name: "ティール × ピンクバッジ",   backgroundColor: "#0d9488", textColor: "#ffffff", badgeColor: "#ec4899" },
  { name: "パープル × ライムバッジ",   backgroundColor: "#581c87", textColor: "#f3e8ff", badgeColor: "#84cc16" },
  { name: "ホワイト × 青バッジ",       backgroundColor: "#ffffff", textColor: "#1e293b", badgeColor: "#3b82f6" },
  { name: "グレー × 赤バッジ",         backgroundColor: "#374151", textColor: "#f9fafb", badgeColor: "#ef4444" },
];

function readAll(): ColorTheme[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as ColorTheme[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: ColorTheme[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function ensureSeeded(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_FLAG_KEY)) return;
  if (readAll().length === 0) {
    const now = Date.now();
    const seeded: ColorTheme[] = PRESETS.map((p, i) => ({
      ...p,
      id: `clr_preset_${String(i).padStart(3, "0")}`,
      isPreset: true,
      createdAt: now + i,
      updatedAt: now + i,
    }));
    writeAll(seeded);
  }
  window.localStorage.setItem(SEED_FLAG_KEY, "1");
}

export function listColorThemes(): ColorTheme[] {
  ensureSeeded();
  return readAll().sort((a, b) => a.createdAt - b.createdAt);
}

export function getColorTheme(id: string): ColorTheme | undefined {
  return readAll().find((t) => t.id === id);
}

export function createColorTheme(
  name: string,
  colors: { backgroundColor: string; textColor: string; badgeColor: string },
): ColorTheme {
  const t: ColorTheme = {
    id: genId(),
    name,
    ...colors,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = readAll();
  list.push(t);
  writeAll(list);
  return t;
}

export function updateColorTheme(id: string, patch: Partial<ColorTheme>): ColorTheme | undefined {
  const list = readAll();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return undefined;
  list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
  writeAll(list);
  return list[i];
}

export function deleteColorTheme(id: string): boolean {
  const list = readAll();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

export function resetColorThemes(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SEED_FLAG_KEY);
  ensureSeeded();
}
