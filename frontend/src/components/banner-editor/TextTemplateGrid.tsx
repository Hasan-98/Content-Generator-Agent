import { useMemo, useState } from "react";
import { Player } from "@rendervid/player";
import {
  buildBannerTemplate,
  type BannerInputs,
} from "../../lib/bannerEditor/build-banner-template";
import type { TextTemplate } from "../../lib/bannerEditor/text-templates";
import type { BannerSize } from "../../lib/bannerEditor/sizes";

const PAGE_SIZE = 10;
const THUMB_W = 100;
const THUMB_H = 100;

/**
 * テキストテンプレートのサムネイルグリッド + ページネーション。
 *
 * 各サムネイルは Player を THUMB_W×THUMB_H で描画して縮小プレビューを出す。
 * テンプレート選択時は、現在の inputs に各 *Style だけマージして適用する
 * （テキスト本文・色・レイアウトは保持）。
 */
export function TextTemplateGrid({
  templates,
  selectedId,
  onSelect,
  baseInputs,
  size,
}: {
  templates: TextTemplate[];
  selectedId: string | null;
  onSelect: (t: TextTemplate) => void;
  /** サムネイル描画時のテキスト・色・レイアウトのベース */
  baseInputs: BannerInputs;
  /** サムネイル描画用のサイズ。表示比率を保つために使用 */
  size: BannerSize;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = templates.slice(start, start + PAGE_SIZE);

  return (
    <section style={s.wrap}>
      <div style={s.head}>
        <span style={s.headTitle}>テンプレート（フォント・サイズ）</span>
        <span style={s.headCount}>
          {templates.length} 件 / {safePage + 1} - {totalPages} ページ
        </span>
      </div>

      <div style={s.grid}>
        {visible.map((t) => (
          <ThumbCell
            key={t.id}
            template={t}
            active={t.id === selectedId}
            baseInputs={baseInputs}
            size={size}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>

      <div style={s.pager}>
        <button
          onClick={() => setPage(Math.max(0, safePage - 1))}
          disabled={safePage === 0}
          style={{ ...s.pagerBtn, ...(safePage === 0 ? s.pagerDisabled : {}) }}
        >
          ‹ 前
        </button>
        <span style={s.pagerInfo}>
          {safePage + 1} / {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
          disabled={safePage >= totalPages - 1}
          style={{
            ...s.pagerBtn,
            ...(safePage >= totalPages - 1 ? s.pagerDisabled : {}),
          }}
        >
          次 ›
        </button>
      </div>
    </section>
  );
}

function ThumbCell({
  template,
  active,
  baseInputs,
  size,
  onClick,
}: {
  template: TextTemplate;
  active: boolean;
  baseInputs: BannerInputs;
  size: BannerSize;
  onClick: () => void;
}) {
  // サムネイル用の縮小サイズ（縦横比は実サイズに合わせる）
  const aspect = size.width / size.height;
  const thumbW = aspect >= 1 ? THUMB_W : Math.round(THUMB_H * aspect);
  const thumbH = aspect >= 1 ? Math.round(THUMB_W / aspect) : THUMB_H;

  // 描画は実サイズで行い、外側 div で transform: scale するパターン
  const fitScale = Math.min(thumbW / size.width, thumbH / size.height);
  const innerW = size.width;
  const innerH = size.height;

  // ベース inputs にこのテンプレの style を適用
  const inputs: BannerInputs = useMemo(
    () => ({
      ...baseInputs,
      badgeStyle: template.badgeStyle,
      subtitleStyle: template.subtitleStyle,
      titleStyle: template.titleStyle,
      bodyStyle: template.bodyStyle,
    }),
    [baseInputs, template],
  );
  const tpl = useMemo(() => buildBannerTemplate(size, inputs), [size, inputs]);

  return (
    <button
      onClick={onClick}
      style={{ ...s.cell, ...(active ? s.cellActive : {}) }}
      title={template.name}
    >
      <div
        style={{
          width: thumbW,
          height: thumbH,
          background: "#000",
          overflow: "hidden",
          position: "relative",
          borderRadius: 4,
        }}
      >
        <div
          style={{
            width: innerW,
            height: innerH,
            transform: `scale(${fitScale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        >
          <Player
            template={tpl as never}
            controls={false}
            style={{ width: innerW, height: innerH }}
          />
        </div>
      </div>
      <div style={s.cellName}>{template.name}</div>
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
  },
  head: { display: "flex", alignItems: "baseline", gap: 6 },
  headTitle: { fontSize: 12, fontWeight: 700, color: "#374151", flex: 1 },
  headCount: { fontSize: 10, color: "#9ca3af" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 8,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: 6,
    border: "2px solid transparent",
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cellActive: { borderColor: "#3b82f6", background: "#eff6ff" },
  cellName: {
    fontSize: 10,
    color: "#374151",
    textAlign: "center",
    width: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pager: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  pagerBtn: {
    padding: "4px 10px",
    fontSize: 11,
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#374151",
  },
  pagerDisabled: { opacity: 0.4, cursor: "not-allowed" },
  pagerInfo: { fontSize: 11, color: "#6b7280", fontFamily: "monospace" },
};
