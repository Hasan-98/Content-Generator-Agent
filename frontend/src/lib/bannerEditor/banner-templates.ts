/**
 * バナー入力値（BannerInputs スナップショット）の保存・管理。
 *
 * - localStorage に保存（キー: STORAGE_KEY）
 * - サイズ非依存：同じテンプレートを別サイズに適用可能
 * - プリセットは初回起動時に自動投入（ユーザー追加分とは isPreset で区別）
 */
import type { BannerInputs } from "./build-banner-template";
import { PRESET_TEMPLATES } from "./preset-templates";

export interface BannerTemplate {
  id: string;
  name: string;
  inputs: BannerInputs;
  isPreset?: boolean; // プリセット由来。削除/上書きはできるが目印として残す
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "image-creator/banner-templates/v1";
const SEED_FLAG_KEY = "image-creator/banner-templates/seeded/v1";

function nowMs(): number {
  return Date.now();
}

export function genId(): string {
  return (
    "tpl_" +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

function readAll(): BannerTemplate[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as BannerTemplate[];
  } catch {
    return [];
  }
}

function writeAll(list: BannerTemplate[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** 初回起動時にプリセットを投入する（既存があれば何もしない） */
function ensureSeeded(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_FLAG_KEY)) return;
  const existing = readAll();
  if (existing.length === 0) {
    const seeded: BannerTemplate[] = PRESET_TEMPLATES.map((p) => ({
      id: genId(),
      name: p.name,
      inputs: p.inputs,
      isPreset: true,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    }));
    writeAll(seeded);
  }
  window.localStorage.setItem(SEED_FLAG_KEY, "1");
}

// ───── Public API ────────────────────────────────────────────────────────────

export function listTemplates(): BannerTemplate[] {
  ensureSeeded();
  return readAll().sort((a, b) => a.createdAt - b.createdAt);
}

export function getTemplate(id: string): BannerTemplate | undefined {
  return readAll().find((t) => t.id === id);
}

export function createTemplate(name: string, inputs: BannerInputs): BannerTemplate {
  const t: BannerTemplate = {
    id: genId(),
    name,
    inputs,
    createdAt: nowMs(),
    updatedAt: nowMs(),
  };
  const list = readAll();
  list.push(t);
  writeAll(list);
  return t;
}

export function updateTemplate(
  id: string,
  patch: { name?: string; inputs?: BannerInputs },
): BannerTemplate | undefined {
  const list = readAll();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return undefined;
  const next: BannerTemplate = {
    ...list[i],
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.inputs !== undefined ? { inputs: patch.inputs } : {}),
    updatedAt: nowMs(),
  };
  list[i] = next;
  writeAll(list);
  return next;
}

export function duplicateTemplate(id: string): BannerTemplate | undefined {
  const src = getTemplate(id);
  if (!src) return undefined;
  return createTemplate(`${src.name} のコピー`, JSON.parse(JSON.stringify(src.inputs)));
}

export function deleteTemplate(id: string): boolean {
  const list = readAll();
  const next = list.filter((t) => t.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

/** すべて消してプリセットを再投入（デバッグ・リセット用） */
export function resetAllTemplates(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SEED_FLAG_KEY);
  ensureSeeded();
}
