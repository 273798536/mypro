import { User, Calendar, FileText, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Info } from 'lucide-react';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { CURRENCY_SYMBOLS, RISK_COLORS } from '../../types';
import { formatCurrency, formatDate } from '../../utils/dataTransformer';

export function DetailPanel() {
  const { selectedRecordId, getRecordById } = useCashFlowStore();
  const { selectedRecordAnomalies } = useAnomalyDetection();

  const record = selectedRecordId ? getRecordById(selectedRecordId) : undefined;

  if (!record) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white">明细钻取</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm text-white/50">选择地形上的数据点</p>
          <p className="text-xs text-white/30 mt-1">查看完整现金流明细</p>
        </div>
      </div>
    );
  }

  const currencySymbol = CURRENCY_SYMBOLS[record.currency] || '';
  const isOutflow = record.direction === 'outflow';
  const rateGap = Math.abs(record.exchangeRate - record.plannedRate);
  const rateGapPercent = (rateGap / Math.max(record.plannedRate, 0.0001)) * 100;
  const hasRateGap = rateGapPercent > 3;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">明细钻取</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{record.id}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className={`text-3xl font-bold ${isOutflow ? 'text-red-400' : 'text-emerald-400'}`}>
          {isOutflow ? '-' : '+'}{currencySymbol}{Math.abs(record.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {isOutflow ? <TrendingDown className="w-5 h-5 text-red-400" /> : <TrendingUp className="w-5 h-5 text-emerald-400" />}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
            <User className="w-3 h-3" />
            <span>客户</span>
          </div>
          <p className="text-sm text-white/90 font-medium truncate">{record.customerName}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
            <Calendar className="w-3 h-3" />
            <span>日期</span>
          </div>
          <p className="text-sm text-white/90 font-medium">{formatDate(record.flowDate)}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
            <DollarSign className="w-3 h-3" />
            <span>币种</span>
          </div>
          <p className="text-sm text-white/90 font-medium">{record.currency}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
            <AlertTriangle className="w-3 h-3" />
            <span>风险等级</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[record.riskLevel] }} />
            <p className="text-sm text-white/90 font-medium">Lv.{record.riskLevel}</p>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-white/5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
          <FileText className="w-3 h-3" />
          <span>来源与备注</span>
        </div>
        <p className="text-xs text-white/60 mb-1">来源: {record.sourceDoc}</p>
        <p className="text-sm text-white/80">{record.note}</p>
      </div>

      <div className="p-3 rounded-lg bg-white/5 mb-3">
        <div className="text-xs text-white/40 mb-2">汇率信息</div>
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-white/50">计划汇率</span>
          <span className="text-white/80 font-mono">{record.plannedRate}</span>
        </div>
        <div className="flex justify-between items-center text-xs mb-1">
          <span className="text-white/50">实际汇率</span>
          <span className={`font-mono ${hasRateGap ? 'text-amber-400' : 'text-white/80'}`}>{record.exchangeRate}</span>
        </div>
        {hasRateGap && (
          <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              <span>汇率缺口 {(record.exchangeRate - record.plannedRate).toFixed(4)} ({rateGapPercent.toFixed(2)}%)</span>
            </div>
          </div>
        )}
      </div>

      {record.riskFactors && record.riskFactors.length > 0 && (
        <div className="p-3 rounded-lg bg-white/5 mb-3">
          <div className="text-xs text-white/40 mb-2">风险评分来源</div>
          <div className="space-y-2">
            {record.riskFactors.map((factor, i) => {
              const percent = (factor.score / factor.maxScore) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{factor.name}</span>
                    <span className="text-white/50 font-mono">{factor.score}/{factor.maxScore}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percent}%`, backgroundColor: percent > 70 ? '#ef4444' : percent > 40 ? '#fbbf24' : '#10b981' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedRecordAnomalies.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-1.5 text-xs text-red-400 mb-2">
            <AlertTriangle className="w-3 h-3" />
            <span>检测到 {selectedRecordAnomalies.length} 项异常</span>
          </div>
          <div className="space-y-1.5">
            {selectedRecordAnomalies.map((anomaly, i) => (
              <div key={i} className="text-xs text-white/60 pl-3 border-l-2 border-red-500/50">
                {anomaly.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}