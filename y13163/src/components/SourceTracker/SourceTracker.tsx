import { useMemo } from 'react';
import { GitBranch, Database, Cpu, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useParamStore } from '@/store/useParamStore';
import { dataStatusLabels, dataStatusColors } from '@/utils/anomaly';
import { formatTimestamp } from '@/utils/format';

const sourceTypeConfig = {
  'buoy-A-primary': { label: '浮标A - 主传感器', icon: Cpu, color: '#00D4FF' },
  'buoy-A-secondary': { label: '浮标A - 备用传感器', icon: Database, color: '#8884d8' },
  'buoy-B-primary': { label: '浮标B - 主传感器', icon: Cpu, color: '#00C853' },
  'default': { label: '未知来源', icon: Database, color: '#64748B' },
};

const processingSteps = [
  { key: 'raw', label: '原始数据采集', description: '从浮标传感器获取原始数据' },
  { key: 'parse', label: '数据解析', description: '解析二进制数据包，转换为可读格式' },
  { key: 'validate', label: '有效性校验', description: '检查数据范围、格式是否合法' },
  { key: 'attribution', label: '误差归因', description: '使用归因公式计算误差值' },
  { key: 'anomaly', label: '异常检测', description: '基于边界值和统计方法检测异常' },
  { key: 'output', label: '结果输出', description: '生成最终数据和报告' },
];

export default function SourceTracker() {
  const { getSelectedData, getSelectedAnomaly } = useDataStore();
  const { getCurrentVersionData } = useParamStore();
  
  const selectedData = getSelectedData();
  const selectedAnomaly = getSelectedAnomaly();
  const currentVersion = getCurrentVersionData();

  const sourceConfig = useMemo(() => {
    if (!selectedData) return sourceTypeConfig['default'];
    return sourceTypeConfig[selectedData.source as keyof typeof sourceTypeConfig] || sourceTypeConfig['default'];
  }, [selectedData]);

  const getStepStatus = (stepKey: string) => {
    if (!selectedData) return 'pending';
    
    if (stepKey === 'anomaly') {
      if (selectedData.status === 'error' || selectedData.status === 'warning') {
        return 'warning';
      }
      return 'completed';
    }
    
    if (stepKey === 'attribution') {
      if (Math.abs(selectedData.errorValue) > 0.5) {
        return 'warning';
      }
      return 'completed';
    }
    
    return 'completed';
  };

  const SourceIcon = sourceConfig.icon;

  if (!selectedData) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-cyan-glow" />
          <h4 className="text-white font-semibold">数据来源追踪</h4>
        </div>
        <div className="text-center py-8 text-slate-500 text-sm">
          请选择一个数据点查看来源追踪信息
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-glow" />
          <h4 className="text-white font-semibold">数据来源追踪</h4>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-slate-900/60 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${sourceConfig.color}20` }}
              >
                <SourceIcon className="w-4 h-4" style={{ color: sourceConfig.color }} />
              </div>
              <div>
                <div className="text-sm text-white font-medium">{sourceConfig.label}</div>
                <div className="text-xs text-slate-500">数据ID: {selectedData.id}</div>
              </div>
            </div>
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: `${dataStatusColors[selectedData.status]}20`,
                color: dataStatusColors[selectedData.status],
              }}
            >
              {dataStatusLabels[selectedData.status]}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/40 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">采集时间</div>
              <div className="text-white font-mono">{formatTimestamp(selectedData.timestamp)}</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">参数版本</div>
              <div className="text-cyan-glow font-mono">{selectedData.attribution}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-white mb-3">处理流程</div>
          <div className="space-y-2">
            {processingSteps.map((step, index) => {
              const status = getStepStatus(step.key);
              const isLast = index === processingSteps.length - 1;
              
              let StatusIcon = Clock;
              let statusColor = 'text-slate-500';
              let bgColor = 'bg-slate-700/30';
              let borderColor = 'border-slate-600/30';
              
              if (status === 'completed') {
                StatusIcon = CheckCircle2;
                statusColor = 'text-success-green';
                bgColor = 'bg-success-green/10';
                borderColor = 'border-success-green/30';
              } else if (status === 'warning') {
                StatusIcon = AlertTriangle;
                statusColor = 'text-warning-orange';
                bgColor = 'bg-warning-orange/10';
                borderColor = 'border-warning-orange/30';
              }

              return (
                <div key={step.key} className="relative">
                  {!isLast && (
                    <div className="absolute left-4 top-10 w-0.5 h-4 bg-slate-700/50"></div>
                  )}
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor} ${borderColor}`}>
                    <div className={`p-1.5 rounded-full ${bgColor} ${statusColor}`}>
                      <StatusIcon className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${status === 'pending' ? 'text-slate-500' : 'text-white'}`}>
                          {step.label}
                        </span>
                        <span className="text-xs text-slate-500">步骤 {index + 1}/6</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      {step.key === 'attribution' && currentVersion && (
                        <div className="mt-2 text-xs text-cyan-glow/70 font-mono">
                          公式: {currentVersion.formula}
                        </div>
                      )}
                      {step.key === 'anomaly' && selectedAnomaly && (
                        <div className="mt-2 text-xs text-warning-orange/70">
                          检测到: {selectedAnomaly.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedAnomaly && (
          <div className="pt-3 border-t border-slate-700/50">
            <div className="text-xs text-slate-500 mb-2">原始数据字段</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900/40 rounded p-2">
                <div className="text-slate-500">wave_height</div>
                <div className="text-white font-mono">{selectedData.waveHeight} m</div>
              </div>
              <div className="bg-slate-900/40 rounded p-2">
                <div className="text-slate-500">wave_period</div>
                <div className="text-white font-mono">{selectedData.wavePeriod} s</div>
              </div>
              <div className="bg-slate-900/40 rounded p-2">
                <div className="text-slate-500">error_value</div>
                <div className="text-warning-orange font-mono">{selectedData.errorValue} m</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
