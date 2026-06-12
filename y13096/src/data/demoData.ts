import type {
  MaterialItem,
  TimelineGap,
  FilterSnapshot,
  AnomalySummary,
  MaterialQueryResponse
} from '../../shared/types';

export const DEMO_DATE = '2026-06-11';

export const demoTimelineGaps: TimelineGap[] = [
  {
    id: 'gap-A',
    start: `${DEMO_DATE} 10:18:00`,
    end: `${DEMO_DATE} 10:35:00`,
    durationMinutes: 17,
    severity: 'critical',
    relatedMaterialIds: ['mat-A03'],
    note: '雷达数据中断17分钟，晚到附件A03于11:05补传'
  },
  {
    id: 'gap-B',
    start: `${DEMO_DATE} 12:02:00`,
    end: `${DEMO_DATE} 12:08:00`,
    durationMinutes: 6,
    severity: 'warning',
    relatedMaterialIds: [],
    note: 'VHF话音记录短暂丢失，无对应材料，待空管补证'
  }
];

export const demoMaterials: MaterialItem[] = [
  {
    id: 'mat-P01',
    type: 'point',
    name: '航路点 P01 · 起飞爬升点',
    timestamp: `${DEMO_DATE} 09:30:00`,
    position: { lng: 121.4737, lat: 31.2304, altitude: 45 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed',
    processNote: '已核对'
  },
  {
    id: 'mat-P02',
    type: 'point',
    name: '航路点 P02 · 程序转弯点',
    timestamp: `${DEMO_DATE} 09:45:00`,
    position: { lng: 121.5037, lat: 31.2404, altitude: 90 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed'
  },
  {
    id: 'mat-A01',
    type: 'attachment',
    name: '附件 · 飞行计划V1.pdf',
    timestamp: `${DEMO_DATE} 10:00:00`,
    position: { lng: 121.5200, lat: 31.2500 },
    attachmentMeta: {
      fileName: '飞行计划V1.pdf',
      fileSize: 1_204_480,
      uploadTime: `${DEMO_DATE} 09:58:00`,
      isLate: false,
      expectedTime: `${DEMO_DATE} 10:00:00`
    },
    caliberHistory: [
      {
        changedAt: `${DEMO_DATE} 10:12:00`,
        changedBy: '评审助理-阿乔',
        field: '备注说明',
        beforeValue: '正常',
        afterValue: '绕飞雷雨区，偏航2.3NM',
        reason: '临时接气象席通知'
      }
    ],
    hasModifiedCaliber: true,
    processStatus: 'processed',
    processNote: '口径修改已留痕'
  },
  {
    id: 'mat-P03',
    type: 'point',
    name: '航路点 P03 · 走廊入口',
    timestamp: `${DEMO_DATE} 10:00:00`,
    position: { lng: 121.5337, lat: 31.2604, altitude: 120 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed'
  },
  {
    id: 'mat-P04',
    type: 'point',
    name: '航路点 P04 · 走廊中续点',
    timestamp: `${DEMO_DATE} 10:10:00`,
    position: { lng: 121.5637, lat: 31.2345, altitude: 120 },
    caliberHistory: [
      {
        changedAt: `${DEMO_DATE} 10:48:00`,
        changedBy: '评审助理-阿乔',
        field: 'position.lat',
        beforeValue: '31.2311',
        afterValue: '31.2345',
        reason: '坐标表更新，纠正录入偏差'
      }
    ],
    hasModifiedCaliber: true,
    processStatus: 'need_evidence',
    processNote: '需补原始坐标来源截图'
  },
  {
    id: 'mat-O01',
    type: 'oral',
    name: '口头说明 · 空管放行许可',
    timestamp: `${DEMO_DATE} 10:15:00`,
    position: { lng: 121.5737, lat: 31.2504 },
    oralMeta: {
      speaker: '塔台-席位2',
      transcript: '东航1234，走廊高度1200米保持，预计飞越P05时间10:42'
    },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed'
  },
  // —— gap-A 10:18 ~ 10:35 缺段开始 ——
  {
    id: 'mat-A03',
    type: 'attachment',
    name: '附件 · 雷达扫描图V2.png（晚到）',
    timestamp: `${DEMO_DATE} 11:05:00`,
    position: { lng: 121.5837, lat: 31.2645 },
    attachmentMeta: {
      fileName: '雷达扫描图V2.png',
      fileSize: 4_589_312,
      uploadTime: `${DEMO_DATE} 11:05:22`,
      isLate: true,
      expectedTime: `${DEMO_DATE} 10:20:00`
    },
    fillsGapId: 'gap-A',
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'need_evidence',
    processNote: '晚到45分钟，需说明延迟原因'
  },
  // —— gap-A 结束 ——
  {
    id: 'mat-P05',
    type: 'point',
    name: '航路点 P05 · 走廊中高点',
    timestamp: `${DEMO_DATE} 10:40:00`,
    position: { lng: 121.5937, lat: 31.2704, altitude: 150 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed'
  },
  {
    id: 'mat-A02',
    type: 'attachment',
    name: '附件 · ADS-B轨迹数据.csv',
    timestamp: `${DEMO_DATE} 10:55:00`,
    position: { lng: 121.6037, lat: 31.2754 },
    attachmentMeta: {
      fileName: 'ADS-B轨迹数据.csv',
      fileSize: 890_112,
      uploadTime: `${DEMO_DATE} 10:54:10`,
      isLate: false,
      expectedTime: `${DEMO_DATE} 10:55:00`
    },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'need_evidence'
  },
  {
    id: 'mat-P06',
    type: 'point',
    name: '航路点 P06 · 高度保持点',
    timestamp: `${DEMO_DATE} 10:55:00`,
    position: { lng: 121.6137, lat: 31.2804, altitude: 150 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed'
  },
  {
    id: 'mat-P07',
    type: 'point',
    name: '航路点 P07 · 下降起点',
    timestamp: `${DEMO_DATE} 11:10:00`,
    position: { lng: 121.6337, lat: 31.2904, altitude: 150 },
    caliberHistory: [
      {
        changedAt: `${DEMO_DATE} 11:20:00`,
        changedBy: '空管-口头通知转文字',
        field: 'position.altitude',
        beforeValue: '120',
        afterValue: '150',
        reason: '冲突调配，上升300米保持'
      }
    ],
    hasModifiedCaliber: true,
    processStatus: 'untreated'
  },
  {
    id: 'mat-P08',
    type: 'point',
    name: '航路点 P08 · ILS截获点',
    timestamp: `${DEMO_DATE} 11:25:00`,
    position: { lng: 121.6537, lat: 31.3004, altitude: 90 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'processed'
  },
  {
    id: 'mat-O02',
    type: 'oral',
    name: '口头说明 · 机组报告绕飞',
    timestamp: `${DEMO_DATE} 11:40:00`,
    position: { lng: 121.6637, lat: 31.3054 },
    oralMeta: {
      speaker: '机组-CA1234',
      transcript: '塔台，CA1234前方10公里遇阵雨，请求偏左3海里'
    },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'untreated'
  },
  {
    id: 'mat-P09',
    type: 'point',
    name: '航路点 P09 · 决断高度点',
    timestamp: `${DEMO_DATE} 11:55:00`,
    position: { lng: 121.6737, lat: 31.3104, altitude: 60 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'rejected',
    processNote: '坐标与进近图不符，退回重填'
  },
  // —— gap-B 12:02 ~ 12:08 缺段（无任何材料） ——
  {
    id: 'mat-P10',
    type: 'point',
    name: '航路点 P10 · 跑道接地区',
    timestamp: `${DEMO_DATE} 12:15:00`,
    position: { lng: 121.6937, lat: 31.3204, altitude: 3 },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'untreated'
  },
  {
    id: 'mat-A04',
    type: 'attachment',
    name: '附件 · 着陆QAR数据.zip',
    timestamp: `${DEMO_DATE} 12:35:00`,
    position: { lng: 121.7037, lat: 31.3254 },
    attachmentMeta: {
      fileName: '着陆QAR数据.zip',
      fileSize: 18_302_976,
      uploadTime: `${DEMO_DATE} 12:34:50`,
      isLate: false,
      expectedTime: `${DEMO_DATE} 12:35:00`
    },
    caliberHistory: [],
    hasModifiedCaliber: false,
    processStatus: 'untreated'
  }
];

export const defaultFilter: FilterSnapshot = {
  dateRange: { start: `${DEMO_DATE} 09:30:00`, end: `${DEMO_DATE} 13:00:00` },
  anomalyStatus: ['normal', 'gap', 'late', 'modified'],
  materialTypes: ['point', 'attachment', 'oral'],
  hasModifiedCaliber: null,
  processStatuses: ['untreated', 'processed', 'need_evidence', 'rejected'],
  rawSqlLike: `time BETWEEN '${DEMO_DATE} 09:30' AND '${DEMO_DATE} 13:00' · 含全部异常与口径修改`
};

export function buildAnomalySummary(items: MaterialItem[], gaps: TimelineGap[]): AnomalySummary {
  const byStatus = { untreated: 0, processed: 0, need_evidence: 0, rejected: 0 };
  let lateAttachments = 0, modifiedCalibers = 0;
  items.forEach(m => {
    byStatus[m.processStatus]++;
    if (m.attachmentMeta?.isLate) lateAttachments++;
    if (m.hasModifiedCaliber) modifiedCalibers++;
  });
  return {
    totalMaterials: items.length,
    lateAttachments,
    modifiedCalibers,
    timelineGaps: gaps.length,
    byStatus
  };
}

export function mockQueryMaterials(filter: FilterSnapshot): MaterialQueryResponse {
  const filtered = demoMaterials.filter(m => {
    const t = m.timestamp;
    if (t < filter.dateRange.start || t > filter.dateRange.end) return false;
    if (!filter.materialTypes.includes(m.type)) return false;
    if (filter.hasModifiedCaliber !== null && m.hasModifiedCaliber !== filter.hasModifiedCaliber) return false;
    if (!filter.processStatuses.includes(m.processStatus)) return false;
    const tags: string[] = ['normal'];
    if (m.attachmentMeta?.isLate) tags.push('late');
    if (m.hasModifiedCaliber) tags.push('modified');
    if (!tags.some(tag => filter.anomalyStatus.includes(tag as any))
        && !(m.fillsGapId && filter.anomalyStatus.includes('gap'))) {
      if (filter.anomalyStatus.length < 4) return false;
    }
    return true;
  });

  return {
    code: 0,
    message: 'ok',
    data: {
      items: filtered,
      filterSnapshot: filter,
      anomalySummary: buildAnomalySummary(demoMaterials, demoTimelineGaps),
      timelineGaps: demoTimelineGaps
    },
    timestamp: new Date().toISOString(),
    requestId: 'REQ-' + Math.random().toString(36).slice(2, 10).toUpperCase()
  };
}
