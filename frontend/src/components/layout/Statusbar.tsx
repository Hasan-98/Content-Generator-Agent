import { useLanguage } from '../../context/LanguageContext';

interface Props {
  section?: string;
}

export default function Statusbar({ section }: Props) {
  const { t } = useLanguage();

  return (
    <div className="h-7 bg-aB flex items-center px-3 gap-4 shrink-0 font-mono text-xs text-white">
      <div className="flex items-center gap-1.5 opacity-85">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        </svg>
        main
      </div>
      <div className="flex items-center gap-1.5 opacity-85">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px]">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        {t('statusbarSynced')}
      </div>
      <div className="flex-1" />
      {section && <div className="opacity-85">{section}</div>}
      <div className="opacity-85">Google Search API</div>
      <div className="opacity-85">AI: Claude</div>
    </div>
  );
}
