import type { ParamValue, Anomaly } from '@/types'

export function detectUnitError(param: ParamValue): Anomaly | null {
  if (!param.hasUnitError) return null
  return {
    id: `detected-${param.id}`,
    stepId: param.stepId,
    type: 'unit',
    description: param.errorNote ?? `参数 ${param.paramName} 存在单位混写导致数量级异常`,
    actionHint: buildUnitActionHint(param),
    status: 'pending',
  }
}

export function detectDirectionError(param: ParamValue): Anomaly | null {
  if (!param.hasDirectionError) return null
  return {
    id: `detected-${param.id}`,
    stepId: param.stepId,
    type: 'direction',
    description:
      param.errorNote ??
      `参数 ${param.paramName} 方向符号与实际流向相反`,
    actionHint: buildDirectionActionHint(param),
    status: 'pending',
  }
}

function buildUnitActionHint(param: ParamValue): string {
  return [
    `1. 找到 ${param.paramName} 的原始现场照片，确认表盘显示的真实单位；`,
    `2. 将当前值 ${param.value} ${param.unit} 按正确单位重新换算或直接覆盖；`,
    `3. 回到后续依赖该参数的计算步骤（通常为最后一步），按统一单位重算。`,
  ].join('\n')
}

function buildDirectionActionHint(param: ParamValue): string {
  return [
    `1. 在制热模式下重新观察 ${param.paramName}：用听针或测温枪比对进出口温度；`,
    `2. 热端应为流向的起始，冷端为流向的终点，据此判断真实方向；`,
    `3. 将参数 direction 由当前值取反（forward↔reverse），并在现场照片上用记号笔补画反向箭头；`,
    `4. 刷新回放结果，确认 COP 与制热量变化方向符合预期。`,
  ].join('\n')
}

export function diffParamVersions(
  v1: ParamValue[],
  v2: ParamValue[],
): Array<{
  paramName: string
  stepId: string
  oldVal: string
  newVal: string
  changed: boolean
}> {
  const map1 = new Map(v1.map((p) => [p.paramName, p]))
  const rows: Array<{
    paramName: string
    stepId: string
    oldVal: string
    newVal: string
    changed: boolean
  }> = []
  for (const p2 of v2) {
    const p1 = map1.get(p2.paramName)
    const oldVal = p1 ? `${p1.value} ${p1.unit}${p1.direction ? ` (${dirLabel(p1.direction)})` : ''}` : '—'
    const newVal = `${p2.value} ${p2.unit}${p2.direction ? ` (${dirLabel(p2.direction)})` : ''}`
    rows.push({
      paramName: p2.paramName,
      stepId: p2.stepId,
      oldVal,
      newVal,
      changed: !p1 || p1.value !== p2.value || p1.unit !== p2.unit || p1.direction !== p2.direction,
    })
  }
  return rows
}

export function dirLabel(d?: 'forward' | 'reverse'): string {
  if (!d) return ''
  return d === 'forward' ? '→ 正向' : '← 反向'
}

export function findResultChangingStep(diffs: ReturnType<typeof diffParamVersions>): string[] {
  const chain = ['冷凝器出水流量', '制热量 Q', '性能系数 COP', '四通阀冷媒流向']
  return diffs.filter((d) => d.changed && chain.includes(d.paramName)).map((d) => d.paramName)
}

export function exportReport(versionId: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify({ versionId, exportedAt: new Date().toISOString(), payload }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heatpump-replay-${versionId}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
