import { Info } from 'lucide-react';
import type { ColorLegendItem } from '@/types';

const legendItems: ColorLegendItem[] = [
  {
    key: 'normal',
    color: '#34D399',
    label: '顺利记录',
    description: '所有参数在正常范围内，坐标系与时间轴与批次一致',
  },
  {
    key: 'pending',
    color: '#A78BFA',
    label: '待确认记录',
    description: '存在边界参数或坐标系/时间轴差异，需人工复核判定',
  },
  {
    key: 'invalid',
    color: '#F87171',
    label: '坏数据（拦截）',
    description: '多参数联合越界或使用未标准化 Native 空间，已自动排除',
  },
  {
    key: 'idle',
    color: '#64748B',
    label: '脑区节点（无连接）',
    description: '存在于图谱中但当前批次无测量记录的脑区',
  },
  {
    key: 'oob',
    color: '#F87171',
    label: '越界脉冲环',
    description: '节点周围闪烁红色环，表示该脑区参与的连接存在越界参数',
  },
  {
    key: 'selected',
    color: '#22D3EE',
    label: '选中高亮',
    description: '当前在右侧列表中选中的记录/节点，带青蓝色发光高亮',
  },
];

export const ColorLegend = () => {
  return (
    <div className="absolute top-4 right-4 z-10 w-64 rounded-xl border border-cyan-400/20 bg-[#0B1026]/90 p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-cyan-400" />
        <h3
          className="text-xs font-bold uppercase tracking-wider text-cyan-300"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          颜色含义图例
        </h3>
      </div>
      <div className="space-y-2.5">
        {legendItems.map((item) => (
          <div key={item.key} className="flex items-start gap-2.5">
            {item.key === 'oob' ? (
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <div className="h-3.5 w-3.5 animate-pulse rounded-full border-2"
                  style={{ borderColor: item.color }}
                />
              </div>
            ) : (
              <div
                className="mt-0.5 h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}55` }}
              />
            )}
            <div className="min-w-0">
              <div
                className="text-[11px] font-semibold text-slate-100"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.label}
              </div>
              <div className="mt-0.5 text-[10px] leading-snug text-slate-400">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
