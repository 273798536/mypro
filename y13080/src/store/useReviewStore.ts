import { create } from 'zustand'
import type {
  WarehouseLocation,
  DangerousGoods,
  ReviewComment,
  TimelineRecord,
  BadDataRecord,
  ViewType,
  Filters,
  DescriptionTexts,
} from '@/types'
import {
  warehouseLocations,
  dangerousGoods,
  reviewComments,
  timelineRecords,
  badDataRecords,
} from '@/data/mockData'
import { generateDescriptions } from '@/utils/generateDescription'

interface ReviewStore {
  locations: WarehouseLocation[]
  goods: DangerousGoods[]
  comments: ReviewComment[]
  timelineRecords: TimelineRecord[]
  badData: BadDataRecord[]

  selectedLocationId: string | null
  currentView: ViewType
  filters: Filters

  filteredLocations: WarehouseLocation[]
  selectedLocation: WarehouseLocation | null
  selectedGoods: DangerousGoods[]
  selectedComments: ReviewComment[]
  selectedTimeline: TimelineRecord[]
  hasBadData: boolean
  badDataCount: number

  selectLocation: (id: string | null) => void
  setView: (view: ViewType) => void
  setFilter: (key: keyof Filters, value: string | undefined) => void
  resetFilters: () => void
  getLocationBadData: (locationId: string) => BadDataRecord[]
  getDescriptions: () => DescriptionTexts
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  locations: warehouseLocations,
  goods: dangerousGoods,
  comments: reviewComments,
  timelineRecords: timelineRecords,
  badData: badDataRecords,

  selectedLocationId: 'L001',
  currentView: 'byArea',
  filters: {},

  get filteredLocations() {
    const { locations, filters } = get()
    let result = [...locations]

    if (filters.area) {
      result = result.filter(l => l.area === filters.area)
    }
    if (filters.hazardClass) {
      result = result.filter(l => l.hazardClass === filters.hazardClass)
    }
    if (filters.status) {
      result = result.filter(l => l.status === filters.status)
    }

    return result
  },

  get selectedLocation() {
    const { locations, selectedLocationId } = get()
    return locations.find(l => l.id === selectedLocationId) || null
  },

  get selectedGoods() {
    const { goods, selectedLocationId } = get()
    return goods.filter(g => g.locationId === selectedLocationId)
  },

  get selectedComments() {
    const { comments, selectedLocationId } = get()
    return comments
      .filter(c => c.locationId === selectedLocationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  get selectedTimeline() {
    const { timelineRecords, selectedLocationId, filters } = get()
    let result = timelineRecords.filter(t => t.locationId === selectedLocationId)
    if (filters.date) {
      result = result.filter(t => t.date === filters.date)
    }
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime))
  },

  getDescriptions: () => {
    const { selectedLocation, selectedComments, selectedTimeline, currentView } = get()
    return generateDescriptions(selectedLocation, selectedComments, selectedTimeline, currentView)
  },

  get hasBadData() {
    const { badData, selectedLocationId } = get()
    return badData.some(b => b.locationId === selectedLocationId)
  },

  get badDataCount() {
    const { badData } = get()
    return badData.length
  },

  selectLocation: (id: string | null) => {
    set({ selectedLocationId: id })
  },

  setView: (view: ViewType) => {
    set({ currentView: view })
  },

  setFilter: (key: keyof Filters, value: string | undefined) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
    }))
  },

  resetFilters: () => {
    set({ filters: {} })
  },

  getLocationBadData: (locationId: string) => {
    const { badData } = get()
    return badData.filter(b => b.locationId === locationId)
  },
}))
