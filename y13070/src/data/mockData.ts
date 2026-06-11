import type {
  Station, CoordSystem, Point, PointVersion, Adjacency,
  MergeIssue, ReviewRound, Annotation, AnnotationNote,
  ScreenshotArchive, HandoverReport, HandoverItem,
} from '@/types'

const coordSystems: CoordSystem[] = [
  { id: 'cs-1', name: 'CGCS2000', type: '国家大地坐标系', epsg: 'EPSG:4490' },
  { id: 'cs-2', name: 'WGS-84', type: '世界大地坐标系', epsg: 'EPSG:4326' },
  { id: 'cs-3', name: '西安80', type: '旧版国家坐标系', epsg: 'EPSG:4610' },
  { id: 'cs-4', name: '北京54', type: '旧版国家坐标系', epsg: 'EPSG:4214' },
]

const stations: Station[] = [
  { id: 'st-1', name: '云顶上行站', elevation: 2340, lineName: 'A线' },
  { id: 'st-2', name: '云顶下行站', elevation: 2310, lineName: 'A线' },
  { id: 'st-3', name: '松林中转站', elevation: 1890, lineName: 'B线' },
  { id: 'st-4', name: '碧谷终点站', elevation: 1520, lineName: 'B线' },
]

const points: Point[] = [
  { id: 'pt-1', stationId: 'st-1', name: 'A1', x: 3245678.12, y: 456789.34, z: 2340.56, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-2', stationId: 'st-1', name: 'A2', x: 3245690.45, y: 456801.67, z: 2342.10, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-3', stationId: 'st-1', name: 'A3', x: 3245705.78, y: 456815.90, z: 2338.45, coordSystemId: 'cs-2', status: 'warning' },
  { id: 'pt-4', stationId: 'st-1', name: 'A4', x: 3245720.11, y: 456830.23, z: 2341.20, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-5', stationId: 'st-2', name: 'B1', x: 3245100.00, y: 457200.00, z: 2310.00, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-6', stationId: 'st-2', name: 'B2', x: 3245115.33, y: 457215.33, z: 2312.50, coordSystemId: 'cs-3', status: 'error' },
  { id: 'pt-7', stationId: 'st-2', name: 'B3', x: 3245130.66, y: 457230.66, z: 2308.75, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-8', stationId: 'st-3', name: 'C1', x: 3244800.00, y: 458000.00, z: 1890.00, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-9', stationId: 'st-3', name: 'C2', x: 3244820.00, y: 458020.00, z: 1892.30, coordSystemId: 'cs-4', status: 'error' },
  { id: 'pt-10', stationId: 'st-3', name: 'C3', x: 3244840.00, y: 458040.00, z: 1888.50, coordSystemId: 'cs-1', status: 'warning' },
  { id: 'pt-11', stationId: 'st-3', name: 'C4', x: 3244860.00, y: 458060.00, z: 1891.00, coordSystemId: 'cs-2', status: 'warning' },
  { id: 'pt-12', stationId: 'st-4', name: 'D1', x: 3244400.00, y: 459000.00, z: 1520.00, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-13', stationId: 'st-4', name: 'D2', x: 3244420.00, y: 459020.00, z: 1522.10, coordSystemId: 'cs-1', status: 'normal' },
  { id: 'pt-14', stationId: 'st-4', name: 'D3', x: 3244440.00, y: 459040.00, z: 1518.90, coordSystemId: 'cs-3', status: 'warning' },
  { id: 'pt-15', stationId: 'st-4', name: 'D4', x: 3244460.00, y: 459060.00, z: 1521.50, coordSystemId: 'cs-1', status: 'normal' },
]

const pointVersions: PointVersion[] = [
  {
    id: 'pv-1', pointId: 'pt-6', x: 3245115.33, y: 457215.33, z: 2312.50,
    coordSystemId: 'cs-1', changedBy: '王工', changedAt: '2025-11-10T09:30:00',
    reason: '初始录入使用CGCS2000',
  },
  {
    id: 'pv-2', pointId: 'pt-6', x: 3245115.33, y: 457215.33, z: 2312.50,
    coordSystemId: 'cs-3', changedBy: '李工', changedAt: '2025-12-05T14:20:00',
    reason: '复查发现原始数据为西安80坐标，未做转换直接录入',
  },
  {
    id: 'pv-3', pointId: 'pt-9', x: 3244820.00, y: 458020.00, z: 1892.30,
    coordSystemId: 'cs-1', changedBy: '王工', changedAt: '2025-11-12T10:00:00',
    reason: '初始录入使用CGCS2000',
  },
  {
    id: 'pv-4', pointId: 'pt-9', x: 3244820.00, y: 458020.00, z: 1892.30,
    coordSystemId: 'cs-4', changedBy: '张工', changedAt: '2025-12-08T16:45:00',
    reason: '核实为北京54坐标系数据，与站内其他点位坐标系不一致',
  },
]

const adjacencies: Adjacency[] = [
  { id: 'adj-1', pointAId: 'pt-1', pointBId: 'pt-2', distance: 25.3, deviation: 0.02, mergeOk: true },
  { id: 'adj-2', pointAId: 'pt-2', pointBId: 'pt-3', distance: 22.8, deviation: 3.45, mergeOk: false },
  { id: 'adj-3', pointAId: 'pt-3', pointBId: 'pt-4', distance: 20.1, deviation: 2.87, mergeOk: false },
  { id: 'adj-4', pointAId: 'pt-5', pointBId: 'pt-6', distance: 28.5, deviation: 5.12, mergeOk: false },
  { id: 'adj-5', pointAId: 'pt-6', pointBId: 'pt-7', distance: 24.7, deviation: 4.30, mergeOk: false },
  { id: 'adj-6', pointAId: 'pt-8', pointBId: 'pt-9', distance: 30.2, deviation: 6.01, mergeOk: false },
  { id: 'adj-7', pointAId: 'pt-9', pointBId: 'pt-10', distance: 26.3, deviation: 2.15, mergeOk: false },
  { id: 'adj-8', pointAId: 'pt-10', pointBId: 'pt-11', distance: 28.0, deviation: 1.89, mergeOk: false },
  { id: 'adj-9', pointAId: 'pt-12', pointBId: 'pt-13', distance: 27.5, deviation: 0.03, mergeOk: true },
  { id: 'adj-10', pointAId: 'pt-13', pointBId: 'pt-14', distance: 23.8, deviation: 3.67, mergeOk: false },
  { id: 'adj-11', pointAId: 'pt-14', pointBId: 'pt-15', distance: 25.0, deviation: 2.95, mergeOk: false },
]

const mergeIssues: MergeIssue[] = [
  {
    id: 'mi-1', adjacencyId: 'adj-2',
    description: 'A2(CGCS2000)与A3(WGS-84)相邻合并不一致，偏差3.45m超出容限',
    actionStep: '重新测量 A2-A3 段，确认坐标系一致后再合并。建议将A3坐标从WGS-84转换为CGCS2000后重新复核',
    status: 'open',
  },
  {
    id: 'mi-2', adjacencyId: 'adj-3',
    description: 'A3(WGS-84)与A4(CGCS2000)相邻合并不一致，偏差2.87m超出容限',
    actionStep: '先处理mi-1中A3坐标系问题，处理完成后重新评估A3-A4段偏差',
    status: 'open',
  },
  {
    id: 'mi-3', adjacencyId: 'adj-4',
    description: 'B1(CGCS2000)与B2(西安80)相邻合并不一致，偏差5.12m严重超出容限',
    actionStep: '将B2坐标从西安80转换为CGCS2000，使用七参数转换模型，转换后重新测量B1-B2段',
    status: 'processing',
  },
  {
    id: 'mi-4', adjacencyId: 'adj-5',
    description: 'B2(西安80)与B3(CGCS2000)相邻合并不一致，偏差4.30m超出容限',
    actionStep: '等待mi-3中B2坐标系修正完成后，重新评估B2-B3段偏差',
    status: 'open',
  },
  {
    id: 'mi-5', adjacencyId: 'adj-6',
    description: 'C1(CGCS2000)与C2(北京54)相邻合并不一致，偏差6.01m严重超出容限',
    actionStep: '将C2坐标从北京54转换为CGCS2000，需获取测区七参数，转换后重新复核C1-C2段',
    status: 'open',
  },
  {
    id: 'mi-6', adjacencyId: 'adj-7',
    description: 'C2(北京54)与C3(CGCS2000)相邻合并不一致，偏差2.15m超出容限',
    actionStep: '等待mi-5中C2坐标系修正完成后，重新评估C2-C3段偏差',
    status: 'open',
  },
  {
    id: 'mi-7', adjacencyId: 'adj-8',
    description: 'C3(CGCS2000)与C4(WGS-84)相邻合并不一致，偏差1.89m超出容限',
    actionStep: '将C4坐标从WGS-84转换为CGCS2000后重新复核C3-C4段',
    status: 'open',
  },
  {
    id: 'mi-8', adjacencyId: 'adj-10',
    description: 'D2(CGCS2000)与D3(西安80)相邻合并不一致，偏差3.67m超出容限',
    actionStep: '将D3坐标从西安80转换为CGCS2000，使用七参数转换模型，转换后重新复核D2-D3段',
    status: 'open',
  },
  {
    id: 'mi-9', adjacencyId: 'adj-11',
    description: 'D3(西安80)与D4(CGCS2000)相邻合并不一致，偏差2.95m超出容限',
    actionStep: '等待mi-8中D3坐标系修正完成后，重新评估D3-D4段偏差',
    status: 'open',
  },
]

const reviewRounds: ReviewRound[] = [
  { id: 'rr-1', name: '第一轮复核', startDate: '2025-11-01', endDate: '2025-11-30' },
  { id: 'rr-2', name: '第二轮复核', startDate: '2025-12-01', endDate: '2025-12-31' },
  { id: 'rr-3', name: '第三轮复核', startDate: '2026-01-01', endDate: '2026-01-31' },
]

const annotations: Annotation[] = [
  {
    id: 'ann-1', roundId: 'rr-1', pointId: 'pt-3',
    content: 'A3点位坐标疑似使用WGS-84坐标系，与站内其他点位CGCS2000不一致，需核实原始测量数据',
    author: '王工', createdAt: '2025-11-15T10:30:00', version: 1,
  },
  {
    id: 'ann-2', roundId: 'rr-1', pointId: 'pt-6',
    content: 'B2点位初始录入CGCS2000，复查发现原始数据为西安80坐标，未做转换直接录入，偏差5.12m',
    author: '王工', createdAt: '2025-11-18T14:20:00', version: 1,
  },
  {
    id: 'ann-3', roundId: 'rr-2', pointId: 'pt-6',
    content: 'B2点位已确认坐标系统为西安80，需进行坐标转换。已标记坐标系变更，等待转换参数',
    author: '李工', createdAt: '2025-12-05T09:00:00', version: 2,
  },
  {
    id: 'ann-4', roundId: 'rr-2', pointId: 'pt-9',
    content: 'C2点位坐标为北京54坐标系，与站内CGCS2000不一致，偏差6.01m严重超出容限',
    author: '张工', createdAt: '2025-12-10T11:30:00', version: 1,
  },
  {
    id: 'ann-5', roundId: 'rr-2', pointId: 'pt-10',
    content: 'C3点位偏差1.89m在容限边缘，需关注与C4的坐标系差异是否放大偏差',
    author: '张工', createdAt: '2025-12-12T16:00:00', version: 1,
  },
  {
    id: 'ann-6', roundId: 'rr-2', pointId: 'pt-11',
    content: 'C4使用WGS-84，与C3(CGCS2000)相邻偏差1.89m，需坐标转换后重新评估',
    author: '张工', createdAt: '2025-12-13T10:15:00', version: 1,
  },
  {
    id: 'ann-7', roundId: 'rr-3', pointId: 'pt-14',
    content: 'D3使用西安80坐标系，与D2(CGCS2000)相邻偏差3.67m，需坐标转换',
    author: '王工', createdAt: '2026-01-05T09:45:00', version: 1,
  },
]

const annotationNotes: AnnotationNote[] = [
  {
    id: 'note-1', annotationId: 'ann-1',
    content: '已联系原始测量队，确认A3使用的是手持GPS采集的WGS-84坐标，需要转换为CGCS2000',
    author: '林姐', createdAt: '2025-11-20T15:00:00',
  },
  {
    id: 'note-2', annotationId: 'ann-2',
    content: '教学备注：这是典型的坐标系混用案例，学生需掌握不同坐标系间的转换方法',
    author: '林姐', createdAt: '2025-11-22T10:30:00',
  },
  {
    id: 'note-3', annotationId: 'ann-3',
    content: '已获取测区七参数，准备进行西安80→CGCS2000转换',
    author: '李工', createdAt: '2025-12-08T14:00:00',
  },
  {
    id: 'note-4', annotationId: 'ann-4',
    content: '北京54坐标数据来源于旧版地形图，需确认图根点精度是否满足要求',
    author: '林姐', createdAt: '2025-12-15T09:30:00',
  },
  {
    id: 'note-5', annotationId: 'ann-6',
    content: 'WGS-84与CGCS2000差异虽小但在高精度测量中不可忽略，建议统一到CGCS2000',
    author: '林姐', createdAt: '2025-12-18T11:00:00',
  },
]

const screenshotArchives: ScreenshotArchive[] = [
  {
    id: 'sa-1', annotationId: 'ann-1',
    dataUrl: '', description: '第一轮复核-初始截图-A3点位WGS-84标注',
    capturedAt: '2025-11-15T10:31:00', version: 1,
  },
  {
    id: 'sa-2', annotationId: 'ann-2',
    dataUrl: '', description: '第一轮复核-初始截图-B2点位偏差5.12m标注',
    capturedAt: '2025-11-18T14:21:00', version: 1,
  },
  {
    id: 'sa-3', annotationId: 'ann-3',
    dataUrl: '', description: '第二轮复核-B2坐标系变更后截图',
    capturedAt: '2025-12-05T09:01:00', version: 2,
  },
]

const handoverReports: HandoverReport[] = [
  { id: 'hr-1', title: '山地索道站空间复核交接报告', createdAt: '2026-01-10T10:00:00', status: 'draft' },
]

const handoverItems: HandoverItem[] = [
  {
    id: 'hi-1', reportId: 'hr-1', annotationId: 'ann-1',
    screenshotDataUrl: '', description: 'A3点位坐标系混用(WGS-84)，需转换为CGCS2000',
    verificationStatus: 'pending', verifiedBy: '', verifiedAt: '',
  },
  {
    id: 'hi-2', reportId: 'hr-1', annotationId: 'ann-3',
    screenshotDataUrl: '', description: 'B2点位西安80坐标需转换，已获取七参数',
    verificationStatus: 'pending', verifiedBy: '', verifiedAt: '',
  },
  {
    id: 'hi-3', reportId: 'hr-1', annotationId: 'ann-4',
    screenshotDataUrl: '', description: 'C2点位北京54坐标与CGCS2000不一致，偏差6.01m',
    verificationStatus: 'pending', verifiedBy: '', verifiedAt: '',
  },
  {
    id: 'hi-4', reportId: 'hr-1', annotationId: 'ann-6',
    screenshotDataUrl: '', description: 'C4点位WGS-84坐标需转换为CGCS2000',
    verificationStatus: 'pending', verifiedBy: '', verifiedAt: '',
  },
  {
    id: 'hi-5', reportId: 'hr-1', annotationId: 'ann-7',
    screenshotDataUrl: '', description: 'D3点位西安80坐标与CGCS2000不一致，偏差3.67m',
    verificationStatus: 'pending', verifiedBy: '', verifiedAt: '',
  },
]

export const mockData = {
  coordSystems,
  stations,
  points,
  pointVersions,
  adjacencies,
  mergeIssues,
  reviewRounds,
  annotations,
  annotationNotes,
  screenshotArchives,
  handoverReports,
  handoverItems,
}
