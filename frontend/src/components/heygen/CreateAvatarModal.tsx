import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { createHeygenAvatar } from '../../api/heygenAvatars';
import type { HeygenTrainedAvatar, HeygenAvatarType } from '../../types';

interface Props {
  onClose: () => void;
  onCreated: (avatar: HeygenTrainedAvatar) => void;
}

const PHOTO_ACCEPT = '.jpg,.jpeg,.png';
const VIDEO_ACCEPT = '.mp4,.mov,.webm';
const PHOTO_MAX_MB = 10;
const VIDEO_MAX_MB = 50;

export default function CreateAvatarModal({ onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const [avatarType, setAvatarType] = useState<HeygenAvatarType>('photo');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPhoto = avatarType === 'photo';
  const maxMB = isPhoto ? PHOTO_MAX_MB : VIDEO_MAX_MB;
  const acceptTypes = isPhoto ? PHOTO_ACCEPT : VIDEO_ACCEPT;

  function clearFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function switchType(type: HeygenAvatarType) {
    if (type === avatarType) return;
    clearFile();
    setAvatarType(type);
  }

  function handleFile(f: File) {
    if (isPhoto && !f.type.startsWith('image/')) {
      toast.error(t('heygenAvatarErrorNotImage'));
      return;
    }
    if (!isPhoto && !f.type.startsWith('video/')) {
      toast.error(t('heygenAvatarErrorNotVideo'));
      return;
    }
    if (f.size > maxMB * 1024 * 1024) {
      toast.error(isPhoto ? t('heygenAvatarErrorTooLarge') : t('heygenAvatarErrorVideoTooLarge'));
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('heygenAvatarErrorEmpty'));
      return;
    }
    if (!file) {
      toast.error(t('heygenAvatarErrorNoFile'));
      return;
    }
    setSubmitting(true);
    try {
      const created = await createHeygenAvatar({ name: name.trim(), avatarType, file });
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
          {/* Avatar Type Toggle */}
          <div>
            <label className="block text-[11px] text-t2 mb-1.5">{t('heygenAvatarTypeLabel')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchType('photo')}
                className={`flex-1 text-xs py-2 rounded border transition-colors font-medium ${
                  isPhoto
                    ? 'bg-aB/20 text-aB border-aB/40'
                    : 'bg-bg0 text-t2 border-bd hover:border-aB/30'
                }`}
              >
                {t('heygenAvatarTypePhoto')}
              </button>
              <button
                type="button"
                onClick={() => switchType('video')}
                className={`flex-1 text-xs py-2 rounded border transition-colors font-medium ${
                  !isPhoto
                    ? 'bg-aB/20 text-aB border-aB/40'
                    : 'bg-bg0 text-t2 border-bd hover:border-aB/30'
                }`}
              >
                {t('heygenAvatarTypeVideo')}
              </button>
            </div>
          </div>

          {/* Name */}
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

          {/* File upload area */}
          <div>
            <label className="block text-[11px] text-t2 mb-1">{t('heygenAvatarFieldFile')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              onChange={handleFileInput}
              className="hidden"
            />

            {previewUrl && file ? (
              <div className="relative rounded border border-bd overflow-hidden bg-bg0 flex items-center justify-center" style={{ height: 180 }}>
                {isPhoto ? (
                  <img src={previewUrl} alt="preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <video src={previewUrl} controls className="max-w-full max-h-full" />
                )}
                <button
                  type="button"
                  onClick={clearFile}
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
                <div className="text-3xl text-tM mb-2">{isPhoto ? '+' : '\u25B6'}</div>
                <div className="text-xs text-t2">
                  {isPhoto ? t('heygenAvatarDropzonePhoto') : t('heygenAvatarDropzoneVideo')}
                </div>
                <div className="text-[10px] text-tM mt-1">
                  {isPhoto ? t('heygenAvatarDropzoneHintPhoto') : t('heygenAvatarDropzoneHintVideo')}
                </div>
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
              disabled={submitting || !file}
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
