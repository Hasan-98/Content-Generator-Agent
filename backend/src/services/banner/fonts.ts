/**
 * 利用可能な日本語 Google Fonts の定義一覧。
 *
 * 実際の Web フォント読み込みは web/index.html の <link> で一括ロード。
 * Node 側のレンダリングでは Puppeteer 経由で同 URL のフォントを取得する。
 */
export interface FontOption {
  /** 識別子。BannerInputs の値として保存される（family と同じでも良いが分離しておく） */
  id: string;
  /** UI 表示用の人間向け名 */
  label: string;
  /** CSS font-family に渡す値（フォールバック含む） */
  family: string;
  /** 利用可能なウェイト */
  weights: number[];
  /** UI でのヒント（明朝/角丸/手書き/ドット 等） */
  hint?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "noto-sans-jp",
    label: "Noto Sans JP",
    family: '"Noto Sans JP", sans-serif',
    weights: [400, 500, 700, 900],
    hint: "標準ゴシック",
  },
  {
    id: "noto-serif-jp",
    label: "Noto Serif JP",
    family: '"Noto Serif JP", serif',
    weights: [400, 700, 900],
    hint: "明朝",
  },
  {
    id: "mplus-rounded-1c",
    label: "M PLUS Rounded 1c",
    family: '"M PLUS Rounded 1c", sans-serif',
    weights: [400, 500, 700, 900],
    hint: "角丸ゴシック",
  },
  {
    id: "zen-kaku-gothic-new",
    label: "Zen Kaku Gothic New",
    family: '"Zen Kaku Gothic New", sans-serif',
    weights: [400, 500, 700, 900],
    hint: "モダンゴシック",
  },
  {
    id: "zen-maru-gothic",
    label: "Zen Maru Gothic",
    family: '"Zen Maru Gothic", sans-serif',
    weights: [400, 500, 700, 900],
    hint: "やわらかい丸ゴシック",
  },
  {
    id: "yusei-magic",
    label: "Yusei Magic",
    family: '"Yusei Magic", sans-serif',
    weights: [400],
    hint: "手書き風ポップ",
  },
  {
    id: "sawarabi-mincho",
    label: "Sawarabi Mincho",
    family: '"Sawarabi Mincho", serif',
    weights: [400],
    hint: "細身の明朝",
  },
  {
    id: "kaisei-decol",
    label: "Kaisei Decol",
    family: '"Kaisei Decol", serif',
    weights: [400, 500, 700],
    hint: "クラシック明朝",
  },
  {
    id: "dot-gothic-16",
    label: "DotGothic16",
    family: '"DotGothic16", sans-serif',
    weights: [400],
    hint: "ドット",
  },
  {
    id: "rocknroll-one",
    label: "RocknRoll One",
    family: '"RocknRoll One", sans-serif',
    weights: [400],
    hint: "ロック",
  },
];

export const DEFAULT_FONT = FONT_OPTIONS[0];

/** Server-side: only built-in fonts are returned. */
export function listAllFonts(): FontOption[] {
  return FONT_OPTIONS;
}

export function getFont(idOrFamily: string | undefined): FontOption {
  if (!idOrFamily) return DEFAULT_FONT;
  const all = listAllFonts();
  return all.find((f) => f.id === idOrFamily || f.family === idOrFamily) ?? DEFAULT_FONT;
}
