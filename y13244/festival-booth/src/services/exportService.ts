import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { BoothSettlement, ExceptionQueueItem, Festival } from '../types';
import {
  settlementStore, exceptionStore, festivalStore,
  boothStore, trackStore, studentStore, progressStore
} from './storage';

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  aligned: '已对齐',
  exception: '有异常',
  manual_review: '待人工复核',
  confirmed: '已确认',
};

const EXCEPTION_STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  investigating: '处理中',
  resolved: '已解决',
  pending_evidence: '等补证据',
};

const SEVERITY_LABEL: Record<string, string> = {
  low: '轻度',
  medium: '中度',
  high: '严重',
};

const EXCEPTION_TYPE_LABEL: Record<string, string> = {
  revenue_mismatch: '营收对不上',
  missing_evidence: '缺证据材料',
  student_count_mismatch: '人数对不上',
  fee_calculation_error: '费用算错了',
  manual_adjustment: '人工改判记录',
  data_incomplete: '数据不完整',
};

function formatFilterSnapshot(snapshot: Record<string, any>): string {
  if (!snapshot || Object.keys(snapshot).length === 0) return '无筛选条件';
  const parts: string[] = [];
  Object.entries(snapshot).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      parts.push(`${k}: ${v.join(' ~ ')}`);
    } else if (v !== undefined && v !== null && v !== '') {
      parts.push(`${k}: ${v}`);
    }
  });
  return parts.join(' | ') || '无筛选条件';
}

