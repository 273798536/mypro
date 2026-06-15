import {
  AppDataState,
  ChangeLog,
  DEFAULT_FILTER,
  Note,
  Screenshot,
  SplitRecord,
  TraceNode,
  TrackVersion,
} from '@/types';
import { uid } from '@/utils/storage';

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
const daysLater = (n: number) => new Date(now + n * 86400000).toISOString();

export function generateSampleData(): AppDataState {
  const tv1: TrackVersion = {
    id: uid('tv'),
    trackName: '夜航西飞',
    versionTag: 'v1.0',
    isLatest: false,
    uploadedAt: daysAgo(30),
    uploadedBy: '李制作人',
    changeSummary: '初始版本：词曲作者、原演唱者信息录入',
    snapshot: {
      composer: '陈墨',
      lyricist: '林远',
      originalArtist: '周野',
      workId: 'OP-2023-0412',
      notes: '首次提交，合同扫描件见共享盘',
    },
  };
  const tv2: TrackVersion = {
    id: uid('tv'),
    trackName: '夜航西飞',
    versionTag: 'v1.1',
    isLatest: false,
    uploadedAt: daysAgo(12),
    uploadedBy: '李制作人',
    changeSummary: '修正作词人笔误（林远→林愿），更新工作编号',
    snapshot: {
      composer: '陈墨',
      lyricist: '林愿',
      originalArtist: '周野',
      workId: 'OP-2023-0412-R1',
      notes: '法务反馈修正作词人姓名拼写',
    },
  };
  const tv3: TrackVersion = {
    id: uid('tv'),
    trackName: '夜航西飞',
    versionTag: 'v1.2',
    isLatest: true,
    uploadedAt: daysAgo(3),
    uploadedBy: '琴房前台小温',
    changeSummary: '追加原演唱者授权范围，增加附属曲谱版本',
    snapshot: {
      composer: '陈墨',
      lyricist: '林愿',
      originalArtist: '周野',
      workId: 'OP-2023-0412-R2',
      notes: '授权范围扩展至海外发行渠道',
    },
  };
  const tv4: TrackVersion = {
    id: uid('tv'),
    trackName: '旧日慢板',
    versionTag: 'v1.0',
    isLatest: true,
    uploadedAt: daysAgo(20),
    uploadedBy: '琴房前台小温',
    changeSummary: '初始版本',
    snapshot: {
      composer: '顾深',
      lyricist: '顾深',
      originalArtist: '苏青',
      workId: 'OP-2024-0017',
      notes: '词曲同一人，授权合同有效期三年',
    },
  };
  const tv5: TrackVersion = {
    id: uid('tv'),
    trackName: '灯塔与海',
    versionTag: 'v1.0',
    isLatest: true,
    uploadedAt: daysAgo(45),
    uploadedBy: '李制作人',
    changeSummary: '初始版本',
    snapshot: {
      composer: '沈川',
      lyricist: '许白',
      originalArtist: '韩琦',
      workId: 'OP-2022-1105',
      notes: '长期授权曲目',
    },
  };
  const tv6: TrackVersion = {
    id: uid('tv'),
    trackName: '未寄出的信',
    versionTag: 'v1.0',
    isLatest: true,
    uploadedAt: daysAgo(60),
    uploadedBy: '李制作人',
    changeSummary: '初始版本',
    snapshot: {
      composer: '江迟',
      lyricist: '江迟',
      originalArtist: '江迟',
      workId: 'OP-2022-0888',
      notes: '独立音乐人自授权',
    },
  };

  const trackVersions = [tv1, tv2, tv3, tv4, tv5, tv6];

  const sr1: SplitRecord = {
    id: uid('sr'),
    trackVersionId: tv2.id,
    performanceName: '夜航·春季场 第3场',
    performanceDate: daysAgo(10),
    artistRatio: 45,
    venueRatio: 35,
    distributionRatio: 20,
    authExpiryDate: daysLater(120),
    status: 'conflicted',
    humanReason: '',
  };
  const sr2: SplitRecord = {
    id: uid('sr'),
    trackVersionId: tv3.id,
    performanceName: '夜航·春季场 第4场',
    performanceDate: daysAgo(8),
    artistRatio: 45,
    venueRatio: 35,
    distributionRatio: 20,
    authExpiryDate: daysLater(120),
    status: 'aligned',
    humanReason: '',
    confirmedBy: '琴房前台小温',
    confirmedAt: daysAgo(7),
  };
  const sr3: SplitRecord = {
    id: uid('sr'),
    trackVersionId: tv4.id,
    performanceName: '旧日民谣夜 专场',
    performanceDate: daysAgo(5),
    artistRatio: 50,
    venueRatio: 30,
    distributionRatio: 20,
    authExpiryDate: daysAgo(2),
    status: 'suspended',
    humanReason: '',
  };
  const sr4: SplitRecord = {
    id: uid('sr'),
    trackVersionId: tv5.id,
    performanceName: '深蓝巡回·上海站',
    performanceDate: daysAgo(2),
    artistRatio: 40,
    venueRatio: 40,
    distributionRatio: 20,
    authExpiryDate: daysLater(365),
    status: 'missing_note',
    humanReason: '',
  };
  const sr5: SplitRecord = {
    id: uid('sr'),
    trackVersionId: tv6.id,
    performanceName: '江迟不插电 Live',
    performanceDate: daysAgo(1),
    artistRatio: 60,
    venueRatio: 25,
    distributionRatio: 15,
    authExpiryDate: daysLater(720),
    status: 'pending',
    humanReason: '',
  };
  const sr6: SplitRecord = {
    id: uid('sr'),
    trackVersionId: tv3.id,
    performanceName: '春浪音乐节 主舞台',
    performanceDate: daysAgo(1),
    artistRatio: 42,
    venueRatio: 38,
    distributionRatio: 20,
    authExpiryDate: daysLater(120),
    status: 'pending',
    humanReason: '',
  };

  const splitRecords = [sr1, sr2, sr3, sr4, sr5, sr6];

  const n1: Note = {
    id: uid('nt'),
    splitRecordId: sr1.id,
    sourceType: 'old_version',
    content: '从 v1.0 曲目表中继承的旧备注：春季场按老合同 45/35/20 执行',
    createdBy: '系统导入',
    createdAt: daysAgo(10),
  };
  const n2: Note = {
    id: uid('nt'),
    splitRecordId: sr2.id,
    sourceType: 'manual_add',
    content: '已与法务核对 v1.2 的授权范围，确认海外发行分成包含在内',
    createdBy: '琴房前台小温',
    createdAt: daysAgo(7),
  };
  const n3: Note = {
    id: uid('nt'),
    splitRecordId: sr4.id,
    sourceType: 'verbal',
    content: '韩琦经纪人电话告知：40/40/20 分成是本次上海站特批比例，后续场次回归 45/35/20',
    createdBy: '琴房前台小温',
    createdAt: daysAgo(2),
  };

  const notes = [n1, n2, n3];

  const screenshots: Screenshot[] = [
    {
      id: uid('ss'),
      splitRecordId: sr2.id,
      description: '法务邮件截图：确认 v1.2 授权范围',
      dataUrl:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>
            <rect width='100%' height='100%' fill='#E4E9F2'/>
            <rect x='16' y='16' width='288' height='24' fill='#C6CFE0'/>
            <rect x='16' y='48' width='240' height='12' fill='#98A6C2'/>
            <rect x='16' y='68' width='260' height='12' fill='#98A6C2'/>
            <rect x='16' y='88' width='220' height='12' fill='#98A6C2'/>
            <rect x='16' y='120' width='120' height='36' rx='6' fill='#4A8C6E'/>
            <text x='76' y='143' fill='white' font-size='14' text-anchor='middle' font-family='sans-serif'>授权确认</text>
          </svg>`
        ),
      createdAt: daysAgo(7),
    },
  ];

  const changeLogs: ChangeLog[] = [
    {
      id: uid('cl'),
      splitRecordId: sr2.id,
      fieldName: 'status',
      oldValue: 'pending',
      newValue: 'aligned',
      changedBy: '琴房前台小温',
      changedAt: daysAgo(7),
      changeReason: '核对 v1.2 授权范围后人工确认',
    },
    {
      id: uid('cl'),
      splitRecordId: sr2.id,
      fieldName: 'trackVersionId',
      oldValue: tv2.id,
      newValue: tv3.id,
      changedBy: '琴房前台小温',
      changedAt: daysAgo(7),
      changeReason: '升级至最新版曲目表 v1.2',
    },
    {
      id: uid('cl'),
      splitRecordId: sr1.id,
      fieldName: 'status',
      oldValue: 'pending',
      newValue: 'conflicted',
      changedBy: '系统',
      changedAt: daysAgo(3),
      changeReason: '检测到引用的 v1.1 曲目表已非最新版',
    },
    {
      id: uid('cl'),
      splitRecordId: sr3.id,
      fieldName: 'status',
      oldValue: 'pending',
      newValue: 'suspended',
      changedBy: '系统',
      changedAt: daysAgo(2),
      changeReason: '授权到期自动挂起',
    },
  ];

  const traceNodes: TraceNode[] = [
    {
      id: uid('tn'),
      splitRecordId: sr1.id,
      influenceType: 'old_version',
      description: '初始数据来源于 v1.0 曲目表，由系统批量导入',
      orderIndex: 1,
    },
    {
      id: uid('tn'),
      splitRecordId: sr1.id,
      influenceType: 'system_check',
      description: '系统检测到当前曲目已发布 v1.2，本记录仍使用 v1.1',
      orderIndex: 2,
    },
    {
      id: uid('tn'),
      splitRecordId: sr1.id,
      influenceType: 'manual_add',
      description: '旧版标记为「版本冲突」状态，等待人工处理',
      orderIndex: 3,
    },
    {
      id: uid('tn'),
      splitRecordId: sr2.id,
      influenceType: 'manual_add',
      description: '人工切换到 v1.2 最新版曲目表',
      orderIndex: 1,
    },
    {
      id: uid('tn'),
      splitRecordId: sr2.id,
      influenceType: 'manual_add',
      description: '上传法务邮件截图并补录备注',
      orderIndex: 2,
    },
    {
      id: uid('tn'),
      splitRecordId: sr2.id,
      influenceType: 'system_check',
      description: '比例合计 45+35+20=100，校验通过',
      orderIndex: 3,
    },
    {
      id: uid('tn'),
      splitRecordId: sr2.id,
      influenceType: 'manual_add',
      description: '琴房前台小温确认对齐',
      orderIndex: 4,
    },
    {
      id: uid('tn'),
      splitRecordId: sr3.id,
      influenceType: 'system_check',
      description: '授权已到期（2天前），自动变更为挂起状态',
      orderIndex: 1,
    },
    {
      id: uid('tn'),
      splitRecordId: sr4.id,
      influenceType: 'verbal',
      description: '经纪人电话口头告知：上海站特批 40/40/20',
      orderIndex: 1,
    },
    {
      id: uid('tn'),
      splitRecordId: sr4.id,
      influenceType: 'system_check',
      description: '缺少文字版确认材料，标为「备注待补」',
      orderIndex: 2,
    },
  ];

  return {
    trackVersions,
    splitRecords,
    notes,
    screenshots,
    changeLogs,
    traceNodes,
    filterState: { ...DEFAULT_FILTER, savedAt: '' },
    currentUser: '琴房前台小温',
    sampleLoaded: true,
  };
}
