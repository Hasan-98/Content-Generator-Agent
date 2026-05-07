import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageEditor from '../../pages/ImageEditor';
import { cancelPending, getPendingIntent, subscribePendingIntent } from '../../lib/imageEditorBridge';

/**
 * Fullscreen overlay that renders the ImageEditor when the bridge has a
 * pending intent. Lets ImageCard (Article STEP B) and VideoScriptCreator
 * trigger the editor inline without leaving the page.
 *
 * Lifecycle:
 *   - Subscribes to imageEditorBridge.
 *   - When `setPendingIntent({...})` fires, the overlay mounts ImageEditor.
 *   - ImageEditor's "Use this image" / "Cancel" buttons clear the intent,
 *     which triggers the overlay to unmount.
 */
export default function ImageEditorOverlay() {
  const [hasPending, setHasPending] = useState<boolean>(() => getPendingIntent() !== null);

  useEffect(() => {
    return subscribePendingIntent((p) => setHasPending(p !== null));
  }, []);

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (!hasPending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [hasPending]);

  if (!hasPending) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13, 17, 23, 0.92)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          margin: 16,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        <button
          onClick={() => cancelPending()}
          title="Close editor (cancel)"
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: 16,
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <ImageEditor />
        </div>
      </div>
    </div>,
    document.body,
  );
}
