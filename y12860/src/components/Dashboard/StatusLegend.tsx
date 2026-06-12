import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuoyStatus } from '@/types';
import { BUOY_STATUS_LABEL } from '@/types';
import { ChevronDown, ChevronUp, Gauge, Radio, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';

interface StatusLegendProps {
  screenshotMode?: boolean;
}

const statusList: {
  status: BuoyStatus;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    status: 'normal',
    label: BUOY_STATUS_LABEL.normal,
    description: '所有传感器数据正常，通讯稳定在线',
    icon: Gauge,
  },
  {
    status: 'offline',
    label: BUOY_STATUS_LABEL.offline,
    description: '超过30分钟未收到心跳包，通讯中断',
    icon: Radio,
  },
  {
    status: 'anomaly',
    label: BUOY_STATUS_LABEL.anomaly,
    description: '传感器数据波动异常，需人工核查',
    icon: AlertTriangle,
  },
  {
    status: 'out_of_range',
    label: BUOY_STATUS_LABEL.out_of_range,
    description: '监测值超出安全阈值，触发预警',
    icon: AlertOctagon,
  },
  {
    status: 'pending',
    label: BUOY_STATUS_LABEL.pending,
    description: '数据存在疑问，等待复核确认',
    icon: Clock,
  },
];

const StatusLegend: React.FC<StatusLegendProps> = ({ screenshotMode = false }) => {
  const [isOpen, setIsOpen] = useState(screenshotMode);

  const forceOpen = screenshotMode;
  const shouldShow = forceOpen || isOpen;

  return (
    <div className="nautical-card overflow-hidden">
      <button
        onClick={() => !screenshotMode && setIsOpen(!isOpen)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between',
          !screenshotMode && 'hover:bg-ocean-800/50 transition-colors'
        )}
        disabled={screenshotMode}
      >
        <span className="section-title !text-base !border-l-2 !pl-2 !text-seafoam-400">状态图例</span>
        {!screenshotMode && (
          shouldShow ? (
            <ChevronUp className="w-4 h-4 text-ocean-400" strokeWidth={2} />
          ) : (
            <ChevronDown className="w-4 h-4 text-ocean-400" strokeWidth={2} />
          )
        )}
      </button>

      {(shouldShow || screenshotMode) && (
        <div className={cn('px-4 pb-4 space-y-3', !screenshotMode && 'animate-float-up')}>
          {statusList.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.status} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={cn('status-dot inline-block', `status-${item.status}`)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5',
                        item.status === 'normal' && 'text-seaweed-400',
                        item.status === 'offline' && 'text-ocean-300',
                        item.status === 'anomaly' && 'text-coral-400',
                        item.status === 'out_of_range' && 'text-coral-300',
                        item.status === 'pending' && 'text-sand-400'
                      )}
                      strokeWidth={2}
                    />
                    <span className="text-sm font-medium text-ocean-200">{item.label}</span>
                  </div>
                  <p className="text-xs text-ocean-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}

          <div className="pt-3 mt-3 border-t border-ocean-700/50">
            <p className="text-xs text-ocean-500 leading-relaxed">
              <span className="inline-block w-3 h-3 rounded mr-1.5 align-middle bg-gradient-to-r from-seafoam-500 to-seafoam-300" />
              传感器进度条：绿色代表数值正常
            </p>
            <p className="text-xs text-ocean-500 leading-relaxed mt-1.5">
              <span className="inline-block w-3 h-3 rounded mr-1.5 align-middle bg-coral-500" />
              红色代表数值越界，需关注
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusLegend;
