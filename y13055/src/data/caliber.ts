import type { AnomalyType, CaliberItem } from '../types'

export const ANOMALY_CALIBER: Record<AnomalyType, CaliberItem> = {
  name_mismatch: {
    label: '名称不一致',
    description: '材料清单名称与巡检照片标注名称不匹配，需核对实际物品名称',
    reportText: '经复核，材料清单与照片标注名称存在差异，待现场确认'
  },
  floor_unit_mix: {
    label: '楼层单位混写',
    description: '坐标记录与照片EXIF的楼层单位格式不一致（如"3F"与"3层"），需统一口径',
    reportText: '经复核，楼层标识单位存在混用，需补充统一标准说明'
  },
  coordinate_offset: {
    label: '坐标偏移',
    description: '同一巡检点多次记录坐标偏差超过阈值，疑似坐标系混用导致',
    reportText: '经复核，坐标记录存在异常偏移，建议重新校准坐标系'
  },
  none: {
    label: '正常',
    description: '记录核对无误，无异常',
    reportText: '经复核，该记录正常通过'
  }
}
