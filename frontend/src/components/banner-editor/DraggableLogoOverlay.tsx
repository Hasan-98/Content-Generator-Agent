/**
 * プレビュー上にロゴ位置のドラッグハンドルを重ねるオーバーレイ。
 *
 * - inputs.logoPosition の現在値からロゴ矩形の表示座標を算出
 * - mousedown でドラッグ開始 → 移動量を 1080 基準 px に逆算して logoX/logoY を更新
 * - 移動が始まると logoPosition は自動的に "custom" に切り替わる
 * - 親要素は relative で playerWrap の上に absolute 配置される前提
 */
import { useEffect, useRef, useState } from "react";
import type { BannerInputs } from "../../lib/bannerEditor/build-banner-template";

export function DraggableLogoOverlay({
  inputs,
  bannerWidth,
  bannerHeight,
  displayWidth,
  displayHeight,
  onPatch,
}: {
  inputs: Required<BannerInputs>;
  bannerWidth: number;
  bannerHeight: number;
  displayWidth: number;
  displayHeight: number;
  onPatch: (patch: Partial<BannerInputs>) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 }); // ロゴ矩形左上→マウス位置の相対オフセット（表示座標系）
  const overlayRef = useRef<HTMLDivElement>(null);

  // 1080 基準のスケール（buildBannerTemplate と同じ計算）
  const scale = Math.min(bannerWidth, bannerHeight) / 1080;
  const fitScale = displayWidth / bannerWidth;
  const logoSize = (inputs.logoSize ?? 120) * scale; // 実バナー座標
  const margin = (inputs.logoMargin ?? 40) * scale;

  // 現在のロゴ位置（実バナー座標）
  const pos = inputs.logoPosition ?? "bottom-right";
  let lx: number;
  let ly: number;
  if (pos === "custom") {
    lx = (inputs.logoX ?? 0) * scale;
    ly = (inputs.logoY ?? 0) * scale;
  } else {
    lx = margin;
    ly = margin;
    if (pos.endsWith("center")) lx = (bannerWidth - logoSize) / 2;
    else if (pos.endsWith("right")) lx = bannerWidth - logoSize - margin;
    if (pos.startsWith("middle") || pos === "center") ly = (bannerHeight - logoSize) / 2;
    else if (pos.startsWith("bottom")) ly = bannerHeight - logoSize - margin;
  }

  // 表示座標
  const dx = lx * fitScale;
  const dy = ly * fitScale;
  const dSize = logoSize * fitScale;

  function onMouseDown(e: React.MouseEvent) {
    if (!inputs.logoUrl) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;
    function move(e: MouseEvent) {
      const parent = overlayRef.current?.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      // 表示座標系でのロゴ左上位置
      const newDx = e.clientX - parentRect.left - dragOffsetRef.current.x;
      const newDy = e.clientY - parentRect.top - dragOffsetRef.current.y;
      // 表示 → 実バナー → 1080 基準
      const newLx = newDx / fitScale;
      const newLy = newDy / fitScale;
      const newX1080 = newLx / scale;
      const newY1080 = newLy / scale;
      onPatch({
        logoPosition: "custom",
        logoX: Math.round(newX1080),
        logoY: Math.round(newY1080),
      });
    }
    function up() {
      setDragging(false);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, fitScale, scale, onPatch]);

  if (!inputs.logoUrl) return null;
  // displayHeight は使わないが props 互換のため受け取る
  void displayHeight;

  return (
    <div
      ref={overlayRef}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: dx,
        top: dy,
        width: dSize,
        height: dSize,
        cursor: dragging ? "grabbing" : "grab",
        border: "2px dashed rgba(59, 130, 246, 0.7)",
        background: dragging ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.05)",
        boxSizing: "border-box",
        zIndex: 10,
        transition: dragging ? "none" : "background 0.12s",
      }}
      title="ドラッグでロゴを移動"
    >
      <span
        style={{
          position: "absolute",
          top: -22,
          left: 0,
          fontSize: 10,
          padding: "2px 6px",
          background: "#3b82f6",
          color: "#fff",
          borderRadius: 3,
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}
      >
        🏷 ロゴ {pos === "custom" ? `(${inputs.logoX ?? 0}, ${inputs.logoY ?? 0})` : pos}
      </span>
    </div>
  );
}
