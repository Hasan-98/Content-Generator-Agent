interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function PlaceholderPage({ icon, title, description }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h2 className="text-t1 text-xl font-medium mb-2">{title}</h2>
        <p className="text-t2 text-sm">{description}</p>
        <p className="text-tM text-xs mt-2">Coming soon</p>
      </div>
    </div>
  );
}
