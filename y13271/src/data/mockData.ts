import type {
  BusBay, ResidentFeedback, VersionHistory, ExportBatch, ImportBatch,
  MockData, BadDataFlag, BayStatus, ChangedBy, FilterCriteria, ExportStatistics
} from '../types';

const DISTRICTS = ['陆家嘴街道', '张江镇', '花木街道'];
const ROADS = ['陆家嘴环路', '世纪大道', '张江路', '祖冲之路', '花木路', '锦绣路', '张杨路', '浦东南路', '高科中路', '龙阳路'];

const BAY_NAME_SUFFIXES = [
  '丰和路站', '地铁站', '东方明珠站', '滨江大道站', '银城中路站',
  '金茂大厦站', '环球金融中心站', '上海中心站', '国金中心站', '正大广场站',
  '张江高科站', '金科路站', '广兰路站', '唐镇站', '毕升路站',
  '达尔文路站', '蔡伦路站', '伽利略路站', '牛顿路站', '居里路站',
  '世纪公园站', '龙阳路地铁站', '新国际博览中心站', '芳甸路站', '迎春路站',
  '合欢路站', '民生路站', '源深路站', '桃林路站', '福山路站'
];

const RESIDENT_NAMES = ['张伟', '王芳', '李娜', '刘强', '陈静', '杨勇', '赵敏', '黄磊', '周婷', '吴刚', '徐丽', '孙浩', '马超', '朱琳', '胡军', '郭涛', '何晶', '高翔', '罗敏', '梁波', '宋雪', '唐亮', '许萍', '韩冰', '冯雷'];
const FEEDBACK_CONTENTS = [
  '早高峰8点-9点期间站点容量严重不足，经常有公交车无法进站只能在主路停靠，存在安全隐患。建议扩容至20辆以上。',
  '晚上下班时段等车人群拥挤，港湾内只能停3辆公交，后面的车只能排队，建议拓宽站台。',
  '雨天时站台积水严重，乘客上下车不便，建议改造排水系统并增加遮雨棚。',
  '站点位置设置不合理，离小区出入口太远，老人小孩乘车不便，建议向西迁移50米。',
  '公交线路过多，同一站台有12条线路经过，高峰期车辆拥堵，建议分流到附近站点。',
  '无障碍设施不完善，轮椅通道被共享单车占用，建议加强管理并增设坡道。',
  '候车座椅太少，老年人等车需要站立很久，建议增加至少8个座位。',
  '夜间照明不足，站台漆黑一片，女性乘客等车不安全，建议加装LED灯。',
  '站牌信息模糊不清，部分线路首末班车时间错误，误导乘客，建议重新制作站牌。',
  '垃圾桶太少且清理不及时，站台垃圾堆积异味重，建议增加并每天清运两次。',
  '站点附近黑车揽客现象严重，影响公交车进出站，建议联合执法整治。',
  '非机动车乱停乱放占用人行道，乘客只能走非机动车道，建议规划停车区域。',
  '高峰时段插队现象严重，没有排队引导设施，建议设置排队护栏。',
  '站台地面瓷砖破损多处，雨天容易滑倒，建议尽快修复。',
  '缺少公共厕所，长途等车不方便，建议附近增设流动厕所或指示牌。'
];
const OPERATORS = ['规划师小赵', '现场勘测李工', '数据复核王老师', '系统管理员', '张工'];
const PLACEHOLDER_IMG = (id: number, w = 800, h = 600) => `https://picsum.photos/seed/busbay${id}/${w}/${h}`;

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[rand(0, arr.length - 1)];
const dateStr = (daysAgo: number, h = 9, m = 0) => {
  const d = new Date('2026-06-16');
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, rand(0, 59), 0);
  return d.toISOString();
};
const genId = (prefix: string, n: number) => `${prefix}_${String(n).padStart(3, '0')}`;
const simpleHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).slice(0, 8);
};

