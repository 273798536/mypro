import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Sample } from '../shared/types'
import { SEED_SAMPLES } from './data/seed'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, 'data')
const DATA_FILE = path.resolve(DATA_DIR, 'store.json')

async function ensureStore(): Promise<void> {
  if (!existsSync(DATA_FILE)) {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(DATA_FILE, JSON.stringify({ samples: SEED_SAMPLES }, null, 2), 'utf8')
  }
}

export async function readSamples(): Promise<Sample[]> {
  await ensureStore()
  const raw = await readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw) as { samples?: Sample[] }
  return parsed.samples ?? []
}

export async function writeSamples(samples: Sample[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify({ samples }, null, 2), 'utf8')
}
