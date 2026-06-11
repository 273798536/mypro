import { useMemo } from 'react';
import { Server, Cpu, Database, MapPin, ArrowDown, Code } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { TraceNodeType } from '@/types';
import { formatDateTime } from '@/utils/date';

interface MaterialTraceProps {
  pointId: string;
}

const nodeIcons: Record<TraceNodeType, typeof Server> = {
  system: Server,
  model: Cpu,
  data: Database,
  point: MapPin,
};

const nodeColors: Record<TraceNodeType, string> = {
  system: 'text-info-purple bg-info-purple/20 border-info-purple/30',
  model: 'text-tech-blue bg-tech-blue/20 border-tech-blue/30',
  data: 'text-success-green bg-success-green/20 border-success-green/30',
  point: 'text-alert-red bg-alert-red/20 border-alert-red/30',
};

const nodeLabels: Record<TraceNodeType, string> = {
  system: '系统',
  model: '模型',
  data: '数据',
  point: '点位',
};

export default function MaterialTrace({ pointId }: MaterialTraceProps) {
  const { materialTraces } = useDataStore();

  const trace = useMemo(() => {
    return materialTraces.find(t => t.pointId === pointId);
  }, [materialTraces, pointId]);

  if (!trace) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>暂无追溯数据</p>
        <p className="text-xs mt-1">该点位未关联材料追溯链</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          材料追溯链
        </h3>
        <span className="text-xs text-tech-blue">{trace.source}</span>
      </div>

      <div className="space-y-2">
        {trace.chain.map((node, idx) => {
          const Icon = nodeIcons[node.type];
          const isLast = idx === trace.chain.length - 1;

          return (
            <div key={node.id}>
              <div className={`glass-card p-3 border ${nodeColors[node.type]}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border ${nodeColors[node.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {node.name}
                      </span>
                      <span className={`tag ${node.type === 'point' ? 'tag-danger' : 'tag-info'}`}>
                        {nodeLabels[node.type]}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted font-mono">
                      {node.id}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {formatDateTime(node.timestamp)}
                    </p>
                  </div>
                </div>
              </div>

              {!isLast && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-4 h-4 text-tech-blue/40" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Code className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-secondary">原始数据快照</span>
        </div>
        <pre className="text-xs font-mono text-text-muted bg-bg-deep/50 p-2 rounded overflow-x-auto">
          {JSON.stringify(JSON.parse(trace.rawData), null, 2)}
        </pre>
      </div>

      <div className="text-xs text-text-muted text-center">
        共 {trace.chain.length} 级追溯链路
      </div>
    </div>
  );
}
