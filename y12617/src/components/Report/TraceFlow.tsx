import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { AlertTriangle, FileEdit, Camera, MessageSquare, ChevronRight, Clock } from 'lucide-react';
import type { TraceNode, TraceNodeType } from '../../types/report';

interface TraceFlowProps {
  traceChain: TraceNode[];
  title?: string;
}

export const TraceFlow: React.FC<TraceFlowProps> = ({ traceChain, title = '追溯链路' }) => {
  const getNodeIcon = (type: TraceNodeType) => {
    switch (type) {
      case 'anomaly':
        return AlertTriangle;
      case 'annotation':
        return FileEdit;
      case 'snapshot':
        return Camera;
      case 'process_note':
        return MessageSquare;
    }
  };

  const getNodeColor = (type: TraceNodeType) => {
    switch (type) {
      case 'anomaly':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          dot: 'bg-red-500',
        };
      case 'annotation':
        return {
          bg: 'bg-primary-50',
          border: 'border-primary-200',
          icon: 'text-primary-500',
          dot: 'bg-primary-500',
        };
      case 'snapshot':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          icon: 'text-purple-500',
          dot: 'bg-purple-500',
        };
      case 'process_note':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          dot: 'bg-green-500',
        };
    }
  };

  const getNodeTypeLabel = (type: TraceNodeType) => {
    switch (type) {
      case 'anomaly':
        return '异常';
      case 'annotation':
        return '标注草稿';
      case 'snapshot':
        return '画布快照';
      case 'process_note':
        return '处理意见';
    }
  };

  if (traceChain.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 p-2 rounded-lg">
            <ChevronRight className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-neutral-800">{title}</h3>
            <p className="text-sm text-neutral-500">从异常回查到处理意见的完整链路</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {traceChain.length > 1 && (
            <div className="absolute left-7 top-12 bottom-12 w-0.5 bg-neutral-200" />
          )}

          <div className="space-y-1">
            {traceChain.map((node, index) => {
              const colors = getNodeColor(node.type);
              const Icon = getNodeIcon(node.type);
              const isLast = index === traceChain.length - 1;

              return (
                <div key={node.id} className="relative">
                  <div className="flex gap-4">
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-xl ${colors.bg} ${colors.border} border-2 flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      {!isLast && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                          <ChevronRight className="w-4 h-4 text-neutral-400 rotate-90" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 pb-4">
                      <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg} bg-opacity-50`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.icon}`}>
                              {getNodeTypeLabel(node.type)}
                            </span>
                            <span className="text-xs font-mono text-neutral-400">
                              {node.linkId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <Clock className="w-3 h-3" />
                            {new Date(node.timestamp).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </div>

                        <h4 className="font-medium text-neutral-800 mb-1">{node.title}</h4>
                        <p className="text-sm text-neutral-600">{node.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
