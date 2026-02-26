import { useLanguage } from '../../context/LanguageContext';

interface Props {
  selectedCount: number;
  onNextStep: () => void;
  onGeneratePersona: () => void;
  onFactCheck: () => void;
  onDelete: () => void;
}

export default function BulkActions({
  selectedCount,
  onNextStep,
  onGeneratePersona,
  onFactCheck,
  onDelete,
}: Props) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-aB bg-bg1 mb-2"
      style={{ background: 'rgba(88,166,255,0.06)' }}
    >
      <span className="text-xs text-aB font-semibold mr-1">
        {selectedCount} {t('bulkSelected')}
      </span>
      <div className="h-3 w-px bg-bd" />
      <button
        onClick={onNextStep}
        className="text-xs px-2 py-1 rounded bg-aB text-bg0 font-medium hover:opacity-90 transition-opacity"
      >
        {t('bulkNextStep')}
      </button>
      <button
        onClick={onGeneratePersona}
        className="text-xs px-2 py-1 rounded border border-aP text-aP hover:bg-bg2 transition-colors"
      >
        {t('bulkGeneratePersona')}
      </button>
      <button
        onClick={onFactCheck}
        className="text-xs px-2 py-1 rounded border border-aG text-aG hover:bg-bg2 transition-colors"
      >
        {t('bulkFactCheck')}
      </button>
      <div className="flex-1" />
      <button
        onClick={onDelete}
        className="text-xs px-2 py-1 rounded border border-aR text-aR hover:bg-bg2 transition-colors"
      >
        {t('bulkDelete')}
      </button>
    </div>
  );
}