export function exportFestivalSettlementToExcel(
  festivalId: string,
  visibleSettlementIds: string[],
  filterSnapshot: Record<string, any>,
  options: { includeProgress?: boolean } = {}
): void {
  const festival = festivalStore.get();
  const allSettlements = settlementStore.getByFestivalId(festivalId);
  const settlements = visibleSettlementIds.length > 0
    ? allSettlements.filter(s => visibleSettlementIds.includes(s.id))
    : allSettlements;
  const allExceptions = exceptionStore.getByFestivalId(festivalId);

  const timestamp = dayjs().format('YYYYMMDD_HHmmss');
  const fileName = `音乐节摊位分账对齐_${festival.name}_${timestamp}.xlsx`;

  const wb = XLSX.utils.book_new();

  const metaData = [
    ['导出说明'],
    ['导出时间', dayjs().format('YYYY-MM-DD HH:mm:ss')],
    ['音乐节', festival.name],
    ['举办日期', festival.date],
    ['场地', festival.venue],
    ['授权到期日', festival.authorizationExpiry],
    ['导出时筛选口径', formatFilterSnapshot(filterSnapshot)],
    ['注意事项', '所有金额与系统屏幕显示一致；异常原因已附在第3个Sheet；人工改判记录标红'],
    [],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, wsMeta, '0_导出说明');

  const settlementHeader = [
    '分账编号', '曲目名称', '摊位名称', '摊位类型', '运营方',
    '实际营收(元)', '系统计算分账(元)', '实际分账(元)', '差额(元)',
    '学生分成(元)', '老师分成(元)', '摊位分成(元)', '平台分成(元)',
    '对齐状态', '分账日期', '参演学生', '备注'
  ];
  const settlementRows: any[][] = settlements.map(s => {
    const track = trackStore.getById(s.trackId);
    const booth = boothStore.getById(s.boothId);
    const students = track?.studentIds.map(id => studentStore.getById(id)?.name).filter(Boolean).join('、') || '';
    const diff = (s.actualShare - s.systemCalculatedShare).toFixed(2);
    const statusLabel = STATUS_LABEL[s.status] || s.status;
    const note = (s.status === 'manual_review' || s.status === 'confirmed')
      ? '【人工改判】' + (s.status === 'confirmed' ? '已确认' : '待确认')
      : '';

    return [
      s.id,
      track?.name || '',
      booth?.name || '',
      booth?.type || '',
      s.operatorName,
      s.actualRevenue.toFixed(2),
      s.systemCalculatedShare.toFixed(2),
      s.actualShare.toFixed(2),
      diff,
      s.studentShare.toFixed(2),
      s.teacherShare.toFixed(2),
      s.boothShare.toFixed(2),
      s.platformShare.toFixed(2),
      statusLabel,
      s.settlementDate,
      students,
      note,
    ];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([settlementHeader, ...settlementRows]);
  XLSX.utils.book_append_sheet(wb, ws1, '1_摊位分账明细');

  const exceptionHeader = [
    '异常编号', '关联分账编号', '异常类型', '严重程度', '当前状态',
    '人话版异常原因（给演出/发行同事看）', '下一步操作',
    '是否需要人工确认', '是否是人工改判',
    '要求补齐的材料', '已提交的材料',
    '报告人', '报告时间', '处理人',
    '筛选口径快照',
  ];
  const exceptionRows: any[][] = allExceptions.map(e => {
    return [
      e.id,
      e.settlementId,
      EXCEPTION_TYPE_LABEL[e.type] || e.type,
      SEVERITY_LABEL[e.severity],
      EXCEPTION_STATUS_LABEL[e.status] || e.status,
      e.humanReason,
      e.nextStep,
      e.needsManualConfirm ? '是' : '否',
      e.isManualOverride ? '是（会标红）' : '否',
      (e.evidenceRequired || []).join('；'),
      (e.evidenceProvided || []).join('；') || '（暂无）',
      e.reportedBy,
      e.reportedAt,
      e.assignedTo || '（暂未分配）',
      formatFilterSnapshot(e.filterSnapshot),
    ];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([exceptionHeader, ...exceptionRows]);
  XLSX.utils.book_append_sheet(wb, ws2, '2_异常队列清单');

  if (options.includeProgress) {
    const progressHeader = [
      '学生姓名', '年级', '乐器', '综合进步(分)',
      '进步最明显的维度', '目前最需要加强的维度',
      '老师观察到的亮点', '林姐评语',
    ];
    const allStudents = studentStore.getAll();
    const progressRows: any[][] = allStudents.map(student => {
      const latest = progressStore.getLatestByStudentId(student.id);
      if (!latest) {
        return [student.name, student.grade, student.instrument, '暂无', '暂无', '暂无', '暂无', '暂无'];
      }
      const sorted = [...latest.dimensions].sort(
        (a, b) => (b.currentScore - b.previousScore) - (a.currentScore - a.previousScore)
      );
      const top = sorted.slice(0, 2).map(d => `${d.name}(+${d.currentScore - d.previousScore})`).join('、');
      const lowest = [...latest.dimensions]
        .sort((a, b) => a.currentScore - b.currentScore)
        .slice(0, 2)
        .map(d => `${d.name}(${d.currentScore}分)`)
        .join('、');
      return [
        student.name,
        student.grade,
        student.instrument,
        latest.overallChange > 0 ? '+' + latest.overallChange : latest.overallChange,
        top,
        lowest,
        latest.highlights.join('；'),
        latest.teacherComment,
      ];
    });
    const ws3 = XLSX.utils.aoa_to_sheet([progressHeader, ...progressRows]);
    XLSX.utils.book_append_sheet(wb, ws3, '3_学生进步清单');
  }

  const schedulerHeader = [
    '音乐节名称', '已处理分账数', '总分账数',
    '待补证据数', '异常数', '整体状态', '最近运行时间',
  ];
  const schedulerRows: any[][] = [[
    festival.name,
    settlements.filter(s => s.status === 'aligned' || s.status === 'confirmed').length,
    settlements.length,
    allExceptions.filter(e => e.status === 'pending_evidence').length,
    allExceptions.filter(e => e.status !== 'resolved').length,
    allExceptions.filter(e => e.status !== 'resolved').length > 0 ? '需要关注' : '全部就绪',
    dayjs().format('YYYY-MM-DD HH:mm:ss'),
  ]];
  const ws4 = XLSX.utils.aoa_to_sheet([schedulerHeader, ...schedulerRows]);
  XLSX.utils.book_append_sheet(wb, ws4, '4_排班视角总览');

  XLSX.writeFile(wb, fileName);
}

export function exportSchedulerChecklist(festivalId: string): void {
  const festival = festivalStore.get();
  const allSettlements = settlementStore.getByFestivalId(festivalId);
  const allExceptions = exceptionStore.getByFestivalId(festivalId);
  const booths = boothStore.getAll();

  const timestamp = dayjs().format('YYYYMMDD_HHmmss');
  const fileName = `排班同事用_${festival.name}_分账处理检查清单_${timestamp}.xlsx`;

  const wb = XLSX.utils.book_new();

  const headers = [
    '序号', '摊位名称', '运营方', '曲目/场次', '分账状态',
    '是否需要补证据', '补什么材料',
    '是否已处理', '处理人签字栏', '备注',
  ];
  const rows: any[][] = allSettlements.map((s, idx) => {
    const booth = boothStore.getById(s.boothId);
    const track = trackStore.getById(s.trackId);
    const pendingEx = allExceptions.filter(
      e => e.settlementId === s.id && e.status !== 'resolved'
    );
    const needEvidence = pendingEx.some(e => e.status === 'pending_evidence');
    const evidenceList = pendingEx
      .flatMap(e => (e.evidenceRequired || []).filter(r => !(e.evidenceProvided || []).includes(r)))
      .join('；');
    const isDone = s.status === 'aligned' || s.status === 'confirmed';
    return [
      idx + 1,
      booth?.name || '',
      s.operatorName,
      track?.name || '',
      STATUS_LABEL[s.status] || s.status,
      needEvidence ? '是' : '否',
      evidenceList || '（无需）',
      isDone ? '✅ 已处理' : '⏳ 待处理',
      '',
      pendingEx.map(e => EXCEPTION_TYPE_LABEL[e.type] + ': ' + e.humanReason).join('；'),
    ];
  });

  const summary = [
    ['音乐节摊位分账处理检查清单'],
    ['音乐节', festival.name],
    ['日期', festival.date],
    ['打印时间', dayjs().format('YYYY-MM-DD HH:mm:ss')],
    ['说明', '请在彩排进场前确认每一行的处理状态，需要补证据的让对应同事尽快补齐。全部打勾后签字。'],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...summary, headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, '分账处理检查清单');

  XLSX.writeFile(wb, fileName);
}
