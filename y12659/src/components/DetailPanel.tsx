import { Activity, AlertTriangle, Shield, Database, Layers, Gauge, Crosshair, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useDemoStore } from '@/store/demoStore';
import { slopePoints, THRESHOLD_CONFIG } from '@/data/mockData';
import { getRiskLabel, getRiskColor, formatTime, getRiskLevelByDistance } from '@/utils/collision';

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-mine-card rounded-lg p-3 border border-mine-border">
      <div className="flex items-center gap-2 text-mine-muted text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div
        className="font-mono text-xl font-semibold tracking-tight"
        style={{ color: color || '#fff' }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-mine-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DetailPanel() {
  const {
    plane, currentTime, distanceHistory, events,
    outOfBoundsCount, maxRiskLevel, unusableRecords,
  } = useDemoStore();

  const currentRisk = getRiskLevelByDistance(plane.minDistance);
  const activeEvents = events.filter((e) => Math.abs(e.timestamp - currentTime) < 2).slice(0, 3);
  const nearestEvent = events.find((e) => e.timestamp >= currentTime);
  const dangerPoints = slopePoints.filter((p) => p.riskLevel === 'danger').length;
  const warningPoints = slopePoints.filter((p) => p.riskLevel === 'warning').length;

  const recentHistory = distanceHistory.slice(-60);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4 bg-mine-panel/60">
      <div>
        <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-mine-rock" />
          实时检测明细
        </h2>
        <p className="text-xs text-mine-muted mt-1">当前帧数据与碰撞检测结果</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Clock}
          label="当前时间"
          value={formatTime(currentTime)}
          sub={`帧 ${Math.floor(currentTime * 60)}`}
        />
        <MetricCard
          icon={Crosshair}
          label="剖切面位置"
          value={`${plane.position.toFixed(2)}m`}
          sub="沿 X 轴"
        />
        <MetricCard
          icon={Gauge}
          label="最小距离"
          value={isNaN(plane.minDistance) ? '--' : `${plane.minDistance.toFixed(3)}m`}
          sub={isNaN(plane.minDistance) ? '数据缺失' : `最近点 ${plane.closestPointId ?? '-'}`}
          color={getRiskColor(currentRisk)}
        />
        <MetricCard
          icon={Shield}
          label="风险等级"
          value={getRiskLabel(currentRisk)}
          sub={plane.isOutOfBounds ? '已触发拦截' : '检测正常'}
          color={getRiskColor(currentRisk)}
        />
      </div>

      <div className="bg-mine-card rounded-lg p-3 border border-mine-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-mine-muted flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            距离趋势（近 60 采样点）
          </div>
          <div className="text-[10px] font-mono text-mine-muted">
            阈值 {THRESHOLD_CONFIG.dangerDistance}m / {THRESHOLD_CONFIG.safeDistance}m
          </div>
        </div>
        <div className="relative h-20 bg-mine-dark/60 rounded overflow-hidden">
          <div
            className="absolute left-0 right-0 bg-red-500/10 border-b border-red-500/30"
            style={{ bottom: 0, height: `${(THRESHOLD_CONFIG.dangerDistance / 2.5) * 100}%` }}
          />
          <div
            className="absolute left-0 right-0 bg-yellow-500/10 border-b border-yellow-500/30"
            style={{
              bottom: `${(THRESHOLD_CONFIG.dangerDistance / 2.5) * 100}%`,
              height: `${((THRESHOLD_CONFIG.safeDistance - THRESHOLD_CONFIG.dangerDistance) / 2.5) * 100}%`,
            }}
          />
          <svg className="absolute inset-0 w-full h-full">
            {recentHistory.length > 1 && recentHistory.map((h, i) => {
              if (i === 0) return null;
              const prev = recentHistory[i - 1];
              const x1 = ((i - 1) / (recentHistory.length - 1)) * 100;
              const x2 = (i / (recentHistory.length - 1)) * 100;
              const y1 = 100 - Math.min((isNaN(prev.distance) ? 0 : prev.distance) / 2.5, 1) * 100;
              const y2 = 100 - Math.min((isNaN(h.distance) ? 0 : h.distance) / 2.5, 1) * 100;
              const color = isNaN(h.distance) ? '#8B5CF6' :
                h.distance < THRESHOLD_CONFIG.dangerDistance ? '#D7263D' :
                h.distance < THRESHOLD_CONFIG.safeDistance ? '#F59E0B' : '#4ADE80';
              return (
                <line
                  key={i}
                  x1={`${x1}%`} y1={`${y1}%`}
                  x2={`${x2}%`} y2={`${y2}%`}
                  stroke={color}
                  strokeWidth={1.5}
                />
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between text-[10px] text-mine-muted mt-1 font-mono">
          <span>2.5m</span>
          <span>距离阈值</span>
          <span>0m</span>
        </div>
      </div>

      <div className="bg-mine-card rounded-lg p-3 border border-mine-border">
        <div className="text-xs text-mine-muted mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          点云分布概况
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>安全点</span>
            </div>
            <span className="font-mono">{slopePoints.length - dangerPoints - warningPoints}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>预警点</span>
            </div>
            <span className="font-mono text-yellow-500">{warningPoints}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>危险点</span>
            </div>
            <span className="font-mono text-red-500">{dangerPoints}</span>
          </div>
          <div className="border-t border-mine-border pt-2 mt-2 flex items-center justify-between text-sm">
            <span className="text-mine-muted">总点数</span>
            <span className="font-mono font-semibold">{slopePoints.length}</span>
          </div>
        </div>
      </div>

      {activeEvents.length > 0 && (
        <div className="bg-mine-card rounded-lg p-3 border border-red-500/30">
          <div className="text-xs text-red-400 mb-2 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            当前关联事件
          </div>
          <div className="space-y-2">
            {activeEvents.map((e) => (
              <div key={e.id} className="bg-mine-dark/50 rounded p-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-mine-muted">t={e.timestamp.toFixed(2)}s</span>
                  {e.isRecordUsable ? (
                    <span className="flex items-center gap-1 text-green-400 text-[10px]">
                      <CheckCircle className="w-3 h-3" /> 记录可用
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-purple-400 text-[10px]">
                      <XCircle className="w-3 h-3" /> 记录不可用
                    </span>
                  )}
                </div>
                <p className="text-white/90 leading-relaxed">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-mine-card rounded-lg p-3 border border-mine-border">
          <div className="text-[11px] text-mine-muted mb-1">越界累计</div>
          <div className="font-mono text-2xl font-semibold text-red-400">{outOfBoundsCount}</div>
          <div className="text-[10px] text-mine-muted">次拦截</div>
        </div>
        <div className="bg-mine-card rounded-lg p-3 border border-mine-border">
          <div className="text-[11px] text-mine-muted mb-1">不可用记录</div>
          <div className="font-mono text-2xl font-semibold text-purple-400">{unusableRecords.length}</div>
          <div className="text-[10px] text-mine-muted">条</div>
        </div>
      </div>

      <div className="bg-mine-card rounded-lg p-3 border border-mine-border">
        <div className="text-xs text-mine-muted mb-2 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />
          检测阈值配置
        </div>
        <ul className="space-y-1.5 text-xs">
          <li className="flex items-center justify-between">
            <span className="text-green-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> 安全
            </span>
            <span className="font-mono">距离 ≥ {THRESHOLD_CONFIG.safeDistance}m</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-yellow-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> 预警
            </span>
            <span className="font-mono">{THRESHOLD_CONFIG.warningDistance}m ~ {THRESHOLD_CONFIG.safeDistance}m</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-red-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> 越界
            </span>
            <span className="font-mono">距离 {'<'} {THRESHOLD_CONFIG.dangerDistance}m</span>
          </li>
          <li className="flex items-center justify-between pt-1 border-t border-mine-border mt-1">
            <span className="text-mine-muted">连续判定帧</span>
            <span className="font-mono">{THRESHOLD_CONFIG.consecutiveFrames} 帧</span>
          </li>
        </ul>
      </div>

      {nearestEvent && (
        <div className="bg-gradient-to-br from-mine-blue/40 to-transparent rounded-lg p-3 border border-mine-blue/50">
          <div className="text-[11px] text-blue-300 mb-1">下一事件（{Math.max(0, nearestEvent.timestamp - currentTime).toFixed(1)}s 后）</div>
          <p className="text-sm text-white/90">{nearestEvent.description}</p>
        </div>
      )}
    </div>
  );
}