function generateBays(): BusBay[] {
  const bays: BusBay[] = [];
  const lngBase = [121.50, 121.58, 121.54];
  const latBase = [31.24, 31.20, 31.22];

  for (let i = 0; i < 30; i++) {
    const districtIdx = i < 10 ? 0 : i < 20 ? 1 : 2;
    const roadIdx = (i * 3 + Math.floor(i / 3)) % 10;
    const statuses: BayStatus[] = ['normal', 'abnormal', 'pending'];
    const fbCount = rand(1, 9);
    const dupCount = rand(0, 3);
    const badCount = i % 7 === 0 ? rand(1, 2) : 0;

    bays.push({
      id: genId('bay', i + 1),
      name: ROADS[roadIdx] + BAY_NAME_SUFFIXES[i],
      road: ROADS[roadIdx],
      district: DISTRICTS[districtIdx],
      lng: +(lngBase[districtIdx] + (Math.random() - 0.5) * 0.08).toFixed(6),
      lat: +(latBase[districtIdx] + (Math.random() - 0.5) * 0.05).toFixed(6),
      designCapacity: [8, 10, 12, 15, 18, 20][rand(0, 5)],
      currentCapacity: 0,
      status: statuses[badCount > 0 ? 1 : fbCount > 5 ? 2 : 0],
      feedbackCount: fbCount,
      duplicateCount: dupCount,
      badDataCount: badCount,
      createdAt: dateStr(rand(30, 90)),
      updatedAt: dateStr(rand(0, 7))
    });
    bays[i].currentCapacity = Math.max(3, bays[i].designCapacity - rand(0, 5));
  }
  return bays;
}

function generateFeedbacks(bays: BusBay[], importBatches: ImportBatch[]): ResidentFeedback[] {
  const feedbacks: ResidentFeedback[] = [];
  const badTypes: BadDataFlag[] = ['missing_name', 'invalid_name', 'missing_phone', 'invalid_phone', 'missing_content', 'short_content', 'no_matching_bay', 'duplicate_content'];
  let fIdx = 0;

  for (let i = 0; i < 120; i++) {
    const batch = importBatches[i % importBatches.length];
    const isBad = i < 15;
    const isDup = i >= 100 && i < 120;
    const bay = isBad && i % 5 === 0 ? null : pick(bays);
    const origBay = bay;

    let name = pick(RESIDENT_NAMES);
    let phone = `138${rand(10000000, 99999999)}`;
    let content = pick(FEEDBACK_CONTENTS);
    const badFlags: BadDataFlag[] = [];

    if (isBad) {
      const t = badTypes[i % 8];
      badFlags.push(t);
      if (t === 'missing_name') name = '';
      if (t === 'invalid_name') name = 'A1@#';
      if (t === 'missing_phone') phone = '';
      if (t === 'invalid_phone') phone = '12345';
      if (t === 'missing_content') content = '';
      if (t === 'short_content') content = '太挤';
      if (t === 'no_matching_bay' && origBay) continue;
      if (t === 'duplicate_content') badFlags.push('duplicate_content');
      if (i >= 8 && i < 15) badFlags.push(pick(badTypes.filter(x => !badFlags.includes(x))));
    }

    let dupOfId: string | undefined;
    let dupOrder: number | undefined;
    if (isDup && feedbacks.length > 5) {
      const target = feedbacks[fIdx % Math.max(1, feedbacks.length - 10)];
      dupOfId = target.id;
      dupOrder = 2 + fIdx % 3;
      content = target.content;
      name = target.residentName;
      phone = target.phone;
      fIdx++;
    }

    feedbacks.push({
      id: genId('fb', i + 1),
      bayId: bay?.id ?? null,
      sourceRow: rand(1, 80),
      sourceFile: batch.fileName,
      residentName: name,
      phone,
      content,
      reportedAt: dateStr(rand(0, 45), rand(7, 21), rand(0, 59)),
      isDuplicate: isDup,
      duplicateOfId: dupOfId,
      duplicateOrder: dupOrder,
      badDataFlags: badFlags,
      rawData: { 序号: i + 1, 姓名: name, 联系电话: phone, 反馈内容: content },
      importBatchId: batch.id,
      createdAt: dateStr(rand(0, 15), rand(9, 18))
    });
  }
  return feedbacks;
}

