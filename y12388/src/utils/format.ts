import dayjs from 'dayjs'
import { RegistrationStatus, AnomalyType } from '@/types'

export function formatDate(date: string | dayjs.Dayjs | Date, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

export function formatDateTime(date: string | dayjs.Dayjs | Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export function formatRelativeTime(date: string | dayjs.Dayjs | Date): string {
  const now = dayjs()
  const target = dayjs(date)
  const diffDays = now.diff(target, 'day')

  if (diffDays === 0) {
    const diffHours = now.diff(target, 'hour')
    if (diffHours === 0) {
      const diffMinutes = now.diff(target, 'minute')
      return diffMinutes <= 0 ? '刚刚' : `${diffMinutes}分钟前`
    }
    return `${diffHours}小时前`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return formatDate(date)
  }
}

export function getStatusText(status: RegistrationStatus): string {
  const statusMap: Record<RegistrationStatus, string> = {
    [RegistrationStatus.PENDING]: '待审核',
    [RegistrationStatus.MATERIALS_INCOMPLETE]: '材料不齐',
    [RegistrationStatus.REVIEWING]: '审核中',
    [RegistrationStatus.REPERTOIRE_MISMATCH]: '曲目不符',
    [RegistrationStatus.PAYMENT_LATE]: '缴费晚到',
    [RegistrationStatus.DOCUMENT_MISSING]: '证件缺失',
    [RegistrationStatus.PASSED]: '审核通过',
    [RegistrationStatus.REJECTED]: '审核驳回',
    [RegistrationStatus.SUPPLEMENT]: '待补充材料',
  }
  return statusMap[status] || status
}

export function getStatusColor(status: RegistrationStatus): string {
  const colorMap: Record<RegistrationStatus, string> = {
    [RegistrationStatus.PASSED]: 'bg-green-600',
    [RegistrationStatus.PENDING]: 'bg-yellow-500',
    [RegistrationStatus.REVIEWING]: 'bg-blue-600',
    [RegistrationStatus.REPERTOIRE_MISMATCH]: 'bg-orange-500',
    [RegistrationStatus.PAYMENT_LATE]: 'bg-orange-500',
    [RegistrationStatus.DOCUMENT_MISSING]: 'bg-orange-500',
    [RegistrationStatus.REJECTED]: 'bg-red-600',
    [RegistrationStatus.MATERIALS_INCOMPLETE]: 'bg-yellow-500',
    [RegistrationStatus.SUPPLEMENT]: 'bg-yellow-500',
  }
  return colorMap[status] || 'bg-gray-500'
}

export function getAnomalyText(type: AnomalyType): string {
  const anomalyMap: Record<AnomalyType, string> = {
    [AnomalyType.REPERTOIRE_MISMATCH]: '曲目版本不符',
    [AnomalyType.PAYMENT_LATE]: '缴费晚到',
    [AnomalyType.DOCUMENT_MISSING]: '证件缺失',
    [AnomalyType.TEACHER_CONTRADICTION]: '老师补充说明',
    [AnomalyType.MATERIAL_INCOMPLETE]: '材料不完整',
  }
  return anomalyMap[type] || type
}

export function getAnomalyColor(type: AnomalyType): string {
  const colorMap: Record<AnomalyType, string> = {
    [AnomalyType.REPERTOIRE_MISMATCH]: 'bg-orange-100 text-orange-800 border-orange-300',
    [AnomalyType.PAYMENT_LATE]: 'bg-orange-100 text-orange-800 border-orange-300',
    [AnomalyType.DOCUMENT_MISSING]: 'bg-orange-100 text-orange-800 border-orange-300',
    [AnomalyType.TEACHER_CONTRADICTION]: 'bg-amber-100 text-amber-800 border-amber-300',
    [AnomalyType.MATERIAL_INCOMPLETE]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  }
  return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-300'
}

export function getDocumentTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    id_card: '身份证',
    previous_certificate: '上一级考级证书',
    photo: '证件照片',
    other: '其他证明材料',
  }
  return nameMap[type] || type
}

export function getMaterialTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    application_form: '考级报名表',
    repertoire_page: '曲目版本页',
    payment_receipt: '缴费回执',
    photo: '近期免冠照片',
  }
  return nameMap[type] || type
}

export function getEvidenceTypeText(type: string): string {
  const nameMap: Record<string, string> = {
    repertoire: '曲目相关',
    payment: '缴费相关',
    document: '证件相关',
    other: '其他',
  }
  return nameMap[type] || type
}

export function maskIdNumber(idNumber: string): string {
  if (!idNumber || idNumber.length < 8) return idNumber
  return idNumber.substring(0, 6) + '********' + idNumber.substring(14)
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.substring(0, 3) + '****' + phone.substring(7)
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

export function getExamLevelText(level: string): string {
  const levelMap: Record<string, string> = {
    '1': '一级',
    '2': '二级',
    '3': '三级',
    '4': '四级',
    '5': '五级',
    '6': '六级',
    '7': '七级',
    '8': '八级',
    '9': '九级',
    '10': '十级',
  }
  return levelMap[level] || level
}

export function getGenderText(gender: 'male' | 'female'): string {
  return gender === 'male' ? '男' : '女'
}
