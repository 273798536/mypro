import React from 'react';
import BoundaryChart from './BoundaryChart';
import ExtrapolateCompare from './ExtrapolateCompare';
import SourceTrace from './SourceTrace';

const Anomaly: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          异常明细追溯
        </h1>
        <p className="text-slate-500 max-w-2xl">
          边界值改变判断的原因说明、外推越界变化前后对比、以及每条异常记录到原始材料的完整追溯链
        </p>
      </div>

      <BoundaryChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExtrapolateCompare />
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
            <h3 className="font-semibold text-slate-800 mb-4">边界类型统计</h3>
            <div className="space-y-4">
              {[
                { type: '空集合', count: 1, color: 'bg-amber-500', desc: '输入数据为空，无法进行计算' },
                { type: '零值异常', count: 1, color: 'bg-red-500', desc: '非预期零值，疑似数据缺失' },
                { type: '外推越界', count: 1, color: 'bg-purple-500', desc: '外推值超出阈值范围，已裁剪' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{item.type}</span>
                      <span className="text-sm font-bold text-slate-800">{item.count}</span>
                    </div>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
            <h3 className="font-semibold text-indigo-800 mb-3">边界值判断逻辑</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-indigo-700">空集合判断</p>
                  <p className="text-xs text-indigo-600">数据长度为0时，标记为边界异常，不参与后续计算</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-indigo-700">零值判断</p>
                  <p className="text-xs text-indigo-600">非预期上下文出现零值时，标记为待人工复核</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-indigo-700">外推越界判断</p>
                  <p className="text-xs text-indigo-600">超出阈值±50%范围时，裁剪至边界并保留原值记录</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SourceTrace />
    </div>
  );
};

export default Anomaly;
