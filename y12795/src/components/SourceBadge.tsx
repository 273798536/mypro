import { Tag } from 'lucide-react';

interface SourceBadgeProps {
  rowNumber?: number;
  imageName?: string;
  remark?: string;
}

export function SourceBadge({ rowNumber, imageName, remark }: SourceBadgeProps) {
  if (!rowNumber && !imageName) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {rowNumber && (
        <span className="source-badge" title={`原始行号 ${rowNumber}`}>
          <Tag size={12} />
          行{rowNumber}
        </span>
      )}
      {imageName && (
        <span className="source-badge" title={`来源图片: ${imageName}`}>
          <span className="text-xs">🖼️</span>
          {imageName.length > 12 ? imageName.slice(0, 10) + '…' : imageName}
        </span>
      )}
      {remark && (
        <span className="source-badge bg-lab-cream border-lab-amber" title={remark}>
          📝 {remark.length > 10 ? remark.slice(0, 8) + '…' : remark}
        </span>
      )}
    </div>
  );
}
