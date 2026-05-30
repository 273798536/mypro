import { useGameStore, type PulseRecord } from '../store/gameStore'
import { FREQUENCY_CONFIG } from '../utils/sonarPhysics'
import { generateExportData, downloadJson } from '../utils/exportUtils'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Navigation, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

export default function ReviewPage() {
  const score = useGameStore(s => s.score)
  const pulses = useGameStore(s => s.pulses)
  const pathDecisions = useGameStore(s => s.pathDecisions)
  const currentLevel = useGameStore(s => s.currentLevel)
  const energy = useGameStore(s => s.energy)
  const resetGame = useGameStore(s => s.resetGame)
  const navigate = useNavigate()

  const handleExport = () => {
    const data = generateExportData(
      currentLevel || 0,
      score,
      pulses,
      pathDecisions
    )
    downloadJson(data)
  }

  const handleBack = () => {
    resetGame()
    navigate('/')
  }

  const judgmentIcon = (j: PulseRecord['judgment']) => {
    if (j === 'correct') return <CheckCircle size={14} className="text-sonar-green" />
    if (j === 'misjudged') return <XCircle size={14} className="text-danger-red" />
    return <HelpCircle size={14} className="text-white/30" />
  }

  const judgmentLabel = (j: PulseRecord['judgment']) => {
    if (j === 'correct') return <span className="text-sonar-green">正确</span>
    if (j === 'misjudged') return <span className="text-danger-red">误判</span>
    return <span className="text-white/30">未判定</span>
  }

  return (
    <div className="min-h-screen bg-deep-sea p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <div className="text-xl font-bold text-echo-cyan glow-cyan">📋 复盘面板</div>
          <div className="flex-1" />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sonar-green/20 border border-sonar-green/40 text-sonar-green text-sm font-medium hover:bg-sonar-green/30 transition-all"
          >
            <Download size={14} />
            导出成绩 JSON
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4">
            <div className="text-xs text-white/40">判定准确率</div>
            <div className={`text-2xl font-mono font-bold ${score.judgmentAccuracy >= 70 ? 'text-sonar-green glow-green' : score.judgmentAccuracy >= 40 ? 'text-warn-orange glow-orange' : 'text-danger-red glow-red'}`}>
              {score.judgmentAccuracy}%
            </div>
          </div>
          <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4">
            <div className="text-xs text-white/40">路径评分</div>
            <div className="text-2xl font-mono font-bold text-echo-cyan glow-cyan">
              {score.pathScore}
            </div>
          </div>
          <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4">
            <div className="text-xs text-white/40">剩余能量</div>
            <div className={`text-2xl font-mono font-bold ${energy > 50 ? 'text-sonar-green' : energy > 25 ? 'text-warn-orange' : 'text-danger-red'}`}>
              {Math.round(energy)}%
            </div>
          </div>
          <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4">
            <div className="text-xs text-white/40">碰撞次数</div>
            <div className={`text-2xl font-mono font-bold ${score.collisions === 0 ? 'text-sonar-green' : 'text-danger-red'}`}>
              {score.collisions}
            </div>
          </div>
        </div>

        <div className="bg-deep-sea-light/80 rounded-xl border border-cyan-900/30 p-5">
          <div className="flex items-center gap-2 text-echo-cyan mb-4">
            <FileText size={16} />
            <span className="font-medium">回声判定记录</span>
            <span className="ml-auto text-xs text-white/30">共 {pulses.length} 条脉冲</span>
          </div>

          {pulses.length === 0 ? (
            <div className="text-center text-white/30 py-8">无脉冲记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-900/20">
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">#</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">回合</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">频率</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">回声数</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">延迟范围</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">频移</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">混叠</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">能量比</th>
                    <th className="text-left text-xs text-white/40 font-normal py-2 px-2">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {pulses.map(pulse => {
                    const hasAliased = pulse.echoes.some(e => e.isAliased)
                    const minDelay = pulse.echoes.length > 0 ? Math.min(...pulse.echoes.map(e => e.delay)) : 0
                    const maxDelay = pulse.echoes.length > 0 ? Math.max(...pulse.echoes.map(e => e.delay)) : 0
                    const freqShifts = pulse.echoes.map(e => e.frequencyShift)
                    const avgEnergy = pulse.echoes.length > 0
                      ? pulse.echoes.reduce((s, e) => s + e.energyRatio, 0) / pulse.echoes.length
                      : 0

                    return (
                      <tr key={pulse.id} className="border-b border-cyan-900/10 hover:bg-cyan-900/5">
                        <td className="py-2 px-2 font-mono text-white/60">{pulse.id}</td>
                        <td className="py-2 px-2 font-mono text-white/60">{pulse.turn}</td>
                        <td className="py-2 px-2">
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ color: FREQUENCY_CONFIG[pulse.frequency].color, backgroundColor: FREQUENCY_CONFIG[pulse.frequency].color + '15' }}>
                            {FREQUENCY_CONFIG[pulse.frequency].label}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-white/60">{pulse.echoes.length}</td>
                        <td className="py-2 px-2 font-mono text-echo-cyan text-xs">
                          {pulse.echoes.length > 0 ? `${minDelay.toFixed(1)}-${maxDelay.toFixed(1)}ms` : '-'}
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">
                          {freqShifts.length > 0 ? (
                            <span className={hasAliased ? 'text-warn-orange' : 'text-white/60'}>
                              {Math.min(...freqShifts)}~{Math.max(...freqShifts)}Hz
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2">
                          {hasAliased ? (
                            <span className="text-warn-orange text-xs font-mono">是</span>
                          ) : (
                            <span className="text-white/30 text-xs font-mono">否</span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">
                          <span className={avgEnergy < 0.3 ? 'text-danger-red' : avgEnergy < 0.6 ? 'text-warn-orange' : 'text-white/60'}>
                            {(avgEnergy * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            {judgmentIcon(pulse.judgment)}
                            {judgmentLabel(pulse.judgment)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-deep-sea-light/80 rounded-xl border border-cyan-900/30 p-5">
          <div className="flex items-center gap-2 text-echo-cyan mb-4">
            <Navigation size={16} />
            <span className="font-medium">路径选择回顾</span>
            <span className="ml-auto text-xs text-white/30">共 {pathDecisions.length} 次决策</span>
          </div>

          {pathDecisions.length === 0 ? (
            <div className="text-center text-white/30 py-8">无路径决策记录</div>
          ) : (
            <div className="space-y-2">
              {pathDecisions.map((dec, idx) => (
                <div key={idx} className="bg-deep-sea/60 rounded-lg p-3 flex items-center gap-4 border border-cyan-900/10">
                  <div className="text-xs text-white/40 font-mono">回合{dec.turn}</div>
                  <div className="flex items-center gap-1.5">
                    {dec.wasSafe ? (
                      <CheckCircle size={14} className="text-sonar-green" />
                    ) : (
                      <XCircle size={14} className="text-danger-red" />
                    )}
                    <span className={`text-sm ${dec.wasSafe ? 'text-sonar-green' : 'text-danger-red'}`}>
                      {dec.wasSafe ? '安全通过' : '碰撞障碍'}
                    </span>
                  </div>
                  <div className="text-xs text-white/50">
                    方向: <span className="font-mono text-echo-cyan">{dec.pathDirection}</span>
                  </div>
                  <div className="text-xs text-white/50">
                    置信度: <span className={`font-mono ${dec.confidence >= 70 ? 'text-sonar-green' : dec.confidence >= 40 ? 'text-warn-orange' : 'text-danger-red'}`}>
                      {dec.confidence}%
                    </span>
                  </div>
                  <div className="text-xs text-white/30 ml-auto">
                    {dec.confidence < 40 && dec.wasSafe && '低置信度但侥幸通过'}
                    {dec.confidence >= 70 && !dec.wasSafe && '高置信度仍碰撞——回声误判'}
                    {dec.confidence < 40 && !dec.wasSafe && '低置信度且碰撞——信息不足'}
                    {dec.confidence >= 70 && dec.wasSafe && '判断准确'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(pulses.some(p => p.echoes.some(e => e.isAliased)) || pulses.some(p => p.echoes.some(e => e.delay > 200))) && (
          <div className="bg-deep-sea-light/80 rounded-xl border border-cyan-900/30 p-5">
            <div className="flex items-center gap-2 text-warn-orange mb-4">
              <FileText size={16} />
              <span className="font-medium">问题诊断</span>
            </div>
            <div className="space-y-3">
              {pulses.some(p => p.echoes.some(e => e.isAliased)) && (
                <div className="bg-warn-orange/5 border border-warn-orange/15 rounded-lg p-4">
                  <div className="text-sm font-medium text-warn-orange mb-1">频率混叠</div>
                  <div className="text-xs text-white/50 leading-relaxed">
                    当两个障碍物的间距小于半波长(λ/2)时，它们反射的回声频率会重叠，无法区分。
                    低频脉冲(1kHz)的波长为1.5m，半波长0.75m——在密集障碍物区域极易混叠。
                    解决方案：使用高频脉冲提高分辨率，但代价是更高的能量消耗和更快的衰减。
                    <div className="mt-2 font-mono text-xs text-warn-orange/60">
                      混叠脉冲: {pulses.filter(p => p.echoes.some(e => e.isAliased)).map(p => `#${p.id}`).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              {pulses.some(p => p.echoes.some(e => e.delay > 200)) && (
                <div className="bg-echo-cyan/5 border border-echo-cyan/15 rounded-lg p-4">
                  <div className="text-sm font-medium text-echo-cyan mb-1">回声延迟</div>
                  <div className="text-xs text-white/50 leading-relaxed">
                    远距离障碍物的回声延迟大，在你做出路径选择时可能还未到达。
                    这就是"对账"问题：你依据的信息不完整，像在对账时缺少关键一笔。
                    声速1500m/s，每100m距离产生约133ms延迟。
                    <div className="mt-2 font-mono text-xs text-echo-cyan/60">
                      长延迟脉冲: {pulses.filter(p => p.echoes.some(e => e.delay > 200)).map(p => `#${p.id}(${Math.max(...p.echoes.filter(e => e.delay > 200).map(e => e.delay)).toFixed(0)}ms)`).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              {energy <= 0 && (
                <div className="bg-danger-red/5 border border-danger-red/15 rounded-lg p-4">
                  <div className="text-sm font-medium text-danger-red mb-1">能量耗尽</div>
                  <div className="text-xs text-white/50 leading-relaxed">
                    高频脉冲每次消耗20%能量，碰撞一次扣25%。如果先用高频探测再用高频确认，
                    仅两次脉冲就消耗40%，再加一次碰撞就只剩35%。能量管理需要策略：
                    优先低频广域扫描，只在关键路径使用高频精确确认。
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
