import { Plus, Minus, AlertTriangle } from 'lucide-react';
import type { BondCard, RatingGrade } from '@/types';

function getRatingColor(rating: RatingGrade): string {
  if (rating === 'AAA' || rating === 'AA') return '#43A047';
  if (rating === 'A' || rating === 'BBB') return '#FFC107';
  return '#E53935';
}

interface BondCardPoolProps {
  bonds: BondCard[];
  onAddBond: (bondId: string) => void;
}

export function BondCardPool({ bonds, onAddBond }: BondCardPoolProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2
          className="text-lg font-bold text-white inline-block"
          style={{ borderBottom: '2px solid #F59E0B', paddingBottom: 4 }}
        >
          债券卡池
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {bonds.map((bond) => {
          const hasDurationMismatch =
            Math.abs(bond.effectiveDuration - bond.simpleDuration) > 0.5;

          return (
            <div
              key={bond.id}
              className="rounded-lg border border-slate-700/50 p-4 transition-all duration-200 hover:border-amber-500/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              style={{ backgroundColor: '#0F1D33' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white">{bond.issuer}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: getRatingColor(bond.rating) }}
                  >
                    {bond.rating}
                  </span>
                  {bond.callable && (
                    <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                      含赎回
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">久期</span>
                  <span className="text-white font-medium">
                    {bond.simpleDuration.toFixed(2)}
                  </span>
                  {hasDurationMismatch && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">YTM</span>
                  <span className="text-white font-medium">
                    {bond.ytm.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">面值</span>
                  <span className="text-white font-medium">
                    {bond.parValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">票息</span>
                  <span className="text-white font-medium">
                    {bond.couponRate.toFixed(2)}%
                  </span>
                </div>
              </div>

              {hasDurationMismatch && (
                <div className="flex items-center gap-1 mb-3 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>久期差异</span>
                </div>
              )}

              <button
                onClick={() => onAddBond(bond.id)}
                className="w-full flex items-center justify-center gap-1.5 rounded border border-amber-500 bg-transparent px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors duration-150 hover:bg-amber-500 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PortfolioSlotProps {
  bonds: BondCard[];
  onRemoveBond: (bondId: string) => void;
}

export function PortfolioSlot({ bonds, onRemoveBond }: PortfolioSlotProps) {
  const totalPar = bonds.reduce((s, b) => s + b.parValue, 0);
  const weightedDuration =
    bonds.length > 0
      ? bonds.reduce(
          (s, b) => s + b.effectiveDuration * b.parValue,
          0,
        ) / totalPar
      : 0;
  const weightedYTM =
    bonds.length > 0
      ? bonds.reduce((s, b) => s + b.ytm * b.parValue, 0) / totalPar
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2
          className="text-lg font-bold text-white inline-block"
          style={{ borderBottom: '2px solid #F59E0B', paddingBottom: 4 }}
        >
          组合持仓
        </h2>
        {bonds.length > 0 && (
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span>
              加权久期{' '}
              <span className="text-white font-medium">
                {weightedDuration.toFixed(2)}
              </span>
            </span>
            <span>
              加权YTM{' '}
              <span className="text-white font-medium">
                {(weightedYTM).toFixed(2)}%
              </span>
            </span>
            <span>
              面值合计{' '}
              <span className="text-white font-medium">
                {totalPar.toLocaleString()}
              </span>
            </span>
          </div>
        )}
      </div>

      {bonds.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-slate-600 py-12 text-sm text-slate-500"
          style={{ backgroundColor: '#0F1D33' }}
        >
          拖入或添加债券卡构建组合
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bonds.map((bond) => {
            const hasDurationMismatch =
              Math.abs(bond.effectiveDuration - bond.simpleDuration) > 0.5;

            return (
              <div
                key={bond.id}
                className="flex items-center justify-between rounded-lg border border-slate-700/50 px-4 py-3 transition-all duration-200 hover:border-amber-500/40"
                style={{ backgroundColor: '#0F1D33' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-bold text-white truncate">
                    {bond.issuer}
                  </span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: getRatingColor(bond.rating) }}
                  >
                    {bond.rating}
                  </span>
                  {bond.callable && (
                    <span className="shrink-0 rounded bg-orange-500/20 px-1.5 py-0.5 text-xs font-medium text-orange-400">
                      含赎回
                    </span>
                  )}
                  {hasDurationMismatch && (
                    <AlertTriangle className="shrink-0 w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>

                <div className="flex items-center gap-5 text-xs shrink-0">
                  <span className="text-slate-400">
                    久期{' '}
                    <span className="text-white font-medium">
                      {bond.simpleDuration.toFixed(2)}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    YTM{' '}
                    <span className="text-white font-medium">
                      {bond.ytm.toFixed(2)}%
                    </span>
                  </span>
                  <span className="text-slate-400">
                    面值{' '}
                    <span className="text-white font-medium">
                      {bond.parValue.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    票息{' '}
                    <span className="text-white font-medium">
                      {bond.couponRate.toFixed(2)}%
                    </span>
                  </span>
                  <button
                    onClick={() => onRemoveBond(bond.id)}
                    className="flex items-center gap-1 rounded border border-red-500 bg-transparent px-2 py-1 text-xs font-medium text-red-400 transition-colors duration-150 hover:bg-red-500 hover:text-white"
                  >
                    <Minus className="w-3 h-3" />
                    移除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
