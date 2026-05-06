/**
 * 初回起動時に投入するプリセットテンプレート。
 * ユーザーは編集・削除・複製ができる。
 */
import type { BannerInputs } from "./build-banner-template";
import { FONT_OPTIONS } from "./fonts";

const F = (id: string) =>
  FONT_OPTIONS.find((f) => f.id === id)?.family ?? FONT_OPTIONS[0].family;

export interface PresetTemplate {
  name: string;
  inputs: BannerInputs;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  // 1. ベーシック中央
  {
    name: "ベーシック（中央）",
    inputs: {
      title: "新商品キャンペーン",
      subtitle: "期間限定セール開催中",
      badge: "30% OFF",
      body: "全品送料無料・即日発送",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      badgeColor: "#ef4444",
      verticalLayout: "center",
      writingMode: "horizontal",
    },
  },
  // 2. タイトル上配置
  {
    name: "タイトル上配置",
    inputs: {
      title: "新商品キャンペーン",
      subtitle: "期間限定セール開催中",
      badge: "30% OFF",
      body: "全品送料無料・即日発送",
      backgroundColor: "#1e3a8a",
      textColor: "#ffffff",
      badgeColor: "#fbbf24",
      verticalLayout: "top",
      writingMode: "horizontal",
    },
  },
  // 3. タイトル下配置
  {
    name: "タイトル下配置",
    inputs: {
      title: "新商品キャンペーン",
      subtitle: "期間限定セール開催中",
      badge: "30% OFF",
      body: "全品送料無料・即日発送",
      backgroundColor: "#7f1d1d",
      textColor: "#fef3c7",
      badgeColor: "#fbbf24",
      verticalLayout: "bottom",
      writingMode: "horizontal",
    },
  },
  // 4. 明朝シック
  {
    name: "明朝シック",
    inputs: {
      title: "上質を、日常へ。",
      subtitle: "新作プレミアムコレクション",
      badge: "NEW",
      body: "厳選した素材と熟練の技術",
      backgroundColor: "#1c1917",
      textColor: "#fafaf9",
      badgeColor: "#a16207",
      verticalLayout: "center",
      writingMode: "horizontal",
      titleStyle:    { fontFamily: F("noto-serif-jp"),   fontWeight: 900, textAlign: "center" },
      subtitleStyle: { fontFamily: F("noto-serif-jp"),   fontWeight: 400, textAlign: "center" },
      bodyStyle:     { fontFamily: F("sawarabi-mincho"), fontWeight: 400, textAlign: "center" },
      badgeStyle:    { fontFamily: F("noto-serif-jp"),   fontWeight: 700 },
    },
  },
  // 5. ポップ手書き
  {
    name: "ポップ手書き",
    inputs: {
      title: "夏祭り開催！",
      subtitle: "8/1 - 8/15 限定",
      badge: "FESTIVAL",
      body: "屋台・抽選会・花火大会",
      backgroundColor: "#fde047",
      textColor: "#1c1917",
      badgeColor: "#dc2626",
      verticalLayout: "center",
      writingMode: "horizontal",
      titleStyle:    { fontFamily: F("yusei-magic"),       fontWeight: 400, textAlign: "center" },
      subtitleStyle: { fontFamily: F("rocknroll-one"),     fontWeight: 400, textAlign: "center" },
      bodyStyle:     { fontFamily: F("mplus-rounded-1c"),  fontWeight: 700, textAlign: "center" },
      badgeStyle:    { fontFamily: F("rocknroll-one"),     fontWeight: 400 },
    },
  },
];
