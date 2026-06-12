import { Database, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { DataSource, DataSourceStatus } from '@/types';

interface Props {
  sources: DataSource[];
}

const sourceIcons: Record<string, React.ReactNode> = {
  'risk-notice': <Database className="w-5 h-5" />,
  'tide-table': <Database className="w-5 h-5" />,
  'ship-track': <Database className="w-5 h-5" />,
};

function StatusIndicator({ status }: { status: DataSourceStatus }) {
  if (status === 'online') {
    return <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3 h-3" />在线</span>;
  }
  if (status === 'syncing') {
    return <span className="flex items-center gap-1 text-xs text-aqua-600"><Loader2 className="w-3 h-3 animate-spin" />同步中</span>;
  }
  return <span className="flex items-center gap-1 text-xs text-red-500"><WifiOff className="w-3 h-3" />离线</span>;
}

export default function DataSourceCards({ sources }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sources.map((source) => (
        <div
          key={source.id}
          className="card-ocean p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-ocean-800">
              {sourceIcons[source.id]}
              <span className="font-medium text-sm">{source.name}</span>
            </div>
            <StatusIndicator status={source.status} />
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="truncate" title={source.sourcePath}>
              📁 {source.sourcePath}
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {source.lastSyncTime.substring(11, 16)} 更新
              </span>
              <span className="font-mono text-slate-600">{source.recordCount} 条</span>
            </div>
          </div>
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                source.status === 'online' ? 'bg-green-400' : source.status === 'syncing' ? 'bg-aqua-400 animate-pulse' : 'bg-red-400'
              }`}
              style={{ width: source.status === 'online' ? '100%' : source.status === 'syncing' ? '65%' : '30%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
