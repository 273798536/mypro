import type {
  Complaint,
  Material,
  ApprovalRecord,
  ApiLog,
  Photo,
  TrendPoint,
} from '../types'

const generateId = (prefix: string, index: number) => `${prefix}-${String(index).padStart(3, '0')}`

const baseDate = new Date('2026-06-16')

const formatDate = (date: Date) => date.toISOString()

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const complaintTitles = [
  '朝阳区建国路88号噪音扰民',
  '海淀区中关村大街违法停车',
  '西城区金融街占道经营',
  '东城区王府井步行街垃圾堆放',
  '丰台区丽泽路施工扬尘',
  '通州区新华大街污水漫溢',
  '昌平区回龙观路灯损坏',
  '大兴区亦庄开发区绿化破坏',
]

const addresses = [
  '北京市朝阳区建国路88号',
  '北京市海淀区中关村大街1号',
  '北京市西城区金融街7号',
  '北京市东城区王府井大街138号',
  '北京市丰台区丽泽路300号',
  '北京市通州区新华大街1号',
  '北京市昌平区回龙观西大街',
  '北京市大兴区亦庄荣昌东街',
]

const operators = ['张三', '李四', '王五', '赵六', '钱七']
const stages = ['受理登记', '现场核查', '部门审批', '处理完成']
const sources = ['12345热线', '微信公众号', '官网留言', '现场举报']
const calibers = ['环境保护', '城市管理', '交通秩序', '环境卫生', '市政设施']

export const complaints: Complaint[] = [
  {
    id: generateId('cmp', 1),
    title: complaintTitles[0],
    address: addresses[0],
    lat: 39.9087,
    lng: 116.4074,
    status: 'pending',
    isDuplicate: false,
    isAbnormal: false,
    createdAt: formatDate(addDays(baseDate, -8)),
  },
  {
    id: generateId('cmp', 2),
    title: complaintTitles[0],
    address: addresses[0],
    lat: 39.9087,
    lng: 116.4074,
    status: 'reviewing',
    isDuplicate: true,
    isAbnormal: false,
    createdAt: formatDate(addDays(baseDate, -7)),
  },
  {
    id: generateId('cmp', 3),
    title: complaintTitles[1],
    address: addresses[1],
    lat: 39.9842,
    lng: 116.3074,
    status: 'supplemented',
    isDuplicate: false,
    isAbnormal: true,
    createdAt: formatDate(addDays(baseDate, -6)),
    supplementNote: '经核查，投诉位置与实际偏差约500米，已修正坐标',
    originalLat: 39.9800,
    originalLng: 116.3000,
  },
  {
    id: generateId('cmp', 4),
    title: complaintTitles[2],
    address: addresses[2],
    lat: 39.9128,
    lng: 116.3554,
    status: 'rejected',
    isDuplicate: false,
    isAbnormal: true,
    createdAt: formatDate(addDays(baseDate, -5)),
  },
  {
    id: generateId('cmp', 5),
    title: complaintTitles[3],
    address: addresses[3],
    lat: 39.9139,
    lng: 116.4103,
    status: 'reviewing',
    isDuplicate: false,
    isAbnormal: false,
    createdAt: formatDate(addDays(baseDate, -4)),
  },
  {
    id: generateId('cmp', 6),
    title: complaintTitles[4],
    address: addresses[4],
    lat: 39.8587,
    lng: 116.3412,
    status: 'pending',
    isDuplicate: true,
    isAbnormal: false,
    createdAt: formatDate(addDays(baseDate, -3)),
  },
  {
    id: generateId('cmp', 7),
    title: complaintTitles[5],
    address: addresses[5],
    lat: 39.9056,
    lng: 116.6554,
    status: 'reviewing',
    isDuplicate: false,
    isAbnormal: true,
    createdAt: formatDate(addDays(baseDate, -2)),
  },
  {
    id: generateId('cmp', 8),
    title: complaintTitles[6],
    address: addresses[6],
    lat: 40.0708,
    lng: 116.3345,
    status: 'supplemented',
    isDuplicate: false,
    isAbnormal: false,
    createdAt: formatDate(addDays(baseDate, -1)),
  },
]

