import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { getCampaignDefaults, upsertCampaignDefaults } from '../../api/topics';

interface Props {
  topLevelId: string;
  topLevelName: string;
  onClose: () => void;
}

const IMAGE_TASTES = ['PHOTO', 'TEXT_OVERLAY', 'INFOGRAPHIC', 'ILLUSTRATION', 'CINEMATIC'] as const;
const BG_SOURCES = ['free', 'ai'] as const;

export default function CampaignDefaultsModal({ topLevelId, topLevelName, onClose }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageTaste, setImageTaste] = useState<string>('INFOGRAPHIC');
  const [videoBgSource, setVideoBgSource] = useState<'free' | 'ai'>('free');

  useEffect(() => {
    (async () => {
      try {
        const defaults = await getCampaignDefaults(topLevelId);
        setImageTaste(defaults.imageTaste);
        setVideoBgSource(defaults.videoBgSource);
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [topLevelId]);

  async function handleSave() {
    setSaving(true);
    try {
      await upsertCampaignDefaults(topLevelId, { imageTaste, videoBgSource });
      toast.success(t('campaignDefaultsSaved'));
      onClose();
    } catch {
      toast.error(t('campaignDefaultsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bg0/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg1 border border-bd rounded-lg w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-bd flex items-center justify-between">
          <div>
            <div className="text-sm text-t1 font-semibold">{t('campaignDefaultsTitle')}</div>
            <div className="text-[11px] text-tM mt-0.5">{topLevelName}</div>
          </div>
          <button onClick={onClose} className="text-tM hover:text-t1 transition-colors text-lg leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-tM text-sm">{t('appLoading')}</div>
        ) : (
          <div className="p-5 flex flex-col gap-5">
            {/* Image Taste */}
            <div>
              <label className="block text-[11px] text-t2 mb-2 font-medium">{t('campaignDefaultsImageTaste')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {IMAGE_TASTES.map(taste => (
                  <button
                    key={taste}
                    onClick={() => setImageTaste(taste)}
                    className={`text-[11px] px-3 py-2 rounded border transition-colors ${
                      imageTaste === taste
                        ? 'border-aB bg-aB/15 text-aB font-medium'
                        : 'border-bd text-t2 hover:border-t2'
                    }`}
                  >
                    {t(`campaignDefaultsTaste_${taste}` as any)}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Background Source */}
            <div>
              <label className="block text-[11px] text-t2 mb-2 font-medium">{t('campaignDefaultsVideoBg')}</label>
              <div className="flex flex-col gap-2">
                {BG_SOURCES.map(src => (
                  <button
                    key={src}
                    onClick={() => setVideoBgSource(src)}
                    className={`flex items-start gap-3 p-3 rounded border transition-colors text-left ${
                      videoBgSource === src
                        ? 'border-aB bg-aB/10'
                        : 'border-bd hover:border-t2'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                      videoBgSource === src ? 'border-aB' : 'border-tM'
                    }`}>
                      {videoBgSource === src && <div className="w-2 h-2 rounded-full bg-aB" />}
                    </div>
                    <div>
                      <div className={`text-xs font-medium ${videoBgSource === src ? 'text-aB' : 'text-t1'}`}>
                        {t(`campaignDefaultsBg_${src}` as any)}
                      </div>
                      <div className="text-[10px] text-tM mt-0.5">
                        {t(`campaignDefaultsBg_${src}_desc` as any)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-bd">
              <button
                onClick={onClose}
                className="text-xs px-4 py-2 rounded border border-bd text-t2 hover:text-t1 transition-colors"
              >
                {t('heygenAvatarCancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-4 py-2 rounded bg-aB/20 text-aB border border-aB/40 hover:bg-aB/30 disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? t('settingsSaving') : t('campaignDefaultsSaveBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