function generateVersions(bays: BusBay[], feedbacks: ResidentFeedback[]): VersionHistory[] {
  const versions: VersionHistory[] = [];
  const fields = ['currentCapacity', 'status', 'lngLat', 'designCapacity', 'feedbackCount'];
  let vIdx = 0, supIdx = 0;

  for (let i = 0; i < 45; i++) {
    const bay = bays[i % bays.length];
    const isField = i >= 35;
    const fld = fields[i % fields.length];
    const by: ChangedBy = isField ? 'field' : i % 3 === 0 ? 'planner' : 'resident';
    let oldV: string | number | boolean | null | undefined | [number, number];
    let newV: string | number | boolean | null | undefined | [number, number];
    let summary = '';
    let oldLL: [number, number] | undefined, newLL: [number, number] | undefined;
    const atchs: string[] = isField ? [PLACEHOLDER_IMG(++supIdx), PLACEHOLDER_IMG(supIdx + 100, 600, 400), PLACEHOLDER_IMG(supIdx + 200, 1024, 768)] : [];

    if (fld === 'currentCapacity') {
      oldV = bay.currentCapacity;
      newV = Math.max(3, oldV + (i % 2 ? rand(1, 4) : -rand(1, 3)));
      summary = `容量从 ${oldV} 辆调整为 ${newV} 辆（${newV > oldV ? '增加' : '减少'} ${Math.abs(newV - oldV)} 辆）`;
    } else if (fld === 'status') {
      oldV = bay.status;
      const all: BayStatus[] = ['normal', 'abnormal', 'pending'];
      newV = pick(all.filter(s => s !== oldV));
      summary = `状态从「${oldV === 'normal' ? '正常' : oldV === 'abnormal' ? '异常' : '待复核'}」变更为「${newV === 'normal' ? '正常' : newV === 'abnormal' ? '异常' : '待复核'}」`;
    } else if (fld === 'lngLat') {
      oldV = [bay.lng, bay.lat];
      oldLL = [bay.lng, bay.lat];
      newLL = [+(bay.lng + (Math.random() - 0.5) * 0.003).toFixed(6), +(bay.lat + (Math.random() - 0.5) * 0.002).toFixed(6)];
      newV = newLL;
      summary = `地图点位微调（经度 ${oldLL[0]}→${newLL[0]}，纬度 ${oldLL[1]}→${newLL[1]}）`;
    } else if (fld === 'designCapacity') {
      oldV = bay.designCapacity;
      newV = oldV + (i % 2 ? 2 : 0);
      summary = `设计容量从 ${oldV} 辆调整为 ${newV} 辆`;
    } else {
      oldV = bay.feedbackCount;
      newV = oldV + 1;
      summary = `反馈计数更新`;
    }

    versions.push({
      id: genId('ver', i + 1),
      bayId: bay.id,
      fieldName: fld,
      oldValue: oldV,
      newValue: newV,
      changedBy: by,
      changedAt: dateStr(rand(0, 30), rand(8, 20), rand(0, 59)),
      remark: isField ? `现场勘测第${supIdx}号补录，${pick(['附现场照片3张', '含位移前后对比', '容量实测确认'])}` : pick(['居民反馈核实调整', '规划师复核修正', '数据同步更新', '异常数据修正']),
      attachments: atchs,
      sourceFeedbackId: by === 'resident' && feedbacks[vIdx % feedbacks.length]?.id,
      isFieldSupplement: isField,
      changeSummary: summary,
      oldLngLat: oldLL,
      newLngLat: newLL
    });
    vIdx++;
  }
  return versions;
}

