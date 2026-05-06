/**
 * Rendervid Player の renderLayer prop で渡すカスタムレンダラー。
 *
 * Rendervid 0.1.0 の標準実装は:
 *  - text レイヤーで stroke / textShadow を無視する
 *  - video レイヤーは "Video: filename" のプレースホルダーしか出さず、実際に再生されない
 * ため、両方を自前で描画して補う。
 *
 * 使い方:
 *   <Player template={...} renderLayer={renderLayerWithEffects} />
 *
 * 上記以外のレイヤーは null を返して Rendervid のデフォルトに任せる。
 */
import type React from "react";

// Rendervid 内部の Layer 型と少し違うので、必要な部分だけ独自に narrow する
interface AnyLayer {
  type: string;
  props: Record<string, unknown>;
}

interface VideoProps {
  src?: string;
  fit?: "cover" | "contain" | "fill";
  loop?: boolean;
  muted?: boolean;
  startTime?: number;
  endTime?: number;
  playbackRate?: number;
  /** 「再生する区間」の配列（複数カット）。指定されると startTime/endTime より優先 */
  segments?: Array<{ start: number; end: number }>;
}

interface ImageProps {
  src?: string;
  fit?: "cover" | "contain" | "fill" | "none";
  objectPosition?: string;
  /** 角丸（数値 px or "50%" で円）。Rendervid 標準 image レイヤーは borderRadius 非対応のため自前で対応 */
  borderRadius?: number | string;
  /** 枠線（CSS の border 文字列。例: "4px solid #fff"） */
  border?: string;
  /** 影（CSS の box-shadow 文字列） */
  boxShadow?: string;
}

interface TextProps {
  text?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  letterSpacing?: number;
  opacity?: number;
  stroke?: { color: string; width: number };
  textShadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  // バッジのような背景付きテキスト用
  backgroundColor?: string;
  padding?: number | { top: number; right: number; bottom: number; left: number };
  borderRadius?: number;
  // 改行制御: "pre-wrap"（改行尊重・自動折返） / "nowrap"（折返禁止）/ "normal"（標準）
  whiteSpace?: "pre-wrap" | "nowrap" | "normal" | "pre" | "pre-line";
}

export function renderLayerWithEffects(layer: AnyLayer): React.ReactNode {
  if (layer.type === "video") return renderVideo(layer.props as VideoProps);
  if (layer.type === "image") {
    const ip = layer.props as ImageProps;
    // borderRadius / border / boxShadow が指定されている時だけカスタム描画（その他はデフォルトに任せる）
    const hasCustomStyle =
      (ip.borderRadius !== undefined && ip.borderRadius !== 0) ||
      !!ip.border ||
      !!ip.boxShadow;
    if (hasCustomStyle) return renderImage(ip);
    return null;
  }
  if (layer.type !== "text") return null; // 他は Rendervid デフォルトに任せる

  const props = layer.props as TextProps;

  // Rendervid デフォルト互換のレイアウト
  const justifyContent =
    props.textAlign === "left" ? "flex-start"
    : props.textAlign === "right" ? "flex-end"
    : "center";
  const alignItems =
    props.verticalAlign === "top" ? "flex-start"
    : props.verticalAlign === "bottom" ? "flex-end"
    : "center";

  const stroke = props.stroke;
  const shadow = props.textShadow;
  const text = props.text ?? "";
  // 明示の whiteSpace 指定があればそれを使う。
  // 指定なしなら、改行 \n が含まれるかどうかで自動切替。
  const whiteSpace =
    props.whiteSpace ?? (text.includes("\n") ? "pre-wrap" : "normal");

  // backgroundColor / padding / borderRadius を持つ場合は、
  // 「バッジ風: 背景付きテキスト」レイアウトにして自動サイズに見せる。
  const hasBackground = !!props.backgroundColor;

  const innerStyle: React.CSSProperties = {
    fontSize: props.fontSize ?? 16,
    fontWeight: props.fontWeight ?? "normal",
    color: props.color ?? "#ffffff",
    fontFamily: props.fontFamily ?? "inherit",
    lineHeight: props.lineHeight,
    letterSpacing: props.letterSpacing,
    textAlign: props.textAlign ?? "center",
    whiteSpace,
    wordBreak: whiteSpace === "nowrap" ? "keep-all" : "break-word",
    opacity: props.opacity,
    WebkitTextStroke: stroke && stroke.width > 0 ? `${stroke.width}px ${stroke.color}` : undefined,
    textShadow: shadow
      ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
      : undefined,
    paintOrder: "stroke fill" as React.CSSProperties["paintOrder"],
    // 背景付きの場合は inline-block で自動サイズに
    ...(hasBackground
      ? {
          display: "inline-block",
          backgroundColor: props.backgroundColor,
          padding: paddingToCss(props.padding),
          borderRadius: props.borderRadius,
        }
      : {}),
  };

  // 外側で「中央/上下/左右」配置
  const wrapStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems,
    justifyContent,
  };

  if (hasBackground) {
    // 背景付きテキストはサイズ自動。inner は inline-block。
    return (
      <div style={wrapStyle}>
        <span style={innerStyle}>{text}</span>
      </div>
    );
  }
  // 通常テキストは Rendervid 標準と同じく div が領域いっぱい
  return <div style={{ ...wrapStyle, ...innerStyle }}>{text}</div>;
}

