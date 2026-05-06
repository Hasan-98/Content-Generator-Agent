/**
 * Rendervid 用の共通 helper。
 *
 * 役割:
 *   1. テンプレート JSON をファイルから読み込み
 *   2. defaults と inputs をマージ
 *   3. JSON 文字列レベルで {{key}} を自前置換（v0.1.0 のバグ対策）
 *   4. 残った {{key}} を検知して警告（タイポ防止）
 *   5. NodeRenderer をシングルトン化して再利用（毎回作ると Puppeteer が遅い）
 *   6. renderer.renderImage / renderVideo のラッパー
 *
 * 上流バグ:
 *   @rendervid/renderer-node@0.1.0 では renderer 側の inputs 補間が動作しない。
 *   公式 first-image サンプルでも {{headline}} が置換されないことを確認済み。
 *   本 helper では JSON 文字列レベルで自前置換しつつ、念のため公式 inputs も
 *   一緒に渡しておく（将来バグが直っても二重置換にはならない — 既に置換済みの
 *   テンプレートには {{...}} が残っていないため no-op）。
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { createNodeRenderer } from "@rendervid/renderer-node";

// ───── Types ─────────────────────────────────────────────────────────────────

export type InputValue = string | number | boolean;
export type Inputs = Record<string, InputValue>;

export interface TemplateInputDef {
  key: string;
  type?: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: InputValue;
}

export interface RendervidTemplate {
  name: string;
  description?: string;
  version?: string;
  output: {
    type: "image" | "video";
    width: number;
    height: number;
    duration?: number;
    fps?: number;
  };
  inputs?: TemplateInputDef[];
  defaults?: Inputs;
  composition: unknown;
  [key: string]: unknown;
}

export interface PreparedTemplate {
  template: RendervidTemplate;
  resolvedInputs: Inputs;
  unresolvedKeys: string[];
}

export interface RenderImageOptions {
  /** ファイルから読み込む場合のパス。{{key}} は inputs で補間される。 */
  templatePath?: string;
  /** 既に組み立て済みの template オブジェクトを直接渡す場合（補間不要）。 */
  template?: RendervidTemplate;
  inputs?: Inputs;
  outputPath: string;
  format?: "png" | "jpeg";
  quality?: number;
  renderWaitTime?: number;
  /** 残った {{key}} を検知したときの挙動。"error" / "warn"（既定）/ "silent" */
  onUnresolved?: "error" | "warn" | "silent";
}

export interface RenderImageResult {
  success: boolean;
  outputPath: string;
  fileSize?: number;
  durationMs: number;
  error?: string;
  unresolvedKeys: string[];
}

// ───── Internals ─────────────────────────────────────────────────────────────

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/** JSON 文字列の {{key}} を inputs で置換する。値は JSON-safe な文字列に。 */
export function interpolate(jsonText: string, inputs: Inputs): string {
  return jsonText.replace(PLACEHOLDER_RE, (full, key) => {
    if (!Object.prototype.hasOwnProperty.call(inputs, key)) return full;
    const v = inputs[key];
    // JSON 文字列内の置換なので、ダブルクオートやバックスラッシュをエスケープ。
    // ただし {{...}} は元々 "..." の中にいるので、JSON.stringify した値の
    // 先頭/末尾のクオートを剥がして埋め込む（リテラルの中身として扱う）。
    return JSON.stringify(String(v)).slice(1, -1);
  });
}

/** テンプレート文字列から残存 {{key}} の一覧を返す（重複排除）。 */
export function findUnresolvedKeys(jsonText: string): string[] {
  const keys = new Set<string>();
  for (const m of jsonText.matchAll(PLACEHOLDER_RE)) keys.add(m[1]);
  return [...keys];
}

/**
 * テンプレートを読み込んで inputs を解決した状態で返す。
 * - defaults と inputs をマージ（inputs 優先）
 * - JSON 文字列レベルで {{key}} を置換
 * - 残存 {{key}} を返す
 */
