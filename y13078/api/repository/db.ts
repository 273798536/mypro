import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Point, ViewPreset, Cabinet } from '../../shared/types';
import { initialPoints, initialViews, initialCabinets } from '../data/seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DbSchema {
  points: Point[];
  views: ViewPreset[];
  cabinets: Cabinet[];
  meta: { updatedAt: number; version: string };
}

function loadDefault(): DbSchema {
  return {
    points: initialPoints,
    views: initialViews,
    cabinets: initialCabinets,
    meta: { updatedAt: Date.now(), version: '1.0.0' },
  };
}

function ensureFile(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const data = loadDefault();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DbSchema;
    if (!parsed.points || !Array.isArray(parsed.points) || parsed.points.length === 0) {
      const data = loadDefault();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
      return data;
    }
    return parsed;
  } catch {
    const data = loadDefault();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
}

function persist(db: DbSchema) {
  db.meta.updatedAt = Date.now();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let cache: DbSchema | null = null;
function getDb(): DbSchema {
  if (!cache) cache = ensureFile();
  return cache;
}
function resetCache() { cache = null; }

export const db = {
  readAll(): DbSchema { return getDb(); },

  getAllPoints(): Point[] { return [...getDb().points]; },
  getPointById(id: string): Point | undefined {
    return getDb().points.find(p => p.id === id);
  },
  updatePoint(id: string, patch: Partial<Point>): Point | null {
    const d = getDb();
    const idx = d.points.findIndex(p => p.id === id);
    if (idx < 0) return null;
    d.points[idx] = { ...d.points[idx], ...patch, updatedAt: Date.now() };
    persist(d);
    return d.points[idx];
  },

  getAllViews(): ViewPreset[] { return [...getDb().views]; },
  getViewById(id: string): ViewPreset | undefined {
    return getDb().views.find(v => v.id === id);
  },
  createView(view: Omit<ViewPreset, 'id' | 'createdAt'>): ViewPreset {
    const d = getDb();
    const newView: ViewPreset = {
      ...view,
      id: `V-${String(d.views.length + 1).padStart(3, '0')}`,
      createdAt: Date.now(),
    };
    d.views.push(newView);
    persist(d);
    return newView;
  },
  deleteView(id: string): boolean {
    const d = getDb();
    const idx = d.views.findIndex(v => v.id === id);
    if (idx < 0) return false;
    d.views.splice(idx, 1);
    persist(d);
    return true;
  },

  getAllCabinets(): Cabinet[] { return [...getDb().cabinets]; },

  reset() { resetCache(); const d = loadDefault(); persist(d); resetCache(); },
  forceReload() { resetCache(); getDb(); },
};
