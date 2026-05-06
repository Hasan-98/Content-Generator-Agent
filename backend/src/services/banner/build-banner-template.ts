/**
 * バナーの Rendervid テンプレートをサイズと入力値から動的生成する。
 *
 * デザイン基準:
 *   - スケール = min(width, height) / 1080
 *   - badge → subtitle → title → body の順に縦中央スタック
 *   - 各要素のフォントサイズ・マージンはスケールで等倍縮小
 *   - 各要素は fontFamily / fontWeight / fontSize 倍率 / offsetY を個別指定可能
 */
import type { BannerSize } from "./sizes";
// type-only import で render-helper の Node 専用 API（fs 等）を持ち込まない
import type { RendervidTemplate } from "./render-helper";
import { DEFAULT_FONT, getFont } from "./fonts";

/** 各テキスト要素の個別スタイル */
export type TextAlign = "left" | "center" | "right";

/** 縁取り */
export interface TextStrokeStyle {
  enabled: boolean;
  color: string;   // 例: "#000000"
  width: number;   // 1080 基準 px、buildBannerTemplate でスケール掛ける
}

/** ドロップシャドウ */
export interface TextShadowStyle {
  enabled: boolean;
  color: string;   // 例: "rgba(0,0,0,0.6)" or "#000000"
  blur: number;    // 1080 基準 px
  offsetX: number; // 1080 基準 px
  offsetY: number; // 1080 基準 px
}

export interface TextStyle {
  /** font-family（FontOption.family または id を渡す。省略時は DEFAULT_FONT） */
  fontFamily?: string;
  /** ウェイト 400/500/700/900 など */
  fontWeight?: number;
  /** 基本フォントサイズに掛ける倍率（0.5〜2.0、省略時 1.0） */
  fontSize?: number;
  /** 縦位置オフセット px（1080 基準、+下/-上、省略時 0） */
  offsetY?: number;
  /** 水平方向の揃え。省略時 "center" */
  textAlign?: TextAlign;
  /** 文字色（個別指定）。未指定なら inputs.textColor が使われる */
  color?: string;
  /** 縁取り（任意、enabled=false で無効化） */
  stroke?: TextStrokeStyle;
  /** ドロップシャドウ（任意、enabled=false で無効化） */
  shadow?: TextShadowStyle;
}

export type VerticalLayout = "top" | "center" | "bottom";
export type WritingMode = "horizontal" | "vertical-rl";

export interface BannerInputs {
  title: string;
  subtitle?: string;
  badge?: string;
  body?: string;
  backgroundColor?: string;
  textColor?: string;
  badgeColor?: string;

  // 背景画像（任意）。指定された場合は背景色の上に重ねて描画
  backgroundImageUrl?: string;
  /** 背景画像の不透明度 0〜1。0 = 完全透明（背景色のみ）、1 = 画像のみ。既定 1.0 */
  backgroundImageOpacity?: number;
  /** 背景画像の X 位置オフセット（1080 基準 px、+右/-左、既定 0） */
  backgroundImageOffsetX?: number;
  /** 背景画像の Y 位置オフセット（1080 基準 px、+下/-上、既定 0） */
  backgroundImageOffsetY?: number;
  /** 背景画像の拡大率（1.0 = キャンバスにフィット、1.5 = 150% 拡大、既定 1.0） */
  backgroundImageScale?: number;
  /** 背景が動画のときの開始秒（カットイン、既定 0、互換用。segments があれば無視） */
  backgroundVideoTrimStart?: number;
  /** 背景が動画のときの終了秒（カットアウト、未指定なら動画末尾まで、互換用。segments があれば無視） */
  backgroundVideoTrimEnd?: number;
  /**
   * 「再生する区間」の配列（複数カット）。
   * 例: [{start:0, end:1.5}, {start:3.0, end:5.0}] のように残したい区間だけを並べる。
   * 配列が空 or 未指定なら trimStart/trimEnd（または動画全体）が使われる。
   */
  backgroundVideoSegments?: Array<{ start: number; end: number }>;

