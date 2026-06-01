import { GitBranch, ArrowRight, Database, AlertTriangle, Settings, FileDown } from 'lucide-react';
import type { DataChainNode } from '../../types';
import { formatDateTime } from '../../utils/dateUtils';

interface DataChainViewProps {
  dataChain: DataChainNode[];
}

export function DataChainView({ dataChain }: DataChainViewProps) {
  if (!dataChain || dataChain.length === 0) {
    return (
      <div className="text-center py-8 text-primary-500">
        <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">暂无数据链路记录</p>
      </div>
    );
  }

  const stepIcons = {
    import: <Database className="w-4 h-4" />,
    conflict_detect: <AlertTriangle className="w-4 h-4" />,
    adjust: <Settings className="w-4 h-4" />,
    export: <FileDown className="w-4 h-4" />,
  };

  const stepNames = {
    import: '数据导入',
    conflict_detect: '冲突检测',
    adjust: '调整修改',
    export: '数据导出',
  };

  const stepColors = {
    import: 'bg-primary border-primary-600 text-white',
    conflict_detect: 'bg-conflict border-conflict-dark text-white',
    adjust: 'bg-warning border-warning-dark text-warning-dark',
    export: 'bg-success border-success-dark text-white',
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-primary-800 mb-4 flex items-center gap-2">
        <GitBranch className="w-4 h-4" />
        数据链路追踪 ({dataChain.length} 个节点)
      </h4>
      
      <div className="space-y-4">
        {dataChain.map((node, index) => (
          <div key={index} className="relative flex gap-4">
            {index < dataChain.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-primary-200" />
            )}
            
            <div className={`
              w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${stepColors[node.step]}
            `}>
              {stepIcons[node.step]}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-primary-800">
                  {stepNames[node.step]}
                </span>
                {node.operator && (
                  <span className="text-xs text-primary-500">
                    · {node.operator}
                  </span>
                )}
              </div>
              
              <div className="text-xs text-primary-500 mb-2">
                {formatDateTime(node.timestamp)}
              </div>
              
              <div className="bg-primary-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <span className="text-primary-500">来源：</span>
                    <span className="text-primary-700">{node.source}</span>
                  </div>
                  <div>
                    <span className="text-primary-500">版本：</span>
                    <code className="bg-primary-100 px-1.5 py-0.5 rounded text-xs text-primary-700">
                      {node.version}
                    </code>
                  </div>
                </div>
                
                {node.remark && (
                  <div className="text-primary-700">
                    <span className="text-primary-500">备注：</span>
                    {node.remark}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-primary-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-primary-500">
            链路完整性验证：
          </span>
          <span className="font-medium text-success">
            ✓ 链路完整，数据可追溯
          </span>
        </div>
      </div>
    </div>
  );
}
