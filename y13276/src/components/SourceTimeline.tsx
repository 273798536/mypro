import { sourceTypeLabels } from '@/types';
import type { DataSource } from '@/types';
import { FileText, MessageSquare, MapPin } from 'lucide-react';

const sourceIcons = {
  gis_old: MapPin,
  attachment: FileText,
  verbal: MessageSquare,
};

const sourceColors = {
  gis_old: 'bg-blue-500',
  attachment: 'bg-purple-500',
  verbal: 'bg-orange-500',
};

const sourceBgColors = {
  gis_old: 'bg-blue-50 border-blue-200',
  attachment: 'bg-purple-50 border-purple-200',
  verbal: 'bg-orange-50 border-orange-200',
};

interface SourceTimelineProps {
  sources: DataSource[];
}

export default function SourceTimeline({ sources }: SourceTimelineProps) {
  const sortedSources = [...sources].sort(
    (a, b) => new Date(a.recordTime).getTime() - new Date(b.recordTime).getTime()
  );

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />

      <div className="space-y-4">
        {sortedSources.map((source) => {
          const Icon = sourceIcons[source.type];
          return (
            <div key={source.id} className="relative pl-10">
              <div
                className={`absolute left-0 top-0 w-8 h-8 rounded-full ${sourceColors[source.type]} flex items-center justify-center shadow-md`}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>

              <div className={`rounded-lg border p-3 ${sourceBgColors[source.type]}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-slate-800">
                    {source.name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-white ${sourceColors[source.type]}`}>
                    {sourceTypeLabels[source.type]}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mb-2">
                  <p className="mb-1">
                    <span className="text-slate-500">记录时间：</span>
                    {source.recordTime}
                  </p>
                  <p>
                    <span className="text-slate-500">记录人：</span>
                    {source.recorder}
                  </p>
                </div>

                <div className="bg-white/60 rounded p-2 mb-2">
                  <p className="text-xs text-slate-500 mb-1">原始说法：</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    "{source.description}"
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">口径：</span>
                  <span className="text-sm font-medium text-slate-800">
                    {source.value}
                  </span>
                  {source.position && (
                    <>
                      <span className="text-xs text-slate-500 ml-2">坐标：</span>
                      <span className="text-xs text-slate-600">
                        {source.position.lng.toFixed(4)}, {source.position.lat.toFixed(4)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
