import type {
  GisPoint,
  ReviewRecord,
  AbnormalQueue,
  Material,
  PhotoRecord,
  HistoryRecord
} from '@/types'

const centerLng = 121.4737
const centerLat = 31.2304

const randomOffset = () => (Math.random() - 0.5) * 0.1

const generatePoints = (): GisPoint[] => {
  const streets = ['豫园街道', '南京东路街道', '外滩街道', '陆家嘴街道', '淮海中路街道', '徐家汇街道']
  const districts = ['黄浦区', '黄浦区', '黄浦区', '浦东新区', '黄浦区', '徐汇区']
  const names = [
    '豫园商城外摆点',
    '南京东路步行街北段',
    '外滩观光平台南入口',
    '陆家嘴环路美食街',
    '淮海中路商圈外摆',
    '徐家汇天桥下广场',
    '田子坊弄堂外摆',
    '新天地北里广场',
    '静安寺久光百货门前',
    '四川北路商业街中段',
    '五角场万达广场外摆',
    '七浦路服装市场门口'
  ]
  const types: Array<'street' | 'plaza' | 'pedestrian'> = ['plaza', 'pedestrian', 'street', 'street', 'plaza', 'plaza', 'street', 'plaza', 'plaza', 'pedestrian', 'plaza', 'street']
  const statuses: Array<'pending' | 'reviewing' | 'confirmed' | 'disputed'> = ['pending', 'reviewing', 'pending', 'confirmed', 'reviewing', 'disputed', 'pending', 'confirmed', 'reviewing', 'pending', 'confirmed', 'reviewing']
  const capacities = [48, 86, 32, 64, 52, 70, 38, 56, 42, 60, 78, 44]
  const complaints = [2, 5, 1, 3, 2, 8, 1, 0, 4, 3, 1, 7]
  const duplicateFlags = [false, true, false, false, false, true, false, false, false, false, false, true]

  return names.map((name, i) => ({
    id: `POINT_${String(i + 1).padStart(4, '0')}`,
    name,
    lng: centerLng + randomOffset(),
    lat: centerLat + randomOffset(),
    district: districts[i % 6],
    street: streets[i % 6],
    address: `${streets[i % 6]}${name}区域${i + 1}号`,
    type: types[i],
    capacity: capacities[i],
    currentCapacity: Math.floor(capacities[i] * (0.6 + Math.random() * 0.5)),
    status: statuses[i],
    complaintCount: complaints[i],
    duplicateComplaint: duplicateFlags[i],
    lastComplaintDate: complaints[i] > 0 ? `2026-06-${String(10 + (i % 5)).padStart(2, '0')}` : '-',
    createTime: `2026-05-${String(1 + i).padStart(2, '0')} 10:00:00`,
    updateTime: `2026-06-${String(10 + (i % 6)).padStart(2, '0')} 14:3${i}:00`
  }))
}

