import React from 'react';
import { PlaylistItem, Conflict } from '../types';
import { Music, Sparkles, Megaphone, AlertCircle } from 'lucide-react';

interface TimelineProps {
  items: PlaylistItem[];
  conflicts: Conflict[];
  onItemClick?: (item: PlaylistItem) => void;
  onConflictClick?: (conflict: Conflict) => void;
}

const sourceIcons = {
  library: Music,
  promotion: Sparkles,
  advertisement: Megaphone,
};

const sourceColors = {
  library: 'bg-primary-500',
  promotion: 'bg-warning-500',
  advertisement: 'bg-purple-500',
};

export const Timeline: React.FC<TimelineProps> = ({
  items,
  conflicts,
  onItemClick,
  onConflictClick,
}) => {
  const getItemConflicts = (item: PlaylistItem) => {
    return conflicts.filter((c) => c.relatedItemIds.includes(item.id));
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-surface-800 mb-6 font-display">
        歌单时间轴
      </h3>
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-surface-200" />
        
        <div className="space-y-4">
          {items.map((item, index) => {
            const itemConflicts = getItemConflicts(item);
            const hasConflict = itemConflicts.length > 0;
            const SourceIcon = sourceIcons[item.source];
            const firstConflict = itemConflicts[0];

            return (
              <div
                key={item.id}
                className="relative flex items-start gap-4 group cursor-pointer"
                onClick={() => onItemClick?.(item)}
              >
                <div
                  className={`relative z-10 timeline-node ${sourceColors[item.source]} ${
                    hasConflict && !firstConflict?.resolved ? 'conflict-pulse' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {hasConflict && !firstConflict?.resolved && (
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full flex items-center justify-center cursor-pointer z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConflictClick?.(firstConflict);
                      }}
                    >
                      <AlertCircle className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                <div
                  className={`flex-1 ml-4 p-4 rounded-lg border transition-all duration-200 ${
                    hasConflict && !firstConflict?.resolved
                      ? 'border-danger-200 bg-danger-50'
                      : firstConflict?.resolved
                      ? 'border-success-200 bg-success-50'
                      : 'border-surface-200 bg-surface-50 group-hover:bg-white group-hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          item.source === 'library'
                            ? 'bg-primary-100 text-primary-600'
                            : item.source === 'promotion'
                            ? 'bg-warning-100 text-warning-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        <SourceIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-surface-800">
                          {item.song?.title}
                        </p>
                        <p className="text-sm text-surface-500">
                          {item.song?.artist}
                          {item.song?.isNew && (
                            <span className="ml-2 px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded-full">
                              新歌
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-surface-600">
                        {item.scheduledTime}
                      </p>
                      <p className="text-xs text-surface-400">
                        #{item.position + 1}
                      </p>
                    </div>
                  </div>

                  {hasConflict && (
                    <div
                      className={`mt-3 p-3 rounded-md text-sm cursor-pointer ${
                        firstConflict?.resolved
                          ? 'bg-success-100 text-success-700'
                          : 'bg-danger-100 text-danger-700'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onConflictClick?.(firstConflict);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">
                          {firstConflict?.type === 'artist_repeat'
                            ? '同艺人连播'
                            : firstConflict?.type === 'new_song_dense'
                            ? '新歌过密'
                            : '广告撞歌'}
                        </span>
                        <span className="ml-auto text-xs opacity-75">
                          {firstConflict?.resolved ? '已处理' : '点击查看详情'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
