/**
 * 出力サイズの定義一覧。
 *
 * - id  : CLI 引数 (--size <id>) と出力ファイル名に使う
 * - label: ログ表示用の人間向け名
 * - width / height: 出力ピクセルサイズ
 *
 * デザイン側のスケール基準は「短辺 1080px のとき titleSize=88px」。
 * build-banner-template.ts の中で短辺に応じて全フォント・余白を等倍スケールする。
 */
export interface BannerSize {
  id: string;
  label: string;
  width: number;
  height: number;
  /**
   * フォントサイズの追加倍率（既定 1.0）。
   * 短辺が極端に小さいサイズ（モバイルバナー 320×50 等）では、
   * 短辺基準の自動スケールだと文字が読めないため、ここで底上げする。
   */
  fontBoost?: number;
}

export const BANNER_SIZES: BannerSize[] = [
  { id: "instagram-square",    label: "Instagram 正方形",     width: 1080, height: 1080 },
  { id: "instagram-story",     label: "Instagram ストーリー",  width: 1080, height: 1920 },
  { id: "instagram-landscape", label: "Instagram 横長",       width: 1080, height:  566 },
  { id: "line-square",         label: "LINE 正方形",          width: 1040, height: 1040 },
  { id: "twitter-card",        label: "Twitter カード",       width: 1200, height:  630 },
  { id: "facebook-ad",         label: "Facebook 広告",        width: 1200, height:  628 },
  { id: "youtube-video",       label: "YouTube 動画",         width: 1920, height: 1080 },
  { id: "instagram-feed-video", label: "Instagram フィード動画", width: 1080, height: 1080 },
];

export function getSize(id: string): BannerSize {
  const s = BANNER_SIZES.find((s) => s.id === id);
  if (!s) {
    const all = BANNER_SIZES.map((s) => s.id).join(", ");
    throw new Error(`unknown size id: "${id}" (available: ${all})`);
  }
  return s;
}
