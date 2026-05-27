import React, { useState, useRef } from 'react';
import {
  Upload,
  Settings,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Play
} from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';
import type { ImportMode } from '../../types/portfolio';
import { parseImportFile } from '../../utils/fileHandler';
import { formatPercent, getImportModeLabel } from '../../utils/formatters';
import { generateEfficientFrontier } from '../../engine/efficientFrontier';
import { detectRiskOverlap, detectInactiveConstraints } from '../../engine/validation';
import { covarianceMatrix } from '../../mock/sampleData';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<SectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400">{icon}</span>
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-slate-700/50">
          {children}
        </div>
      )}
    </div>
  );
};

export const ControlPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    assets,
    portfolios,
    constraints,
    dataSources,
    isLoading,
    importData,
    toggleConstraint,
    deleteConstraint,
    addConstraint,
    setPortfolios,
    loadMockData
  } = useDataStore();

  const {
    sceneSettings,
    setAxisMapping,
    setShowSurface,
    setShowPoints,
    setShowAxis,
    setHighlightOptimal,
    setReturnRange,
    setVolatilityRange,
    setDrawdownRange,
    setSharpeMin,
    setShowAnomalies,
    setShowOnlyFeasible,
    setFrontierPoints,
    setGeneratingFrontier,
    isGeneratingFrontier
  } = useFilterStore();

  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [importResult, setImportResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data, fileType } = await parseImportFile(file, assets);
      const result = await importData(
        data,
        file.name,
        fileType,
        importMode,
        `文件导入: ${file.name}`
      );

      setImportResult({
        show: true,
        success: result.success,
        message: `成功导入 ${result.imported} 个组合，重复 ${result.duplicates} 个`,
        errors: result.errors,
        warnings: result.warnings
      });

      setTimeout(() => setImportResult(null), 5000);
    } catch (err) {
      setImportResult({
        show: true,
        success: false,
        message: err instanceof Error ? err.message : '导入失败',
        errors: [err instanceof Error ? err.message : '导入失败'],
        warnings: []
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateFrontier = async () => {
    setGeneratingFrontier(true);
    
    try {
      const result = generateEfficientFrontier(
        assets,
        covarianceMatrix,
        50,
        portfolios
      );
      
      const newPortfolios = [
        ...portfolios.filter(p => p.source !== '有效前沿计算'),
        ...result.portfolios.filter(p => p.source === '有效前沿计算')
      ];
      
      setPortfolios(newPortfolios);
    } catch (err) {
      console.error('生成有效前沿失败:', err);
    } finally {
      setGeneratingFrontier(false);
    }
  };

  const anomalies = portfolios.filter(p => p.anomalies.length > 0);
  const weightErrors = anomalies.filter(p => 
    p.anomalies.some(a => a.type === 'weight_sum')
  );
  const riskOverlaps = detectRiskOverlap(portfolios);
  const inactiveConstraints = detectInactiveConstraints(portfolios, constraints.filter(c => c.enabled));

  const handleAddConstraint = () => {
    addConstraint({
      type: 'return',
      operator: 'gt',
      value: 0.05,
      enabled: true,
      label: '新约束条件'
    });
  };

  return (
    <div className="w-72 h-full overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-amber-400 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          有效前沿分析
        </h1>
        <p className="text-xs text-slate-400">
          投资组合三维可视化分析平台
        </p>
      </div>

      {importResult?.show && (
        <div className={`p-3 rounded-lg mb-4 ${
          importResult.success ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {importResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${importResult.success ? 'text-green-300' : 'text-red-300'}`}>
              {importResult.message}
            </span>
          </div>
          {importResult.warnings.length > 0 && (
            <div className="mt-2 text-xs text-amber-300">
              {importResult.warnings.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
          {importResult.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-300">
              {importResult.errors.slice(0, 3).map((e, i) => (
                <div key={i} className="flex items-start gap-1">
                  <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(weightErrors.length > 0 || riskOverlaps.size > 0 || inactiveConstraints.length > 0) && (
        <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">异常提示</span>
          </div>
          <div className="space-y-1 text-xs">
            {weightErrors.length > 0 && (
              <div className="flex items-center justify-between text-red-300">
                <span>权重和不为1</span>
                <span className="bg-red-900/50 px-2 py-0.5 rounded">
                  {weightErrors.length} 个
                </span>
              </div>
            )}
            {riskOverlaps.size > 0 && (
              <div className="flex items-center justify-between text-amber-300">
                <span>风险点重叠</span>
                <span className="bg-amber-900/50 px-2 py-0.5 rounded">
                  {riskOverlaps.size} 组
                </span>
              </div>
            )}
            {inactiveConstraints.length > 0 && (
              <div className="flex items-center justify-between text-amber-300">
                <span>约束未生效</span>
                <span className="bg-amber-900/50 px-2 py-0.5 rounded">
                  {inactiveConstraints.length} 条
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <CollapsibleSection
        title="数据导入"
        icon={<Upload className="w-4 h-4" />}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-2">重复数据处理方式</label>
            <div className="grid grid-cols-3 gap-1">
              {(['ignore', 'overwrite', 'append'] as ImportMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setImportMode(mode)}
                  className={`px-2 py-1.5 text-xs rounded transition-colors ${
                    importMode === mode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-slate-700/50 text-slate-300 border border-transparent hover:bg-slate-600/50'
                  }`}
                >
                  {getImportModeLabel(mode)}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">{isLoading ? '导入中...' : '导入数据'}</span>
          </button>

          <button
            onClick={loadMockData}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span className="text-sm">加载示例数据</span>
          </button>

          {dataSources.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-2">导入历史</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {dataSources.slice(-5).reverse().map((ds) => (
                  <div key={ds.id} className="text-xs text-slate-400 flex items-center justify-between py-1 border-b border-slate-700/50">
                    <span className="truncate">{ds.fileName}</span>
                    <span className="text-slate-500 flex-shrink-0 ml-2">
                      {getImportModeLabel(ds.importMode)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="约束条件"
        icon={<Filter className="w-4 h-4" />}
        defaultOpen={true}
      >
        <div className="space-y-3">
          {constraints.map((constraint) => (
            <div
              key={constraint.id}
              className={`p-2 rounded-lg border ${
                constraint.enabled
                  ? 'bg-slate-700/30 border-slate-600/50'
                  : 'bg-slate-800/30 border-slate-700/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${constraint.enabled ? 'text-slate-200' : 'text-slate-500'}`}>
                  {constraint.label}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleConstraint(constraint.id)}
                    className={`w-8 h-5 rounded-full transition-colors relative ${
                      constraint.enabled ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${
                        constraint.enabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteConstraint(constraint.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {constraint.type === 'weight' && constraint.assetId ? (
                  `${assets.find(a => a.id === constraint.assetId)?.name || constraint.assetId} `
                ) : ''}
                {constraint.operator === 'gt' ? '>' : constraint.operator === 'lt' ? '<' : '='}
                {' '}
                {Array.isArray(constraint.value)
                  ? `${formatPercent(constraint.value[0])} ~ ${formatPercent(constraint.value[1])}`
                  : formatPercent(constraint.value as number)}
              </div>
            </div>
          ))}

          <button
            onClick={handleAddConstraint}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-amber-400 border border-dashed border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
          >
            <Plus className="w-3 h-3" />
            添加约束
          </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="筛选条件"
        icon={<Settings className="w-4 h-4" />}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">预期收益率范围</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最小"
                step="0.01"
                onChange={(e) => setReturnRange(e.target.value ? parseFloat(e.target.value) / 100 : undefined, undefined)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-slate-500 flex items-center">~</span>
              <input
                type="number"
                placeholder="最大"
                step="0.01"
                onChange={(e) => setReturnRange(undefined, e.target.value ? parseFloat(e.target.value) / 100 : undefined)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-xs text-slate-500 flex items-center">%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">波动率范围</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最小"
                step="0.01"
                onChange={(e) => setVolatilityRange(e.target.value ? parseFloat(e.target.value) / 100 : undefined, undefined)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-slate-500 flex items-center">~</span>
              <input
                type="number"
                placeholder="最大"
                step="0.01"
                onChange={(e) => setVolatilityRange(undefined, e.target.value ? parseFloat(e.target.value) / 100 : undefined)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-xs text-slate-500 flex items-center">%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">最大回撤范围</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="最小"
                step="0.01"
                onChange={(e) => setDrawdownRange(e.target.value ? -parseFloat(e.target.value) / 100 : undefined, undefined)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-slate-500 flex items-center">~</span>
              <input
                type="number"
                placeholder="最大"
                step="0.01"
                onChange={(e) => setDrawdownRange(undefined, e.target.value ? -parseFloat(e.target.value) / 100 : undefined)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-xs text-slate-500 flex items-center">%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">夏普比率最低</label>
            <input
              type="number"
              placeholder="0.5"
              step="0.1"
              onChange={(e) => setSharpeMin(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFilterStore.getState().showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300">显示异常组合</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFilterStore.getState().showOnlyFeasible}
                onChange={(e) => setShowOnlyFeasible(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300">仅显示满足约束的组合</span>
            </label>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="场景设置"
        icon={<Layers className="w-4 h-4" />}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-2">坐标轴映射</label>
            <div className="space-y-2">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 w-6">{axis.toUpperCase()}</span>
                  <select
                    value={sceneSettings[`${axis}Axis`]}
                    onChange={(e) => setAxisMapping(axis, e.target.value as any)}
                    className="flex-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="volatility">波动率</option>
                    <option value="return">预期收益</option>
                    <option value="drawdown">最大回撤</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sceneSettings.showSurface}
                onChange={(e) => setShowSurface(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300">显示有效前沿曲面</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sceneSettings.showPoints}
                onChange={(e) => setShowPoints(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300">显示组合散点</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sceneSettings.showAxis}
                onChange={(e) => setShowAxis(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300">显示坐标轴</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sceneSettings.highlightOptimal}
                onChange={(e) => setHighlightOptimal(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-300">高亮最优组合</span>
            </label>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">有效前沿点数</label>
            <input
              type="range"
              min="20"
              max="100"
              value={useFilterStore.getState().frontierPoints}
              onChange={(e) => setFrontierPoints(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>20</span>
              <span>{useFilterStore.getState().frontierPoints}</span>
              <span>100</span>
            </div>
          </div>

          <button
            onClick={handleGenerateFrontier}
            disabled={isGeneratingFrontier || assets.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingFrontier ? 'animate-spin' : ''}`} />
            <span className="text-sm">
              {isGeneratingFrontier ? '生成中...' : '重新计算有效前沿'}
            </span>
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
};
