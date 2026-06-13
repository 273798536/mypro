import { MapPin } from 'lucide-react';

interface SceneTagProps {
  title: string;
}

export default function SceneTag({ title }: SceneTagProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-xs">
      <MapPin size={12} />
      <span>{title}</span>
    </div>
  );
}
