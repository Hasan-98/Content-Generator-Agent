interface Props {
  active: string;
  onChange: (tab: string) => void;
}

const tabs = [
  { id: 'topics', label: 'Topics', icon: '📋' },
  { id: 'persona', label: 'Persona', icon: '👤' },
  { id: 'structure', label: 'Structure', icon: '🗂' },
  { id: 'blog', label: 'Blog', icon: '✍️' },
  { id: 'image', label: 'Image', icon: '🖼' },
];

export default function ActivityBar({ active, onChange }: Props) {
  return (
    <div className="w-14 bg-bg1 border-r border-bd flex flex-col items-center py-2 gap-1 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          title={tab.label}
          className={`w-10 h-10 rounded flex flex-col items-center justify-center text-lg transition-colors ${
            active === tab.id
              ? 'bg-bg2 text-t1'
              : 'text-t2 hover:text-t1 hover:bg-bg2'
          }`}
        >
          {tab.icon}
        </button>
      ))}
    </div>
  );
}
