import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ElectricityPrice } from '../types';

interface PriceCalendarProps {
  data: ElectricityPrice[];
}

export function PriceCalendar({ data }: PriceCalendarProps) {
  const avgPrice = Math.round(data.reduce((sum, d) => sum + d.price, 0) / data.length);

  const getPeriodColor = (period: ElectricityPrice['period']) => {
    switch (period) {
      case 'peak': return 'bg-rose-500 text-white';
      case 'flat': return 'bg-sky-400 text-white';
      case 'valley': return 'bg-emerald-400 text-white';
    }
  };

  const getPeriodLabel = (period: ElectricityPrice['period']) => {
    switch (period) {
      case 'peak': return '峰';
      case 'flat': return '平';
      case 'valley': return '谷';
    }
  };

  const peakHours = data.filter(d => d.period === 'peak').length;
  const valleyHours = data.filter(d => d.period === 'valley').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          分时电价日历
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <TrendingUp className="w-4 h-4 text-rose-500" />
          <div>
            <div className="text-xs text-gray-500">峰时电价</div>
            <div className="text-sm font-semibold text-rose-600">¥{data.find(d => d.period === 'peak')?.price || 0}/MWh</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <TrendingDown className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-xs text-gray-500">谷时电价</div>
            <div className="text-sm font-semibold text-emerald-600">¥{data.find(d => d.period === 'valley')?.price || 0}/MWh</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-2">24小时电价分布</p>
        <div className="grid grid-cols-6 gap-1">
          {data.map((d, idx) => (
            <div
              key={idx}
              className={`relative p-1.5 rounded text-center cursor-pointer transition-transform hover:scale-105 ${getPeriodColor(d.period)}`}
              title={`${d.time}: ¥${d.price}/MWh`}
            >
              <div className="text-xs font-bold">{getPeriodLabel(d.period)}</div>
              <div className="text-[10px] opacity-80">{d.hour.toString().padStart(2, '0')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-rose-500 rounded"></div>
          <span className="text-gray-600">峰时 ({peakHours}h)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-400 rounded"></div>
          <span className="text-gray-600">平时 ({24 - peakHours - valleyHours}h)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-400 rounded"></div>
          <span className="text-gray-600">谷时 ({valleyHours}h)</span>
        </div>
      </div>

      <div className="p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <Minus className="w-4 h-4" />
            平均电价
          </span>
          <span className="text-lg font-bold text-slate-700">
            ¥{avgPrice} <span className="text-sm font-normal text-gray-500">/MWh</span>
          </span>
        </div>
      </div>
    </div>
  );
}
