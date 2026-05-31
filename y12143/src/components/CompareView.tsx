import { useState, useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from 'lucide-react'
import { usePumpStore } from '@/store/usePumpStore'
import { cn } from '@/lib/utils'
import type { CalculationSnapshot, PumpMatchResult } from '@/types'

interface CompareField {
  key: keyof CalculationSnapshot
  label: string
  unit: string
}

const FIELDS: CompareField[] = [
  { key: 'frictionLoss', label: '沿程损失', unit: 'm' },
  { key: 'localLoss', label: '局部损失', unit: 'm' },
  { key: 'totalHeadLoss', label: '总水头损失', unit: 'm' },
  { key: 'velocity', label: '流速', unit: 'm/s' },
  { key: 'requiredHead', label: '需求扬程', unit: 'm' },
]

function calcChange(oldVal: number, newVal: number) {
  if (oldVal === 0) return newVal === 0 ? 0 : Infinity
  return ((newVal - oldVal) / Math.abs(oldVal)) * 100
}

function DiffBadge({ oldVal, newVal }: { oldVal: number; newVal: number }) {
  if (oldVal === newVal) return <Minus className="h-3.5 w-3.5 text-navy-400" />
  const pct = calcChange(oldVal, newVal)
  const up = newVal > oldVal
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? '+' : ''}{pct === Infinity ? '∞' : pct.toFixed(1)}%
    </span>
  )
}

function PumpDiff({ oldPumps, newPumps }: { oldPumps: PumpMatchResult[]; newPumps: PumpMatchResult[] }) {
  const oldIds = new Set(oldPumps.map(p => p.pumpId))
  const newIds = new Set(newPumps.map(p => p.pumpId))
  const added = newPumps.filter(p => !oldIds.has(p.pumpId))
  const removed = oldPumps.filter(p => !newIds.has(p.pumpId))
  const kept = newPumps.filter(p => oldIds.has(p.pumpId))

  if (added.length === 0 && removed.length === 0 && kept.length === 0) {
    return <p className="text-xs text-navy-400">无匹配水泵</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {kept.map(p => (
        <div key={p.pumpId} className="flex items-center gap-2 text-xs text-navy-200">
          <Minus className="h-3 w-3 text-navy-400" />
          <span>{p.pumpName}</span>
          <span className="text-navy-400">{p.ratedHead}m / {p.ratedFlow}L/s</span>
        </div>
      ))}
      {added.map(p => (
        <div key={p.pumpId} className="flex items-center gap-2 text-xs text-amber-400">
          <ArrowUpRight className="h-3 w-3" />
          <span className="font-medium">{p.pumpName}</span>
          <span className="text-navy-400">{p.ratedHead}m / {p.ratedFlow}L/s</span>
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px]">新增</span>
        </div>
      ))}
      {removed.map(p => (
        <div key={p.pumpId} className="flex items-center gap-2 text-xs text-red-400">
          <ArrowDownRight className="h-3 w-3" />
          <span className="font-medium line-through">{p.pumpName}</span>
          <span className="text-navy-400">{p.ratedHead}m / {p.ratedFlow}L/s</span>
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px]">移除</span>
        </div>
      ))}
    </div>
  )
}

