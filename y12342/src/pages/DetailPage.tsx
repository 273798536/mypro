import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  Database,
  Link2,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { getAnomalyTypeName, calculateVelocity } from '@/utils/calculationEngine'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { collisions, speedRecords, massTable } = useAppStore()
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const collision = collisions.find((c) => c.id === id)

  if (!collision) {
    return (
      <div className="text-center py-20 animate-fade-in-up">
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
          <Zap className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">未找到碰撞记录</h2>
        <p className="text-slate-500 mb-6">该碰撞记录可能已被删除或不存在</p>
        <button
          onClick={() => navigate('/analysis')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回分析概览
        </button>
      </div>
    )
  }

  const { calculationResult, anomalies } = collision

  const relatedSpeedRecords = speedRecords.filter((r) =>
    collision.ballIds.includes(r.ballId) &&
    Math.abs(r.timestamp - collision.collisionTime) < 0.2
  )

  const relatedMassRecords = massTable.filter((m) =>
    collision.ballIds.includes(m.ballId)
  )

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/analysis')}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            碰撞详情 - {collision.collisionTimeFormatted}
          </h2>
          <p className="text-slate-500">
            参与小球: {collision.ballIds.join(', ')} · 状态:{' '}
            {collision.status === 'normal' ? '正常' : collision.status === 'warning' ? '警告' : '异常'}
          </p>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">检测到 {anomalies.length} 个异常</h3>
          </div>
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`bg-white rounded-lg p-4 border ${
                  anomaly.severity === 'high'
                    ? 'border-red-300'
                    : anomaly.severity === 'medium'
                    ? 'border-amber-300'
                    : 'border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                        anomaly.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : anomaly.severity === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {anomaly.severity === 'high'
                        ? '严重'
                        : anomaly.severity === 'medium'
                        ? '中等'
                        : '轻微'}
                    </span>
                    <span className="font-medium text-slate-800">
                      {getAnomalyTypeName(anomaly.type)}
                    </span>
                  </div>
                  {anomaly.affectedBalls.length > 0 && (
                    <span className="text-sm text-slate-500">
                      涉及小球: {anomaly.affectedBalls.join(', ')}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-slate-600 text-sm">{anomaly.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            计算结果汇总
          </h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-slate-700 mb-4">动量分析</h4>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">碰撞前总动量</span>
                  <span className="font-mono font-medium text-slate-800">
                    {calculationResult.totalMomentumBefore.toFixed(6)} kg·m/s
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">碰撞后总动量</span>
                  <span className="font-mono font-medium text-slate-800">
                    {calculationResult.totalMomentumAfter.toFixed(6)} kg·m/s
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">动量差异</span>
                  <span
                    className={`font-mono font-medium ${
                      calculationResult.momentumDifferencePercent > 0.05
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {calculationResult.momentumDifference.toFixed(6)} (
                    {(calculationResult.momentumDifferencePercent * 100).toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">动量守恒验证</span>
                  <span className="flex items-center gap-2">
                    {calculationResult.isValid ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">通过</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 font-medium">不通过</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 mb-4">能量分析</h4>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">碰撞前总动能</span>
                  <span className="font-mono font-medium text-slate-800">
                    {calculationResult.totalKineticEnergyBefore.toFixed(6)} J
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">碰撞后总动能</span>
                  <span className="font-mono font-medium text-slate-800">
                    {calculationResult.totalKineticEnergyAfter.toFixed(6)} J
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">能量损失</span>
                  <span
                    className={`font-mono font-medium ${
                      calculationResult.energyLossPercent > 0.1 ? 'text-red-600' : 'text-slate-800'
                    }`}
                  >
                    {calculationResult.energyLoss.toFixed(6)} J (
                    {(calculationResult.energyLossPercent * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5" />
            各小球状态对比
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">小球</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600" colSpan={3}>
                  碰撞前
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-600" colSpan={3}>
                  碰撞后
                </th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">ID</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">质量(kg)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">速度(m/s)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">动能(J)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">质量(kg)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">速度(m/s)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">动能(J)</th>
              </tr>
            </thead>
            <tbody>
              {calculationResult.ballsBefore.map((before, i) => {
                const after = calculationResult.ballsAfter[i]
                return (
                  <tr key={before.ballId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {before.ballId}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {before.mass ?? (
                        <span className="text-red-500">缺失</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {calculateVelocity(before.velocityX, before.velocityY).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {before.kineticEnergy.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {after?.mass ?? (
                        <span className="text-red-500">缺失</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {after ? calculateVelocity(after.velocityX, after.velocityY).toFixed(4) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {after?.kineticEnergy.toFixed(4) ?? '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            计算步骤追溯
          </h3>
        </div>
        <div className="p-6">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {calculationResult.calculationSteps.map((step) => (
                <div key={step.step} className="relative pl-12">
                  <div className="absolute left-2.5 w-4 h-4 bg-primary-500 rounded-full border-4 border-white shadow" />
                  <button
                    onClick={() =>
                      setExpandedStep(expandedStep === step.step ? null : step.step)
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div>
                        <span className="text-sm font-medium text-slate-800">
                          步骤 {step.step}
                        </span>
                        <span className="ml-3 text-slate-600">{step.description}</span>
                      </div>
                      {expandedStep === step.step ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {expandedStep === step.step && (
                    <div className="mt-2 ml-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-primary-700">公式: </span>
                          <code className="font-mono bg-white px-2 py-1 rounded text-primary-800">
                            {step.formula}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium text-primary-700">结果: </span>
                          <span className="text-primary-800">{step.result}</span>
                        </div>
                        <div>
                          <span className="font-medium text-primary-700">源数据: </span>
                          <span className="text-primary-800">{step.sourceData}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            源数据关联
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              速度记录来源: {collision.speedRecordSource}
            </h4>
            <div className="overflow-x-auto bg-slate-50 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600">小球ID</th>
                    <th className="px-3 py-2 text-left text-slate-600">时间戳</th>
                    <th className="px-3 py-2 text-left text-slate-600">速度X</th>
                    <th className="px-3 py-2 text-left text-slate-600">速度Y</th>
                    <th className="px-3 py-2 text-left text-slate-600">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedSpeedRecords.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-mono">{r.ballId}</td>
                      <td className="px-3 py-2 font-mono">{r.timestamp.toFixed(3)}</td>
                      <td className="px-3 py-2 font-mono">{r.velocityX.toFixed(4)}</td>
                      <td className="px-3 py-2 font-mono">{r.velocityY.toFixed(4)}</td>
                      <td className="px-3 py-2 text-slate-500">{r.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              质量表来源: {collision.massTableSource}
            </h4>
            <div className="overflow-x-auto bg-slate-50 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600">小球ID</th>
                    <th className="px-3 py-2 text-left text-slate-600">质量(kg)</th>
                    <th className="px-3 py-2 text-left text-slate-600">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedMassRecords.map((m) => (
                    <tr key={m.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-mono">{m.ballId}</td>
                      <td className="px-3 py-2 font-mono">{m.mass}</td>
                      <td className="px-3 py-2 text-slate-500">{m.remarks || '-'}</td>
                    </tr>
                  ))}
                  {collision.ballIds
                    .filter((id) => !relatedMassRecords.some((m) => m.ballId === id))
                    .map((id) => (
                      <tr key={`missing-${id}`} className="border-t border-red-200 bg-red-50">
                        <td className="px-3 py-2 font-mono text-red-600">{id}</td>
                        <td className="px-3 py-2 font-mono text-red-600">缺失</td>
                        <td className="px-3 py-2 text-red-500">请补充质量数据</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {collision.videoNotes && (
            <div>
              <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                视频备注
              </h4>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800">{collision.videoNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
