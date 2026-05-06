/**
 * Tiny pub/sub bridge between MediaPickerModal callers and the ImageEditor page.
 *
 * Flow:
 *   1. User opens MediaPickerModal in ImageCard / CreateAvatarModal.
 *   2. They click "✏️ Open in editor". Caller fires `openEditorWith(...)` —
 *      the editor mounts with `pending` set, prefilled with the background URL,
 *      and shows a banner "Editing for <label>".
 *   3. After render, the editor calls `completePending(finalUrl)` which fires
 *      the original callback so ImageCard can apply the URL.
 *
 * This is purposely _not_ a full Redux/zustand store — only a single pending
 * intent at a time (everything else is stored as project state inside the
 * editor itself).
 */

export interface EditorPendingIntent {
  /** Display name shown in the editor banner ("Article image #2", "Photo avatar", etc.) */
  contextLabel: string;
  /** Background image URL to prefill (optional) */
  prefillBackgroundUrl?: string;
  /** Optional initial size id (e.g. "instagram-square") */
  initialSizeId?: string;
  /** Optional title text the caller wants overlaid */
  initialTitle?: string;
  /** Called when the user clicks "Use this image" in the editor */
  onUse: (finalUrl: string) => void;
  /** Called if the user navigates away without picking */
  onCancel?: () => void;
}

let _pending: EditorPendingIntent | null = null;
const _subscribers: Array<(p: EditorPendingIntent | null) => void> = [];

export function getPendingIntent(): EditorPendingIntent | null {
  return _pending;
}

export function setPendingIntent(intent: EditorPendingIntent | null): void {
  _pending = intent;
  for (const sub of _subscribers) sub(intent);
}

/** React hook-friendly subscription — returns an unsubscribe fn. */
export function subscribePendingIntent(cb: (p: EditorPendingIntent | null) => void): () => void {
  _subscribers.push(cb);
  return () => {
    const i = _subscribers.indexOf(cb);
    if (i >= 0) _subscribers.splice(i, 1);
  };
}

/** Editor-side: complete the round trip, fire the callback, clear pending. */
export function completePending(finalUrl: string): void {
  const p = _pending;
  if (!p) return;
  setPendingIntent(null);
  p.onUse(finalUrl);
}

/** Editor-side: user dismissed without picking. */
export function cancelPending(): void {
  const p = _pending;
  if (!p) return;
  setPendingIntent(null);
  p.onCancel?.();
}
