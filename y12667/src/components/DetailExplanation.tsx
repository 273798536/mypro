import { Info, AlertTriangle, AlertCircle, CheckCircle, Layers } from 'lucide-react';
import type { AngleDataPoint, SectionFrame } from '@shared/types';
import { riskLevelInfo } from './constants';

interface Props {
  angleData: AngleDataPoint[];
  sections: SectionFrame[];
  riskLevel: string;
  currentFrame: number;
}

export default function DetailExplanation({ angleData, sections, riskLevel, currentFrame }: Props) {
  const point = angleData[currentFrame] || angleData[0];
  const section = sections.find((s) => s.frameIndex === currentFrame) || sections[0];
  const riskInfo = riskLevelInfo[riskLevel as keyof typeof riskLevelInfo] || riskLevelInfo.normal;
  const RiskIcon = riskInfo.icon;

  const getPointIcon = (angle: number) => {
    if (angle > 85 || angle < 25) return <AlertCircle className="w-4 h-4 text-safety-red shrink-0" />;
    if (angle > 75) return <AlertTriangle className="w-4 h-4 text-safety-yellow shrink-0" />;
    return <CheckCircle className="w-4 h-4 text-safety-green shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <Info className="w-4 h-4 text-safety-blue" />
        <h3 className="font-mono text-sm font-semibold text-white">明细解释</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className={`rounded-lg border px-4 py-3 ${riskInfo.bg}`}>
          <div className="flex items-center gap-2">
            <RiskIcon className={`w-5 h-5 ${riskInfo.color}`} />
            <div className={`font-semibold ${riskInfo.color}`}>当前风险等级：{riskInfo.label}</div>
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            系统依据绳索角度阈值、剖切帧完整性、透明遮挡重叠率等多维度综合判定当前记录的风险等级。
          </p>
        </div>

        {point && (
          <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
            <div className="flex items-center gap-2 mb-3">
              {getPointIcon(point.angle)}
              <div className="font-mono text-sm text-white">
                帧 #{currentFrame} · {point.angle.toFixed(1)}°
              </div>
              <span className="ml-auto text-xs text-slate-400 font-mono">T+{point.timestamp}s</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{point.explanation}</p>
          </div>
        )}

        {section && (
          <div className="rounded-lg border border-slate-700 bg-slate-850 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-safety-blue shrink-0" />
              <div className="font-mono text-sm text-white">
                剖切帧 #{section.frameIndex} 备注
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{section.note}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>数据点: {section.data.length}</span>
              <span>·</span>
              <span>时间戳: T+{section.timestamp}s</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-400 px-1">全部关键帧解释</div>
          <div className="space-y-1.5">
            {angleData.map((d, i) => {
              const highlight = i === currentFrame;
              return (
                <div
                  key={i}
                  className={`rounded px-3 py-2 flex items-start gap-2 text-xs transition-colors ${
                    highlight ? 'bg-safety-orange/10 border border-safety-orange/30' : 'hover:bg-slate-700/40'
                  }`}
                >
                  {getPointIcon(d.angle)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">帧 #{i} · {d.angle.toFixed(1)}°</span>
                      {highlight && <span className="text-[10px] bg-safety-orange/30 text-safety-orange px-1.5 py-0.5 rounded">当前</span>}
                    </div>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">{d.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
