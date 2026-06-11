import { X, MapPin, AlertTriangle, Download, Lightbulb } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDataStore } from '@/store/useDataStore';
import { detectMixedUnits } from '@/utils/unit';

export default function OpsGuideCard() {
  const { showOpsGuide, setShowOpsGuide, setViewMode, toggleExportModal, selectPoint } = useAppStore();
  const { points } = useDataStore();

  if (!showOpsGuide) return null;

  const firstAnomaly = points.find(p => p.isAnomaly);
  const mixedRecords = detectMixedUnits(points);
  const firstMixed = mixedRecords[0];

  const handleJumpToSample = () => {
    setViewMode('all');
    if (points.length > 0) {
      selectPoint(points[Math.floor(points.length / 2)].id);
    }
    setShowOpsGuide(false);
  };

  const handleJumpToAnomaly = () => {
    setViewMode('anomaly');
    if (firstAnomaly) {
      selectPoint(firstAnomaly.id);
    }
    setShowOpsGuide(false);
  };

  const handleShowExport = () => {
    toggleExportModal();
    setShowOpsGuide(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-[420px] shadow-2xl border-tech-blue/30 shadow-glow-blue">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tech-blue/20">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-tech-blue" />
            <h2 className="text-base font-semibold text-text-primary">运维指引卡</h2>
          </div>
          <button
            onClick={() => setShowOpsGuide(false)}
            className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-secondary">
            老何接班看三样，三行搞定不用慌
          </p>

          <button
            onClick={handleJumpToSample}
            className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-tech-blue/20 flex items-center justify-center group-hover:bg-tech-blue/30 transition-colors">
              <MapPin className="w-6 h-6 text-tech-blue" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text-primary">样例在哪？</h4>
              <p className="text-xs text-text-muted mt-1">
                主图表上任意点都是样例，点击看详情
              </p>
            </div>
          </button>

          <button
            onClick={handleJumpToAnomaly}
            className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left border-alert-red/30 group"
          >
            <div className="w-12 h-12 rounded-xl bg-alert-red/20 flex items-center justify-center group-hover:bg-alert-red/30 transition-colors">
              <AlertTriangle className="w-6 h-6 text-alert-red animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text-primary">异常在哪？</h4>
              <p className="text-xs text-text-muted mt-1">
                红点是异常，共 {points.filter(p => p.isAnomaly).length} 个；
                {firstMixed ? `混写 ${mixedRecords.length} 条` : '无单位混写'}
              </p>
            </div>
          </button>

          <button
            onClick={handleShowExport}
            className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left border-success-green/30 group"
          >
            <div className="w-12 h-12 rounded-xl bg-success-green/20 flex items-center justify-center group-hover:bg-success-green/30 transition-colors">
              <Download className="w-6 h-6 text-success-green" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text-primary">结果怎么导出？</h4>
              <p className="text-xs text-text-muted mt-1">
                点右上角导出按钮，支持 CSV、截图、报告
              </p>
            </div>
          </button>
        </div>

        <div className="px-5 py-3 border-t border-border-glow/20 bg-tech-blue/5 rounded-b-xl">
          <p className="text-xs text-text-secondary text-center">
            数据都存在浏览器里，刷新不丢失 · 同一数据源，三套展示一致
          </p>
        </div>
      </div>
    </div>
  );
}
