import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Eye, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useDeclarationStore } from '@/stores/useDeclarationStore';
import { useReviewViewStore } from '@/stores/useDeclarationStore';
import { captureScreenshot } from '@/utils/screenshot';
import RiskLevelBadge from '@/components/common/RiskLevelBadge';
import type { ViewPreset } from '@/types';

const viewPresets: { key: ViewPreset; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: '总览视角', icon: <Eye className="w-4 h-4" /> },
  { key: 'risk-detail', label: '风险详情', icon: <ShieldAlert className="w-4 h-4" /> },
  { key: 'boundary-compare', label: '边界对比', icon: <AlertTriangle className="w-4 h-4" /> },
];

export default function ReviewShot() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const declarations = useDeclarationStore(s => s.declarations);
  const declaration = declarations.find(d => d.id === id);
  const currentPreset = useReviewViewStore(s => s.currentPreset);
  const setPreset = useReviewViewStore(s => s.setPreset);
  const showLegend = useReviewViewStore(s => s.showLegend);
  const toggleLegend = useReviewViewStore(s => s.toggleLegend);

  if (!declaration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => navigate('/')} className="text-ocean-600 hover:underline">返回工作台</button>
      </div>
    );
  }

  const handleCapture = () => {
    captureScreenshot('review-shot-content', `${declaration.vesselName}_评审截图`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/declaration/${id}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-ocean-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回详情
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
              {viewPresets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setPreset(preset.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                    currentPreset === preset.key
                      ? 'bg-ocean-800 text-white'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {preset.icon}
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              onClick={toggleLegend}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                showLegend ? 'bg-ocean-50 border-ocean-200 text-ocean-700' : 'bg-white border-gray-200 text-slate-500'
              }`}
            >
              图例 {showLegend ? '✓' : ''}
            </button>
            <button
              onClick={handleCapture}
              className="flex items-center gap-1.5 px-4 py-2 bg-ocean-800 text-white rounded-lg text-sm font-medium hover:bg-ocean-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
              导出截图
            </button>
          </div>
        </div>

        <div id="review-shot-content" className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 relative">
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-ocean-800">{declaration.vesselName} — 评审视图</h2>
              <RiskLevelBadge level={declaration.currentRiskLevel} size="lg" />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              视角：{viewPresets.find(v => v.key === currentPreset)?.label} · 生成时间：{new Date().toLocaleString('zh-CN')}
            </div>
          </div>

          {currentPreset === 'overview' && (
            <OverviewContent declaration={declaration} />
          )}
          {currentPreset === 'risk-detail' && (
            <RiskDetailContent declaration={declaration} />
          )}
          {currentPreset === 'boundary-compare' && (
            <BoundaryCompareContent declaration={declaration} />
          )}

          {showLegend && (
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-lg" style={{ minWidth: '200px' }}>
              <div className="text-[10px] font-semibold text-slate-700 mb-2">颜色图例</div>
              <div className="space-y-1 text-[10px]">
                <LegendItem color="#EF4444" label="高风险" desc="需立即处理" />
                <LegendItem color="#F97316" label="中风险" desc="需关注" />
                <LegendItem color="#EAB308" label="低风险" desc="可放行" />
                <LegendItem color="#22C55E" label="合规" desc="通过校验" />
                <div className="border-t border-gray-100 my-1" />
                <LegendItem color="#EF4444" label="越界" desc="超出阈值，红色边框脉冲" />
                <LegendItem color="#F59E0B" label="边界异常" desc="单位/时区问题" />
                <LegendItem color="#94A3B8" label="待补录" desc="气象数据缺失" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="font-medium text-slate-700">{label}</span>
      <span className="text-slate-400">— {desc}</span>
    </div>
  );
}

function OverviewContent({ declaration }: { declaration: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-3 bg-slate-50 rounded-lg">
        <div className="text-[10px] text-slate-400 mb-1">船舶 / 航次</div>
        <div className="text-sm font-medium">{declaration.vesselName}</div>
        <div className="text-xs text-slate-500">{declaration.arrivalTime} → {declaration.departureTime}</div>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">
        <div className="text-[10px] text-slate-400 mb-1">风险等级</div>
        <RiskLevelBadge level={declaration.currentRiskLevel} size="lg" />
        {declaration.initialRiskLevel !== declaration.currentRiskLevel && (
          <div className="text-[10px] text-amber-600 mt-1">
            初始：{declaration.initialRiskLevel} → 当前：{declaration.currentRiskLevel}
          </div>
        )}
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">
        <div className="text-[10px] text-slate-400 mb-1">异常摘要</div>
        <div className="text-sm font-mono">{declaration.boundaryIssues.length} 项边界异常</div>
        <div className="text-xs text-slate-500">{declaration.weatherGaps.filter((g: any) => g.status === 'missing').length} 项气象缺口</div>
      </div>
    </div>
  );
}

function RiskDetailContent({ declaration }: { declaration: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-lg">
        <div>
          <div className="text-[10px] text-slate-400">初始判定</div>
          <RiskLevelBadge level={declaration.initialRiskLevel} size="lg" />
        </div>
        <div className="text-slate-300">→</div>
        <div>
          <div className="text-[10px] text-slate-400">当前判定</div>
          <RiskLevelBadge level={declaration.currentRiskLevel} size="lg" />
        </div>
      </div>
      {declaration.riskChangeHistory.map((change: any) => (
        <div key={change.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
          <span className="text-amber-800 font-medium">变更：{change.beforeLevel} → {change.afterLevel}</span>
          <span className="text-amber-600 ml-2">| {change.changedBy} | {change.reason}</span>
        </div>
      ))}
    </div>
  );
}

function BoundaryCompareContent({ declaration }: { declaration: any }) {
  return (
    <div className="space-y-3">
      {declaration.boundaryIssues.map((issue: any) => (
        <div key={issue.id} className={`p-3 rounded-lg border-l-4 ${issue.severity === 'critical' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">{issue.type === 'salinity-unit-mix' ? '盐度单位混用' : '潮位时区错误'}</span>
            {issue.impactsResult && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded">影响结果</span>}
          </div>
          <p className="text-xs text-slate-600 mb-2">{issue.description}</p>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-white border border-red-200 rounded px-2 py-1 font-mono text-red-600">{issue.originalValue}</div>
            <span className="text-slate-300">→</span>
            <div className="bg-white border border-green-200 rounded px-2 py-1 font-mono text-green-600">{issue.correctedValue}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