  // ロゴ（背景画像 + テキストの上に重ねて描画される）
  logoUrl?: string;
  /** ロゴの配置位置（"custom" 時は logoX/logoY を使用） */
  logoPosition?: "top-left" | "top-center" | "top-right"
    | "middle-left" | "center" | "middle-right"
    | "bottom-left" | "bottom-center" | "bottom-right"
    | "custom";
  /** logoPosition === "custom" のときの X 座標（1080 基準 px、ロゴ左上基準） */
  logoX?: number;
  /** logoPosition === "custom" のときの Y 座標（1080 基準 px、ロゴ左上基準） */
  logoY?: number;
  /** ロゴサイズ（1080 基準 px、既定 120） */
  logoSize?: number;
  /** ロゴ余白（端からの距離、1080 基準 px、既定 40） */
  logoMargin?: number;
  /** ロゴ不透明度 0〜1（既定 1.0） */
  logoOpacity?: number;

  // ─── 動画カード用：アバター（ロゴと同じ式の 9 ポジション + 微調整） ─────
  /** カードレイアウト（後方互換用・未使用）。新方式は avatarPosition で制御 */
  cardLayout?: "left" | "right";
  /** アバター画像 URL（動画ビューで使用） */
  avatarUrl?: string;
  /** アバターサイズ（1080 基準 px、既定 220）。プリセット: 大 360 / 中 220 / 小 120 */
  avatarSize?: number;
  /** アバターを丸く切り抜く（既定: avatarSize <= 140 で true） */
  avatarRounded?: boolean;
  /** アバター配置（"custom" 時は avatarX/avatarY を使用）。ロゴと同じ 9 ポジション + custom */
  avatarPosition?: "top-left" | "top-center" | "top-right"
    | "middle-left" | "center" | "middle-right"
    | "bottom-left" | "bottom-center" | "bottom-right"
    | "custom";
  /** avatarPosition === "custom" のときの X 座標（1080 基準 px、アバター左上基準） */
  avatarX?: number;
  /** avatarPosition === "custom" のときの Y 座標（1080 基準 px、アバター左上基準） */
  avatarY?: number;
  /** アバター余白（端からの距離、1080 基準 px、既定 40） */
  avatarMargin?: number;

  // レイアウト軸
  verticalLayout?: VerticalLayout; // 縦方向の配置基準（既定 "center"）
  writingMode?: WritingMode;       // 横書き / 縦書き（既定 "horizontal"）

  // 要素ごとの表示／非表示（個別セルでだけ非表示にしたいとき用）
  // title は必須なので非表示にできない。
  hideBadge?: boolean;
  hideSubtitle?: boolean;
  hideBody?: boolean;

  // 各要素のスタイル（任意）
  badgeStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  titleStyle?: TextStyle;
  bodyStyle?: TextStyle;
}

/**
 * 動画書き出し時のオーバーレイ PNG 用クロマキー色。
 * Rendervid の renderImage は Puppeteer 経由で透過 PNG を出せないため、
 * オーバーレイモードではこの色で背景を塗り、FFmpeg の colorkey フィルタで抜いて
 * 背景動画と合成する。テキスト・ロゴで偶然この色が使われると消えるので注意。
 */
export const OVERLAY_CHROMAKEY_COLOR = "#00FF00";

export const DEFAULT_STROKE: TextStrokeStyle = { enabled: false, color: "#000000", width: 4 };
export const DEFAULT_SHADOW: TextShadowStyle = {
  enabled: false,
  color: "rgba(0,0,0,0.5)",
  blur: 8,
  offsetX: 0,
  offsetY: 4,
};

export const DEFAULT_STYLE: Required<TextStyle> = {
  fontFamily: DEFAULT_FONT.family,
  fontWeight: 900,
  fontSize: 1,
  offsetY: 0,
  textAlign: "center",
  color: "",
  stroke: DEFAULT_STROKE,
  shadow: DEFAULT_SHADOW,
};

