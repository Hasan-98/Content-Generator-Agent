interface Props {
  active: string;
  onChange: (tab: string) => void;
}

const tabs = [
  {
    id: 'topic',
    label: 'Topic Creator',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18M3 12h12M3 17h9" />
        <circle cx="19" cy="17" r="3" />
        <path d="M21 19l1.5 1.5" />
      </svg>
    ),
  },
  {
    id: 'article',
    label: 'Article Creator',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: 'video',
    label: 'Video Script',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram Publisher',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

export default function ActivityBar({ active, onChange }: Props) {
  return (
    <div className="w-14 bg-bg1 border-r border-bd flex flex-col items-center py-3 gap-1 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          title={tab.label}
          className={`w-11 h-11 rounded flex items-center justify-center transition-colors relative group ${
            active === tab.id
              ? 'bg-bg2 text-t1'
              : 'text-t2 hover:text-t1 hover:bg-bg2'
          }`}
        >
          {active === tab.id && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-aB rounded-r" />
          )}
          {tab.icon}
        </button>
      ))}
    </div>
  );
}
