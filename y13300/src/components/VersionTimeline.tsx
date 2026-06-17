import { Lock } from 'lucide-react';
import { TicketVersion, STATUS_COLORS } from '../../shared/types.js';
import { cn } from '@/lib/utils';

interface VersionTimelineProps {
  versions: TicketVersion[];
  selectedVersion?: number;
  onSelect?: (version: number) => void;
}

export default function VersionTimeline({
  versions,
  selectedVersion,
  onSelect,
}: VersionTimelineProps) {
  return (
    <div className="w-80 border-r border-gray-200 bg-white p-4 overflow-y-auto">
      <h3 className="mb-4 font-semibold text-gray-800">版本历史</h3>
      <div className="relative">
        <div className="absolute left-[11px] top-0 h-full w-0.5 bg-gray-200" />
        <div className="space-y-1">
          {versions.map((version, index) => {
            const isActive = selectedVersion === version.version;
            const isLast = index === versions.length - 1;
            const statusColor = STATUS_COLORS[version.status].replace('bg-', '');

            return (
              <div key={version.id} className="relative flex items-start gap-4">
                <div className="relative z-10 flex h-6 w-6 items-center justify-center">
                  <div
                    className={cn(
                      'h-4 w-4 rounded-full border-2 border-white',
                      STATUS_COLORS[version.status],
                      isActive && 'ring-2 ring-offset-1',
                      isActive && `ring-${statusColor}`
                    )}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onSelect?.(version.version)}
                  className={cn(
                    'flex-1 rounded-lg border p-3 text-left transition-all duration-200',
                    isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                    !isLast && 'pb-4'
                  )}
                >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    v{version.version}
                  </span>
                  {version.isLocked && (
                    <Lock className="w-3.5 h-3.5 text-violet-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {version.modelVersion}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                  {version.summary}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>{version.createdBy}</span>
                  <span>·</span>
                  <span>{new Date(version.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                {version.changeNote && (
                  <p className="mt-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {version.changeNote}
                  </p>
                )}
              </button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
