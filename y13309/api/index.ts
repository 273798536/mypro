import express from 'express'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type {
  ApiError,
  ImportPayload,
  ImportResult,
  PatchPayload,
  Sample,
  SamplesResponse,
} from '../shared/types'
import { toSample } from '../shared/transform'
import { readSamples, writeSamples } from './store'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.resolve(ROOT, 'dist')

const app = express()
app.use(express.json({ limit: '5mb' }))

function uniqueThresholdVersions(samples: Sample[]): string[] {
  return Array.from(new Set(samples.map((s) => s.thresholdVersion))).sort()
}

function genId(now: string, existing: Set<string>, index: number): string {
  const date = now.slice(0, 10).replace(/-/g, '')
  let id = `MR-${date}-${String(index).padStart(3, '0')}`
  let n = 1
  while (existing.has(id)) {
    n += 1
    id = `MR-${date}-${String(index).padStart(3, '0')}-${n}`
  }
  return id
}

function hasText(v: unknown): boolean {
  return v !== undefined && v !== null && String(v).trim() !== ''
}

app.get('/api/samples', async (_req, res) => {
  const samples = await readSamples()
  const body: SamplesResponse = {
    samples,
    thresholdVersions: uniqueThresholdVersions(samples),
  }
  res.json(body)
})

app.post('/api/samples/import', async (req, res) => {
  const { materials } = (req.body ?? {}) as ImportPayload
  if (!Array.isArray(materials) || materials.length === 0) {
    const body: ApiError = { error: 'materials 不能为空' }
    res.status(400).json(body)
    return
  }
  const samples = await readSamples()
  const existing = new Set(samples.map((s) => s.id))
  const now = new Date().toISOString()
  const errors: ImportResult['errors'] = []
  const inserted: Sample[] = []

  materials.forEach((raw, index) => {
    const valid =
      hasText(raw.materialName) &&
      hasText(raw.materialContent) &&
      hasText(raw.question) &&
      hasText(raw.modelOutput) &&
      hasText(raw.conclusion) &&
      hasText(raw.thresholdVersion) &&
      typeof raw.threshold === 'number'
    if (!valid) {
      errors.push({
        index,
        reason: '缺少必填字段（materialName / materialContent / question / modelOutput / conclusion / thresholdVersion / threshold）',
      })
      return
    }
    const id = genId(now, existing, samples.length + inserted.length + index + 1)
    existing.add(id)
    inserted.push(toSample(raw, now, id))
  })

  if (inserted.length > 0) {
    await writeSamples([...samples, ...inserted])
  }
  const result: ImportResult = { inserted: inserted.length, errors, samples: inserted }
  res.status(201).json(result)
})

app.patch('/api/samples/:id', async (req, res) => {
  const { id } = req.params
  const { action } = (req.body ?? {}) as PatchPayload
  if (action !== 'confirm' && action !== 'withdraw') {
    const body: ApiError = { error: 'action 必须为 confirm 或 withdraw' }
    res.status(400).json(body)
    return
  }
  const samples = await readSamples()
  const idx = samples.findIndex((s) => s.id === id)
  if (idx === -1) {
    const body: ApiError = { error: `样本不存在：${id}` }
    res.status(404).json(body)
    return
  }
  const target = samples[idx]
  const now = new Date().toISOString()

  if (action === 'confirm') {
    if (target.status === 'exception') {
      const body: ApiError = {
        error: '异常记录不可确认为通过：请先修正引用缺失 / 名称不一致后重新导入',
      }
      res.status(409).json(body)
      return
    }
    target.status = 'confirmed'
    target.confirmedAt = now
    target.withdrawnAt = undefined
    target.history.push({ at: now, action: 'confirm' })
  } else {
    target.status = 'withdrawn'
    target.withdrawnAt = now
    target.history.push({ at: now, action: 'withdraw' })
  }

  samples[idx] = target
  await writeSamples(samples)
  res.json(target)
})

if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(DIST, 'index.html'))
  })
}

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`[病历问答指标看板] 后端运行于 http://localhost:${PORT}（接口返回 /api/samples）`)
})
