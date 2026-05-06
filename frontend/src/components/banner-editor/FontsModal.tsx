/**
 * フォント追加・管理モーダル。
 *
 * - 組み込みフォント（FONT_OPTIONS）は表示のみ・削除不可
 * - ユーザー追加フォント（custom-fonts）は追加・削除可
 * - 追加は Google Fonts 名 + ウェイト（カンマ区切り）+ 表示名
 *   → 自動で <link rel="stylesheet" href="...googleapis.com/css2?family=..."> を <head> に注入
 *
 * 例) Klee One: name="Klee One" weights="400,600"
 *     Stick: name="Stick" weights="400"
 *     Shippori Antique: name="Shippori Antique" weights="400"
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FONT_OPTIONS } from "../../lib/bannerEditor/fonts";
import {
  listCustomFonts,
  addCustomFont,
  removeCustomFont,
  type CustomFont,
} from "../../lib/bannerEditor/custom-fonts";
import { refreshCustomFonts } from "../../lib/bannerEditor/font-loader";

export function FontsModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  /** 追加・削除があった時に呼ばれる */
  onChanged?: () => void;
}) {
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [name, setName] = useState("");
  const [weights, setWeights] = useState("400");
  const [label, setLabel] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (open) setCustomFonts(listCustomFonts());
  }, [open]);

  if (!open) return null;

  function reload() {
    refreshCustomFonts();
    setCustomFonts(listCustomFonts());
    onChanged?.();
  }

  function addFont() {
    if (!name.trim()) {
      alert("Google Fonts 名を入力してください");
      return;
    }
    const ws = weights
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n >= 100 && n <= 900);
    if (ws.length === 0) {
      alert("ウェイトを 100〜900 の範囲でカンマ区切り入力してください（例: 400, 700）");
      return;
    }
    addCustomFont({
      googleFontName: name.trim(),
      label: label.trim() || name.trim(),
      weights: ws,
      hint: hint.trim() || undefined,
    });
    setName("");
    setWeights("400");
    setLabel("");
    setHint("");
    reload();
  }

  function removeFont(id: string) {
    if (!confirm("このフォントを削除しますか？（既に使用中のテンプレ・プロジェクトでは元の名前のまま残ります）")) return;
    removeCustomFont(id);
    reload();
  }

  return createPortal(
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <h3 style={s.title}>🔤 フォント管理</h3>
            <div style={s.subtitle}>
              Google Fonts に登録されているフォントを追加できます
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn} title="閉じる">✕</button>
        </div>

        <div style={s.body}>
          {/* ── 追加フォーム ── */}
          <section style={s.section}>
            <div style={s.sectionTitle}>+ 新しいフォントを追加</div>
            <div style={s.formGrid}>
              <label style={s.field}>
                <span style={s.fieldLabel}>
                  Google Fonts 名 <span style={s.req}>*</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: Klee One / Stick / Shippori Antique"
                  style={s.input}
                />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>
                  ウェイト <span style={s.req}>*</span>
                </span>
                <input
                  type="text"
                  value={weights}
                  onChange={(e) => setWeights(e.target.value)}
                  placeholder="400, 700"
                  style={s.input}
                />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>表示名（省略時はフォント名）</span>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder=""
                  style={s.input}
                />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>ヒント（任意）</span>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="例: 角丸ポップ"
                  style={s.input}
                />
              </label>
            </div>
            <div style={s.notice}>
              💡 <a href="https://fonts.google.com/?subset=japanese" target="_blank" rel="noreferrer noopener" style={s.link}>
                Google Fonts (日本語フィルタ済み)
              </a> で名前を確認してください。<br />
              ウェイトは Google Fonts 側に存在するもののみ機能します。
            </div>
            <button onClick={addFont} style={s.addBtn}>+ 追加</button>
          </section>

          {/* ── 一覧 ── */}
          <section style={s.section}>
            <div style={s.sectionTitle}>追加済みフォント（{customFonts.length}）</div>
            {customFonts.length === 0 ? (
              <div style={s.empty}>まだ追加されたフォントはありません。</div>
            ) : (
              <ul style={s.list}>
                {customFonts.map((f) => (
                  <li key={f.id} style={s.item}>
                    <span style={{ ...s.sample, fontFamily: f.family }}>あア亜Aa 123</span>
                    <div style={s.itemMeta}>
                      <div style={s.itemName}>{f.label}</div>
                      <div style={s.itemSub}>
                        {f.googleFontName} · w[{f.weights.join(",")}]
                        {f.hint && <> · {f.hint}</>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFont(f.id)}
                      style={s.delBtn}
                      title="削除"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── 組み込みフォント（参考） ── */}
          <section style={s.section}>
            <div style={s.sectionTitle}>組み込みフォント（{FONT_OPTIONS.length}・削除不可）</div>
            <ul style={s.list}>
              {FONT_OPTIONS.map((f) => (
                <li key={f.id} style={s.item}>
                  <span style={{ ...s.sample, fontFamily: f.family }}>あア亜Aa</span>
                  <div style={s.itemMeta}>
                    <div style={s.itemName}>{f.label}</div>
                    <div style={s.itemSub}>w[{f.weights.join(",")}]{f.hint && <> · {f.hint}</>}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div style={s.footer}>
          <button onClick={onClose} style={s.doneBtn}>閉じる</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    zIndex: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    background: "#fff",
    borderRadius: 10,
    width: "min(700px, 100%)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  header: {
    flexShrink: 0,
    padding: "14px 18px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
  },
  title: { fontSize: 15, fontWeight: 700, margin: 0, color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  closeBtn: {
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    color: "#6b7280",
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  section: {
    flexShrink: 0,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
  },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 11, color: "#6b7280", fontWeight: 600 },
  req: { color: "#dc2626" },
  input: {
    height: 30,
    padding: "0 10px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "inherit",
  },
  notice: {
    fontSize: 11,
    color: "#1e40af",
    background: "#eff6ff",
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    lineHeight: 1.6,
  },
  link: { color: "#3b82f6" },
  addBtn: {
    marginTop: 10,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid #3b82f6",
    background: "#3b82f6",
    color: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  empty: { padding: "20px 4px", fontSize: 12, color: "#9ca3af", textAlign: "center" },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 10px",
    borderRadius: 4,
    background: "#fafafa",
  },
  sample: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111",
    minWidth: 96,
  },
  itemMeta: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 13, fontWeight: 600, color: "#111" },
  itemSub: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  delBtn: {
    width: 28,
    height: 28,
    border: "1px solid #fca5a5",
    background: "#fff",
    color: "#b91c1c",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
  },

  footer: {
    flexShrink: 0,
    padding: 12,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
    background: "#f9fafb",
  },
  doneBtn: {
    height: 32,
    padding: "0 18px",
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
  },
};
