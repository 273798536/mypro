import { Waves, CloudRain, MapPin, Clock, User, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReviewRound } from '../types';
import { useState } from 'react';

interface ReviewRoundCardProps {
  round: ReviewRound;
  isLatest: boolean;
}

const statusConfig = {
  pending: { label: '待复核', color: 'bg-slate-100 text-slate-600', dotColor: 'bg-slate-400' },
  in_progress: { label: '复核中', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-500' },
};

function ReviewRoundCard({ round, isLatest }: ReviewRoundCardProps) {
  const [isOpen, setIsOpen] = useState(isLatest);
  const status = statusConfig[round.status];

  const tideRange = round.tideData.highTideHeight - round.tideData.lowTideHeight;

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className={cn(
        'absolute left-[-5px] top-4 h-3 w-3 rounded-full border-2 border-white',
        status.dotColor
      )} />

      <div className={cn(
        'rounded-lg border overflow-hidden transition-all',
        isLatest ? 'border-sky-300 bg-sky-50/30 shadow-md' : 'border-slate-200 bg-white'
      )}>
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <span className="font-bold text-slate-600">{round.roundNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-slate-800">第 {round.roundNumber} 轮复核</h4>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  status.color
                )}>
                  {status.label}
                </span>
                {isLatest && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                    当前轮次
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock size={12} />
                {new Date(round.timestamp).toLocaleString('zh-CN')}
                <span className="mx-1">·</span>
                <User size={12} />
                {round.reviewer}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-slate-500">
                <Waves size={14} />
                潮汐
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <CloudRain size={14} />
                气象
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <MapPin size={14} />
                禁航
              </span>
            </div>
            {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-slate-200 p-4 space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">
              <FileText size={14} className="inline mr-1" />
              <span className="font-medium">复核备注：</span>
              {round.notes}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-cyan-50 border border-cyan-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                    <Waves size={16} />
                  </div>
                  <h5 className="font-medium text-cyan-800">潮汐数据</h5>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-600">日期</span>
                    <span className="font-mono text-cyan-800">{round.tideData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-600">高潮</span>
                    <span className="font-mono text-cyan-800">{round.tideData.highTideTime} / {round.tideData.highTideHeight}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-600">低潮</span>
                    <span className="font-mono text-cyan-800">{round.tideData.lowTideTime} / {round.tideData.lowTideHeight}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-600">潮差</span>
                    <span className="font-mono text-cyan-800">{tideRange.toFixed(1)}m</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-cyan-200 text-xs text-cyan-500">
                    来源：{round.tideData.source}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-sky-50 border border-sky-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <CloudRain size={16} />
                  </div>
                  <h5 className="font-medium text-sky-800">气象预报</h5>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-sky-600">日期</span>
                    <span className="font-mono text-sky-800">{round.weatherData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-600">气温</span>
                    <span className="font-mono text-sky-800">{round.weatherData.temperature.min}-{round.weatherData.temperature.max}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-600">风速</span>
                    <span className="font-mono text-sky-800">{round.weatherData.windSpeed} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-600">风向</span>
                    <span className="font-mono text-sky-800">{round.weatherData.windDirection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-600">降水</span>
                    <span className="font-mono text-sky-800">{round.weatherData.precipitation} mm</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-sky-200 text-xs text-sky-500">
                    来源：{round.weatherData.source}
                  </div>
                </div>
              </div>

              <div className={cn(
                'p-4 rounded-lg border',
                round.noSailCheck.status === 'pass'
                  ? 'bg-emerald-50 border-emerald-200'
                  : round.noSailCheck.status === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-rose-50 border-rose-200'
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    round.noSailCheck.status === 'pass'
                      ? 'bg-emerald-100 text-emerald-600'
                      : round.noSailCheck.status === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-rose-100 text-rose-600'
                  )}>
                    <MapPin size={16} />
                  </div>
                  <h5 className={cn(
                    'font-medium',
                    round.noSailCheck.status === 'pass' ? 'text-emerald-800' :
                    round.noSailCheck.status === 'warning' ? 'text-amber-800' : 'text-rose-800'
                  )}>
                    禁航区检测
                  </h5>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={round.noSailCheck.status === 'pass' ? 'text-emerald-600' : round.noSailCheck.status === 'warning' ? 'text-amber-600' : 'text-rose-600'}>检测状态</span>
                    <span className={cn(
                      'font-mono font-medium',
                      round.noSailCheck.status === 'pass' ? 'text-emerald-700' :
                      round.noSailCheck.status === 'warning' ? 'text-amber-700' : 'text-rose-700'
                    )}>
                      {round.noSailCheck.status === 'pass' ? '通过' :
                       round.noSailCheck.status === 'warning' ? '有警告' : '未通过'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={round.noSailCheck.status === 'pass' ? 'text-emerald-600' : round.noSailCheck.status === 'warning' ? 'text-amber-600' : 'text-rose-600'}>数据点总数</span>
                    <span className="font-mono">{round.noSailCheck.totalPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={round.noSailCheck.status === 'pass' ? 'text-emerald-600' : round.noSailCheck.status === 'warning' ? 'text-amber-600' : 'text-rose-600'}>越界数量</span>
                    <span className={cn(
                      'font-mono font-bold',
                      round.noSailCheck.violationCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                    )}>
                      {round.noSailCheck.violationCount}
                    </span>
                  </div>
                  {round.noSailCheck.violations.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">越界记录：</p>
                      {round.noSailCheck.violations.map(v => (
                        <div key={v.id} className="text-xs text-amber-700 py-1">
                          <span className="font-medium">{v.zoneName}</span>
                          <span className="mx-1">·</span>
                          <span>{new Date(v.point.timestamp).toLocaleTimeString('zh-CN')}</span>
                          {v.intercepted && (
                            <span className="ml-2 inline-block bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                              已拦截
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ReviewTimelineProps {
  rounds: ReviewRound[];
  className?: string;
}

export function ReviewTimeline({ rounds, className }: ReviewTimelineProps) {
  const sortedRounds = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">统一复核流程</h3>
        <div className="text-sm text-slate-500">
          共 <span className="font-medium text-slate-700">{rounds.length}</span> 轮复核
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-lg border border-sky-200">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">说明：</span>
          每一轮复核都包含潮汐表、气象预报和禁航区越界检测三类数据，
          确保课题组能看出每次处理的是眼前这批具体材料，而非通用样例。
        </p>
      </div>

      <div className="mt-6">
        {sortedRounds.map((round, idx) => (
          <ReviewRoundCard
            key={round.id}
            round={round}
            isLatest={idx === 0}
          />
        ))}
      </div>

      {rounds.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <Clock size={48} className="mx-auto text-slate-300" />
          <p className="mt-2 text-slate-500">暂无复核记录</p>
        </div>
      )}
    </div>
  );
}
