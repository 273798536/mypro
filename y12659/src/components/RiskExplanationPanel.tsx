import { AlertTriangle, ShieldAlert, Info, CheckCircle2, XCircle, FileWarning, Lightbulb } from 'lucide-react';
import { useDemoStore } from '@/store/demoStore';
import { THRESHOLD_CONFIG } from '@/data/mockData';
import { getRiskLevelByDistance, getRiskLabel, getRiskColor } from '@/utils/collision';

export default function RiskExplanationPanel() {
  const { plane, currentTime, events } = useDemoStore();
  const currentRisk = getRiskLevelByDistance(plane.minDistance);

  const currentEvent = [...events].reverse().find((e) => e.timestamp <= currentTime);

  const interceptReasons = [
    {
      title: '距离阈值触发',
      detail: `剖切面到最近点云的最小距离 ${isNaN(plane.minDistance) ? '数据缺失' : plane.minDistance.toFixed(3) + 'm'} 小于阈值 ${THRESHOLD_CONFIG.dangerDistance}m`,
      active: !isNaN(plane.minDistance) && plane.minDistance < THRESHOLD_CONFIG.dangerDistance,
    },
    {
      title: '连续帧判定',
      detail: `连续 ${THRESHOLD_CONFIG.consecutiveFrames} 帧检测结果均低于阈值，排除单点噪声误报`,
      active: plane.isOutOfBounds,
    },
    {
      title: '危险区域侵入',
      detail: '剖切面已进入预设的边坡不稳定区域（根据历史监测数据标注）',
      active: plane.isOutOfBounds,
    },
  ];

  const dataQualityIssues = events
    .filter((e) => !e.isRecordUsable && e.timestamp <= currentTime)
    .slice(-3);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4 bg-white/95 text-slate-800">
      <div>
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-slate-900">
          <ShieldAlert className="w-5 h-5 text-mine-rock" />
          风险判定说明
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          不仅仅是颜色提示 —— 这里解释「为什么」被判定为越界
        </p>
      </div>

      <div
        className={`rounded-xl p-4 border-l-4 ${
          currentRisk === 'danger'
            ? 'bg-red-50 border-red-500'
            : currentRisk === 'warning'
            ? 'bg-amber-50 border-amber-500'
            : 'bg-emerald-50 border-emerald-500'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">当前判定结果</span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: getRiskColor(currentRisk) }}
          >
            {getRiskLabel(currentRisk)}
          </span>
        </div>
        <div className="font-mono text-3xl font-bold" style={{ color: getRiskColor(currentRisk) }}>
          {isNaN(plane.minDistance) ? '--' : plane.minDistance.toFixed(3)}
          <span className="text-base font-medium text-slate-500 ml-1">m</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {plane.isOutOfBounds
            ? '⚠ 已触发自动拦截，剖切面暂停推进（演示模式）'
            : currentRisk === 'warning'
            ? '接近预警阈值，请密切关注距离变化趋势'
            : '距离安全，继续推进检测'}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          越界拦截判定依据
        </h3>
        <div className="space-y-2">
          {interceptReasons.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 border transition ${
                r.active
                  ? 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                {r.active ? (
                  <CheckCircle2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-800">{r.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{r.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-800">评审会需要知道什么</h3>
        </div>
        <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>碰撞检测是<strong>连续判定</strong>而非一次性：需连续 {THRESHOLD_CONFIG.consecutiveFrames} 帧越界才触发</li>
          <li>判定阈值 {THRESHOLD_CONFIG.dangerDistance}m 来自矿山边坡监测规范，留有安全余量</li>
          <li>拦截不代表坍塌，代表「该区域不满足安全距离要求」需复核</li>
          <li>部分时间段数据<strong>不可用</strong>（传感器离线/参数未校准），评审需跳过这些记录</li>
        </ol>
      </div>

      {currentEvent && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            最近事件详情
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">事件时间</span>
              <span className="font-mono text-slate-800">{currentEvent.timestamp.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">事件类型</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                style={{
                  backgroundColor:
                    currentEvent.type === 'out-of-bounds' ? '#D7263D' :
                    currentEvent.type === 'data-missing' ? '#8B5CF6' :
                    '#F59E0B',
                }}
              >
                {currentEvent.type === 'out-of-bounds' ? '剖切面越界' :
                 currentEvent.type === 'data-missing' ? '数据缺失' :
                 currentEvent.type === 'collision' ? '碰撞检测' : '预警'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">最小距离</span>
              <span className="font-mono">
                {isNaN(currentEvent.minDistance) ? 'N/A' : currentEvent.minDistance.toFixed(3) + 'm'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">是否可用</span>
              <span className={currentEvent.isRecordUsable ? 'text-emerald-600' : 'text-purple-600'}>
                {currentEvent.isRecordUsable ? '可用 ✓' : '不可用 ✗'}
              </span>
            </div>
            <p className="pt-2 border-t border-slate-200 text-slate-700 leading-relaxed">
              {currentEvent.description}
            </p>
          </div>
        </div>
      )}

      {dataQualityIssues.length > 0 && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1.5">
            <FileWarning className="w-4 h-4" />
            不可用记录说明（评审需排除）
          </h3>
          <div className="space-y-1.5">
            {dataQualityIssues.map((e) => (
              <div key={e.id} className="text-xs bg-white/60 rounded p-2 border border-purple-100">
                <div className="flex justify-between mb-0.5">
                  <span className="font-mono text-purple-700">t={e.timestamp.toFixed(2)}s</span>
                  <span className="text-purple-600 text-[10px]">排除原因</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{e.unusableReason || e.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">判定流程（供报告引用）</h3>
        <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
          <li>剖切面沿 X 轴以 {((30 / 30)).toFixed(2)} m/s 匀速推进</li>
          <li>每帧计算所有 8000 个点云到平面的垂直距离</li>
          <li>取最小值作为判定依据，记录距离时间序列</li>
          <li>若连续 {THRESHOLD_CONFIG.consecutiveFrames} 帧距离 <b>{`< ${THRESHOLD_CONFIG.dangerDistance}m`}</b> → 触发越界拦截</li>
          <li>自动记录事件帧号、距离、涉及点编号，供导出报告</li>
        </ol>
      </div>
    </div>
  );
}