const generateReviewRecords = (points: GisPoint[]): ReviewRecord[] => {
  const records: ReviewRecord[] = []
  points.forEach((point) => {
    const base: ReviewRecord = {
      id: `RV_${point.id}_V1`,
      pointId: point.id,
      version: 1,
      reviewer: '阿宁',
      reviewTime: `2026-06-10 09:${30 + (parseInt(point.id.slice(-2)) % 30)}:00`,
      status: 'draft',
      manualRemark: '',
      oldOpinion: '初版意见：该点位位于核心商圈，人流密集，建议容量按80%核定。周边居民投诉噪音扰民问题，需现场核实。',
      capacitySuggestion: Math.floor(point.capacity * 0.8),
      actualCapacity: point.currentCapacity,
      confirmReason: '',
      impactScope: '',
      isLatest: true,
      changes: []
    }
    records.push(base)

    if (point.status !== 'pending') {
      const v2: ReviewRecord = {
        id: `RV_${point.id}_V2`,
        pointId: point.id,
        version: 2,
        reviewer: '阿宁',
        reviewTime: `2026-06-12 15:${10 + (parseInt(point.id.slice(-2)) % 40)}:00`,
        status: point.status === 'disputed' ? 'need_confirm' : (point.status === 'confirmed' ? 'approved' : 'pending'),
        manualRemark: point.duplicateComplaint
          ? '该点位存在重复投诉，需进一步确认投诉来源是否为同一批商户，现场已拍照取证。'
          : '现场复核后调整容量，已与街道城管沟通确认。',
        oldOpinion: '初版意见：该点位位于核心商圈，人流密集，建议容量按80%核定。周边居民投诉噪音扰民问题，需现场核实。',
        capacitySuggestion: Math.floor(point.capacity * (point.duplicateComplaint ? 0.65 : 0.85)),
        actualCapacity: point.currentCapacity,
        confirmReason: point.duplicateComplaint ? '重复投诉待核实：是否为同一投诉人反复提交' : '',
        impactScope: point.duplicateComplaint ? `影响范围：${point.street}周边3个小区、约200户居民` : '',
        isLatest: true,
        changes: [
          {
            field: 'capacitySuggestion',
            oldValue: base.capacitySuggestion,
            newValue: Math.floor(point.capacity * (point.duplicateComplaint ? 0.65 : 0.85)),
            changeTime: `2026-06-12 15:${10 + (parseInt(point.id.slice(-2)) % 40)}:00`,
            operator: '阿宁'
          },
          {
            field: 'manualRemark',
            oldValue: '',
            newValue: point.duplicateComplaint ? '重复投诉待确认' : '已现场复核',
            changeTime: `2026-06-12 15:${11 + (parseInt(point.id.slice(-2)) % 40)}:00`,
            operator: '阿宁'
          }
        ]
      }
      base.isLatest = false
      records.push(v2)
    }
  })
  return records
}

const generateAbnormalQueues = (points: GisPoint[]): AbnormalQueue[] => {
  const queues: AbnormalQueue[] = []
  const abnormalPoints = points.filter(p => p.duplicateComplaint || p.complaintCount >= 5 || p.status === 'disputed')

  abnormalPoints.forEach((point, idx) => {
    if (point.duplicateComplaint) {
      queues.push({
        id: `ABN_DUP_${String(idx + 1).padStart(3, '0')}`,
        pointId: point.id,
        pointName: point.name,
        type: 'duplicate_complaint',
        level: 'high',
        description: `该点位近7天收到${point.complaintCount}条投诉，疑似重复投诉，投诉人信息高度重合`,
        status: 'pending',
        createTime: `2026-06-${String(11 + idx).padStart(2, '0')} 08:20:00`,
        handler: '阿宁',
        remark: ''
      })
    }
    if (point.status === 'disputed') {
      queues.push({
        id: `ABN_DIS_${String(idx + 1).padStart(3, '0')}`,
        pointId: point.id,
        pointName: point.name,
        type: 'pending_confirm',
        level: 'high',
        description: '复核意见与商户申报存在争议，需人工确认最终容量',
        status: 'processing',
        createTime: `2026-06-${String(12 + idx).padStart(2, '0')} 10:05:00`,
        handler: '阿宁',
        remark: '已联系街道城管协调'
      })
    }
    if (point.currentCapacity > point.capacity) {
      queues.push({
        id: `ABN_CAP_${String(idx + 1).padStart(3, '0')}`,
        pointId: point.id,
        pointName: point.name,
        type: 'capacity_over',
        level: 'medium',
        description: `当前摆位${point.currentCapacity}个，超出核定容量${point.capacity - point.currentCapacity}个`,
        status: 'pending',
        createTime: `2026-06-${String(10 + idx).padStart(2, '0')} 16:40:00`,
        handler: '阿宁',
        remark: ''
      })
    }
  })

  queues.push({
    id: 'ABN_NAM_001',
    pointId: 'POINT_0001',
    pointName: points[0].name,
    type: 'name_mismatch',
    level: 'low',
    description: '材料中名称为"豫园商城外摆区"与系统登记名称不一致',
    status: 'processing',
    createTime: '2026-06-13 09:15:00',
    handler: '阿宁',
    remark: '已发函至商圈管理方核实标准名称'
  })
  queues.push({
    id: 'ABN_PHO_001',
    pointId: 'POINT_0007',
    pointName: points[6].name,
    type: 'photo_missing',
    level: 'medium',
    description: '该点位缺少现场全景照片和近景特写照片',
    status: 'pending',
    createTime: '2026-06-14 11:30:00',
    handler: '阿宁',
    remark: ''
  })

  return queues
}

