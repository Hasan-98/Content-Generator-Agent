/**
 * ユーザーが追加したカスタムフォントの保存・取得（localStorage）。
 *
 * 組み込みフォント (lib/fonts.ts の FONT_OPTIONS) はそのまま、
 * UI から追加したフォントだけ localStorage に保存する。
 *
 * 想定: Google Fonts に登録されているフォント。
 * 例) { googleFontName: "Klee One", weights: [400, 600] }
 *     → https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap
 */
import type { FontOption } from "./fonts";

export interface CustomFont extends FontOption {
  /** Google Fonts のフォント名（URL 用、空白はそのまま）。例: "Klee One" */
  googleFontName: string;
  /** 表示順制御や復元用 */
  createdAt: number;
}

const STORAGE_KEY = "image-creator/custom-fonts/v1";

function read(): CustomFont[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as CustomFont[]) : [];
  } catch {
    return [];
  }
}

function write(list: CustomFont[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listCustomFonts(): CustomFont[] {
  return read().sort((a, b) => a.createdAt - b.createdAt);
}

/** 追加（id が重複しないようサニタイズ） */
export function addCustomFont(input: {
  googleFontName: string;
  label: string;
  weights: number[];
  hint?: string;
}): CustomFont {
  const id = "cust-" + slugify(input.googleFontName) + "-" + Date.now().toString(36).slice(-4);
  const family = `"${input.googleFontName}", sans-serif`;
  const cf: CustomFont = {
    id,
    label: input.label || input.googleFontName,
    family,
    weights: input.weights.length > 0 ? input.weights : [400],
    googleFontName: input.googleFontName,
    hint: input.hint,
    createdAt: Date.now(),
  };
  write([...read(), cf]);
  return cf;
}

export function removeCustomFont(id: string): void {
  write(read().filter((f) => f.id !== id));
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
}

/** Google Fonts CSS API の URL を組み立てる */
export function buildGoogleFontsUrl(font: CustomFont): string {
  const family = font.googleFontName.replace(/ /g, "+");
  const wght = font.weights.length > 0 ? `:wght@${[...font.weights].sort((a, b) => a - b).join(";")}` : "";
  return `https://fonts.googleapis.com/css2?family=${family}${wght}&display=swap`;
}
