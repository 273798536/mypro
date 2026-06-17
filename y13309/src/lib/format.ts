import type { Sample, SampleStatus } from '@shared/types'

export const STATUS_LABEL: Record<SampleStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  withdrawn: '已撤回',
  exception: '异常',
}

export const STATUS_RESULT: Record<SampleStatus, string> = {
  pending: '待确认',
  confirmed: '通过',
  withdrawn: '已撤回',
  exception: '异常·不可通过',
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export function isBad(s: Pick<Sample, 'citationMissing' | 'nameMismatch'>): boolean {
  return s.citationMissing || s.nameMismatch
}

export function fileStamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`
}

export function downloadInterfaceReturn(
  samples: Sample[],
  thresholdVersions: string[],
): void {
  const payload = {
    source: '/api/samples',
    exportedAt: new Date().toISOString(),
    thresholdVersions,
    samples,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `病历问答指标看板-接口返回-${fileStamp(new Date().toISOString())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
