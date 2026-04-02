import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getShopifyConfig, upsertShopifyConfig, deleteShopifyConfig, testShopifyConnection } from '../../api/shopifyConfig';
import type { ShopifyConfigResponse } from '../../api/shopifyConfig';
import toast from 'react-hot-toast';

interface Props {
  topLevelId: string;
  topicName: string;
  onClose: () => void;
}

export default function ShopifyConfigModal({ topLevelId, topicName, onClose }: Props) {
  const { t } = useLanguage();
  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [blogId, setBlogId] = useState('');
  const [existing, setExisting] = useState<ShopifyConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const config = await getShopifyConfig(topLevelId);
        if (config) {
          setExisting(config);
          setShopDomain(config.shopDomain);
          setBlogId(config.blogId || '');
        }
      } catch {
        // No config yet
      } finally {
        setLoading(false);
      }
    })();
  }, [topLevelId]);

  async function handleSave() {
    if (!shopDomain.trim()) {
      toast.error(t('shopifyConfigErrDomain'));
      return;
    }
    if (!existing && !accessToken.trim()) {
      toast.error(t('shopifyConfigErrToken'));
      return;
    }

    setSaving(true);
    try {
      const payload: { shopDomain: string; accessToken?: string; blogId?: string } = {
        shopDomain: shopDomain.trim(),
        blogId: blogId.trim(),
      };
      if (accessToken.trim()) payload.accessToken = accessToken.trim();

      const result = await upsertShopifyConfig(topLevelId, payload);
      setExisting(result);
      setAccessToken('');
      toast.success(t('shopifyConfigSaved'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('shopifyConfigSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testShopifyConnection(topLevelId);
      if (result.success) {
        toast.success(`${t('shopifyConfigTestOk')} — ${result.shopName}`);
      } else {
        toast.error(result.error || t('shopifyConfigTestFail'));
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || t('shopifyConfigTestFail'));
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteShopifyConfig(topLevelId);
      setExisting(null);
      setShopDomain('');
      setAccessToken('');
      setBlogId('');
      toast.success(t('shopifyConfigDeleted'));
    } catch {
      toast.error(t('shopifyConfigDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-bg0/70 backdrop-blur-sm" />
      <div className="relative w-[480px] bg-bg1 border border-bd rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-bd">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-aG">
              <path d="M15.5 2.5L14 4l1 2-1 1 3 3 1-1 2 1 1.5-1.5-5-5z" />
              <path d="M14 4l-9.5 9.5a2 2 0 0 0 0 2.83l2.17 2.17a2 2 0 0 0 2.83 0L19 9" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-t1">{t('shopifyConfigTitle')}</div>
              <div className="text-[11px] text-tM mt-0.5">{topicName}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-t2 hover:text-t1 text-lg transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-t2 text-sm">{t('appLoading')}</div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              {existing && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-aG/10 border border-aG/20">
                  <div className="w-2 h-2 rounded-full bg-aG" />
                  <span className="text-xs text-aG font-medium">{t('shopifyConfigConnected')}</span>
                  <span className="text-xs text-t2 ml-auto">{existing.shopDomain}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-t2 mb-1 block">{t('shopifyConfigDomain')}</label>
                <input
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aG transition-colors placeholder:text-tM"
                />
                <div className="text-[10px] text-tM mt-1">{t('shopifyConfigDomainHint')}</div>
              </div>

              <div>
                <label className="text-xs text-t2 mb-1 block">
                  {t('shopifyConfigToken')}
                  {existing && <span className="text-tM ml-1">({t('shopifyConfigTokenHint')})</span>}
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={existing ? t('shopifyConfigTokenPlaceholderExisting') : t('shopifyConfigTokenPlaceholder')}
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aG transition-colors placeholder:text-tM"
                />
              </div>

              <div>
                <label className="text-xs text-t2 mb-1 block">{t('shopifyConfigBlogId')}</label>
                <input
                  value={blogId}
                  onChange={(e) => setBlogId(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-bg0 border border-bd rounded px-3 py-2 text-sm text-t1 focus:outline-none focus:border-aG transition-colors placeholder:text-tM"
                />
                <div className="text-[10px] text-tM mt-1">{t('shopifyConfigBlogIdHint')}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-bd bg-bg0/30">
              <div className="flex gap-2">
                {existing && (
                  <>
                    <button onClick={handleTest} disabled={testing} className="px-3 py-2 text-xs rounded border border-aG/40 text-aG hover:bg-aG/10 disabled:opacity-50 transition-colors">
                      {testing ? t('shopifyConfigTesting') : t('shopifyConfigTestBtn')}
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="px-3 py-2 text-xs rounded border border-aR/40 text-aR hover:bg-aR/10 disabled:opacity-50 transition-colors">
                      {deleting ? t('shopifyConfigDeleting') : t('shopifyConfigDeleteBtn')}
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-xs text-t2 hover:text-t1 rounded border border-bd hover:border-t2 transition-colors">
                  {t('shopifyConfigCancel')}
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs rounded bg-aG/20 text-aG border border-aG/40 hover:bg-aG/30 disabled:opacity-50 transition-colors font-medium">
                  {saving ? t('shopifyConfigSaving') : t('shopifyConfigSaveBtn')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
