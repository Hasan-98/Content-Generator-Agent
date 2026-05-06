/**
 * 各テキスト行の FontPicker の隣に並べる、ワンクリック調整ボタン群。
 *  - 揃え: ⬅ ⬌ ➡
 *  - サイズ: A− A+ （倍率 -0.1 / +0.1）
 *  - 位置:  ↑ ↓ （offsetY -20 / +20）
 *  - 太さ:  B− B+ （対応ウェイト内で前後）
 *  - リセット: ⟲ （サイズ 100% / 位置 0 に戻す）
 *
 * 各ボタンには title で現在値を出して、hover でも分かるようにする。
 */
import type { TextStyle } from "../../lib/bannerEditor/build-banner-template";
import { getFont } from "../../lib/bannerEditor/fonts";

const SIZE_STEP = 0.1;
const SIZE_MIN = 0.5;
const SIZE_MAX = 2.0;
const OFFSET_STEP = 20;
const OFFSET_MIN = -500;
const OFFSET_MAX = 500;

function nextWeight(family: string | undefined, current: number, dir: 1 | -1): number {
  const f = getFont(family);
  const idx = f.weights.indexOf(current);
  if (idx < 0) {
    // current がフォントの対応ウェイトにない → 最も近いものを基準にする
    const sorted = [...f.weights].sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
    return sorted[0];
  }
  const ni = Math.max(0, Math.min(f.weights.length - 1, idx + dir));
  return f.weights[ni];
}

export function TextStyleControls({
  value,
  onChange,
}: {
  value: TextStyle;
  onChange: (next: TextStyle) => void;
}) {
  const currentSize = value.fontSize ?? 1;
  const currentOffsetY = value.offsetY ?? 0;
  const currentAlign = value.textAlign ?? "center";
  const currentWeight = value.fontWeight ?? 700;
  const family = value.fontFamily;
  const weights = getFont(family).weights;

  function patch(p: Partial<TextStyle>) {
    onChange({ ...value, ...p });
  }

  const sizePct = Math.round(currentSize * 100);
  const weightCanDown = weights.length > 1 && nextWeight(family, currentWeight, -1) < currentWeight;
  const weightCanUp = weights.length > 1 && nextWeight(family, currentWeight, 1) > currentWeight;

  return (
    <div style={s.wrap}>
      {/* 揃え */}
      <div style={s.group}>
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            onClick={() => patch({ textAlign: a })}
            style={{ ...s.btn, ...(a === currentAlign ? s.btnActive : {}) }}
            title={a === "left" ? "左揃え" : a === "right" ? "右揃え" : "中央揃え"}
          >
            {a === "left" ? "⬅" : a === "right" ? "➡" : "⬌"}
          </button>
        ))}
      </div>

      {/* サイズ */}
      <div style={s.group}>
        <button
          onClick={() => patch({ fontSize: Math.max(SIZE_MIN, +(currentSize - SIZE_STEP).toFixed(2)) })}
          style={s.btn}
          disabled={currentSize <= SIZE_MIN}
          title={`サイズを小さく（現在 ${sizePct}%）`}
        >
          A−
        </button>
        <span style={s.value} title="現在のサイズ倍率">{sizePct}%</span>
        <button
          onClick={() => patch({ fontSize: Math.min(SIZE_MAX, +(currentSize + SIZE_STEP).toFixed(2)) })}
          style={s.btn}
          disabled={currentSize >= SIZE_MAX}
          title={`サイズを大きく（現在 ${sizePct}%）`}
        >
          A+
        </button>
      </div>

      {/* 位置 */}
      <div style={s.group}>
        <button
          onClick={() => patch({ offsetY: Math.max(OFFSET_MIN, currentOffsetY - OFFSET_STEP) })}
          style={s.btn}
          disabled={currentOffsetY <= OFFSET_MIN}
          title={`上に移動（現在 ${currentOffsetY}px）`}
        >
          ↑
        </button>
        <span style={s.value} title="現在の縦位置オフセット">
          {currentOffsetY > 0 ? "+" : ""}
          {currentOffsetY}
        </span>
        <button
          onClick={() => patch({ offsetY: Math.min(OFFSET_MAX, currentOffsetY + OFFSET_STEP) })}
          style={s.btn}
          disabled={currentOffsetY >= OFFSET_MAX}
          title={`下に移動（現在 ${currentOffsetY}px）`}
        >
          ↓
        </button>
      </div>

      {/* 太さ */}
      <div style={s.group}>
        <button
          onClick={() => patch({ fontWeight: nextWeight(family, currentWeight, -1) })}
          style={s.btn}
          disabled={!weightCanDown}
          title={`細く（現在 ${currentWeight}）`}
        >
          B−
        </button>
        <button
          onClick={() => patch({ fontWeight: nextWeight(family, currentWeight, 1) })}
          style={s.btn}
          disabled={!weightCanUp}
          title={`太く（現在 ${currentWeight}）`}
        >
          B+
        </button>
      </div>

      {/* リセット（サイズと位置を既定に） */}
      <button
        onClick={() => patch({ fontSize: 1, offsetY: 0 })}
        style={s.btn}
        title="サイズ100% / 位置0 に戻す"
      >
        ⟲
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  group: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    overflow: "hidden",
    background: "#fff",
  },
  btn: {
    minWidth: 24,
    height: 24,
    padding: "0 5px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
    color: "#374151",
    borderRight: "1px solid #e5e7eb",
  },
  btnActive: { background: "#3b82f6", color: "#fff" },
  value: {
    minWidth: 36,
    padding: "0 4px",
    fontSize: 10,
    color: "#6b7280",
    fontFamily: "monospace",
    textAlign: "center",
    borderRight: "1px solid #e5e7eb",
  },
};
