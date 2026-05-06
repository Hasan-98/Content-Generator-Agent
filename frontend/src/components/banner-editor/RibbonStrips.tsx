/**
 * 上部リボン用の 3 つの横スクロール strip コンポーネント。
 *  - ProjectStrip       : プロジェクト（保存セット）
 *  - ColorThemeStrip    : テーマ（色）
 *  - TextTemplateStrip  : テンプレート（フォント・サイズ） + ページネーション
 *
 * Excel のリボン UI を意識したコンパクトな横一列レイアウト。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@rendervid/player";
import {
  buildBannerTemplate,
  type BannerInputs,
} from "../../lib/bannerEditor/build-banner-template";
import { renderLayerWithEffects } from "./CustomTextLayer";
import type { TextTemplate } from "../../lib/bannerEditor/text-templates";
import type { ColorTheme } from "../../lib/bannerEditor/color-themes";
import type { BannerTemplate as Project } from "../../lib/bannerEditor/banner-templates";
import type { BannerSize } from "../../lib/bannerEditor/sizes";

// ───── ProjectStrip ─────────────────────────────────────────────────────────

export function ProjectStrip({
  projects,
  selectedId,
  onSelect,
  onCreateNew,
  onSaveOver,
  onDuplicate,
  onRename,
  onDelete,
  hasUnsavedChanges,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onSaveOver: () => void;
  onDuplicate: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  hasUnsavedChanges: boolean;
}) {
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <section style={s.strip}>
      <div style={s.stripLabel}>プロジェクト</div>
      <div style={s.stripScroll}>
        <button onClick={onCreateNew} style={s.newBtn} title="現在の入力を新規プロジェクトとして保存">
          + 新規
        </button>
        {projects.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              // 枠は付けず、選択中は ✓ バッジ + 青太字で識別
              style={{ ...s.projectChip, ...(active ? s.projectChipActive : {}) }}
              title={p.name}
            >
              {active && <span style={s.inlineCheck}>✓</span>}
              {p.isPreset && <span style={s.presetDot}>●</span>}
              {p.name}
            </button>
          );
        })}
      </div>
      {selected && (
        <div style={s.stripActions}>
          <button
            onClick={onSaveOver}
            disabled={!hasUnsavedChanges}
            style={{
              ...s.actionBtn,
              ...(hasUnsavedChanges ? s.actionPrimary : s.actionDisabled),
            }}
            title="現在の入力で上書き"
          >
            💾{hasUnsavedChanges ? " *" : ""}
          </button>
          <button onClick={onDuplicate} style={s.actionBtn} title="複製">⎘</button>
          <button
            onClick={() => {
              const v = prompt("新しい名前", selected.name);
              if (v && v.trim()) onRename(v.trim());
            }}
            style={s.actionBtn}
            title="名前変更"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (confirm(`「${selected.name}」を削除しますか？`)) onDelete();
            }}
            style={{ ...s.actionBtn, ...s.actionDanger }}
            title="削除"
          >
            🗑
          </button>
        </div>
      )}
    </section>
  );
}

// ───── ColorThemeStrip ──────────────────────────────────────────────────────

export function ColorThemeStrip({
  themes,
  selectedId,
  onSelect,
}: {
  themes: ColorTheme[];
  selectedId: string | null;
  onSelect: (t: ColorTheme) => void;
}) {
  return (
    <section style={s.strip}>
      <div style={s.stripLabel}>テーマ</div>
      <div style={s.stripScroll}>
        {themes.map((t) => {
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              // 枠は付けず、選択中は色帯の右上に ✓ バッジ + 名前を青太字
              style={s.themeChip}
              title={t.name}
            >
              <div style={s.themeSwatchRow}>
                <span style={{ ...s.themeSwatch, background: t.backgroundColor }} />
                <span style={{ ...s.themeSwatch, background: t.textColor }} />
                <span style={{ ...s.themeSwatch, background: t.badgeColor }} />
                {active && <span style={s.themeCheck}>✓</span>}
              </div>
              <span style={{ ...s.themeName, ...(active ? s.themeNameActive : {}) }}>
                {t.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ───── TextTemplateStrip ────────────────────────────────────────────────────

const PAGE_SIZE = 8;
const THUMB_W = 76;
const THUMB_H = 76;

export function TextTemplateStrip({
  templates,
  selectedId,
  onSelect,
  onCreateNew,
  onSaveOver,
  onDuplicate,
  onRename,
  onDelete,
  hasUnsavedChanges,
  baseInputs,
  size,
}: {
  templates: TextTemplate[];
  selectedId: string | null;
  onSelect: (t: TextTemplate) => void;
  onCreateNew: () => void;
  onSaveOver: () => void;
  onDuplicate: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  hasUnsavedChanges: boolean;
  baseInputs: BannerInputs;
  size: BannerSize;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = templates.slice(start, start + PAGE_SIZE);

  // テンプレート件数が増えたら（= 新規追加された）ページ 0 に戻す。
  // listTextTemplates が「ユーザー作成を新しい順で先頭」に並べるので、page 0 に追加分が出る。
  const prevLen = useRef(templates.length);
  useEffect(() => {
    if (templates.length > prevLen.current) setPage(0);
    prevLen.current = templates.length;
  }, [templates.length]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  return (
    <section style={s.strip}>
      <div style={s.stripLabel}>テンプレート</div>
      <button
        onClick={onCreateNew}
        style={s.newBtn}
        title="現在のフォント・サイズ・位置を新しいテンプレートとして保存"
      >
        + 新規
      </button>
      <button
        onClick={() => setPage(Math.max(0, safePage - 1))}
        disabled={safePage === 0}
        style={{ ...s.pageBtn, ...(safePage === 0 ? s.actionDisabled : {}) }}
      >
        ‹
      </button>
      <div style={s.stripScroll}>
        {visible.map((t) => (
          <ThumbChip
            key={t.id}
            template={t}
            active={t.id === selectedId}
            dirty={t.id === selectedId && hasUnsavedChanges}
            baseInputs={baseInputs}
            size={size}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>
      <button
        onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
        disabled={safePage >= totalPages - 1}
        style={{ ...s.pageBtn, ...(safePage >= totalPages - 1 ? s.actionDisabled : {}) }}
      >
        ›
      </button>
      <span style={s.pageInfo}>
        {safePage + 1}/{totalPages}
      </span>

      {selected && (
        <div style={s.stripActions}>
          <button
            onClick={onSaveOver}
            disabled={!hasUnsavedChanges}
            style={{
              ...s.actionBtn,
              ...(hasUnsavedChanges ? s.actionPrimary : s.actionDisabled),
            }}
            title="現在のフォント・サイズ・位置でこのテンプレートを上書き"
          >
            💾{hasUnsavedChanges ? " *" : ""}
          </button>
          <button onClick={onDuplicate} style={s.actionBtn} title="複製して別名で保存">⎘</button>
          <button
            onClick={() => {
              const v = prompt("新しい名前", selected.name);
              if (v && v.trim()) onRename(v.trim());
            }}
            style={s.actionBtn}
            title="名前変更"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (confirm(`「${selected.name}」を削除しますか？`)) onDelete();
            }}
            style={{ ...s.actionBtn, ...s.actionDanger }}
            title="削除"
          >
            🗑
          </button>
        </div>
      )}
    </section>
  );
}

function ThumbChip({
  template,
  active,
  dirty,
  baseInputs,
  size,
  onClick,
}: {
  template: TextTemplate;
  active: boolean;
  dirty?: boolean;
  baseInputs: BannerInputs;
  size: BannerSize;
  onClick: () => void;
}) {
  const aspect = size.width / size.height;
  const thumbW = aspect >= 1 ? THUMB_W : Math.round(THUMB_H * aspect);
  const thumbH = aspect >= 1 ? Math.round(THUMB_W / aspect) : THUMB_H;
  const fitScale = Math.min(thumbW / size.width, thumbH / size.height);

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
      // テンプレートチップは active 時の枠・背景は付けない（識別は ✓ バッジ + 名前色で行う）
      style={s.thumbChip}
      title={template.name}
    >
      <div
        style={{
          width: thumbW,
          height: thumbH,
          background: "#000",
          overflow: "hidden",
          position: "relative",
          borderRadius: 3,
        }}
      >
        <div
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${fitScale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        >
          <Player
            template={tpl as never}
            controls={false}
            style={{ width: size.width, height: size.height }}
            renderLayer={renderLayerWithEffects as never}
          />
        </div>
        {active && <span style={s.activeBadge}>{dirty ? "✎" : "✓"}</span>}
      </div>
      <div style={{ ...s.thumbName, ...(active ? s.thumbNameActive : {}) }}>
        {template.name}
        {dirty && <span style={s.dirtyMark}> *</span>}
      </div>
    </button>
  );
}

// ───── Styles (Excel リボン風) ────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  strip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    minHeight: 56,
  },
  stripLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#6b7280",
    minWidth: 60,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  stripScroll: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
    overflowX: "auto",
    padding: "2px 0",
  },
  stripActions: { display: "flex", gap: 2, marginLeft: 4 },

  newBtn: {
    flex: "0 0 auto",
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 600,
    border: "1px dashed #3b82f6",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  projectChip: {
    flex: "0 0 auto",
    padding: "5px 10px",
    fontSize: 11,
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#374151",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  },
  projectChipActive: { color: "#1d4ed8", fontWeight: 700 },
  inlineCheck: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: 900,
  },
  presetDot: { color: "#9ca3af", fontSize: 8 },

  themeChip: {
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: 4,
    border: "2px solid transparent",
    borderRadius: 4,
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    minWidth: 60,
  },
  themeSwatchRow: {
    position: "relative",
    display: "flex",
    width: "100%",
    height: 24,
    borderRadius: 3,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  themeSwatch: { flex: 1 },
  themeCheck: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 2px #fff",
  },
  themeName: {
    fontSize: 9,
    color: "#6b7280",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 70,
  },
  themeNameActive: { color: "#1d4ed8", fontWeight: 700 },

  thumbChip: {
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: 3,
    border: "2px solid transparent",
    borderRadius: 4,
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  thumbName: {
    fontSize: 9,
    color: "#6b7280",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 80,
  },
  thumbNameActive: { color: "#1d4ed8", fontWeight: 700 },
  dirtyMark: { color: "#dc2626", fontWeight: 900 },
  activeBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 2px #fff",
  },

  chipActive: {
    borderColor: "#3b82f6",
    background: "#eff6ff",
    boxShadow: "0 0 0 1px #3b82f6 inset",
  },

  pageBtn: {
    flex: "0 0 auto",
    width: 26,
    height: 26,
    padding: 0,
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#374151",
  },
  pageInfo: {
    fontSize: 10,
    color: "#6b7280",
    fontFamily: "monospace",
    minWidth: 32,
    textAlign: "center",
  },

  actionBtn: {
    flex: "0 0 auto",
    width: 28,
    height: 28,
    padding: 0,
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    color: "#374151",
  },
  actionPrimary: {
    border: "1px solid #3b82f6",
    background: "#3b82f6",
    color: "#fff",
  },
  actionDanger: { color: "#b91c1c", borderColor: "#fca5a5" },
  actionDisabled: { opacity: 0.4, cursor: "not-allowed" },
};
