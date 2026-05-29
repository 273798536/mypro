import { create } from 'zustand'
import type { VoxelData, BuildingBlock, PedestrianZone, DetectedIssue, RiskAnnotation, AppFilters } from '@/types'
import { generateMockData } from '@/data/mockData'
import { runAllDetections } from '@/utils/issueDetection'
import { generateWindConclusion } from '@/utils/exportReport'
import { WIND_SPEED_MAX, WIND_SPEED_MIN, HEIGHT_MAX, HEIGHT_MIN } from '@/types'

interface AppStore {
  voxels: VoxelData[]
  buildings: BuildingBlock[]
  pedestrianZones: PedestrianZone[]
  issues: DetectedIssue[]
  annotations: RiskAnnotation[]
  filters: AppFilters
  selectedVoxelId: string | null
  selectedIssueId: string | null
  issuePanelOpen: boolean
  detailPanelOpen: boolean
  filterPanelOpen: boolean
  windConclusion: string
  cameraTarget: [number, number, number] | null
  dataLoaded: boolean

  loadData: () => void
  setFilters: (filters: Partial<AppFilters>) => void
  selectVoxel: (id: string | null) => void
  selectIssue: (id: string | null) => void
  confirmIssue: (id: string) => void
  addAnnotation: (annotation: RiskAnnotation) => void
  removeAnnotation: (id: string) => void
  toggleIssuePanel: () => void
  toggleDetailPanel: () => void
  toggleFilterPanel: () => void
  setCameraTarget: (target: [number, number, number] | null) => void
  getFilteredVoxels: () => VoxelData[]
  getSelectedVoxel: () => VoxelData | null
  getSelectedIssue: () => DetectedIssue | null
}

const { voxels: rawVoxels, buildings, pedestrianZones } = generateMockData()

export const useStore = create<AppStore>((set, get) => {
  const issues = runAllDetections(rawVoxels, buildings, pedestrianZones, 5)
  const windConclusion = generateWindConclusion(issues, rawVoxels)

  const annotations: RiskAnnotation[] = issues
    .filter((i) => i.severity === 'critical')
    .map((i) => ({
      id: `ann_${i.id}`,
      issueId: i.id,
      label: i.type === 'wind_reversal'
        ? '⚠ 风向反转'
        : i.type === 'voxel_hole'
          ? '⚠ 体素空洞'
          : '⚠ 测点遮挡',
      position: i.position,
      type: (i.severity === 'critical' ? 'danger' : 'warning') as RiskAnnotation['type'],
    }))

  return {
    voxels: rawVoxels,
    buildings,
    pedestrianZones,
    issues,
    annotations,
    filters: {
      categories: ['building', 'wind', 'pedestrian'],
      windSpeedRange: [WIND_SPEED_MIN, WIND_SPEED_MAX],
      heightSlice: [HEIGHT_MIN, HEIGHT_MAX],
    },
    selectedVoxelId: null,
    selectedIssueId: null,
    issuePanelOpen: true,
    detailPanelOpen: true,
    filterPanelOpen: true,
    windConclusion,
    cameraTarget: null,
    dataLoaded: true,

    loadData: () => {
      const data = generateMockData()
      const newIssues = runAllDetections(data.voxels, data.buildings, data.pedestrianZones, 5)
      const newConclusion = generateWindConclusion(newIssues, data.voxels)
      const newAnnotations: RiskAnnotation[] = newIssues
        .filter((i) => i.severity === 'critical')
        .map((i) => ({
          id: `ann_${i.id}`,
          issueId: i.id,
          label: i.type === 'wind_reversal'
            ? '⚠ 风向反转'
            : i.type === 'voxel_hole'
              ? '⚠ 体素空洞'
              : '⚠ 测点遮挡',
          position: i.position,
          type: (i.severity === 'critical' ? 'danger' : 'warning') as RiskAnnotation['type'],
        }))
      set({
        voxels: data.voxels,
        buildings: data.buildings,
        pedestrianZones: data.pedestrianZones,
        issues: newIssues,
        annotations: newAnnotations,
        windConclusion: newConclusion,
        dataLoaded: true,
      })
    },

    setFilters: (newFilters) =>
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),

    selectVoxel: (id) => set({ selectedVoxelId: id }),

    selectIssue: (id) => {
      const issue = get().issues.find((i) => i.id === id)
      if (issue) {
        set({
          selectedIssueId: id,
          cameraTarget: issue.position,
          detailPanelOpen: true,
        })
      } else {
        set({ selectedIssueId: null, cameraTarget: null })
      }
    },

    confirmIssue: (id) =>
      set((state) => ({
        issues: state.issues.map((i) =>
          i.id === id ? { ...i, confirmed: !i.confirmed } : i
        ),
      })),

    addAnnotation: (annotation) =>
      set((state) => ({
        annotations: [...state.annotations, annotation],
      })),

    removeAnnotation: (id) =>
      set((state) => ({
        annotations: state.annotations.filter((a) => a.id !== id),
      })),

    toggleIssuePanel: () =>
      set((state) => ({ issuePanelOpen: !state.issuePanelOpen })),

    toggleDetailPanel: () =>
      set((state) => ({ detailPanelOpen: !state.detailPanelOpen })),

    toggleFilterPanel: () =>
      set((state) => ({ filterPanelOpen: !state.filterPanelOpen })),

    setCameraTarget: (target) => set({ cameraTarget: target }),

    getFilteredVoxels: () => {
      const { voxels, filters } = get()
      return voxels.filter((v) => {
        if (!filters.categories.includes(v.category)) return false
        if (v.category === 'wind' || v.category === 'pedestrian') {
          if (v.windSpeed < filters.windSpeedRange[0] || v.windSpeed > filters.windSpeedRange[1]) return false
        }
        if (v.position[1] < filters.heightSlice[0] || v.position[1] > filters.heightSlice[1]) return false
        return true
      })
    },

    getSelectedVoxel: () => {
      const { voxels, selectedVoxelId } = get()
      if (!selectedVoxelId) return null
      return voxels.find((v) => v.id === selectedVoxelId) || null
    },

    getSelectedIssue: () => {
      const { issues, selectedIssueId } = get()
      if (!selectedIssueId) return null
      return issues.find((i) => i.id === selectedIssueId) || null
    },
  }
})
