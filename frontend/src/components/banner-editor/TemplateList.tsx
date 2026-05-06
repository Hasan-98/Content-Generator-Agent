import { useState } from "react";
import type { BannerTemplate } from "../../lib/bannerEditor/banner-templates";

/**
 * 上部に並ぶテンプレート一覧 + 操作ボタン。
 * - クリックで選択
 * - 「+ 新規」「上書き」「複製」「名前変更」「削除」
 */
export function TemplateList({
  templates,
  selectedId,
  onSelect,
  onCreateNew,
  onSaveOver,
  onDuplicate,
  onRename,
  onDelete,
  hasUnsavedChanges,
}: {
  templates: BannerTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onSaveOver: () => void;
  onDuplicate: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  hasUnsavedChanges: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const selected = templates.find((t) => t.id === selectedId) ?? null;

  return (
    <section style={s.wrap}>
      <div style={s.head}>
        <span style={s.headTitle}>テンプレート</span>
        <button onClick={onCreateNew} style={s.createBtn} title="現在の入力で新規保存">
          + 新規
        </button>
      </div>

      <div style={s.list}>
        {templates.length === 0 && (
          <div style={s.empty}>テンプレートがありません</div>
        )}
        {templates.map((t) => {
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{ ...s.item, ...(active ? s.itemActive : {}) }}
              title={t.name}
            >
              <span style={s.itemName}>{t.name}</span>
              {t.isPreset && <span style={s.presetTag}>preset</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={s.actions}>
          {editing ? (
            <input
              autoFocus
              defaultValue={selected.name}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                if (v && v !== selected.name) onRename(v);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                if (e.key === "Escape") setEditing(false);
              }}
              style={s.renameInput}
            />
          ) : (
            <>
              <button
                onClick={onSaveOver}
                disabled={!hasUnsavedChanges}
                style={{
                  ...s.actionBtn,
                  ...(hasUnsavedChanges ? s.actionPrimary : s.actionDisabled),
                }}
                title="現在の入力でこのテンプレートを上書き"
              >
                💾 上書き保存{hasUnsavedChanges ? " *" : ""}
              </button>
              <button onClick={onDuplicate} style={s.actionBtn} title="複製">
                ⎘ 複製
              </button>
              <button onClick={() => setEditing(true)} style={s.actionBtn} title="名前変更">
                ✏️ 名前
              </button>
              <button
                onClick={() => {
                  if (confirm(`「${selected.name}」を削除しますか？`)) onDelete();
                }}
                style={{ ...s.actionBtn, ...s.actionDanger }}
                title="削除"
              >
                🗑 削除
              </button>
            </>
          )}
        </div>
      )}
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
  head: { display: "flex", alignItems: "center", gap: 8 },
  headTitle: { fontSize: 12, fontWeight: 700, color: "#374151", flex: 1 },
  createBtn: {
    height: 26,
    padding: "0 10px",
    border: "1px solid #3b82f6",
    background: "#3b82f6",
    color: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxHeight: 200,
    overflowY: "auto",
  },
  empty: { fontSize: 11, color: "#9ca3af", padding: "8px 4px" },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 8px",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
    color: "#374151",
    textAlign: "left",
  },
  itemActive: { background: "#dbeafe", borderColor: "#3b82f6", color: "#1e40af" },
  itemName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  presetTag: {
    fontSize: 9,
    padding: "1px 5px",
    background: "#e5e7eb",
    color: "#6b7280",
    borderRadius: 9999,
  },
  actions: { display: "flex", gap: 4, flexWrap: "wrap" },
  actionBtn: {
    flex: "1 1 auto",
    height: 26,
    padding: "0 6px",
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "inherit",
    color: "#374151",
    minWidth: 0,
    whiteSpace: "nowrap",
  },
  actionPrimary: {
    border: "1px solid #3b82f6",
    background: "#3b82f6",
    color: "#fff",
    fontWeight: 600,
  },
  actionDanger: { color: "#b91c1c", borderColor: "#fca5a5" },
  actionDisabled: { color: "#9ca3af", cursor: "not-allowed" },
  renameInput: {
    flex: 1,
    height: 26,
    padding: "0 6px",
    border: "1px solid #3b82f6",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "inherit",
  },
};
