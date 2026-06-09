import type {
  ConnectionRecord,
  ReviewStatus,
  ValidationIssue,
} from '@/types';

export const statusColor = {
  normal: '#34D399',
  pending: '#A78BFA',
  invalid: '#F87171',
} as const;

export const statusLabel = {
  normal: '顺利',
  pending: '待确认',
  invalid: '坏数据',
} as const;

export const coordinateLabel = {
  MNI: 'MNI152 标准空间',
  Talairach: 'Talairach 空间',
  Native: 'Native 原生空间（未标准化）',
} as const;

export const severityColor = {
  low: '#22D3EE',
  medium: '#F59E0B',
  high: '#F87171',
} as const;

export const reviewStatusColor = {
  pass: '#34D399',
  warning: '#F59E0B',
  fail: '#F87171',
} as const;

export const reviewStatusLabel = {
  pass: '通过',
  warning: '待处理',
  fail: '失败',
} as const;

export const validationTypeLabel = {
  coordinate_mismatch: '坐标系混用',
  timestamp_desync: '时间轴不同步',
  parameter_outlier: '参数越界',
} as const;

export const checkTimeParamsConsistent = (
  records: ConnectionRecord[],
): { status: ReviewStatus; detail: string } => {
  const systems = new Set(records.map((r) => r.coordinateSystem));
  const times = new Set(records.map((r) => r.acquisitionTime));

  if (systems.size === 1 && times.size === 1) {
    return {
      status: 'pass',
      detail: `所有 ${records.length} 条记录坐标系（${[...systems][0]}）与采集时间点（${[
        ...times,
      ][0]}）完全一致。`,
    };
  }
  if (systems.size > 1) {
    return {
      status: 'fail',
      detail: `检测到 ${systems.size} 种坐标系混用：${[...systems]
        .map((s) => coordinateLabel[s])
        .join('、')}。批次内必须统一到同一标准空间。`,
    };
  }
  return {
    status: 'warning',
    detail: `检测到 ${times.size} 个采集时间点：${[...times].join(
      '、',
    )}。请确认是否属于同一研究阶段。`,
  };
};

export const checkScreenshotChecklist = (
  viewpointsCount: number,
  records: ConnectionRecord[],
): { status: ReviewStatus; detail: string } => {
  const pendingCount = records.filter((r) => r.status !== 'normal').length;
  const required = Math.max(2, pendingCount);

  if (viewpointsCount >= required) {
    return {
      status: 'pass',
      detail: `已保存 ${viewpointsCount} 个视角截图，满足至少 ${required} 个的复核要求。`,
    };
  }
  if (viewpointsCount > 0) {
    return {
      status: 'warning',
      detail: `已保存 ${viewpointsCount} 个视角，建议至少保存 ${required} 个（含待确认/坏数据各至少 1 张）。`,
    };
  }
  return {
    status: 'fail',
    detail: '尚未保存任何视角截图。评审沟通需要截图作为依据，请至少保存关键视角。',
  };
};

export const checkTimelineSynchronized = (
  records: ConnectionRecord[],
): { status: ReviewStatus; detail: string } => {
  const issues = records.filter((r) =>
    r.validationIssues.some((v) => v.type === 'timestamp_desync'),
  );
  if (issues.length === 0) {
    return {
      status: 'pass',
      detail: `所有 ${records.length} 条记录采集时间轴与批次一致。`,
    };
  }
  return {
    status: 'fail',
    detail: `${issues.length} 条记录时间轴不同步（${issues
      .map((r) => r.id)
      .join('、')}），将导致行为学匹配失败。`,
  };
};

export const summarizeBlockingIssues = (
  records: ConnectionRecord[],
): ValidationIssue[] => {
  return records.flatMap((r) =>
    r.validationIssues.filter((v) => v.severity === 'error'),
  );
};