export function prepareTemplate(
  templatePath: string,
  inputs: Inputs = {},
): PreparedTemplate {
  const rawText = readFileSync(templatePath, "utf-8");
  const rawTemplate = JSON.parse(rawText) as RendervidTemplate;
  const merged: Inputs = { ...(rawTemplate.defaults ?? {}), ...inputs };
  const interpolated = interpolate(rawText, merged);
  const template = JSON.parse(interpolated) as RendervidTemplate;
  return {
    template,
    resolvedInputs: merged,
    unresolvedKeys: findUnresolvedKeys(interpolated),
  };
}

// ───── Renderer singleton ────────────────────────────────────────────────────

let _renderer: ReturnType<typeof createNodeRenderer> | null = null;

/** プロセス内で 1 つだけ NodeRenderer を保持して使い回す。 */
export function getRenderer(): ReturnType<typeof createNodeRenderer> {
  if (!_renderer) _renderer = createNodeRenderer();
  return _renderer;
}

/** テスト用に明示的に破棄したいときの口（通常は不要）。 */
export function resetRenderer(): void {
  _renderer = null;
}

// ───── Public render API ─────────────────────────────────────────────────────

/**
 * テンプレートと inputs から PNG/JPEG を生成する。
 * 出力先ディレクトリが無ければ自動作成。
 */
export async function renderImage(
  opts: RenderImageOptions,
): Promise<RenderImageResult> {
  const onUnresolved = opts.onUnresolved ?? "warn";

  let prepared: PreparedTemplate;
  let source: string;
  if (opts.templatePath) {
    prepared = prepareTemplate(opts.templatePath, opts.inputs);
    source = opts.templatePath;
  } else if (opts.template) {
    // 直接渡された template オブジェクト。{{key}} 補間は不要だが、
    // 残存 placeholder のチェックだけ実施する。
    const text = JSON.stringify(opts.template);
    prepared = {
      template: opts.template,
      resolvedInputs: opts.inputs ?? {},
      unresolvedKeys: findUnresolvedKeys(text),
    };
    source = `<template:${opts.template.name}>`;
  } else {
    throw new Error("renderImage: templatePath か template のどちらかが必須です");
  }

  if (prepared.unresolvedKeys.length > 0) {
    const msg = `[rendervid] 未解決の placeholder: {{${prepared.unresolvedKeys.join("}}, {{")}}}  (source: ${source})`;
    if (onUnresolved === "error") throw new Error(msg);
    if (onUnresolved === "warn") console.warn(msg);
  }

  const outDir = dirname(opts.outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const renderer = getRenderer();
  const t0 = Date.now();
  const result = await renderer.renderImage({
    // RendervidTemplate と公式 Template は構造的にほぼ同じだが、
    // 公式型は inputs/defaults を必須に近い形で要求するため明示キャストする。
    template: prepared.template as unknown as Parameters<typeof renderer.renderImage>[0]["template"],
    // 念のため公式 API にも渡す（将来 bug fix されたときの保険）。
    // 既に文字列レベルで置換済みなので二重置換は起きない。
    inputs: prepared.resolvedInputs,
    outputPath: opts.outputPath,
    format: opts.format ?? "png",
    quality: opts.quality ?? 100,
    renderWaitTime: opts.renderWaitTime ?? 500,
  });
  const durationMs = Date.now() - t0;

  return {
    success: !!result.success,
    outputPath: opts.outputPath,
    fileSize: result.fileSize,
    durationMs,
    error: result.error,
    unresolvedKeys: prepared.unresolvedKeys,
  };
}

// ───── CLI helper ────────────────────────────────────────────────────────────

/**
 * `--key value` 形式の引数を Inputs に変換する。
 * 値が "true"/"false" は boolean、数値文字列は number にキャスト。
 */
export function parseCliArgs(argv: string[] = process.argv.slice(2)): Inputs {
  const out: Inputs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) continue;
    if (next === "true") out[key] = true;
    else if (next === "false") out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(next)) out[key] = Number(next);
    else out[key] = next;
    i++;
  }
  return out;
}