export const DEFAULT_INPUTS: Required<
  Omit<BannerInputs, "badgeStyle" | "subtitleStyle" | "titleStyle" | "bodyStyle">
> & {
  badgeStyle: TextStyle;
  subtitleStyle: TextStyle;
  titleStyle: TextStyle;
  bodyStyle: TextStyle;
} = {
  title: "新商品キャンペーン",
  subtitle: "期間限定セール開催中",
  badge: "30% OFF",
  body: "全品送料無料・即日発送",
  backgroundColor: "#0f172a",
  textColor: "#ffffff",
  badgeColor: "#ef4444",
  backgroundImageUrl: "",
  backgroundImageOpacity: 1,
  backgroundImageOffsetX: 0,
  backgroundImageOffsetY: 0,
  backgroundImageScale: 1,
  backgroundVideoTrimStart: 0,
  backgroundVideoTrimEnd: 0,
  backgroundVideoSegments: [],
  cardLayout: "left",
  avatarUrl: "",
  avatarSize: 220,
  avatarRounded: false,
  avatarPosition: "middle-left",
  avatarX: 0,
  avatarY: 0,
  avatarMargin: 40,
  logoUrl: "",
  logoPosition: "bottom-right",
  logoX: 0,
  logoY: 0,
  logoSize: 120,
  logoMargin: 40,
  logoOpacity: 1,
  verticalLayout: "center",
  writingMode: "horizontal",
  hideBadge: false,
  hideSubtitle: false,
  hideBody: false,
  badgeStyle: { fontWeight: 900, fontSize: 1, offsetY: 0 },
  subtitleStyle: { fontWeight: 700, fontSize: 1, offsetY: 0 },
  titleStyle: { fontWeight: 900, fontSize: 1, offsetY: 0 },
  bodyStyle: { fontWeight: 400, fontSize: 1, offsetY: 0 },
};

/**
 * 1080 基準のデザイントークン。
 * 各値はスケールを掛けて使う。
 */
const BASE = {
  badgeFontSize: 36,
  badgeBgWidth: 200,
  badgeBgHeight: 60,
  badgeMarginBottom: 28,

  subtitleFontSize: 44,
  subtitleHeight: 60,
  subtitleMarginBottom: 24,

  titleFontSize: 88,
  titleHeight: 200,
  titleMarginBottom: 24,

  bodyFontSize: 32,
  bodyHeight: 60,

  outerPaddingX: 60,
} as const;

/** URL から拡張子で動画かどうか判定（クエリ ?... も無視） */
function isVideoUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogv)$/.test(path);
}

/** style 解決：デフォルト + 個別指定をマージし、fontFamily を実 family に変換 */
function resolveStyle(
  style: TextStyle | undefined,
  fallbackWeight: number,
): Required<TextStyle> {
  return {
    fontFamily: getFont(style?.fontFamily).family,
    fontWeight: style?.fontWeight ?? fallbackWeight,
    fontSize: style?.fontSize ?? 1,
    offsetY: style?.offsetY ?? 0,
    textAlign: style?.textAlign ?? "center",
    color: style?.color ?? "", // 空なら呼び出し側で inputs.textColor を使う
    stroke: style?.stroke ?? DEFAULT_STROKE,
    shadow: style?.shadow ?? DEFAULT_SHADOW,
  };
}

/**
 * サイズ + 入力値から完成済み Rendervid テンプレートを返す。
 * 文字列補間はせず、layers 内の text/fill には実値を直接埋める。
 *
 * options.overlayOnly = true の場合、背景色・背景画像・背景動画レイヤーを省略し
 * 透過バックグラウンドのオーバーレイ PNG（テキスト + ロゴのみ）として出力できる。
 * 動画書き出しで FFmpeg と合成するときに使う。
 */
