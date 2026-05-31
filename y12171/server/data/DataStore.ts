import type {
  SamplePack,
  LicenseAgreement,
  TrackProject,
  SampleUsage
} from '../../shared/types'

export class DataStore {
  private samplePacks: Map<string, SamplePack> = new Map()
  private licenses: Map<string, LicenseAgreement> = new Map()
  private tracks: Map<string, TrackProject> = new Map()
  private usages: Map<string, SampleUsage> = new Map()

  getSamplePacks(): SamplePack[] {
    return Array.from(this.samplePacks.values())
  }

  getSamplePack(id: string): SamplePack | undefined {
    return this.samplePacks.get(id)
  }

  addSamplePack(pack: SamplePack): void {
    this.samplePacks.set(pack.id, pack)
  }

  updateSamplePack(id: string, updates: Partial<SamplePack>): SamplePack | undefined {
    const existing = this.samplePacks.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.samplePacks.set(id, updated)
    return updated
  }

  deleteSamplePack(id: string): boolean {
    return this.samplePacks.delete(id)
  }

  getLicenses(): LicenseAgreement[] {
    return Array.from(this.licenses.values())
  }

  getLicense(id: string): LicenseAgreement | undefined {
    return this.licenses.get(id)
  }

  getLicensesForPack(packId: string): LicenseAgreement[] {
    return Array.from(this.licenses.values()).filter(l => l.samplePackId === packId)
  }

  addLicense(license: LicenseAgreement): void {
    this.licenses.set(license.id, license)
  }

  updateLicense(id: string, updates: Partial<LicenseAgreement>): LicenseAgreement | undefined {
    const existing = this.licenses.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.licenses.set(id, updated)
    return updated
  }

  deleteLicense(id: string): boolean {
    return this.licenses.delete(id)
  }

  getTracks(): TrackProject[] {
    return Array.from(this.tracks.values())
  }

  getTrack(id: string): TrackProject | undefined {
    return this.tracks.get(id)
  }

  addTrack(track: TrackProject): void {
    this.tracks.set(track.id, track)
  }

  updateTrack(id: string, updates: Partial<TrackProject>): TrackProject | undefined {
    const existing = this.tracks.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.tracks.set(id, updated)
    return updated
  }

  deleteTrack(id: string): boolean {
    return this.tracks.delete(id)
  }

  getUsages(): SampleUsage[] {
    return Array.from(this.usages.values())
  }

  getUsage(id: string): SampleUsage | undefined {
    return this.usages.get(id)
  }

  getUsagesForTrack(trackId: string): SampleUsage[] {
    return Array.from(this.usages.values()).filter(u => u.trackProjectId === trackId)
  }

  getUsagesForPack(packId: string): SampleUsage[] {
    return Array.from(this.usages.values()).filter(u => u.samplePackId === packId)
  }

  addUsage(usage: SampleUsage): void {
    this.usages.set(usage.id, usage)
  }

  updateUsage(id: string, updates: Partial<SampleUsage>): SampleUsage | undefined {
    const existing = this.usages.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.usages.set(id, updated)
    return updated
  }

  deleteUsage(id: string): boolean {
    return this.usages.delete(id)
  }

  exportAll() {
    return {
      samplePacks: this.getSamplePacks(),
      licenses: this.getLicenses(),
      tracks: this.getTracks(),
      usages: this.getUsages()
    }
  }

  importAll(data: {
    samplePacks: SamplePack[]
    licenses: LicenseAgreement[]
    tracks: TrackProject[]
    usages: SampleUsage[]
  }) {
    this.samplePacks.clear()
    this.licenses.clear()
    this.tracks.clear()
    this.usages.clear()

    data.samplePacks.forEach(p => this.samplePacks.set(p.id, p))
    data.licenses.forEach(l => this.licenses.set(l.id, l))
    data.tracks.forEach(t => this.tracks.set(t.id, t))
    data.usages.forEach(u => this.usages.set(u.id, u))
  }
}
