import dayjs from 'dayjs';

export const statusMap = {
  pending: { text: '待复核', class: 'status-pending' },
  reviewing: { text: '复核中', class: 'status-reviewing' },
  resolved: { text: '已解决', class: 'status-resolved' },
  rejected: { text: '已驳回', class: 'status-rejected' },
  duplicate: { text: '重复投诉', class: 'status-duplicate' }
};

export const typeMap = {
  illegal_parking: '违停',
  traffic_congestion: '拥堵',
  pedestrian_safety: '行人安全',
  noise: '噪音',
  other: '其他'
};

export const roleMap = {
  engineer: '交通工程师',
  inspector: '巡检员',
  admin: '管理员'
};

export const resultMap = {
  pass: { text: '通过', class: 'btn-success' },
  fail: { text: '不通过', class: 'btn-danger' },
  pending: { text: '待复核', class: 'btn-secondary' },
  duplicate: { text: '重复投诉', class: 'btn-warning' }
};

export function formatDate(date) {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatDateOnly(date) {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD');
}

export function truncate(text, maxLen = 50) {
  if (!text) return '-';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

export function getFieldLabel(fieldName) {
  const labels = {
    status: '状态',
    description: '描述',
    location_id: '关联地点',
    is_duplicate: '重复标记',
    duplicate_of: '关联主投诉',
    calculation_result: '计算结果'
  };
  return labels[fieldName] || fieldName;
}

export function formatValue(fieldName, value) {
  if (value === null || value === undefined) return '-';
  if (fieldName === 'status') return statusMap[value]?.text || value;
  if (fieldName === 'is_duplicate') return value === 1 ? '是' : '否';
  return String(value);
}

export function generateComplaintNo() {
  const now = dayjs();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CP-${now.year()}-${random}`;
}
