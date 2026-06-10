import {
  FlaskConical,
  TestTube,
  ShieldCheck,
  Edit3,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { TraceNode } from '@/types';
import { cn } from '@/lib/utils';

interface TraceChainProps {
  nodes: TraceNode[];
}

const nodeConfig = {
  material: {
    icon: FlaskConical,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: '原材料',
  },
  experiment: {
    icon: TestTube,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: '实验',
  },
  qc: {
    icon: ShieldCheck,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: '质控',
  },
  correction: {
    icon: Edit3,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: '校正',
  },
  analysis: {
    icon: BarChart3,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: '分析',
  },
  conclusion: {
    icon: CheckCircle2,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label: '结论',
  },
};

export default function TraceChain({ nodes }: TraceChainProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="relative">
      {nodes.map((node, index) => {
        const config = nodeConfig[node.type];
        const Icon = config.icon;
        const isLast = index === nodes.length - 1;

        return (
          <div key={node.id} className="relative flex gap-4">
            {!isLast && (
              <div className="absolute left-6 top-12 h-full w-0.5 bg-gray-200" />
            )}
            <div
              className={cn(
                'relative z-10 flex h-12 w-12 items-center justify-center rounded-full',
                config.color
              )}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div
              className={cn(
                'mb-6 flex-1 rounded-xl border p-4',
                config.bgColor,
                config.borderColor
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium text-white',
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    <h4 className="font-semibold text-gray-900">{node.title}</h4>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{node.description}</p>
                </div>
                {node.time && (
                  <span className="text-xs text-gray-500">
                    {new Date(node.time).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>
              {(node.operator || node.metadata) && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  {node.operator && <span>操作人：{node.operator}</span>}
                  {node.metadata &&
                    Object.entries(node.metadata).map(([key, value]) => (
                      <span key={key}>
                        {key}：{value}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
