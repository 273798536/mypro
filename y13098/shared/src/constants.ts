export const RECORD_TYPE_LABELS: Record<string, string> = {
  normal: '正常记录',
  abnormal: '异常记录',
  temporary: '临时说明'
};

export const STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已驳回',
  modified: '已修改'
};

export const MATERIAL_TYPE_LABELS: Record<string, string> = {
  photo: '巡检照片',
  document: '文档材料',
  note: '人工备注',
  screenshot: '截图说明'
};

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  create: '创建记录',
  update: '更新内容',
  confirm: '人工确认',
  reject: '驳回记录',
  status_change: '状态变更'
};

export const STORAGE_KEYS = {
  FILTER_CRITERIA: 'route_corridor_filter_criteria',
  ACTIVE_TAB: 'route_corridor_active_tab'
};

export const DEFAULT_PAGE_SIZE = 20;
