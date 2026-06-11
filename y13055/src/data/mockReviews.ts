import type { ReviewRecord } from '../types'
import { ANOMALY_CALIBER } from './caliber'

export const mockReviews: ReviewRecord[] = [
  {
    id: 'rev-001',
    photoId: 'photo-001',
    materialId: 'mat-001',
    anomalyType: 'name_mismatch',
    anomalyDescription: ANOMALY_CALIBER.name_mismatch.description,
    status: 'pending',
    reviewNote: '待复核：清单名称"一次性输液器"与照片标注"输液器"不一致，需现场确认实际物品名称',
    updatedAt: '2024-03-15 17:00:00'
  },
  {
    id: 'rev-002',
    photoId: 'photo-002',
    materialId: 'mat-003',
    anomalyType: 'name_mismatch',
    anomalyDescription: ANOMALY_CALIBER.name_mismatch.description,
    status: 'need_evidence',
    reviewNote: '需补证据：清单名称"医用检查手套"与照片标注"手套"存在差异，请补充现场实物照片',
    evidenceUrl: 'https://picsum.photos/seed/evidence-glove/400/300',
    updatedAt: '2024-03-15 18:20:00'
  },
  {
    id: 'rev-003',
    photoId: 'photo-003',
    materialId: 'mat-002',
    anomalyType: 'floor_unit_mix',
    anomalyDescription: ANOMALY_CALIBER.floor_unit_mix.description,
    status: 'need_evidence',
    reviewNote: '需补证据：坐标记录"3F"与照片EXIF"3层"格式不一致，请补充楼层标识规范说明',
    updatedAt: '2024-03-15 19:05:00'
  },
  {
    id: 'rev-004',
    photoId: 'photo-004',
    materialId: 'mat-004',
    anomalyType: 'floor_unit_mix',
    anomalyDescription: ANOMALY_CALIBER.floor_unit_mix.description,
    status: 'pending',
    reviewNote: '待复核：坐标记录"1F"与照片EXIF"1层"单位混用，需统一标准口径',
    updatedAt: '2024-03-15 19:30:00'
  },
  {
    id: 'rev-005',
    photoId: 'photo-005',
    materialId: 'mat-006',
    anomalyType: 'coordinate_offset',
    anomalyDescription: ANOMALY_CALIBER.coordinate_offset.description,
    status: 'pending',
    reviewNote: '待复核：2楼口罩存放区坐标系A记录与B系记录偏差较大，疑似坐标系混用',
    updatedAt: '2024-03-15 20:10:00'
  },
  {
    id: 'rev-006',
    photoId: 'photo-006',
    materialId: 'mat-006',
    anomalyType: 'coordinate_offset',
    anomalyDescription: ANOMALY_CALIBER.coordinate_offset.description,
    status: 'need_evidence',
    reviewNote: '需补证据：同一巡检点A系(150,200)与B系(400,180)偏差超阈值，请补充校准记录',
    updatedAt: '2024-03-15 20:45:00'
  },
  {
    id: 'rev-007',
    photoId: 'photo-007',
    materialId: 'mat-005',
    anomalyType: 'none',
    anomalyDescription: ANOMALY_CALIBER.none.description,
    status: 'reviewed',
    reviewNote: '已复核：3楼消毒棉片记录正常，坐标、名称、楼层均无误',
    updatedAt: '2024-03-16 09:15:00'
  },
  {
    id: 'rev-008',
    photoId: 'photo-008',
    materialId: 'mat-001',
    anomalyType: 'none',
    anomalyDescription: ANOMALY_CALIBER.none.description,
    status: 'reviewed',
    reviewNote: '已复核：1楼输液器二次巡检记录正常，与首次巡检一致',
    updatedAt: '2024-03-16 10:30:00'
  }
]
