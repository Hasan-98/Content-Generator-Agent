import { useLanguage } from '../../context/LanguageContext';
import type { HeygenTrainedAvatar, HeygenTrainedAvatarStatus } from '../../types';

interface Props {
  avatar: HeygenTrainedAvatar;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onRetry: (id: string) => void;
}

const STATUS_STYLE: Record<HeygenTrainedAvatarStatus, { bg: string; color: string }> = {
  PENDING:   { bg: '#8b949e22', color: '#8b949e' },
  UPLOADING: { bg: '#d2992222', color: '#d29922' },
  TRAINING:  { bg: '#58a6ff22', color: '#58a6ff' },
  READY:     { bg: '#3fb95022', color: '#3fb950' },
  FAILED:    { bg: '#f8514922', color: '#f85149' },
};

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

function resolveFileUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

export default function AvatarCard({ avatar, onDelete, onRefresh, onRetry }: Props) {
  const { t } = useLanguage();
  const style = STATUS_STYLE[avatar.status];
  const statusLabel = t(`heygenAvatarStatus${avatar.status}` as 'heygenAvatarStatusPENDING');
  const canRefresh = avatar.status === 'TRAINING' || avatar.status === 'UPLOADING';
  const canRetry = avatar.status === 'FAILED';
  const isVideo = avatar.avatarType === 'video';
  const fileUrl = resolveFileUrl(avatar.imageUrl);

  return (
    <div className="rounded-lg border border-bd bg-bg1 overflow-hidden flex flex-col">
      {/* Preview */}
      <div className="aspect-square bg-bg0 flex items-center justify-center overflow-hidden relative">
        {isVideo ? (
          fileUrl ? (
            <video src={fileUrl} className="w-full h-full object-cover" muted />
          ) : (
            <div className="text-4xl">&#x1F3AC;</div>
          )
        ) : (
          fileUrl ? (
            <img src={fileUrl} alt={avatar.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-4xl">&#x1F464;</div>
          )
        )}
        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded font-mono ${
          isVideo ? 'bg-aP/20 text-aP' : 'bg-aC/20 text-aC'
        }`}>
          {isVideo ? t('heygenAvatarTypeVideo') : t('heygenAvatarTypePhoto')}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-t1 font-semibold truncate" title={avatar.name}>{avatar.name}</div>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono shrink-0"
            style={{ background: style.bg, color: style.color }}
          >
            {statusLabel}
          </span>
        </div>

        {avatar.avatarId && (
          <div className="text-[10px] font-mono text-tM truncate" title={avatar.avatarId}>
            ID: {avatar.avatarId}
          </div>
        )}

        {avatar.fileName && (
          <div className="text-[10px] text-tM truncate" title={avatar.fileName}>
            {avatar.fileName}
          </div>
        )}

        {avatar.errorMsg && (
          <div className="text-[10px] text-aR bg-aR/10 rounded px-2 py-1 break-words">
            {avatar.errorMsg}
          </div>
        )}

        <div className="flex gap-1.5 mt-1">
          {canRetry && (
            <button
              onClick={() => onRetry(avatar.id)}
              className="text-[11px] px-2 py-1 rounded border border-bd text-t2 hover:border-aO hover:text-aO transition-colors flex-1"
            >
              {t('heygenAvatarRetry')}
            </button>
          )}
          {canRefresh && (
            <button
              onClick={() => onRefresh(avatar.id)}
              className="text-[11px] px-2 py-1 rounded border border-bd text-t2 hover:border-aB hover:text-aB transition-colors flex-1"
            >
              {t('heygenAvatarRefresh')}
            </button>
          )}
          <button
            onClick={() => onDelete(avatar.id)}
            className="text-[11px] px-2 py-1 rounded border border-bd text-t2 hover:border-aR hover:text-aR transition-colors flex-1"
          >
            {t('heygenAvatarDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}
