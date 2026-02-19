interface Props {
  message?: string;
}

export default function Statusbar({ message }: Props) {
  return (
    <div className="h-7 bg-aB flex items-center px-4 gap-4 shrink-0">
      <span className="text-bg0 text-xs font-mono">⎇ main</span>
      {message && <span className="text-bg0 text-xs">{message}</span>}
      <span className="ml-auto text-bg0 text-xs opacity-70">Content Creator Studio v1.0</span>
    </div>
  );
}
