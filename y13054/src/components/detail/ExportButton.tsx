import { Download } from 'lucide-react';
import type { Point, TimelineEvent } from '@/types';
import { exportPoint } from '@/utils/export';

interface Props {
  point: Point;
  events: TimelineEvent[];
}

export default function ExportButton({ point, events }: Props) {
  const handleExport = () => {
    exportPoint(point, events);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-deep-sea text-white text-sm rounded-sm hover:bg-deep-sea-dark transition-colors shadow-sm"
    >
      <Download className="w-4 h-4" strokeWidth={1.8} />
      导出异常记录
    </button>
  );
}