export const materials: Material[] = complaints.flatMap((complaint, cmpIdx) => {
  const materialCount = 3 + (cmpIdx % 2)
  return Array.from({ length: materialCount }, (_, matIdx) => {
    const caliberIdx = (cmpIdx + matIdx) % calibers.length
    const changed = matIdx === 0
    return {
      id: generateId('mat', cmpIdx * 4 + matIdx + 1),
      complaintId: complaint.id,
      name: `材料${matIdx + 1}`,
      originalName: `原始材料${matIdx + 1}`,
      source: sources[(cmpIdx + matIdx) % sources.length],
      caliber: changed ? calibers[caliberIdx] : calibers[(caliberIdx + 1) % calibers.length],
      originalCaliber: calibers[caliberIdx],
      caliberChanged: changed,
      changedAt: formatDate(addDays(baseDate, -cmpIdx)),
      changedBy: operators[cmpIdx % operators.length],
      oralNote: matIdx === 1 ? '口述材料，已录音存档' : undefined,
    }
  })
})

export const approvalRecords: ApprovalRecord[] = complaints.flatMap((complaint, cmpIdx) => {
  const recordCount = 3 + (cmpIdx % 2)
  return Array.from({ length: recordCount }, (_, recIdx) => ({
    id: generateId('app', cmpIdx * 4 + recIdx + 1),
    complaintId: complaint.id,
    stage: stages[recIdx % stages.length],
    operator: operators[(cmpIdx + recIdx) % operators.length],
    note: `${stages[recIdx % stages.length]}完成，情况${recIdx === 0 ? '属实' : '基本属实'}，需${recIdx === 0 ? '进一步核实' : '按流程办理'}`,
    createdAt: formatDate(addDays(baseDate, -cmpIdx + recIdx)),
  }))
})

export const apiLogs: ApiLog[] = complaints.flatMap((complaint, cmpIdx) => {
  const logCount = 1 + (cmpIdx % 2)
  return Array.from({ length: logCount }, (_, logIdx) => ({
    id: generateId('log', cmpIdx * 2 + logIdx + 1),
    complaintId: complaint.id,
    requestParams: {
      complaintId: complaint.id,
      action: logIdx === 0 ? 'verify' : 'reprocess',
      timestamp: formatDate(addDays(baseDate, -cmpIdx + logIdx)),
    },
    responseData: {
      success: true,
      code: 200,
      message: logIdx === 0 ? '核验成功' : '重跑成功',
      data: {
        verified: true,
        confidence: 0.85 + Math.random() * 0.1,
      },
    },
    runAt: formatDate(addDays(baseDate, -cmpIdx + logIdx)),
    isRerun: logIdx > 0,
  }))
})

export const photos: Photo[] = [
  {
    id: generateId('photo', 1),
    complaintId: complaints[2].id,
    url: 'https://example.com/photos/photo1.jpg',
    uploadedAt: formatDate(addDays(baseDate, -4)),
    lat: 39.9842,
    lng: 116.3074,
    note: '现场照片，显示违法停车情况',
  },
  {
    id: generateId('photo', 2),
    complaintId: complaints[7].id,
    url: 'https://example.com/photos/photo2.jpg',
    uploadedAt: formatDate(addDays(baseDate, -1)),
    lat: 40.0708,
    lng: 116.3345,
    note: '补录照片，路灯损坏位置确认',
  },
]

export const trendData: TrendPoint[] = Array.from({ length: 14 }, (_, idx) => {
  const date = addDays(baseDate, -13 + idx)
  const baseCount = 3 + Math.floor(Math.random() * 4)
  const isAbnormal = idx === 3 || idx === 7 || idx === 11
  return {
    date: date.toISOString().split('T')[0],
    count: isAbnormal ? baseCount + 6 : baseCount,
    isAbnormal,
  }
})

export const mockData = {
  complaints,
  materials,
  approvalRecords,
  apiLogs,
  photos,
  trendData,
}
