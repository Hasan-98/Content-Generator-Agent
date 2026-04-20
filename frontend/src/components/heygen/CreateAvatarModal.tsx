import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { createHeygenAvatar } from '../../api/heygenAvatars';
import type { HeygenTrainedAvatar } from '../../types';

interface Props {
  onClose: () => void;
  onCreated: (avatar: HeygenTrainedAvatar) => void;
}

export default function CreateAvatarModal({ onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error(t('heygenAvatarErrorNotImage'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('heygenAvatarErrorTooLarge'));
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function clearImage() {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('heygenAvatarErrorEmpty'));
      return;
    }
    if (!imageFile) {
      toast.error(t('heygenAvatarErrorNoImage'));
      return;
    }
    setSubmitting(true);
    try {
      const created = await createHeygenAvatar({ name: name.trim(), imageFile });
      toast.success(t('heygenAvatarCreatedToast'));
      onCreated(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('heygenAvatarCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bg0/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg1 border border-bd rounded-lg w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-bd flex items-center justify-between">
          <div className="text-sm text-t1 font-semibold">{t('heygenAvatarCreateTitle')}</div>
          <button onClick={onClose} className="text-tM hover:text-t1 transition-colors text-lg leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] text-t2 mb-1">{t('heygenAvatarFieldName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('heygenAvatarFieldNamePlaceholder')}
              className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB"
              autoFocus
            />
          </div>

          {/* Drag & drop / click to upload area */}
          <div>
            <label className="block text-[11px] text-t2 mb-1">{t('heygenAvatarFieldImage')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded border border-bd overflow-hidden bg-bg0 flex items-center justify-center" style={{ height: 180 }}>
                <img src={previewUrl} alt="preview" className="max-w-full max-h-full object-contain" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-bg0/80 text-aR hover:bg-aR/20 flex items-center justify-center text-sm transition-colors"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-colors ${
                  dragging ? 'border-aB bg-aB/10' : 'border-bd hover:border-aB/50 bg-bg0'
                }`}
                style={{ height: 180 }}
              >
                <div className="text-3xl text-tM mb-2">+</div>
                <div className="text-xs text-t2">{t('heygenAvatarDropzone')}</div>
                <div className="text-[10px] text-tM mt-1">{t('heygenAvatarDropzoneHint')}</div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-tM bg-bg2 rounded px-3 py-2 leading-relaxed">
            {t('heygenAvatarCreateNote')}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 rounded border border-bd text-t2 hover:text-t1 transition-colors"
            >
              {t('heygenAvatarCancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !imageFile}
              className="text-xs px-4 py-2 rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
            >
              {submitting ? t('heygenAvatarCreating') : t('heygenAvatarCreateBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
