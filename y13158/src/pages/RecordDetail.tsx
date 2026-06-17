import { useStore } from '@/store'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  GitBranch,
  AlertTriangle,
  FileText,
  MessageSquare,
  UserCheck,
  Tag,
  Clock,
  Plus,
  Play,
} from 'lucide-react'
import type { MaterialType } from '@/types'

const materialTypeLabels: Record<MaterialType, string> = {
  nameplate: '设备铭牌',
  supplementary_note: '后补备注',
  verbal_note: '口头说明',
}

const materialTypeIcons: Record<MaterialType, typeof FileText> = {
  nameplate: Tag,
  supplementary_note: FileText,
  verbal_note: MessageSquare,
}

const materialTypeColors: Record<MaterialType, string> = {
  nameplate: 'text-blue-400 bg-blue-500/10',
  supplementary_note: 'text-emerald-400 bg-emerald-500/10',
  verbal_note: 'text-purple-400 bg-purple-500/10',
}

const materialTypeButtonColors: Record<MaterialType, string> = {
  nameplate: 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
  supplementary_note: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  verbal_note: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const records = useStore((s) => s.records)
  const parameterVersions = useStore((s) => s.parameterVersions)
  const materialChanges = useStore((s) => s.materialChanges)
  const manualOverrides = useStore((s) => s.manualOverrides)
  const anomalyPoints = useStore((s) => s.anomalyPoints)
  const addManualOverride = useStore((s) => s.addManualOverride)
  const addMaterialChange = useStore((s) => s.addMaterialChange)
  const runAttribution = useStore((s) => s.runAttribution)
  const isRunning = useStore((s) => s.isRunning)

  const record = records.find((r) => r.id === id)
  const versions = parameterVersions.filter((pv) => pv.recordId === id)
  const materials = materialChanges.filter((mc) => mc.recordId === id)
  const overrides = manualOverrides.filter((mo) => mo.recordId === id)
  const anomalies = anomalyPoints.filter((ap) => ap.recordId === id)

  const [overrideReason, setOverrideReason] = useState('')
  const [overrideConclusion, setOverrideConclusion] = useState('')
  const [showOverrideForm, setShowOverrideForm] = useState(false)

  const [newMaterialType, setNewMaterialType] = useState<MaterialType>('nameplate')
  const [newMaterialContent, setNewMaterialContent] = useState('')
  const [newMaterialIsCaliberChanged, setNewMaterialIsCaliberChanged] = useState(false)
  const [newMaterialCaliberNote, setNewMaterialCaliberNote] = useState('')
  const [showMaterialForm, setShowMaterialForm] = useState(false)

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-iron-400 mb-4">记录不存在</p>
          <Link to="/records" className="text-amber-500 hover:text-amber-400 text-sm">
            返回记录列表
          </Link>
        </div>
      </div>
    )
  }

  const handleOverride = () => {
    if (!overrideReason.trim() || !overrideConclusion.trim()) return
    addManualOverride({
      recordId: record.id,
      originalConclusion: record.conclusion,
      overrideConclusion: overrideConclusion,
      reason: overrideReason,
      operator: '小林',
    })
    setShowOverrideForm(false)
    setOverrideReason('')
    setOverrideConclusion('')
  }

  const handleAddMaterial = () => {
    if (!newMaterialContent.trim()) return
    addMaterialChange({
      recordId: record.id,
      materialType: newMaterialType,
      content: newMaterialContent.trim(),
      isCaliberChanged: newMaterialIsCaliberChanged,
      caliberChangeNote: newMaterialCaliberNote.trim() || undefined,
    })
    setNewMaterialContent('')
    setNewMaterialCaliberNote('')
    setNewMaterialIsCaliberChanged(false)
    setShowMaterialForm(false)
  }

  const paramKeys = versions.length > 0 ? Object.keys(versions[0].parameters) : []

  const statusLabel =
    record.status === 'processed'
      ? '已处理'
      : record.status === 'pending_material'
      ? '待补材料'
      : '人工改判'
  const statusColor =
    record.status === 'processed'
      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      : record.status === 'pending_material'
      ? 'bg-iron-500/10 text-iron-300 border-iron-500/20'
      : 'bg-danger-500/10 text-danger-500 border-danger-500/20'

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-iron-400 hover:text-iron-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-iron-50">{record.cycleName}</h1>
              <span className="font-mono text-xs text-iron-500">{record.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-iron-400">{record.conclusion}</p>
          </div>
          <button
            onClick={runAttribution}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            基于现有材料重算
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section icon={<GitBranch className="w-4 h-4" />} title="参数版本">
          {versions.length === 0 ? (
            <p className="text-iron-500 text-sm">无版本记录</p>
          ) : (
            <div className="space-y-4">
              {versions.map((v) => (
                <div key={v.id} className="rounded-lg border border-iron-700 bg-iron-800/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-iron-200">{v.version}</span>
                    <span className="text-xs text-iron-500">
                      {new Date(v.changedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {paramKeys.map((key) => {
                      const isChanged = v.changedFields.includes(key)
                      return (
                        <div
                          key={key}
                          className={`rounded px-3 py-2 text-xs ${
                            isChanged
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : 'bg-iron-800'
                          }`}
                        >
                          <div className="text-iron-500 mb-0.5">{key}</div>
                          <div className={`font-mono ${isChanged ? 'text-amber-400' : 'text-iron-300'}`}>
                            {String(v.parameters[key])}
                            {isChanged && <span className="ml-1.5 text-amber-500">← 已变更</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section icon={<AlertTriangle className="w-4 h-4" />} title="异常点与解释">
          {anomalies.length === 0 ? (
            <p className="text-iron-500 text-sm">无异常点</p>
          ) : (
            <div className="space-y-3">
              {anomalies.map((ap) => (
                <div key={ap.id} className="rounded-lg border border-iron-700 bg-iron-800/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-iron-200">{ap.parameterName}</span>
                    <span className="text-xs text-iron-500">
                      {new Date(ap.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-2 text-xs font-mono">
                    <span className="text-danger-400">实测: {ap.measuredValue}</span>
                    <span className="text-iron-500">期望: {ap.expectedValue}</span>
                    <span className="text-amber-500">
                      偏差: {(((ap.measuredValue - ap.expectedValue) / ap.expectedValue) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm text-iron-300 leading-relaxed">{ap.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <Section
          icon={<FileText className="w-4 h-4" />}
          title="材料口径时间线"
          action={
            !showMaterialForm ? (
              <button
                onClick={() => setShowMaterialForm(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-iron-800 border border-iron-700 text-iron-300 text-xs hover:border-iron-600 transition-colors ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                补录材料
              </button>
            ) : null
          }
        >
          {showMaterialForm && (
            <div className="mb-5 rounded-lg border border-iron-700 bg-iron-800/50 p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(materialTypeLabels) as MaterialType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewMaterialType(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      newMaterialType === t
                        ? materialTypeButtonColors[t]
                        : 'bg-iron-800 border-iron-700 text-iron-400 hover:border-iron-600'
                    }`}
                  >
                    {(() => {
                      const Icon = materialTypeIcons[t]
                      return <Icon className="w-3.5 h-3.5" />
                    })()}
                    {materialTypeLabels[t]}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs text-iron-400 mb-1.5">材料内容</label>
                <textarea
                  value={newMaterialContent}
                  onChange={(e) => setNewMaterialContent(e.target.value)}
                  placeholder={`输入${materialTypeLabels[newMaterialType]}内容，例如"铭牌流量 55 GPM，额定压力 2.5 MPa"`}
                  rows={2}
                  className="w-full rounded-lg bg-iron-900 border border-iron-700 px-3 py-2 text-sm text-iron-200 placeholder:text-iron-600 focus:border-amber-500/50 focus:outline-none transition-colors resize-none"
                />
                <p className="text-[11px] text-iron-500 mt-1">
                  提示：内容包含「采样/缺失/堵塞」将自动标记采样缺口；包含「公式/单位/阈值」自动标注卡点
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-iron-400">
                <input
                  type="checkbox"
                  checked={newMaterialIsCaliberChanged}
                  onChange={(e) => setNewMaterialIsCaliberChanged(e.target.checked)}
                  className="rounded bg-iron-800 border-iron-700 text-amber-500 focus:ring-amber-500/30"
                />
                这份材料改过口径
              </label>
              {newMaterialIsCaliberChanged && (
                <div>
                  <label className="block text-xs text-iron-400 mb-1.5">口径变更说明</label>
                  <input
                    type="text"
                    value={newMaterialCaliberNote}
                    onChange={(e) => setNewMaterialCaliberNote(e.target.value)}
                    placeholder="例如：流量单位从 GPM 改为 m³/h"
                    className="w-full rounded-lg bg-iron-900 border border-iron-700 px-3 py-2 text-sm text-iron-200 placeholder:text-iron-600 focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddMaterial}
                  disabled={!newMaterialContent.trim()}
                  className="px-3 py-1.5 rounded-md bg-amber-500 text-iron-950 text-xs font-medium hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交
                </button>
                <button
                  onClick={() => {
                    setShowMaterialForm(false)
                    setNewMaterialContent('')
                    setNewMaterialCaliberNote('')
                    setNewMaterialIsCaliberChanged(false)
                  }}
                  className="px-3 py-1.5 rounded-md bg-iron-800 border border-iron-700 text-iron-300 text-xs hover:border-iron-600 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {materials.length === 0 ? (
            <p className="text-iron-500 text-sm">无材料记录，点击右上角「补录材料」添加</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-iron-700" />
              <div className="space-y-4">
                {materials
                  .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
                  .map((mc) => {
                    const Icon = materialTypeIcons[mc.materialType]
                    const colorClass = materialTypeColors[mc.materialType]
                    return (
                      <div key={mc.id} className="relative">
                        <div
                          className={`absolute -left-3.5 w-5 h-5 rounded-full flex items-center justify-center ${
                            mc.isCaliberChanged ? 'bg-danger-500/20 ring-2 ring-danger-500/40' : colorClass
                          }`}
                        >
                          {mc.isCaliberChanged ? (
                            <AlertTriangle className="w-3 h-3 text-danger-500" />
                          ) : (
                            <Icon className="w-3 h-3" />
                          )}
                        </div>
                        <div
                          className={`ml-4 rounded-lg border p-4 ${
                            mc.isCaliberChanged
                              ? 'border-danger-500/30 bg-danger-500/5'
                              : 'border-iron-700 bg-iron-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium ${colorClass.split(' ')[0]}`}>
                              {materialTypeLabels[mc.materialType]}
                            </span>
                            {mc.isCaliberChanged && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-danger-500/10 text-danger-500 border border-danger-500/20">
                                口径变更
                              </span>
                            )}
                            <span className="text-xs text-iron-500 ml-auto">
                              {new Date(mc.changedAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-sm text-iron-300">{mc.content}</p>
                          {mc.caliberChangeNote && (
                            <div className="mt-2 rounded bg-danger-500/5 border border-danger-500/10 px-3 py-2 text-xs text-danger-400">
                              {mc.caliberChangeNote}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </Section>
      </div>

      {overrides.length > 0 && (
        <div className="mt-6">
          <Section icon={<UserCheck className="w-4 h-4" />} title="人工改判记录">
            <div className="space-y-3">
              {overrides.map((mo) => (
                <div key={mo.id} className="rounded-lg border border-danger-500/20 bg-danger-500/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-iron-500">{mo.id}</span>
                    <span className="text-xs text-iron-500">
                      {new Date(mo.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="rounded bg-iron-800/50 p-3">
                      <div className="text-xs text-iron-500 mb-1">原结论</div>
                      <p className="text-sm text-iron-400 line-through">{mo.originalConclusion}</p>
                    </div>
                    <div className="rounded bg-danger-500/5 border border-danger-500/10 p-3">
                      <div className="text-xs text-danger-400 mb-1">改判结论</div>
                      <p className="text-sm text-iron-200">{mo.overrideConclusion}</p>
                    </div>
                  </div>
                  <div className="rounded bg-iron-800/50 p-3">
                    <div className="text-xs text-iron-500 mb-1">改判理由</div>
                    <p className="text-sm text-iron-300">{mo.reason}</p>
                  </div>
                  <div className="mt-2 text-xs text-iron-500">
                    改判人：<span className="text-iron-300">{mo.operator}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      <div className="mt-6">
        <Section icon={<Clock className="w-4 h-4" />} title="人工改判">
          {!showOverrideForm ? (
            <button
              onClick={() => setShowOverrideForm(true)}
              className="px-4 py-2 rounded-lg bg-danger-500/10 border border-danger-500/30 text-danger-500 text-sm hover:bg-danger-500/20 transition-colors"
            >
              发起人工改判
            </button>
          ) : (
            <div className="rounded-lg border border-danger-500/20 bg-danger-500/5 p-4 space-y-4">
              <div>
                <label className="block text-xs text-iron-400 mb-1.5">改判结论</label>
                <input
                  type="text"
                  value={overrideConclusion}
                  onChange={(e) => setOverrideConclusion(e.target.value)}
                  placeholder="输入改判后的结论"
                  className="w-full rounded-lg bg-iron-800 border border-iron-700 px-3 py-2 text-sm text-iron-200 placeholder:text-iron-600 focus:border-amber-500/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-iron-400 mb-1.5">改判理由</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="说明改判原因"
                  rows={3}
                  className="w-full rounded-lg bg-iron-800 border border-iron-700 px-3 py-2 text-sm text-iron-200 placeholder:text-iron-600 focus:border-amber-500/50 focus:outline-none transition-colors resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOverride}
                  disabled={!overrideReason.trim() || !overrideConclusion.trim()}
                  className="px-4 py-2 rounded-lg bg-danger-500 text-white text-sm font-medium hover:bg-danger-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交改判
                </button>
                <button
                  onClick={() => setShowOverrideForm(false)}
                  className="px-4 py-2 rounded-lg bg-iron-800 border border-iron-700 text-iron-300 text-sm hover:border-iron-600 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-iron-700 bg-iron-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-amber-500">{icon}</span>
        <h2 className="text-sm font-semibold text-iron-200">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
