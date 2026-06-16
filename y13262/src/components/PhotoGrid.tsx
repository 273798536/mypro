import { ImageIcon } from 'lucide-react';
import type { Photo } from '../../shared/types';

interface PhotoGridProps {
  photos: Photo[];
}

export default function PhotoGrid({ photos }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        暂无照片
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={`relative aspect-square rounded-lg border-2 overflow-hidden ${
            photo.is_available ? 'border-green-400' : 'border-red-400'
          }`}
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          {photo.is_available ? (
            <img
              src={photo.url}
              alt={photo.original_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <ImageIcon size={24} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
                照片缺失
              </span>
              <span className="text-xs truncate px-2 max-w-full" style={{ color: 'var(--color-text-muted)' }}>
                {photo.original_name}
              </span>
            </div>
          )}

          {photo.is_available && (
            <div className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
          )}
        </div>
      ))}
    </div>
  );
}
