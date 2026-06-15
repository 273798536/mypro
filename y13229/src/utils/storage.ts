import {
  AppDataState,
  DEFAULT_FILTER,
  FilterState,
} from '@/types';

const STORAGE_KEY = 'theater_split_align_v1';
const FILTER_KEY = 'theater_split_filter_v1';

export function loadAppState(): AppDataState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppDataState;
  } catch {
    return null;
  }
}

export function saveAppState(state: AppDataState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存状态失败', e);
  }
}

export function clearAppState(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(FILTER_KEY);
}

export function loadFilter(): FilterState {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return { ...DEFAULT_FILTER };
    const parsed = JSON.parse(raw) as FilterState;
    return { ...DEFAULT_FILTER, ...parsed };
  } catch {
    return { ...DEFAULT_FILTER };
  }
}

export function saveFilter(filter: FilterState): void {
  try {
    localStorage.setItem(
      FILTER_KEY,
      JSON.stringify({ ...filter, savedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.error('保存筛选失败', e);
  }
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = formatDate(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

export function isAuthExpired(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  return exp.getTime() < today.getTime();
}
