import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { AlertTriangle, AlertCircle, Info, Clock, TrendingUp, GitCompare, X, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Warning } from '@/types';

export default function WarningPanel() {
  const { analysisResult, setActiveTab, setSelectedWarning } = useAppStore();
  const [expandedWarning, setExpandedWarning] = useState<string | null>(null);

  const groupedWarnings = useMemo(() => {
    if (!analysisResult) return { errors: [], warnings: [], infos: [] };
    
    return {
      errors: analysisResult.warnings.filter(w => w.severity === 'error'),
      warnings: analysisResult.warnings.filter(w => w.severity === 'warning'),
      infos: analysisResult.warnings.filter(w => w.severity === 'info')
    };
  }, [analysisResult]);

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
        <p>请先完成数据上传和参数配置，然后点击开始分析</p>
      </div>
    );
  }

  if (analysisResult.warnings.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-medium text-emerald-300 mb-2">未检测到相关性误判风险</h3>
        <p className="text-slate-400 text-sm">
          当前数据未发现显著的滞后关系或共同趋势问题
        </p>
        <p className="text-slate-500 text-xs mt-2">
          可尝试调整相关系数阈值或趋势阈值进行更严格的检测
        </p>
      </div>
    );
  }

  const allWarnings = [
    ...groupedWarnings.errors,
    ...groupedWarnings.warnings,
    ...groupedWarnings.infos
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h3 className="font-medium text-slate-200">问题警告</h3>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {groupedWarnings.errors.length > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertCircle className="h-4 w-4" />
              {groupedWarnings.errors.length} 个严重
            </span>
          )}
          {groupedWarnings.warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {groupedWarnings.warnings.length} 个警告
            </span>
          )}
          {groupedWarnings.infos.length > 0 && (
            <span className="flex items-center gap-1 text-cyan-400">
              <Info className="h-4 w-4" />
              {groupedWarnings.infos.length} 个提示
            </span>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-900/20 to-amber-900/20 border border-red-800/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-300 mb-1">检测到 {analysisResult.warnings.length} 个潜在问题</h4>
            <p className="text-xs text-slate-400">
              以下问题可能导致相关性误判。请逐一查看，并结合业务逻辑验证分析结论。
              特别注意：<span className="text-amber-300">相关性 ≠ 因果性</span>。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {allWarnings.map((warning, idx) => (
          <WarningCard
            key={warning.id}
            warning={warning}
            isExpanded={expandedWarning === warning.id}
            onToggle={() => setExpandedWarning(expandedWarning === warning.id ? null : warning.id)}
            onViewDetails={() => {
              setSelectedWarning(warning);
              if (warning.type === 'lag') {
                setActiveTab('lag');
              } else if (warning.type === 'trend') {
                setActiveTab('trend');
              } else {
                setActiveTab('correlation');
              }
            }}
            index={idx + 1}
          />
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">处理建议</h4>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300">滞后关系处理</p>
              <p>使用分布滞后模型 (DLM) 或向量自回归 (VAR) 模型，考虑滞后阶数后重新检验因果关系</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300">共同趋势处理</p>
              <p>对数据进行一阶差分或使用去趋势方法（如 HP 滤波），消除趋势后重新计算相关性</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <GitCompare className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300">虚假相关处理</p>
              <p>引入控制变量进行偏相关分析，或使用格兰杰因果检验验证因果方向</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningCard({
  warning,
  isExpanded,
  onToggle,
  onViewDetails,
  index
}: {
  warning: Warning;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
  index: number;
}) {
  const typeIcon = warning.type === 'lag' ? <Clock className="h-4 w-4" /> :
                   warning.type === 'trend' ? <TrendingUp className="h-4 w-4" /> :
                   <GitCompare className="h-4 w-4" />;
  
  const typeLabel = warning.type === 'lag' ? '滞后关系' :
                    warning.type === 'trend' ? '共同趋势' :
                    '虚假相关';
  
  const severityBg = warning.severity === 'error' ? 'bg-red-900/20 border-red-700/50 hover:bg-red-900/30' :
                     warning.severity === 'warning' ? 'bg-amber-900/20 border-amber-700/50 hover:bg-amber-900/30' :
                     'bg-cyan-900/20 border-cyan-700/50 hover:bg-cyan-900/30';
  
  const severityColor = warning.severity === 'error' ? 'text-red-400' :
                        warning.severity === 'warning' ? 'text-amber-400' :
                        'text-cyan-400';
  
  const severityLabel = warning.severity === 'error' ? '严重' :
                        warning.severity === 'warning' ? '警告' :
                        '提示';

  return (
    <div
      className={cn(
        "rounded-lg border transition-all overflow-hidden",
        severityBg
      )}
      style={{
        animation: isExpanded ? 'none' : `fadeInUp 0.3s ease ${index * 0.1}s both`
      }}
    >
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn("mt-0.5", severityColor)}>
              {typeIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-medium text-slate-200">{warning.title}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-medium",
                  warning.severity === 'error' ? 'bg-red-900/50 text-red-300' :
                  warning.severity === 'warning' ? 'bg-amber-900/50 text-amber-300' :
                  'bg-cyan-900/50 text-cyan-300'
                )}>
                  {severityLabel}
                </span>
                <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                  {typeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{warning.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              详情
            </button>
            <X
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform flex-shrink-0",
                isExpanded && "rotate-45"
              )}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          <div className="pt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-3 w-3 text-slate-500" />
              <span className="text-slate-400">来源文件：</span>
              <span className="text-slate-200 font-mono">{warning.sourceFile}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">问题数据行：</span>
              <div className="flex flex-wrap gap-1">
                {warning.sourceRows.map((row, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-mono text-xs"
                  >
                    第 {row} 行
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">相关变量：</span>
              <div className="flex flex-wrap gap-1">
                {warning.relatedVariables.map((v, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-slate-700 rounded text-cyan-300 font-mono text-xs"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