const generateMaterials = (points: GisPoint[]): Material[] => {
  return [
    {
      id: 'MAT_0001',
      pointId: 'POINT_0001',
      type: 'gis',
      name: '豫园商城GIS点位数据',
      fileName: '豫园商城_GIS_20260610.kml',
      description: '从GIS系统导出的点位坐标、边界范围及周边500米建筑数据',
      uploadTime: '2026-06-10 09:00:00',
      uploader: '系统导入',
      size: 2048
    },
    {
      id: 'MAT_0002',
      pointId: 'POINT_0001',
      type: 'name_mismatch',
      name: '名称不一致情况说明',
      fileName: '名称核实说明_豫园.docx',
      description: '商圈管理方来函说明：系统登记名与实际对外宣传名差异情况',
      uploadTime: '2026-06-12 14:30:00',
      uploader: '阿宁',
      size: 512
    },
    {
      id: 'MAT_0003',
      pointId: 'POINT_0001',
      type: 'supplement',
      name: '商户协调会议纪要',
      fileName: '豫园商户协调会_20260611.pdf',
      description: '后补说明材料：6月11日豫园商圈管理方、商户代表协调会书面纪要',
      uploadTime: '2026-06-13 10:20:00',
      uploader: '阿宁',
      size: 1024
    },
    {
      id: 'MAT_0004',
      pointId: 'POINT_0002',
      type: 'gis',
      name: '南京东路北段GIS数据',
      fileName: '南京东路北_GIS.kml',
      description: '步行街北段100米范围点位坐标数据',
      uploadTime: '2026-06-10 09:00:00',
      uploader: '系统导入',
      size: 1536
    },
    {
      id: 'MAT_0005',
      pointId: 'POINT_0002',
      type: 'supplement',
      name: '重复投诉排查说明',
      fileName: '南京东路投诉排查报告.docx',
      description: '后补材料：针对8条重复投诉的来源排查、投诉人身份核实说明',
      uploadTime: '2026-06-14 16:45:00',
      uploader: '阿宁',
      size: 768
    },
    {
      id: 'MAT_0006',
      pointId: 'POINT_0006',
      type: 'gis',
      name: '徐家汇广场GIS数据',
      fileName: '徐家汇_GIS.kml',
      description: '包含点位范围、地下通道入口、周边小区分布的GIS图层',
      uploadTime: '2026-06-10 09:00:00',
      uploader: '系统导入',
      size: 1792
    },
    {
      id: 'MAT_0007',
      pointId: 'POINT_0012',
      type: 'name_mismatch',
      name: '七浦路点位名称核对表',
      fileName: '七浦路名称核对.xlsx',
      description: '管理处登记名"七浦路东入口"与系统"七浦路服装市场门口"不一致核对材料',
      uploadTime: '2026-06-13 15:10:00',
      uploader: '阿宁',
      size: 256
    }
  ]
}

const generatePhotoRecords = (points: GisPoint[]): PhotoRecord[] => {
  return [
    {
      id: 'PHO_0001',
      pointId: 'POINT_0002',
      url: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800',
      uploader: '阿宁',
      uploadTime: '2026-06-12 16:30:00',
      description: '南京东路步行街北端正对面全景照，可见外摆摊位排列情况',
      changeExplanation: '补录全景照片后，发现实际摆位数比GIS标注多8个，需调整容量核定',
      beforeState: '仅依赖GIS点位估算，摆位分布不清晰',
      afterState: '明确实际摆位62个，建议容量调整为54个'
    },
    {
      id: 'PHO_0002',
      pointId: 'POINT_0006',
      url: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800',
      uploader: '阿宁',
      uploadTime: '2026-06-14 11:20:00',
      description: '徐家汇天桥下广场外摆近景照，可见居民投诉噪音来源位置',
      changeExplanation: '照片佐证了居民投诉点确实紧邻居民楼，需缩小外摆范围',
      beforeState: '容量建议70个，未考虑居民楼间距',
      afterState: '建议容量缩减至46个，划定噪音管控红线'
    },
    {
      id: 'PHO_0003',
      pointId: 'POINT_0001',
      url: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800',
      uploader: '阿宁',
      uploadTime: '2026-06-11 14:50:00',
      description: '豫园商城入口处外摆全景',
      changeExplanation: '首次补录现场照片，确认GIS点位范围准确',
      beforeState: '无现场照片，参考历史数据',
      afterState: '确认容量48个合理'
    }
  ]
}

