export const STORAGE_KEYS = {
  AUTH: 'parking_auth',
  LICENSE_PLATES: 'parking_license_plates',
  MONTHLY_CARDS: 'parking_monthly_cards',
  TEMP_PARKING: 'parking_temp_parking',
  DISCOUNTS: 'parking_discounts',
  RENEWAL_RECORDS: 'parking_renewal_records',
  BAD_ROWS: 'parking_bad_rows',
  IMPORT_SESSIONS: 'parking_import_sessions',
  EXPORT_RECORDS: 'parking_export_records',
};

export const CARD_TYPE_LABELS: Record<string, string> = {
  standard: '标准卡',
  vip: 'VIP卡',
  employee: '员工卡',
};

export const CARD_STATUS_LABELS: Record<string, string> = {
  active: '有效',
  expired: '已过期',
  suspended: '已停用',
};

export const PLATE_STATUS_LABELS: Record<string, string> = {
  active: '正常',
  inactive: '停用',
  transferred: '已过户',
};

export const RENEWAL_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  reviewed: '已复核',
  confirmed: '已确认',
  cancelled: '已取消',
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  normal: '正常',
  warning: '待关注',
  error: '异常',
};

export const BAD_ROW_ERROR_LABELS: Record<string, string> = {
  emptyRow: '空行',
  missingColumn: '缺少列',
  invalidFormat: '格式错误',
  duplicate: '重复数据',
  unknown: '未知错误',
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  licensePlate: '车牌档案',
  tempParking: '临停流水',
  discount: '优惠记录',
  refund: '退款申请',
};

export const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: '折扣比例',
  fixed: '固定金额',
  freeMonths: '赠送月数',
};

export const CARD_MONTHLY_FEES: Record<string, number> = {
  standard: 300,
  vip: 200,
  employee: 100,
};

export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const BUILDING_OPTIONS = [
  '1栋', '2栋', '3栋', '4栋', '5栋', '6栋', '7栋', '8栋',
];

export const EXPORT_TYPE_LABELS: Record<string, string> = {
  renewal: '续费清单',
  deduction: '抵扣明细',
  discount: '优惠汇总',
  full: '完整导出',
};

export const FORMAT_LABELS: Record<string, string> = {
  xlsx: 'Excel',
  csv: 'CSV',
  pdf: 'PDF',
};
