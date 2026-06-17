import type {
  ApiError,
  ImportResult,
  RawMaterial,
  Sample,
  SamplesResponse,
} from '@shared/types'

const BASE = '/api'

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as ApiError
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export async function getSamples(): Promise<SamplesResponse> {
  const res = await fetch(`${BASE}/samples`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await parseError(res, `接口返回失败：${res.status}`))
  return (await res.json()) as SamplesResponse
}

export async function importMaterials(materials: RawMaterial[]): Promise<ImportResult> {
  const res = await fetch(`${BASE}/samples/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ materials }),
  })
  if (!res.ok) throw new Error(await parseError(res, `导入失败：${res.status}`))
  return (await res.json()) as ImportResult
}

export async function patchSample(
  id: string,
  action: 'confirm' | 'withdraw',
): Promise<Sample> {
  const res = await fetch(`${BASE}/samples/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  if (!res.ok) throw new Error(await parseError(res, `操作失败：${res.status}`))
  return (await res.json()) as Sample
}
