import type { SeatRecord } from '../types'

const STORAGE_KEY = 'pocket_park_seat_records'

export const storage = {
  getAll(): SeatRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  },

  saveAll(records: SeatRecord[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  },

  getById(id: string): SeatRecord | undefined {
    const records = this.getAll()
    return records.find(r => r.id === id)
  },

  add(record: SeatRecord): void {
    const records = this.getAll()
    records.push(record)
    this.saveAll(records)
  },

  update(id: string, updates: Partial<SeatRecord>): SeatRecord | undefined {
    const records = this.getAll()
    const index = records.findIndex(r => r.id === id)
    if (index === -1) return undefined
    records[index] = { ...records[index], ...updates }
    this.saveAll(records)
    return records[index]
  },

  remove(id: string): boolean {
    const records = this.getAll()
    const filtered = records.filter(r => r.id !== id)
    if (filtered.length === records.length) return false
    this.saveAll(filtered)
    return true
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
}
