export const maskName = (name: string | null | undefined): string => {
  if (!name) return ''
  if (name.length <= 1) return '*'
  return name.charAt(0) + '*'.repeat(name.length - 1)
}

export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return ''
  if (phone.length <= 4) return '*'.repeat(phone.length)
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

export const maskIdCard = (idCard: string | null | undefined): string => {
  if (!idCard) return ''
  if (idCard.length <= 8) return idCard.slice(0, 4) + '****' + idCard.slice(-4)
  if (idCard.length > 8) return idCard.slice(0, 6) + '********' + idCard.slice(-4)
  return '*'.repeat(idCard.length)
}

export const maskInvoiceNo = (invoiceNo: string | null | undefined): string => {
  if (!invoiceNo) return ''
  if (invoiceNo.length <= 4) return '****'
  return invoiceNo.slice(0, 4) + '*'.repeat(Math.max(0, invoiceNo.length - 8)) + (invoiceNo.length > 4 ? invoiceNo.slice(-4) : '')
}

export const maskAppointmentNo = (appointmentNo: string | null | undefined): string => {
  if (!appointmentNo) return ''
  if (appointmentNo.length <= 4) return '****'
  return appointmentNo.slice(0, 2) + '*'.repeat(Math.max(0, appointmentNo.length - 6)) + (appointmentNo.length > 4 ? appointmentNo.slice(-4) : '')
}

export type MaskLevel = 'none' | 'partial' | 'full'

export const maskSensitiveData = (data: any, maskLevel: MaskLevel = 'partial'): any => {
  if (maskLevel === 'none') return data

  const masked = { ...data }

  if (masked.patientName) {
    masked.patientName = maskName(masked.patientName)
  }
  if (masked.supplierInvoiceNo) {
    masked.supplierInvoiceNo = maskInvoiceNo(masked.supplierInvoiceNo)
  }
  if (masked.appointmentRecordNo) {
    masked.appointmentRecordNo = maskAppointmentNo(masked.appointmentRecordNo)
  }

  if (maskLevel === 'full') {
    if (masked.implantBatchNumber) {
      masked.implantBatchNumber = maskInvoiceNo(masked.implantBatchNumber)
    }
    if (masked.patientName) {
      masked.patientName = '***'
    }
  }

  return masked
}
