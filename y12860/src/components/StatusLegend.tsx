import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { BuoyStatus, BUOY_STATUS_LABEL } from '@/types';
import { cn } from '@/lib/utils';

const statusList: {
  status: BuoyStatus;
  description: string;
}[] = [
  { status: 'normal', description: '浮标运行正常，数据上报及时，传感器读数在合理范围内' },
  { status: 'offline', description: '浮标超过设定时间未上报数据，通信可能中断' },
  { status: 'anomaly', description: '数据存在异常波动或格式异常，需人工核查' },
  { status: 'out_of_range', description: '传感器读数超出预设阈值，触发越界预警' },
  { status: 'pending', description: '数据已补录或修正，等待复核确认' },
];

const textColorMap: Record<BuoyStatus, string> = {
  normal: 'text-seaweed-300',
  offline: 'text-ocean-300',
  anomaly: 'text-coral-300',
  out_of_range: 'text-coral-300',
  pending: 'text-sand-300',
};

export default function StatusLegend() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="nautical-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-ocean-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-seafoam-400" />
          <span className="text-sm font-medium text-ocean-100">状态图例</span>
          <span className="text-[11px] text-ocean-500">共 5 种状态</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ocean-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ocean-400" />
        )}
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out overflow-hidden',
          expanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0">
          <div className="px-4 pb-4 space-y-2">
            {statusList.map((item) => (
              <div
                key={item.status}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-ocean-800/30 border border-ocean-700/20"
              >
                <div className="pt-0.5 shrink-0">
                  <span
                    className={cn(
                      'status-dot w-3 h-3',
                      `status-${item.status}`
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      textColorMap[item.status]
                    )}
                  >
                    {BUOY_STATUS_LABEL[item.status]}
                  </div>
                  <div className="text-[11px] text-ocean-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono bg-ocean-900/60 text-ocean-500 border border-ocean-700/30">
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