export function buildBannerTemplate(
  size: BannerSize,
  rawInputs: Partial<BannerInputs> = {},
  options: { overlayOnly?: boolean } = {},
): RendervidTemplate {
  const inputs = { ...DEFAULT_INPUTS, ...rawInputs };
  const { width, height } = size;
  const overlayOnly = options.overlayOnly === true;
  const scale = Math.min(width, height) / 1080;
  /** サイズ単位のフォント追加倍率（極小バナーで読めるようにする） */
  const fontBoost = size.fontBoost ?? 1;

  // 各要素の style を解決
  const badgeS = resolveStyle(inputs.badgeStyle, 900);
  const subtitleS = resolveStyle(inputs.subtitleStyle, 700);
  const titleS = resolveStyle(inputs.titleStyle, 900);
  const bodyS = resolveStyle(inputs.bodyStyle, 400);

  // スケール後の各値（× ユーザー倍率 × サイズ別 fontBoost）
  const badgeFs = BASE.badgeFontSize * scale * badgeS.fontSize * fontBoost;
  const subtitleFs = BASE.subtitleFontSize * scale * subtitleS.fontSize * fontBoost;
  const titleFs = BASE.titleFontSize * scale * titleS.fontSize * fontBoost;
  const bodyFs = BASE.bodyFontSize * scale * bodyS.fontSize * fontBoost;
  const padX = BASE.outerPaddingX * scale;

  // 動画カード用: アバターはロゴと同じ式の 9 ポジション。テキストはこれまでどおり全幅。
  const hasAvatar = !!(inputs.avatarUrl && inputs.avatarUrl.trim() !== "");
  const avatarSizePx = (inputs.avatarSize ?? 220) * scale;
  const textXStart = padX;
  const textW = width - padX * 2;

  // 行高はフォントサイズ × 行数で自動算出（フォントブースト時の重なりを防ぐ）
  const lineCount = (s: string | undefined) => Math.max(1, (s?.split("\n").length ?? 1));
  const subtitleH = subtitleFs * 1.4 * lineCount(inputs.subtitle);
  const titleH = titleFs * 1.25 * lineCount(inputs.title);
  const bodyH = bodyFs * 1.5 * lineCount(inputs.body);

  // バッジの背景は text レイヤー側で自動サイズ化するので、配置のための高さだけ計算
  const badgePadY = badgeFs * 0.35;
  const badgePadX = badgeFs * 0.7;
  const badgeRowH = badgeFs * 1.3 * lineCount(inputs.badge) + badgePadY * 2;

  /**
   * resolveStyle で得た stroke / shadow を Rendervid text レイヤーが受け取る形に変換。
   * width / blur / offsetX / offsetY はスケール適用。
   */
  function effectsFor(styleResolved: Required<TextStyle>) {
    const out: { stroke?: { color: string; width: number }; textShadow?: { color: string; blur: number; offsetX: number; offsetY: number } } = {};
    if (styleResolved.stroke.enabled && styleResolved.stroke.width > 0) {
      out.stroke = {
        color: styleResolved.stroke.color,
        width: styleResolved.stroke.width * scale,
      };
    }
    if (styleResolved.shadow.enabled) {
      out.textShadow = {
        color: styleResolved.shadow.color,
        blur: styleResolved.shadow.blur * scale,
        offsetX: styleResolved.shadow.offsetX * scale,
        offsetY: styleResolved.shadow.offsetY * scale,
      };
    }
    return out;
  }

  // hide フラグが優先（明示的に非表示にしている場合）、それ以外はテキストの有無
  const hasBadge = !!inputs.badge && !inputs.hideBadge;
  const hasSubtitle = !!inputs.subtitle && !inputs.hideSubtitle;
  const hasBody = !!inputs.body && !inputs.hideBody;

  // 動画カードモード（アバター付き）では body をキャプションとして「カード下部にアンカー」する。
  // → 通常モードでは badge/subtitle/title/body を 1 つのスタックに、
  //    カードモードでは badge/subtitle/title のスタック + 別配置の body
  const isCardMode = hasAvatar;
  const stackHeight =
    (hasBadge ? badgeRowH + BASE.badgeMarginBottom * scale : 0) +
    (hasSubtitle ? subtitleH + BASE.subtitleMarginBottom * scale : 0) +
    titleH +
    (!isCardMode && hasBody ? BASE.titleMarginBottom * scale + bodyH : 0);

  // verticalLayout に応じて開始 y を決定
  const verticalLayout = inputs.verticalLayout ?? "center";
  const padTop = 60 * scale;
  const padBottom = 60 * scale;
  let y =
    verticalLayout === "top"
      ? padTop
      : verticalLayout === "bottom"
        ? height - padBottom - stackHeight
        : (height - stackHeight) / 2;
  const layers: unknown[] = [];

  // 背景色（overlayOnly のときは独特な緑でクロマキー用塗り。FFmpeg 側で colorkey で抜く）
  layers.push({
    id: "background",
    type: "shape",
    position: { x: 0, y: 0 },
    size: { width, height },
    props: {
      shape: "rectangle",
      fill: overlayOnly ? OVERLAY_CHROMAKEY_COLOR : inputs.backgroundColor,
    },
  });

  // 背景画像 / 背景動画（overlayOnly のときは省略 — 動画書き出しでは FFmpeg 側が背景動画を扱う）
  if (!overlayOnly && inputs.backgroundImageUrl && inputs.backgroundImageUrl.trim() !== "") {
    const imgScale = inputs.backgroundImageScale ?? 1;
    const offsetX = (inputs.backgroundImageOffsetX ?? 0) * scale;
    const offsetY = (inputs.backgroundImageOffsetY ?? 0) * scale;
    const imgW = width * imgScale;
    const imgH = height * imgScale;
    // 中心基準で配置 + offset
    const imgX = (width - imgW) / 2 + offsetX;
    const imgY = (height - imgH) / 2 + offsetY;
    if (isVideoUrl(inputs.backgroundImageUrl)) {
      const segments = (inputs.backgroundVideoSegments ?? []).filter(
        (sg) => sg && sg.end > sg.start,
      );
      const trimStart = Math.max(0, inputs.backgroundVideoTrimStart ?? 0);
      const trimEnd = inputs.backgroundVideoTrimEnd ?? 0;
      const videoProps: Record<string, unknown> = {
        src: inputs.backgroundImageUrl,
        fit: "cover",
        loop: true,
        muted: true,
      };
      if (segments.length > 0) {
        // 複数カット：残す区間の配列を直接渡す（renderVideo が順次 + ループ）
        videoProps.segments = segments;
      } else {
        // 旧来の単一トリム
        if (trimStart > 0) videoProps.startTime = trimStart;
        if (trimEnd > 0 && trimEnd > trimStart) videoProps.endTime = trimEnd;
      }
      layers.push({
        id: "background-video",
        type: "video",
        position: { x: imgX, y: imgY },
        size: { width: imgW, height: imgH },
        opacity: inputs.backgroundImageOpacity ?? 1,
        props: videoProps,
      });
    } else {
      layers.push({
        id: "background-image",
        type: "image",
        position: { x: imgX, y: imgY },
        size: { width: imgW, height: imgH },
        opacity: inputs.backgroundImageOpacity ?? 1,
        props: {
          src: inputs.backgroundImageUrl,
          objectFit: "cover",
        },
      });
    }
  }

  // バッジ（背景付きテキスト 1 レイヤーで自動サイズ。textAlign に応じて span が中央/左/右に配置される）
  if (hasBadge) {
    const badgeOffset = badgeS.offsetY * scale;
    // テキスト 1 行で済む場合は折返禁止、改行 \n が含まれる時のみ複数行
    const badgeWhiteSpace = (inputs.badge ?? "").includes("\n") ? "pre-wrap" : "nowrap";
    layers.push({
      id: "badge",
      type: "text",
      position: { x: textXStart, y: y + badgeOffset },
      size: { width: textW, height: badgeRowH },
      props: {
        text: inputs.badge,
        fontSize: badgeFs,
        fontWeight: badgeS.fontWeight,
        color: badgeS.color || "#ffffff",
        textAlign: badgeS.textAlign,
        fontFamily: badgeS.fontFamily,
        backgroundColor: inputs.badgeColor,
        padding: { top: badgePadY, right: badgePadX, bottom: badgePadY, left: badgePadX },
        borderRadius: 8 * scale,
        whiteSpace: badgeWhiteSpace,
        lineHeight: 1.3,
        ...effectsFor(badgeS),
      },
    });
    y += badgeRowH + BASE.badgeMarginBottom * scale;
  }

  // サブタイトル
  if (hasSubtitle) {
    layers.push({
      id: "subtitle",
      type: "text",
      position: { x: textXStart, y: y + subtitleS.offsetY * scale },
      size: { width: textW, height: subtitleH },
      props: {
        text: inputs.subtitle,
        fontSize: subtitleFs,
        fontWeight: subtitleS.fontWeight,
        color: subtitleS.color || inputs.textColor,
        textAlign: subtitleS.textAlign,
        fontFamily: subtitleS.fontFamily,
        opacity: 0.9,
        ...effectsFor(subtitleS),
      },
    });
    y += subtitleH + BASE.subtitleMarginBottom * scale;
  }

  // タイトル（必須）
  layers.push({
    id: "title",
    type: "text",
    position: { x: textXStart, y: y + titleS.offsetY * scale },
    size: { width: textW, height: titleH },
    props: {
      text: inputs.title,
      fontSize: titleFs,
      fontWeight: titleS.fontWeight,
      color: titleS.color || inputs.textColor,
      textAlign: titleS.textAlign,
      fontFamily: titleS.fontFamily,
      lineHeight: 1.15,
      ...effectsFor(titleS),
    },
  });
  y += titleH;

  // 本文（カードモードではキャプションとしてカード下部にアンカー、それ以外は title の下にスタック）
  if (hasBody) {
    let bodyY: number;
    if (isCardMode) {
      bodyY = height - padBottom - bodyH + bodyS.offsetY * scale;
    } else {
      y += BASE.titleMarginBottom * scale;
      bodyY = y + bodyS.offsetY * scale;
    }
    layers.push({
      id: "body",
      type: "text",
      position: { x: textXStart, y: bodyY },
      size: { width: textW, height: bodyH },
      props: {
        text: inputs.body,
        fontSize: bodyFs,
        fontWeight: bodyS.fontWeight,
        color: bodyS.color || inputs.textColor,
        textAlign: bodyS.textAlign,
        fontFamily: bodyS.fontFamily,
        opacity: 0.85,
        lineHeight: 1.5,
        ...effectsFor(bodyS),
      },
    });
  }

  // アバター（ロゴと同じ式の 9 ポジション + custom + margin）
  if (hasAvatar) {
    const aMargin = (inputs.avatarMargin ?? 40) * scale;
    const aPos = inputs.avatarPosition ?? "middle-left";
    let ax: number;
    let ay: number;
    if (aPos === "custom") {
      ax = (inputs.avatarX ?? 0) * scale;
      ay = (inputs.avatarY ?? 0) * scale;
    } else {
      // X
      if (aPos.endsWith("-left")) ax = aMargin;
      else if (aPos.endsWith("-right")) ax = width - aMargin - avatarSizePx;
      else ax = (width - avatarSizePx) / 2;
      // Y
      if (aPos.startsWith("top-")) ay = aMargin;
      else if (aPos.startsWith("bottom-")) ay = height - aMargin - avatarSizePx;
      else ay = (height - avatarSizePx) / 2; // middle / center
    }
    const isSmall = avatarSizePx <= 140 * scale;
    const rounded = inputs.avatarRounded ?? isSmall;
    layers.push({
      id: "avatar",
      type: "image",
      position: { x: ax, y: ay },
      size: { width: avatarSizePx, height: avatarSizePx },
      props: {
        src: inputs.avatarUrl,
        fit: "cover",
        // borderRadius = "50%" で円。ブラウザプレビューは CustomTextLayer がカスタム描画
        borderRadius: rounded ? "50%" : 12 * scale,
        // 円のときは白いリング枠
        ...(rounded
          ? {
              border: `${Math.max(2, Math.round(4 * scale))}px solid #ffffff`,
              boxShadow: `0 0 0 ${Math.max(1, Math.round(2 * scale))}px rgba(0,0,0,0.15)`,
            }
          : {}),
      },
    });
  }

  // ロゴ（テキストの上に重ねて描画）
  if (inputs.logoUrl && inputs.logoUrl.trim() !== "") {
    const logoSize = (inputs.logoSize ?? 120) * scale;
    const margin = (inputs.logoMargin ?? 40) * scale;
    const pos = inputs.logoPosition ?? "bottom-right";
    let lx: number;
    let ly: number;
    if (pos === "custom") {
      // カスタム位置（1080 基準 px → スケール適用）
      lx = (inputs.logoX ?? 0) * scale;
      ly = (inputs.logoY ?? 0) * scale;
    } else {
      lx = margin;
      ly = margin;
      // 横位置
      if (pos.endsWith("center")) lx = (width - logoSize) / 2;
      else if (pos.endsWith("right")) lx = width - logoSize - margin;
      // 縦位置
      if (pos.startsWith("middle") || pos === "center") ly = (height - logoSize) / 2;
      else if (pos.startsWith("bottom")) ly = height - logoSize - margin;
    }
    layers.push({
      id: "logo",
      type: "image",
      position: { x: lx, y: ly },
      size: { width: logoSize, height: logoSize },
      opacity: inputs.logoOpacity ?? 1,
      props: {
        src: inputs.logoUrl,
        objectFit: "contain",
      },
    });
  }

  // 動画レイヤーが含まれる場合は出力タイプを video に切替（Player が時間軸でレンダリングするため）
  const hasVideoLayer = layers.some(
    (l) => (l as { type?: string }).type === "video",
  );
  if (hasVideoLayer) {
    const fps = 30;
    // セグメント合計 > 単一トリム > 既定 5 秒。loop=true なので継ぎ目は気にしない
    const segments = (inputs.backgroundVideoSegments ?? []).filter(
      (sg) => sg && sg.end > sg.start,
    );
    const trimStart = Math.max(0, inputs.backgroundVideoTrimStart ?? 0);
    const trimEnd = inputs.backgroundVideoTrimEnd ?? 0;
    const trimDuration =
      segments.length > 0
        ? segments.reduce((sum, sg) => sum + (sg.end - sg.start), 0)
        : trimEnd > 0 && trimEnd > trimStart
        ? trimEnd - trimStart
        : 5;
    const totalFrames = Math.max(1, Math.round(fps * trimDuration));
    return {
      name: `Banner ${size.label} (${size.width}×${size.height})`,
      description: "buildBannerTemplate() による自動生成テンプレート",
      version: "1.0.0",
      output: { type: "video", width, height, fps, duration: trimDuration },
      composition: {
        scenes: [
          {
            id: "main",
            startFrame: 0,
            endFrame: totalFrames,
            layers,
          },
        ],
      },
    };
  }

  return {
    name: `Banner ${size.label} (${size.width}×${size.height})`,
    description: "buildBannerTemplate() による自動生成テンプレート",
    version: "1.0.0",
    output: { type: "image", width, height },
    composition: {
      scenes: [
        {
          id: "main",
          startFrame: 0,
          endFrame: 1,
          layers,
        },
      ],
    },
  };
}
