import { useState } from 'react';
import {
  History,
  FileUp,
  Calculator,
  MessageSquare,
  PauseCircle,
  CheckCircle,
  XCircle,
  FileText,
  Settings,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  GitCompare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { OperationLog } from '@/types/experiment';

interface OperationTimelineProps {
  logs: OperationLog[];
  highlightOperator?: string;
  getExperimentName?: (id: string) => string;
  operationTypeLabels?: Record<string, string>;
}

const operationConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  import: { icon: FileUp, color: 'text-blue-600', bgColor: 'bg-blue-100', label: '数据导入' },
  calculate: { icon: Calculator, color: 'text-[#0F3460]', bgColor: 'bg-[#0F3460]/10', label: '执行复算' },
  annotate: { icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-100', label: '修改标注' },
  suspend: { icon: PauseCircle, color: 'text-[#E94560]', bgColor: 'bg-[#E94560]/10', label: '挂起记录' },
  confirm: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: '确认通过' },
  reject: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: '拒绝处理' },
  export: { icon: FileText, color: 'text-amber-600', bgColor: 'bg-amber-100', label: '导出报告' },
  parameter_change: { icon: Settings, color: 'text-[#533483]', bgColor: 'bg-[#533483]/10', label: '参数调整' },
};

export const OperationTimeline = ({ logs, highlightOperator = '阿岑', getExperimentName, operationTypeLabels }: OperationTimelineProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const getLabel = (type: string) => {
    if (operationTypeLabels && operationTypeLabels[type]) {
      return operationTypeLabels[type];
    }
    return operationConfig[type]?.label || type;
  };
  
  if (logs.length === 0) {
    return (
      <Card
        title="操作历史"
        subtitle="完整记录所有操作轨迹"
        icon={<History className="w-5 h-5" />}
      >
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无操作记录</p>
          <p className="text-sm text-gray-400 mt-1">开始复算后将显示完整操作历史</p>
        </div>
      </Card>
    );
  }
  
  const isHighlighted = (operator: string) => {
    return operator.includes(highlightOperator);
  };
  
  return (
    <Card
      title="操作历史"
      subtitle={`共 ${logs.length} 条操作记录，维修师傅${highlightOperator}的修改已高亮标记`}
      icon={<History className="w-5 h-5" />}
    >
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-4">
          {logs.map((log, index) => {
            const config = operationConfig[log.operationType] || operationConfig.calculate;
            const Icon = config.icon;
            const isExpanded = expandedId === log.id;
            const highlighted = isHighlighted(log.operator);
            
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'relative pl-12',
                  highlighted && 'rounded-lg ring-2 ring-[#E94560]/30 bg-[#E94560]/5 p-2 -ml-2'
                )}
              >
                <div className={cn(
                  'absolute left-0 w-10 h-10 rounded-full flex items-center justify-center z-10',
                  config.bgColor,
                  highlighted && 'ring-4 ring-[#E94560]/20'
                )}>
                  <Icon className={cn('w-5 h-5', config.color)} />
                </div>
                
                {highlighted && (
                  <div className="absolute left-12 -top-1">
                    <StatusBadge status="warning" size="sm">
                      {highlightOperator}的修改
                    </StatusBadge>
                  </div>
                )}
                
                <div
                  className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{config.label}</h4>
                        <StatusBadge status="info" size="sm" showIcon={false}>
                          {log.operator}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-gray-600">{log.remark}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {log.operator}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={log.operationType === 'suspend' ? 'suspended' : 
                                log.operationType === 'reject' ? 'error' : 'success'}
                        size="sm"
                      >
                        {config.label}
                      </StatusBadge>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (log.beforeSnapshot || log.afterSnapshot) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 border-t border-gray-100 pt-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <GitCompare className="w-4 h-4 text-gray-500" />
                          <h5 className="text-sm font-medium text-gray-700">数据变更对比</h5>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {log.beforeSnapshot && (
                            <div>
                              <p className="text-xs text-gray-500 mb-2">变更前</p>
                              <pre className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 overflow-auto max-h-40">
                                {JSON.stringify(log.beforeSnapshot, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.afterSnapshot && (
                            <div>
                              <p className="text-xs text-gray-500 mb-2">变更后</p>
                              <pre className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 overflow-auto max-h-40">
                                {JSON.stringify(log.afterSnapshot, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