const generateHistoryRecords = (points: GisPoint[]): HistoryRecord[] => {
  const records: HistoryRecord[] = []
  records.push({
    id: 'HIS_0001',
    pointId: 'POINT_0002',
    operator: '阿宁',
    operateType: 'create',
    operateTime: '2026-06-10 09:10:00',
    beforeSnapshot: null,
    afterSnapshot: { status: 'pending', capacitySuggestion: 69, manualRemark: '' },
    diffFields: ['status', 'capacitySuggestion'],
    remark: '创建南京东路步行街北段复核工单'
  })
  records.push({
    id: 'HIS_0002',
    pointId: 'POINT_0002',
    operator: '阿宁',
    operateType: 'photo_upload',
    operateTime: '2026-06-12 16:30:00',
    beforeSnapshot: { capacitySuggestion: 69, status: 'reviewing' },
    afterSnapshot: { capacitySuggestion: 54, status: 'need_confirm' },
    diffFields: ['capacitySuggestion', 'status'],
    remark: '补录现场全景照片后，根据实际摆位情况调整建议容量'
  })
  records.push({
    id: 'HIS_0003',
    pointId: 'POINT_0002',
    operator: '运营主管-王主管',
    operateType: 'confirm',
    operateTime: '2026-06-15 09:30:00',
    beforeSnapshot: { status: 'need_confirm', manualRemark: '重复投诉待核实' },
    afterSnapshot: { status: 'reviewing', manualRemark: '经周一早会确认：重复投诉属实，需进一步核减' },
    diffFields: ['status', 'manualRemark'],
    remark: '周一早会复盘决议：影响200户居民，按65%核减并加设隔音屏障'
  })
  records.push({
    id: 'HIS_0004',
    pointId: 'POINT_0001',
    operator: '阿宁',
    operateType: 'remark_add',
    operateTime: '2026-06-13 10:25:00',
    beforeSnapshot: { manualRemark: '' },
    afterSnapshot: { manualRemark: '已收到商圈管理方名称核实回函，以"豫园商城外摆区"为准' },
    diffFields: ['manualRemark'],
    remark: '补充名称不一致处理进度备注'
  })
  records.push({
    id: 'HIS_0005',
    pointId: 'POINT_0006',
    operator: '阿宁',
    operateType: 'update',
    operateTime: '2026-06-14 11:25:00',
    beforeSnapshot: { capacitySuggestion: 56, confirmReason: '', impactScope: '' },
    afterSnapshot: { capacitySuggestion: 46, confirmReason: '居民投诉点位紧邻住宅楼，重复投诉共8条', impactScope: '周边3个小区共200户居民受影响' },
    diffFields: ['capacitySuggestion', 'confirmReason', 'impactScope'],
    remark: '依据现场照片和投诉记录，给出待确认原因与影响范围'
  })
  records.push({
    id: 'HIS_0006',
    pointId: 'POINT_0006',
    operator: '运营主管-王主管',
    operateType: 'confirm',
    operateTime: '2026-06-15 09:45:00',
    beforeSnapshot: { status: 'disputed' },
    afterSnapshot: { status: 'reviewing' },
    diffFields: ['status'],
    remark: '周一早会复盘：同意徐家汇点位按46个执行，月底再评估'
  })
  return records
}

export const mockGisPoints: GisPoint[] = generatePoints()
export const mockReviewRecords: ReviewRecord[] = generateReviewRecords(mockGisPoints)
export const mockAbnormalQueues: AbnormalQueue[] = generateAbnormalQueues(mockGisPoints)
export const mockMaterials: Material[] = generateMaterials(mockGisPoints)
export const mockPhotoRecords: PhotoRecord[] = generatePhotoRecords(mockGisPoints)
export const mockHistoryRecords: HistoryRecord[] = generateHistoryRecords(mockGisPoints)
