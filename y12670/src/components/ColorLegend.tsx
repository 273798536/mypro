import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';

const ColorLegend: React.FC = () => {
  const valueColors = [
    { value: '低值 0.0', color: 'rgba(51, 102, 204, 0.85)' },
    { value: '中值 0.5', color: 'rgba(130, 170, 210, 0.85)' },
    { value: '高值 1.0', color: 'rgba(180, 220, 230, 0.85)' },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3.5 w-64 shadow-xl">
      <h4 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
        颜色图例说明
      </h4>

      <div className="space-y-3">
        <div>
          <p className="text-[11px] text-slate-400 mb-1.5">数值强度（浅层）</p>
          <div className="flex items-center gap-2">
            {valueColors.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-5 h-3.5 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-slate-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-400 mb-1.5">深度变化</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3.5 rounded bg-gradient-to-r from-blue-400/80 via-cyan-300/70 to-red-400/60" />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-slate-500">浅（偏蓝）</span>
            <span className="text-[10px] text-slate-500">深（偏红）</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700/60">
          <p className="text-[11px] text-slate-400 mb-1.5">异常与状态</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-[10px] text-slate-400">数值越界，超出正常范围</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-[10px] text-green-400">可直接使用</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              <span className="text-[10px] text-yellow-400">需工程师复核</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3 h-3 text-red-500" />
              <span className="text-[10px] text-red-400">不可用</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorLegend;