function generateImportBatches(): ImportBatch[] {
  const files = ['2026年5月居民反馈_第一批.xlsx', '2026年5月居民反馈_第二批.csv', '2026年6月上旬反馈汇总.xlsx', '浦东新区公交投诉0528.xlsx', '花木街道专项反馈.csv', '陆家嘴重点区域反馈0610.xlsx'];
  return files.map((fn, i) => ({
    id: genId('imp', i + 1),
    fileName: fn,
    importedAt: dateStr([45, 38, 22, 15, 8, 3][i], rand(9, 16)),
    totalRows: [28, 22, 30, 18, 12, 25][i],
    validRows: [25, 20, 26, 16, 10, 22][i],
    badDataRows: [2, 1, 3, 1, 1, 4][i],
    duplicateRows: [1, 1, 1, 1, 1, 4][i],
    importedBy: OPERATORS[i % 3]
  }));
}

function generateExportBatches(bays: BusBay[]): ExportBatch[] {
  const batches: ExportBatch[] = [];
  const filterSets: Partial<FilterCriteria>[] = [
    { districts: [], statuses: [] },
    { districts: ['陆家嘴街道'], statuses: ['abnormal'] },
    { districts: ['张江镇'], roads: ['张江路', '祖冲之路'] },
    { statuses: ['pending', 'abnormal'], hasDuplicate: true },
    { districts: ['花木街道'], keyword: '世纪大道' },
    { hasBadData: true },
    { districts: ['陆家嘴街道', '花木街道'], roads: ['世纪大道'] },
    { statuses: ['normal'], keyword: '' }
  ];

  for (let i = 0; i < 8; i++) {
    const fs: FilterCriteria = {
      districts: filterSets[i].districts ?? [],
      roads: filterSets[i].roads ?? [],
      statuses: filterSets[i].statuses ?? [],
      hasDuplicate: filterSets[i].hasDuplicate ?? null,
      hasBadData: filterSets[i].hasBadData ?? null,
      dateFrom: i % 2 ? dateStr(30).slice(0, 10) : null,
      dateTo: i % 2 ? dateStr(0).slice(0, 10) : null,
      keyword: filterSets[i].keyword ?? ''
    };
    const filtered = bays.filter(b =>
      (fs.districts.length === 0 || fs.districts.includes(b.district)) &&
      (fs.roads.length === 0 || fs.roads.includes(b.road)) &&
      (fs.statuses.length === 0 || fs.statuses.includes(b.status)) &&
      (fs.hasDuplicate === null || (fs.hasDuplicate ? b.duplicateCount > 0 : b.duplicateCount === 0)) &&
      (fs.hasBadData === null || (fs.hasBadData ? b.badDataCount > 0 : b.badDataCount === 0)) &&
      (fs.keyword === '' || b.name.includes(fs.keyword) || b.road.includes(fs.keyword))
    );
    const stats: ExportStatistics = {
      total: filtered.length,
      abnormal: filtered.filter(b => b.status === 'abnormal').length,
      normal: filtered.filter(b => b.status === 'normal').length,
      pending: filtered.filter(b => b.status === 'pending').length,
      duplicates: filtered.reduce((s, b) => s + b.duplicateCount, 0),
      badData: filtered.reduce((s, b) => s + b.badDataCount, 0)
    };
    const bayIds = filtered.map(b => b.id).sort();
    batches.push({
      id: genId('exp', i + 1),
      generatedAt: dateStr([42, 35, 28, 20, 12, 7, 2, 0][i], rand(10, 17), rand(0, 59)),
      filterCriteria: fs,
      statistics: stats,
      snapshotHash: simpleHash(JSON.stringify({ fs, bayIds })),
      bayIdsSnapshot: bayIds,
      generatedBy: OPERATORS[i % 4],
      remark: ['月度常规导出', '陆家嘴异常站点专项', '张江片区站点汇总', '异常重复数据导出', '花木街道世纪大道沿线', '坏数据批次导出', '重点街道联合报表', '正常站点存档导出'][i]
    });
  }
  return batches;
}

export function createMockData(): MockData {
  const bays = generateBays();
  const importBatches = generateImportBatches();
  const feedbacks = generateFeedbacks(bays, importBatches);
  const versions = generateVersions(bays, feedbacks);
  const exportBatches = generateExportBatches(bays);
  return { bays, feedbacks, versions, exportBatches, importBatches };
}
