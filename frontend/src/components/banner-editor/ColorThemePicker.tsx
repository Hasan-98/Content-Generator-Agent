import type { ColorTheme } from "../../lib/bannerEditor/color-themes";

/**
 * カラーテーマ選択（カラーパレット風）。
 * 各テーマは bg / text / badge を縦 3 段の色帯として表示する。
 */
export function ColorThemePicker({
  themes,
  selectedId,
  onSelect,
}: {
  themes: ColorTheme[];
  selectedId: string | null;
  onSelect: (t: ColorTheme) => void;
}) {
  return (
    <section style={s.wrap}>
      <div style={s.head}>
        <span style={s.headTitle}>テーマ（色）</span>
        <span style={s.headCount}>{themes.length} 件</span>
      </div>

      <div style={s.grid}>
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            style={{ ...s.cell, ...(t.id === selectedId ? s.cellActive : {}) }}
            title={t.name}
          >
            <div style={s.swatchStack}>
              <div style={{ ...s.swatch, background: t.backgroundColor }} />
              <div style={{ ...s.swatch, background: t.textColor }} />
              <div style={{ ...s.swatch, background: t.badgeColor }} />
            </div>
            <div style={s.cellName}>{t.name}</div>
          </button>
        ))}
      </div>
    </section>
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
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: 6,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: 4,
    border: "2px solid transparent",
    borderRadius: 6,
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cellActive: { borderColor: "#3b82f6", background: "#eff6ff" },
  swatchStack: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: 48,
    borderRadius: 4,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  swatch: { flex: 1 },
  cellName: {
    fontSize: 10,
    color: "#374151",
    textAlign: "center",
    width: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
