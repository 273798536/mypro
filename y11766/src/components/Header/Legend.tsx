import { Download, Layers } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { RISK_TYPE_LABELS } from '../../services/riskDetection';
import { formatCurrency } from '../../utils/colorUtils';

interface LegendProps {
  onExportClick: () => void;
}

export function Legend({ onExportClick }: LegendProps) {
  const { holdings, redemptions, riskAlerts, cashPositions } = useDataStore();

  const totalHoldings = holdings.reduce((sum, h) => sum + h.amount, 0);
  const totalRedemptions = redemptions
    .filter(r => r.status !== 'COMPLETED')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalCash = cashPositions.reduce((sum, c) => sum + c.availableCash, 0);
  const unresolvedRisks = riskAlerts.filter(r => !r.isResolved);

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/50 shadow-2xl w-80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">流动性池监控</h1>
              <p className="text-xs text-slate-400">实时风险预警系统</p>
            </div>
          </div>
          <button
            onClick={onExportClick}
            className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            <Download size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-xl bg-slate-800/50">
            <div className="text-xs text-slate-400 mb-1">总持仓</div>
            <div className="text-sm font-bold text-green-400">¥{formatCurrency(totalHoldings)}</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-slate-800/50">
            <div className="text-xs text-slate-400 mb-1">待赎回</div>
            <div className="text-sm font-bold text-rose-400">¥{formatCurrency(totalRedemptions)}</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-slate-800/50">
            <div className="text-xs text-slate-400 mb-1">现金</div>
            <div className="text-sm font-bold text-cyan-400">¥{formatCurrency(totalCash)}</div>
          </div>
        </div>

        {unresolvedRisks.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">风险警报 ({unresolvedRisks.length})</span>
            </div>
            <div className="space-y-1">
              {unresolvedRisks.slice(0, 2).map(alert => (
                <div key={alert.id} className="text-xs text-slate-300 truncate">
                  • {RISK_TYPE_LABELS[alert.riskType]}
                </div>
              ))}
              {unresolvedRisks.length > 2 && (
                <div className="text-xs text-slate-500">
                  还有 {unresolvedRisks.length - 2} 项警报...
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs text-slate-500 mb-2">图例说明</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-t from-emerald-600 to-emerald-400" />
            <span className="text-xs text-slate-300">安全区域 (低压力)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-t from-amber-600 to-amber-400" />
            <span className="text-xs text-slate-300">警告区域 (中压力)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-t from-red-600 to-red-400 animate-pulse" />
            <span className="text-xs text-slate-300">危险区域 (高压力)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-rose-500 animate-ping opacity-75" />
            <span className="text-xs text-slate-300">风险区块</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">操作提示</div>
          <div className="text-xs text-slate-400 mt-1 space-y-1">
            <div>• 鼠标拖拽旋转 3D 视图</div>
            <div>• 滚轮缩放视图</div>
            <div>• 点击区块查看详情</div>
          </div>
        </div>
      </div>
    </div>
  );
}
