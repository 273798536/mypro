import { create } from 'zustand'
import type {
  Complaint,
  Material,
  ApprovalRecord,
  ApiLog,
  Photo,
  TrendPoint,
} from '../types'
import { mockData } from '../mock/data'

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

interface AppState {
  complaints: Complaint[]
  materials: Material[]
  approvalRecords: ApprovalRecord[]
  apiLogs: ApiLog[]
  photos: Photo[]
  trendData: TrendPoint[]

  getComplaintById: (id: string) => Complaint | undefined
  getMaterialsByComplaintId: (complaintId: string) => Material[]
  getApprovalRecordsByComplaintId: (complaintId: string) => ApprovalRecord[]
  getApiLogsByComplaintId: (complaintId: string) => ApiLog[]
  getPhotosByComplaintId: (complaintId: string) => Photo[]
  getDuplicateComplaints: () => Complaint[]
  getAbnormalComplaints: () => Complaint[]

  rerunApi: (complaintId: string) => void
  supplementPhoto: (complaintId: string, photo: Omit<Photo, 'id' | 'complaintId' | 'uploadedAt'>) => void
  updateComplaintLocation: (complaintId: string, lat: number, lng: number, note?: string) => void
  updateComplaintStatus: (complaintId: string, status: Complaint['status']) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  complaints: mockData.complaints,
  materials: mockData.materials,
  approvalRecords: mockData.approvalRecords,
  apiLogs: mockData.apiLogs,
  photos: mockData.photos,
  trendData: mockData.trendData,

  getComplaintById: (id) => get().complaints.find((c) => c.id === id),

  getMaterialsByComplaintId: (complaintId) =>
    get().materials.filter((m) => m.complaintId === complaintId),

  getApprovalRecordsByComplaintId: (complaintId) =>
    get().approvalRecords.filter((a) => a.complaintId === complaintId),

  getApiLogsByComplaintId: (complaintId) =>
    get().apiLogs.filter((a) => a.complaintId === complaintId),

  getPhotosByComplaintId: (complaintId) =>
    get().photos.filter((p) => p.complaintId === complaintId),

  getDuplicateComplaints: () => get().complaints.filter((c) => c.isDuplicate),

  getAbnormalComplaints: () => get().complaints.filter((c) => c.isAbnormal),

  rerunApi: (complaintId) => {
    const newLog: ApiLog = {
      id: generateId('log'),
      complaintId,
      requestParams: {
        complaintId,
        action: 'reprocess',
        timestamp: new Date().toISOString(),
      },
      responseData: {
        success: true,
        code: 200,
        message: '重跑成功',
        data: {
          verified: true,
          confidence: 0.85 + Math.random() * 0.1,
        },
      },
      runAt: new Date().toISOString(),
      isRerun: true,
    }
    set((state) => ({
      apiLogs: [...state.apiLogs, newLog],
    }))
  },

  supplementPhoto: (complaintId, photo) => {
    const newPhoto: Photo = {
      id: generateId('photo'),
      complaintId,
      uploadedAt: new Date().toISOString(),
      ...photo,
    }
    set((state) => ({
      photos: [...state.photos, newPhoto],
    }))
  },

  updateComplaintLocation: (complaintId, lat, lng, note) => {
    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              originalLat: c.lat,
              originalLng: c.lng,
              lat,
              lng,
              supplementNote: note || c.supplementNote,
            }
          : c
      ),
    }))
  },

  updateComplaintStatus: (complaintId, status) => {
    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === complaintId ? { ...c, status } : c
      ),
    }))
  },
}))
