/**
 * 複数バナーをグリッド状に並列プレビューするコンポーネント。
 *
 * 各セルは完全に独立した inputs を持つ（共通設定は廃止）。
 * セルクリックで選択 → 親が selectedKey を保持して右パネルでそのセルを編集する。
 */
import { Player } from "@rendervid/player";
import { renderLayerWithEffects } from "./CustomTextLayer";
import {
  buildBannerTemplate,
  type BannerInputs,
} from "../../lib/bannerEditor/build-banner-template";

export interface PreviewItem {
  /** 一意キー */
  key: string;
  /** ラベル表示（例: "1080×1920 ストーリー" / "2 枚目: ポイント①"） */
  label: string;
  /** バナーサイズ */
  size: { id: string; label: string; width: number; height: number; fontBoost?: number };
  /** このセルが描画する完全な inputs（独立） */
  inputs: BannerInputs;
  /** 選択中フラグ（true なら青枠でハイライト） */
  selected?: boolean;
  /** セルクリック時のハンドラ */
  onSelect?: () => void;
}

export function MultiPreview({
  items,
  cellMaxWidth = 320,
  cellMaxHeight = 360,
}: {
  items: PreviewItem[];
  cellMaxWidth?: number;
  cellMaxHeight?: number;
}) {
  return (
    <div style={s.grid}>
      {items.map((item) => (
        <PreviewCell
          key={item.key}
          item={item}
          cellMaxWidth={cellMaxWidth}
          cellMaxHeight={cellMaxHeight}
        />
      ))}
    </div>
  );
}

function PreviewCell({
  item,
  cellMaxWidth,
  cellMaxHeight,
}: {
  item: PreviewItem;
  cellMaxWidth: number;
  cellMaxHeight: number;
}) {
  const fitScale = Math.min(
    cellMaxWidth / item.size.width,
    cellMaxHeight / item.size.height,
  );
  const displayW = Math.round(item.size.width * fitScale);
  const displayH = Math.round(item.size.height * fitScale);

  const tpl = buildBannerTemplate(item.size, item.inputs);

  return (
    <button
      onClick={item.onSelect}
      // セル枠は出さない（識別は ✓ バッジ + 名前色のみ）
      style={{
        ...s.cell,
        cursor: item.onSelect ? "pointer" : "default",
      }}
    >
      <div style={s.cellLabel}>
        <span>
          {item.selected && <span style={s.checkBadge}>✓</span>}
          {item.label}
        </span>
        <span style={s.dim}>{item.size.width}×{item.size.height}</span>
      </div>

      <div style={{ ...s.playerWrap, width: displayW, height: displayH }}>
        <div
          style={{
            width: item.size.width,
            height: item.size.height,
            transform: `scale(${fitScale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        >
          <Player
            template={tpl as never}
            controls={false}
            style={{ width: item.size.width, height: item.size.height }}
            renderLayer={renderLayerWithEffects as never}
          />
        </div>
      </div>
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
    padding: 16,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: 8,
    background: "transparent",
    border: "none",
    fontFamily: "inherit",
    textAlign: "left",
  },
  cellLabel: {
    width: "100%",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 11,
    fontWeight: 600,
    color: "#374151",
  },
  checkBadge: {
    display: "inline-block",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 9,
    fontWeight: 900,
    padding: "1px 5px",
    borderRadius: 999,
    marginRight: 4,
  },
  dim: { fontSize: 10, color: "#9ca3af", fontFamily: "monospace" },
  playerWrap: {
    background: "#fff",
    borderRadius: 4,
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },
};
