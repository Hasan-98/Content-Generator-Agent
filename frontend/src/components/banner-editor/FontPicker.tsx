import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listAllFonts, getFont } from "../../lib/bannerEditor/fonts";
import {
  DEFAULT_SHADOW,
  DEFAULT_STROKE,
  type TextStyle,
} from "../../lib/bannerEditor/build-banner-template";

const PANEL_WIDTH = 320;
const PANEL_MAX_HEIGHT = 480;

/** rgba(...) や #RGB / #RRGGBB が混ざった値から HTML color input 用の #RRGGBB を取り出す */
function hexFromRgba(c: string): string {
  if (!c) return "#000000";
  if (c.startsWith("#")) {
    if (c.length === 7) return c;
    if (c.length === 4) return "#" + c.slice(1).split("").map((x) => x + x).join("");
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const toHex = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, "0");
    return "#" + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
  }
  return "#000000";
}

/**
 * 1 行ごとに使うコンパクトなテキストスタイルピッカー。
 * - フォント / 太さ / サイズ倍率 / 上下位置を一括設定
 * - ポップオーバーは Portal でレンダリング、上下スペースに応じて配置自動切替
 */
export function FontPicker({
  value,
  onChange,
}: {
  value: TextStyle;
  onChange: (next: TextStyle) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    function compute() {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const spaceBelow = vh - rect.bottom;
      const spaceAbove = rect.top;
      const desiredH = Math.min(PANEL_MAX_HEIGHT, vh - 16);
      const openAbove = spaceBelow < desiredH && spaceAbove > spaceBelow;
      const top = openAbove
        ? Math.max(8, rect.top - desiredH - 4)
        : Math.min(vh - desiredH - 8, rect.bottom + 4);
      const desiredLeft = rect.right - PANEL_WIDTH;
      const left = Math.max(8, Math.min(vw - PANEL_WIDTH - 8, desiredLeft));
      setPos({ top, left });
    }
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open]);

  const current = getFont(value.fontFamily);
  const currentWeight =
    value.fontWeight ??
    (current.weights.includes(900) ? 900 : current.weights[current.weights.length - 1]);
  const currentSize = value.fontSize ?? 1;
  const currentOffsetY = value.offsetY ?? 0;
  const currentAlign = value.textAlign ?? "center";

  function patch(p: Partial<TextStyle>) {
    onChange({ ...value, ...p });
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...styles.btn,
          fontFamily: current.family,
          fontWeight: currentWeight,
        }}
        title={`${current.label} ${currentWeight} / ${(currentSize * 100).toFixed(0)}% / Δ${currentOffsetY}px`}
      >
        Aa
        <span style={styles.btnLabel}>{current.label}</span>
        <span style={styles.btnArrow}>▾</span>
      </button>

      {open && pos &&
        createPortal(
          <>
            <div style={styles.backdrop} onClick={() => setOpen(false)} />
            <div
              style={{
                ...styles.panel,
                top: pos.top,
                left: pos.left,
                width: PANEL_WIDTH,
                maxHeight: PANEL_MAX_HEIGHT,
              }}
            >
              <div style={styles.panelHeader}>フォント</div>
              <div style={styles.list}>
                {listAllFonts().map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      const w = f.weights.includes(currentWeight)
                        ? currentWeight
                        : f.weights.includes(900)
                          ? 900
                          : f.weights[f.weights.length - 1];
                      patch({ fontFamily: f.family, fontWeight: w });
                    }}
                    style={{
                      ...styles.item,
                      fontFamily: f.family,
                      ...(f.id === current.id ? styles.itemActive : {}),
                    }}
                  >
                    <span style={styles.itemSample}>{f.label}</span>
                    {f.hint && <span style={styles.itemHint}>{f.hint}</span>}
                  </button>
                ))}
              </div>

              <div style={styles.weightRow}>
                <span style={styles.weightLabel}>太さ:</span>
                {current.weights.map((w) => (
                  <button
                    key={w}
                    onClick={() => patch({ fontWeight: w })}
                    style={{
                      ...styles.weightBtn,
                      fontFamily: current.family,
                      fontWeight: w,
                      ...(w === currentWeight ? styles.weightBtnActive : {}),
                    }}
                  >
                    {w === 400 ? "標準" : w === 500 ? "中" : w === 700 ? "太" : "極太"}
                  </button>
                ))}
              </div>

              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>📏 サイズ</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={currentSize}
                  onChange={(e) => patch({ fontSize: parseFloat(e.target.value) })}
                  style={styles.slider}
                />
                <span style={styles.sliderValue}>{(currentSize * 100).toFixed(0)}%</span>
                <button onClick={() => patch({ fontSize: 1 })} style={styles.resetBtn} title="既定に戻す">
                  ⟲
                </button>
              </div>

              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>⤓ 位置</span>
                <input
                  type="range"
                  min={-500}
                  max={500}
                  step={5}
                  value={currentOffsetY}
                  onChange={(e) => patch({ offsetY: parseInt(e.target.value, 10) })}
                  style={styles.slider}
                />
                <span style={styles.sliderValue}>
                  {currentOffsetY > 0 ? "+" : ""}
                  {currentOffsetY}px
                </span>
                <button onClick={() => patch({ offsetY: 0 })} style={styles.resetBtn} title="既定に戻す">
                  ⟲
                </button>
              </div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>　数値入力</span>
                <input
                  type="number"
                  value={currentOffsetY}
                  onChange={(e) => patch({ offsetY: parseInt(e.target.value, 10) || 0 })}
                  step={5}
                  style={styles.numberInput}
                />
                <span style={styles.sliderValue}>px</span>
              </div>

              <div style={styles.alignRow}>
                <span style={styles.alignLabel}>揃え:</span>
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => patch({ textAlign: a })}
                    style={{
                      ...styles.alignBtn,
                      ...(a === currentAlign ? styles.alignBtnActive : {}),
                    }}
                    title={a === "left" ? "左揃え" : a === "right" ? "右揃え" : "中央揃え"}
                  >
                    {a === "left" ? "⬅" : a === "right" ? "➡" : "⬌"}
                  </button>
                ))}
              </div>

              {/* ─── 個別の文字色（テーマを上書き） ─── */}
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>文字色</span>
                <input
                  type="color"
                  value={value.color || "#ffffff"}
                  onChange={(e) => patch({ color: e.target.value })}
                  style={styles.colorInput}
                />
                <span style={styles.sliderValue}>
                  {value.color ? value.color : "テーマ色"}
                </span>
                <button
                  onClick={() => patch({ color: "" })}
                  style={styles.resetBtn}
                  title="テーマ色に戻す"
                >
                  ⟲
                </button>
              </div>

              {/* ─── 縁取り ─────────────────── */}
              <div style={styles.fxHead}>
                <label style={styles.fxToggle}>
                  <input
                    type="checkbox"
                    checked={(value.stroke ?? DEFAULT_STROKE).enabled}
                    onChange={(e) =>
                      patch({
                        stroke: { ...(value.stroke ?? DEFAULT_STROKE), enabled: e.target.checked },
                      })
                    }
                  />
                  <span>縁取り</span>
                </label>
              </div>
              {(value.stroke ?? DEFAULT_STROKE).enabled && (
                <>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel}>色</span>
                    <input
                      type="color"
                      value={(value.stroke ?? DEFAULT_STROKE).color}
                      onChange={(e) =>
                        patch({
                          stroke: { ...(value.stroke ?? DEFAULT_STROKE), color: e.target.value },
                        })
                      }
                      style={styles.colorInput}
                    />
                    <span style={styles.sliderLabel}>太さ</span>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={(value.stroke ?? DEFAULT_STROKE).width}
                      onChange={(e) =>
                        patch({
                          stroke: {
                            ...(value.stroke ?? DEFAULT_STROKE),
                            width: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      style={styles.slider}
                    />
                    <span style={styles.sliderValue}>
                      {(value.stroke ?? DEFAULT_STROKE).width}px
                    </span>
                  </div>
                </>
              )}

              {/* ─── ドロップシャドウ ────────── */}
              <div style={styles.fxHead}>
                <label style={styles.fxToggle}>
                  <input
                    type="checkbox"
                    checked={(value.shadow ?? DEFAULT_SHADOW).enabled}
                    onChange={(e) =>
                      patch({
                        shadow: { ...(value.shadow ?? DEFAULT_SHADOW), enabled: e.target.checked },
                      })
                    }
                  />
                  <span>シャドウ</span>
                </label>
              </div>
              {(value.shadow ?? DEFAULT_SHADOW).enabled && (
                <>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel}>色</span>
                    <input
                      type="color"
                      value={hexFromRgba((value.shadow ?? DEFAULT_SHADOW).color)}
                      onChange={(e) =>
                        patch({
                          shadow: {
                            ...(value.shadow ?? DEFAULT_SHADOW),
                            color: e.target.value,
                          },
                        })
                      }
                      style={styles.colorInput}
                    />
                    <span style={styles.sliderLabel}>ぼかし</span>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={(value.shadow ?? DEFAULT_SHADOW).blur}
                      onChange={(e) =>
                        patch({
                          shadow: {
                            ...(value.shadow ?? DEFAULT_SHADOW),
                            blur: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      style={styles.slider}
                    />
                    <span style={styles.sliderValue}>
                      {(value.shadow ?? DEFAULT_SHADOW).blur}px
                    </span>
                  </div>
                  <div style={styles.sliderRow}>
                    <span style={styles.sliderLabel}>X</span>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={(value.shadow ?? DEFAULT_SHADOW).offsetX}
                      onChange={(e) =>
                        patch({
                          shadow: {
                            ...(value.shadow ?? DEFAULT_SHADOW),
                            offsetX: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      style={styles.slider}
                    />
                    <span style={styles.sliderValue}>
                      {(value.shadow ?? DEFAULT_SHADOW).offsetX}
                    </span>
                    <span style={styles.sliderLabel}>Y</span>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={(value.shadow ?? DEFAULT_SHADOW).offsetY}
                      onChange={(e) =>
                        patch({
                          shadow: {
                            ...(value.shadow ?? DEFAULT_SHADOW),
                            offsetY: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      style={styles.slider}
                    />
                    <span style={styles.sliderValue}>
                      {(value.shadow ?? DEFAULT_SHADOW).offsetY}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    height: 32,
    padding: "0 8px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#374151",
    maxWidth: 180,
  },
  btnLabel: {
    fontSize: 11,
    color: "#6b7280",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  btnArrow: { fontSize: 9, color: "#9ca3af", fontFamily: "inherit" },
  backdrop: { position: "fixed", inset: 0, zIndex: 100 },
  panel: {
    position: "fixed",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    zIndex: 101,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  panelHeader: {
    padding: "8px 12px",
    fontSize: 11,
    color: "#6b7280",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    flex: "0 0 auto",
  },
  list: { flex: "1 1 auto", overflowY: "auto", padding: 4, minHeight: 80 },
  item: {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    borderRadius: 4,
    color: "#111",
  },
  itemActive: { background: "#dbeafe" },
  itemSample: { display: "block", fontSize: 16, fontWeight: 700 },
  itemHint: {
    display: "block",
    fontSize: 11,
    color: "#6b7280",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif',
    marginTop: 2,
  },
  weightRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 12px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    flex: "0 0 auto",
  },
  weightLabel: { fontSize: 11, color: "#6b7280", marginRight: 4 },
  weightBtn: {
    padding: "4px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    color: "#374151",
  },
  weightBtnActive: { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    flex: "0 0 auto",
  },
  sliderLabel: { fontSize: 11, color: "#6b7280", minWidth: 50 },
  slider: { flex: 1, minWidth: 100 },
  sliderValue: {
    fontSize: 11,
    color: "#374151",
    fontFamily: "monospace",
    minWidth: 44,
    textAlign: "right",
  },
  numberInput: {
    flex: 1,
    height: 24,
    padding: "0 6px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
    textAlign: "right",
  },
  resetBtn: {
    width: 22,
    height: 22,
    padding: 0,
    border: "1px solid #d1d5db",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    color: "#6b7280",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  alignRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    flex: "0 0 auto",
  },
  alignLabel: { fontSize: 11, color: "#6b7280", marginRight: 4 },
  alignBtn: {
    flex: 1,
    height: 28,
    padding: 0,
    border: "1px solid #d1d5db",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    color: "#374151",
  },
  alignBtnActive: {
    background: "#3b82f6",
    color: "#fff",
    borderColor: "#3b82f6",
  },
  fxHead: {
    padding: "8px 12px 4px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    flex: "0 0 auto",
  },
  fxToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#374151",
    cursor: "pointer",
  },
  colorInput: {
    width: 28,
    height: 22,
    padding: 0,
    border: "1px solid #d1d5db",
    borderRadius: 3,
    cursor: "pointer",
  },
};
