import type { GisPoint, PublicListItem, Complaint, ConflictGroup, MergeableComplaintGroup } from '@/types';

export const detectConflicts = (points: GisPoint[]): ConflictGroup[] => {
  const streetGroups = new Map<string, GisPoint[]>();
  points.forEach((point) => {
    const existing = streetGroups.get(point.street) || [];
    streetGroups.set(point.street, [...existing, point]);
  });
  const conflictGroups: ConflictGroup[] = [];
  streetGroups.forEach((groupPoints, street) => {
    if (groupPoints.length > 1) {
      conflictGroups.push({ street, points: groupPoints });
    }
  });
  return conflictGroups;
};

export const applyConflictMarkers = (points: GisPoint[]): GisPoint[] => {
  const conflictGroups = detectConflicts(points);
  const conflictPointIds = new Set<string>();
  conflictGroups.forEach((group) => {
    group.points.forEach((p) => conflictPointIds.add(p.id));
  });
  return points.map((point) => {
    if (!conflictPointIds.has(point.id)) {
      return { ...point, status: 'normal' as const, conflictWith: undefined };
    }
    const group = conflictGroups.find((g) => g.street === point.street);
    const conflictIds = group?.points.filter((p) => p.id !== point.id).map((p) => p.id).join(',');
    return {
      ...point,
      status: 'conflict' as const,
      conflictWith: conflictIds,
      updatedAt: new Date().toISOString(),
    };
  });
};

export const detectOverCapacity = (items: PublicListItem[]): PublicListItem[] => {
  const threshold = 1.1;
  return items.map((item) => {
    if (item.status === 'complaint') return item;
    const isOver = item.actualCount > item.capacity * threshold;
    if (isOver) {
      return { ...item, status: 'over_capacity' as const };
    }
    if (item.status === 'over_capacity') {
      return { ...item, status: 'normal' as const };
    }
    return item;
  });
};

export const getOverCapacityPercentage = (item: PublicListItem): number => {
  if (item.capacity === 0) return 0;
  return Math.round(((item.actualCount - item.capacity) / item.capacity) * 100);
};

export const detectMergeableComplaints = (complaints: Complaint[]): MergeableComplaintGroup[] => {
  const groups = new Map<string, Complaint[]>();
  complaints
    .filter((c) => c.status === 'pending')
    .forEach((complaint) => {
      const key = `${complaint.street}||${complaint.listItemId}`;
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, complaint]);
    });
  const mergeableGroups: MergeableComplaintGroup[] = [];
  groups.forEach((groupComplaints, key) => {
    if (groupComplaints.length > 1) {
      const [first] = groupComplaints;
      mergeableGroups.push({
        key,
        street: first.street,
        listItemId: first.listItemId,
        complaints: groupComplaints,
      });
    }
  });
  return mergeableGroups;
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    normal: '正常',
    abnormal: '异常',
    over_capacity: '容量超限',
    complaint: '有投诉',
    conflict: '冲突',
    incomplete: '数据不全',
    pending: '待处理',
    merged: '已归并',
    resolved: '已解决',
    confirm: '确认',
    reject: '驳回',
    merge: '归并',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    normal: 'bg-success-500',
    abnormal: 'bg-warning-500',
    over_capacity: 'bg-danger-500',
    complaint: 'bg-complaint-500',
    conflict: 'bg-danger-500',
    incomplete: 'bg-warning-500',
    pending: 'bg-warning-500',
    merged: 'bg-complaint-500',
    resolved: 'bg-success-500',
  };
  return colors[status] || 'bg-gray-500';
};

export const getStatusBgClass = (status: string): string => {
  const classes: Record<string, string> = {
    normal: 'bg-success-50 border-success-200',
    abnormal: 'bg-warning-50 border-warning-200',
    over_capacity: 'bg-danger-50 border-danger-200 bg-striped-danger',
    complaint: 'bg-complaint-50 border-complaint-200',
    conflict: 'bg-danger-50 border-danger-200',
    incomplete: 'bg-warning-50 border-warning-200',
  };
  return classes[status] || 'bg-gray-50 border-gray-200';
};
