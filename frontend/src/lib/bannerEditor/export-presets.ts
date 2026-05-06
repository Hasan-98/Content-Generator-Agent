/**
 * 書き出しプリセット定義。
 *
 * - 編集用の BANNER_SIZES（プレビューに使う）とは別に、
 *   「書き出し時にだけ使うサイズの組み合わせ」を集約。
 * - 各プリセットは「ボタン 1 つで N 枚連続書き出し」される。
 */

export interface ExportSize {
  id: string;
  label: string;
  width: number;
  height: number;
  /** フォント追加倍率（極小バナーで読めるよう底上げ） */
  fontBoost?: number;
}

export interface ExportPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  sizes: ExportSize[];
}

// ───── Amazon DSP（5 サイズ） ─────────────────────────────────
// Amazon Demand-Side Platform の標準クリエイティブサイズ。
// 細長サイズ（320×50 等）はテキストが小さくなるので、入力はシンプルに保つこと推奨。
export const AMAZON_DSP_PRESET: ExportPreset = {
  id: "amazon-dsp",
  label: "Amazon DSP",
  icon: "🛒",
  description: "Amazon DSP 標準 5 サイズで一括書き出し",
  sizes: [
    // 縦長 300×1050: 短辺 300 で自動スケール 0.28 → 文字小さすぎ。2.5倍ブースト
    { id: "dsp-300x1050", label: "ハーフページ縦長", width: 300, height: 1050, fontBoost: 2.5 },
    // 320×50: 短辺 50 で自動スケール 0.046 → 極小。6倍ブーストでなんとか視認可能
    { id: "dsp-320x50",   label: "モバイルバナー",   width: 320, height: 50, fontBoost: 6.0 },
    { id: "dsp-336x280",  label: "中レクタングル",   width: 336, height: 280 },
    { id: "dsp-480x400",  label: "中サイズ",         width: 480, height: 400 },
    { id: "dsp-1920x1080",label: "フル HD",          width: 1920, height: 1080 },
  ],
};

// ───── Google Display Network（9 サイズ） ─────────────────────
// Google 広告の代表的なディスプレイバナーサイズ。
// 短辺が小さいバナーは fontBoost で文字を底上げする。
export const GOOGLE_DISPLAY_PRESET: ExportPreset = {
  id: "google-display",
  label: "Google Display",
  icon: "🔗",
  description: "Google ディスプレイ広告 標準 9 サイズで一括書き出し",
  sizes: [
    { id: "gdn-300x250",   label: "中レクタングル",       width:  300, height:  250, fontBoost: 2.0 },
    { id: "gdn-336x280",   label: "大レクタングル",       width:  336, height:  280, fontBoost: 1.8 },
    { id: "gdn-728x90",    label: "リーダーボード",       width:  728, height:   90, fontBoost: 5.0 },
    { id: "gdn-970x90",    label: "大リーダーボード",     width:  970, height:   90, fontBoost: 5.0 },
    { id: "gdn-970x250",   label: "ビルボード",           width:  970, height:  250, fontBoost: 2.0 },
    { id: "gdn-320x50",    label: "モバイルバナー",       width:  320, height:   50, fontBoost: 6.0 },
    { id: "gdn-320x100",   label: "大モバイルバナー",     width:  320, height:  100, fontBoost: 4.0 },
    { id: "gdn-1200x628",  label: "横長 (SNS シェア)",   width: 1200, height:  628 },
    { id: "gdn-1200x1200", label: "正方形",               width: 1200, height: 1200 },
  ],
};

export const ALL_EXPORT_PRESETS: ExportPreset[] = [AMAZON_DSP_PRESET, GOOGLE_DISPLAY_PRESET];