function paddingToCss(p: TextProps["padding"]): string | number | undefined {
  if (p == null) return undefined;
  if (typeof p === "number") return `${p}px`;
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

/** image レイヤーを borderRadius / border / boxShadow 付きで描画。Rendervid 標準は対応してない。 */
function renderImage(props: ImageProps): React.ReactNode {
  if (!props.src) return null;
  const fit: React.CSSProperties["objectFit"] =
    props.fit === "contain" ? "contain"
    : props.fit === "fill" ? "fill"
    : props.fit === "none" ? "none"
    : "cover";
  return (
    <img
      src={props.src}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        objectPosition: props.objectPosition,
        borderRadius: props.borderRadius,
        border: props.border,
        boxShadow: props.boxShadow,
        // border の太さ分はみ出ないよう box-sizing
        boxSizing: "border-box",
        display: "block",
      }}
    />
  );
}

/** video レイヤーを実 <video> 要素として描画。Rendervid 0.1.0 のスタブ実装の代替。 */
function renderVideo(props: VideoProps): React.ReactNode {
  if (!props.src) return null;
  const fit: React.CSSProperties["objectFit"] =
    props.fit === "contain" ? "contain"
    : props.fit === "fill" ? "fill"
    : "cover";

  const segments = (props.segments ?? []).filter((sg) => sg && sg.end > sg.start);
  const hasSegments = segments.length > 0;

  return (
    <video
      src={props.src}
      autoPlay
      // segments があっても loop=true を維持。ネイティブループが自然終端を救い、
      // 区間境界の処理は onTimeUpdate が行う（loop=false にするとカット直後にも止まり、
      // currentTime を書き換えても再生再開しないため）
      loop={props.loop ?? true}
      muted={props.muted ?? true}
      playsInline
      preload="auto"
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (hasSegments) {
          v.currentTime = segments[0].start;
        } else if (props.startTime && props.startTime > 0) {
          v.currentTime = props.startTime;
        }
        if (props.playbackRate && props.playbackRate > 0) {
          v.playbackRate = props.playbackRate;
        }
        // 何らかの理由で paused になっていたら再生を試みる
        v.play().catch(() => {});
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        if (hasSegments) {
          // 複数区間: 現在位置がどの区間内か判定し、終端を超えたら次の区間へ。最後なら先頭へ。
          const t = v.currentTime;
          const idx = segments.findIndex((sg) => t >= sg.start && t < sg.end);
          if (idx === -1) {
            // カット部分にいる → 次の区間の頭、なければ先頭
            const next = segments.find((sg) => sg.start >= t) ?? segments[0];
            v.currentTime = next.start;
          } else if (t >= segments[idx].end - 0.05) {
            const next = segments[idx + 1] ?? segments[0];
            v.currentTime = next.start;
          }
          return;
        }
        // 単一区間（旧来）
        if (props.endTime && v.currentTime >= props.endTime) {
          v.currentTime = props.startTime ?? 0;
          if (!(props.loop ?? true)) v.pause();
        }
      }}
      onEnded={(e) => {
        // loop=true でも保険：終端→先頭区間 or 0 へ戻して再生
        const v = e.currentTarget;
        v.currentTime = hasSegments ? segments[0].start : (props.startTime ?? 0);
        v.play().catch(() => {});
      }}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        display: "block",
      }}
    />
  );
}
