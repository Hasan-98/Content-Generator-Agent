import { useState } from 'react';
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
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !imageUrl.trim()) {
      toast.error(t('heygenAvatarErrorEmpty'));
      return;
    }
    setSubmitting(true);
    try {
      const created = await createHeygenAvatar({ name: name.trim(), imageUrl: imageUrl.trim() });
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
          <button onClick={onClose} className="text-tM hover:text-t1 transition-colors text-lg leading-none">×</button>
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

          <div>
            <label className="block text-[11px] text-t2 mb-1">{t('heygenAvatarFieldImageUrl')}</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aB font-mono"
            />
            <div className="text-[10px] text-tM mt-1">{t('heygenAvatarFieldImageUrlHint')}</div>
          </div>

          {imageUrl && (
            <div className="rounded border border-bd overflow-hidden bg-bg0 flex items-center justify-center" style={{ height: 160 }}>
              <img
                src={imageUrl}
                alt="preview"
                className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

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
              disabled={submitting}
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
