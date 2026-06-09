import { useState } from 'react';
import { useSceneStore } from '@/stores/useSceneStore';
import { mainExplanations } from '@/data/explanations';
import type { ExplanationItem } from '@/types';
import {
  Droplets,
  AlertTriangle,
  Gauge,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';

const iconMap: Record<string, typeof Droplets> = {
  droplets: Droplets,
  'alert-triangle': AlertTriangle,
  gauge: Gauge,
  info: Info,
};

export function ExplanationBar() {
  const waterLevel = useSceneStore((s) => s.waterLevel);
  const anomalies = useSceneStore((s) => s.anomalies);
  const [collapsed, setCollapsed] = useState(false);

  const dangerCount = anomalies.filter((a) => a.severity === 'danger').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;

  const liveExplanations: ExplanationItem[] = [
    {
      id: 'live-1',
      icon: 'droplets',
      title: `当前水位 ${waterLevel.currentLevel.toFixed(1)}m`,
      content: `闸室水位现在是${waterLevel.currentLevel.toFixed(1)}米，目标水位${waterLevel.targetLevel}米，还差${(waterLevel.targetLevel - waterLevel.currentLevel).toFixed(1)}米和上游齐平。`,
      highlight: `差 ${(waterLevel.targetLevel - waterLevel.currentLevel).toFixed(1)}m 齐平`,
    },
    {
      id: 'live-2',
      icon: 'alert-triangle',
      title: `检测到 ${dangerCount + warningCount} 处异常`,
      content: `红色${dangerCount}处需要1小时内响应，黄色${warningCount}处需要关注。给运维讲的时候可以说："红色是今天必须处理的，黄色可以排到计划里。"`,
      highlight: dangerCount > 0 ? `${dangerCount}处需立即处理` : `${warningCount}处需关注`,
    },
    {
      id: 'live-3',
      icon: 'gauge',
      title: `流量 ${waterLevel.flowRate.toFixed(1)} m³/s`,
      content: `当前充水流量${waterLevel.flowRate.toFixed(1)}立方米每秒，比设计值150低了${((1 - waterLevel.flowRate / 150) * 100).toFixed(0)}%，每次过闸多花15%-20%时间。`,
      highlight: `效率损失 ${((1 - waterLevel.flowRate / 150) * 100).toFixed(0)}%`,
    },
  ];

  return (
    <div className="border-t border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-1.5 text-left"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-cyan-400" />
          <span className="text-[11px] font-semibold text-slate-300">
            智能解说栏（工程师可以直接拿这些话给运维组讲）
          </span>
        </div>
        {collapsed ? (
          <ChevronUp size={14} className="text-slate-500" />
        ) : (
          <ChevronDown size={14} className="text-slate-500" />
        )}
      </button>

      {!collapsed && (
        <div className="grid gap-2 px-4 pb-3 md:grid-cols-3">
          {liveExplanations.map((item, idx) => {
            const Icon = iconMap[item.icon] || Info;
            const highlightColor =
              item.id === 'live-2' && dangerCount > 0
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                : item.id === 'live-3'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 transition-all hover:border-cyan-500/30"
                style={{ animation: `fadeInUp 0.5s ease ${idx * 0.1}s both` }}
              >
                <div className="absolute right-0 top-0 h-20 w-20 opacity-5">
                  <div
                    className="h-full w-full"
                    style={{
                      background: `radial-gradient(circle at top right, ${highlightColor.includes('rose') ? '#ff3355' : highlightColor.includes('amber') ? '#ffaa00' : '#00d4ff'}, transparent 70%)`,
                    }}
                  />
                </div>
                <div className="relative">
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-cyan-400">
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-100">
                        {item.title}
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        {item.content}
                      </div>
                      {item.highlight && (
                        <div className={`mt-1.5 inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${highlightColor}`}>
                          {item.highlight}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
