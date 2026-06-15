const BAY_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVIEW: 'needs_review',
  COORDINATE_MISMATCH: 'coordinate_mismatch',
  NAME_MISMATCH: 'name_mismatch',
  PHOTO_SUPPLEMENTED: 'photo_supplemented'
};

const BAY_STATUS_LABEL = {
  [BAY_STATUS.DRAFT]: '草稿',
  [BAY_STATUS.PENDING]: '待审核',
  [BAY_STATUS.APPROVED]: '已通过',
  [BAY_STATUS.REJECTED]: '未通过',
  [BAY_STATUS.NEEDS_REVIEW]: '需复核',
  [BAY_STATUS.COORDINATE_MISMATCH]: '坐标偏移',
  [BAY_STATUS.NAME_MISMATCH]: '名称不一致',
  [BAY_STATUS.PHOTO_SUPPLEMENTED]: '已补录照片'
};

const BAY_STATUS_TYPE = {
  [BAY_STATUS.DRAFT]: 'normal',
  [BAY_STATUS.PENDING]: 'warning',
  [BAY_STATUS.APPROVED]: 'success',
  [BAY_STATUS.REJECTED]: 'error',
  [BAY_STATUS.NEEDS_REVIEW]: 'warning',
  [BAY_STATUS.COORDINATE_MISMATCH]: 'error',
  [BAY_STATUS.NAME_MISMATCH]: 'error',
  [BAY_STATUS.PHOTO_SUPPLEMENTED]: 'info'
};

const MATERIAL_SOURCE = {
  GIS: 'gis',
  MANUAL: 'manual',
  FIELD: 'field'
};

const MATERIAL_SOURCE_LABEL = {
  [MATERIAL_SOURCE.GIS]: 'GIS点位',
  [MATERIAL_SOURCE.MANUAL]: '人工录入',
  [MATERIAL_SOURCE.FIELD]: '现场补录'
};

const HISTORY_ACTION = {
  CREATE: 'create',
  STATUS_CHANGE: 'status_change',
  MATERIAL_ADD: 'material_add',
  MATERIAL_REMOVE: 'material_remove',
  PHOTO_ADD: 'photo_add',
  REMARK_UPDATE: 'remark_update',
  REPORT_EXPORT: 'report_export',
  DATA_RESET: 'data_reset'
};

const HISTORY_ACTION_LABEL = {
  [HISTORY_ACTION.CREATE]: '创建记录',
  [HISTORY_ACTION.STATUS_CHANGE]: '状态变更',
  [HISTORY_ACTION.MATERIAL_ADD]: '添加材料',
  [HISTORY_ACTION.MATERIAL_REMOVE]: '移除材料',
  [HISTORY_ACTION.PHOTO_ADD]: '补录照片',
  [HISTORY_ACTION.REMARK_UPDATE]: '更新备注',
  [HISTORY_ACTION.REPORT_EXPORT]: '导出报告',
  [HISTORY_ACTION.DATA_RESET]: '数据重置'
};

module.exports = {
  BAY_STATUS,
  BAY_STATUS_LABEL,
  BAY_STATUS_TYPE,
  MATERIAL_SOURCE,
  MATERIAL_SOURCE_LABEL,
  HISTORY_ACTION,
  HISTORY_ACTION_LABEL
};
