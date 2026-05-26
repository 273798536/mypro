import { Check, Filter } from 'lucide-react';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';
import { CURRENCIES } from '../../types/index';

const CURRENCY_COLORS: Record<string, string> = {
  USD: '#10b981',
  EUR: '#3b82f6',
  GBP: '#8b5cf6',
  JPY: '#fbbf24',
  CNY: '#ef4444',
};

export default function CurrencyFilter() {
  const selectedCurrencies = useCashFlowStore(s => s.filters.selectedCurrencies);
  const toggleCurrency = useCashFlowStore(s => s.toggleCurrency);
  const selectAllCurrencies = useCashFlowStore(s => s.selectAllCurrencies);
  const clearAllCurrencies = useCashFlowStore(s => s.clearAllCurrencies);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Filter className="w-4 h-4 text-emerald-400" />
        <h3 className="text-base font-semibold text-white">币种筛选</h3>
      </div>
      <p className="text-xs text-white/50 mb-4 pl-6">Currency Filter</p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={selectAllCurrencies}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
        >
          全选
        </button>
        <button
          onClick={clearAllCurrencies}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-colors"
        >
          全不选
        </button>
      </div>

      <div className="space-y-2">
        {CURRENCIES.map(currency => {
          const isSelected = selectedCurrencies.includes(currency);
          const color = CURRENCY_COLORS[currency];
          return (
            <button
              key={currency}
              onClick={() => toggleCurrency(currency)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 ease-out"
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: isSelected ? color : 'transparent',
                backgroundColor: isSelected ? `${color}12` : 'rgba(255,255,255,0.03)',
                borderColor: isSelected ? `${color}40` : 'rgba(255,255,255,0.08)',
                transform: isSelected ? 'translateX(2px)' : 'translateX(0)',
              }}
            >
              <span
                className="w-4 h-4 rounded flex items-center justify-center transition-colors duration-300"
                style={{
                  backgroundColor: isSelected ? color : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.2)'}`,
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-white font-medium">{currency}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