export default function CompareView() {
  const snapshots = usePumpStore(s => s.snapshots)
  const [leftIdx, setLeftIdx] = useState<number>(() => Math.max(0, snapshots.length - 2))
  const [rightIdx, setRightIdx] = useState<number>(() => Math.max(0, snapshots.length - 1))

  useMemo(() => {
    if (snapshots.length >= 2) {
      setLeftIdx(Math.max(0, snapshots.length - 2))
      setRightIdx(Math.max(0, snapshots.length - 1))
    }
  }, [snapshots.length])

  const left = snapshots[leftIdx] ?? null
  const right = snapshots[rightIdx] ?? null

  if (snapshots.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
        <GitCompare className="h-12 w-12 text-navy-400/40" />
        <p className="text-sm text-navy-200/60">至少需要两次计算快照才能对比</p>
      </div>
    )
  }

  const optionLabel = (s: CalculationSnapshot, i: number) =>
    `#${i + 1} ${s.triggerType === 'import' ? '导入' : s.triggerType === 'correction' ? '修正' : '初始'} · ${new Date(s.calculatedAt).toLocaleTimeString()}`

  let increases = 0
  let decreases = 0

  const rows = FIELDS.map(field => {
    const o = left ? (left[field.key] as number) : 0
    const n = right ? (right[field.key] as number) : 0
    const changed = o !== n
    if (changed) {
      if (n > o) increases++
      else decreases++
    }
    return { field, oldVal: o, newVal: n, changed }
  })

  const pumpOld = left?.matchedPumps ?? []
  const pumpNew = right?.matchedPumps ?? []
  const pumpOldIds = new Set(pumpOld.map(p => p.pumpId))
  const pumpNewIds = new Set(pumpNew.map(p => p.pumpId))
  const addedCount = pumpNew.filter(p => !pumpOldIds.has(p.pumpId)).length
  const removedCount = pumpOld.filter(p => !pumpNewIds.has(p.pumpId)).length
  const totalChanges = rows.filter(r => r.changed).length + addedCount + removedCount

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <GitCompare className="h-5 w-5 text-amber" />
        <h2 className="text-base font-semibold text-navy-50">快照对比</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="label-text">旧快照</span>
          <select
            className="rounded-md border border-navy-600 bg-navy-700 px-2 py-1.5 text-sm text-navy-100 outline-none focus:border-amber"
            value={leftIdx}
            onChange={e => setLeftIdx(Number(e.target.value))}
          >
            {snapshots.map((s, i) => (
              <option key={s.id} value={i} disabled={i === rightIdx}>
                {optionLabel(s, i)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="label-text">新快照</span>
          <select
            className="rounded-md border border-navy-600 bg-navy-700 px-2 py-1.5 text-sm text-navy-100 outline-none focus:border-amber"
            value={rightIdx}
            onChange={e => setRightIdx(Number(e.target.value))}
          >
            {snapshots.map((s, i) => (
              <option key={s.id} value={i} disabled={i === leftIdx}>
                {optionLabel(s, i)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-2">
        <span className="label-text text-center">旧值</span>
        <span className="label-text text-center">新值</span>
        <span className="label-text">变化</span>
        {rows.map(({ field, oldVal, newVal, changed }) => (
          <div key={field.key} className="col-span-3 grid grid-cols-subgrid items-center gap-x-4 rounded-lg px-3 py-2">
            <div className="flex flex-col items-center">
              <span className="label-text mb-0.5">{field.label}</span>
              <span className={cn('value-text', changed && 'bg-amber-500/10 rounded px-1')}>
                {oldVal.toFixed(3)}
              </span>
              <span className="value-unit">{field.unit}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="label-text mb-0.5">{field.label}</span>
              <span className={cn('value-text', changed && 'bg-amber-500/10 rounded px-1')}>
                {newVal.toFixed(3)}
              </span>
              <span className="value-unit">{field.unit}</span>
            </div>
            <div className="flex items-center justify-center">
              <DiffBadge oldVal={oldVal} newVal={newVal} />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <GitCompare className="h-4 w-4 text-amber" />
          <span className="label-text">水泵匹配对比</span>
        </div>
        <PumpDiff oldPumps={pumpOld} newPumps={pumpNew} />
      </div>

      <div className="card flex items-center justify-center gap-6 py-3">
        <span className="text-sm text-navy-200">
          共<span className="font-semibold text-amber">{totalChanges}</span>项变化
        </span>
        <span className="text-sm text-navy-200">
          其中<span className="font-semibold text-amber">{increases + addedCount}</span>项增加
        </span>
        <span className="text-sm text-navy-200">
          <span className="font-semibold text-red-400">{decreases + removedCount}</span>项减少
        </span>
      </div>
    </div>
  )
}
