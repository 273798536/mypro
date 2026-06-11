import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

export interface ExportPhotoRecord {
  id: string
  name: string
  floor: string
  floorRaw: string
  coordinate: string
  coordinateSystem: string
  materialName: string
  anomalyType: string
  anomalyDescription: string
  status: string
  reviewNote: string
  updatedAt: string
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function captureElement(element: HTMLElement, options?: {
  backgroundColor?: string
  scale?: number
}): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: options?.backgroundColor || '#ffffff',
    scale: options?.scale || 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    scrollY: 0,
    scrollX: 0,
  })
  return canvas.toDataURL('image/png')
}

export async function exportElementAsImage(
  element: HTMLElement,
  filename: string,
  options?: { backgroundColor?: string; scale?: number }
) {
  const dataUrl = await captureElement(element, options)
  downloadDataUrl(dataUrl, filename)
  return dataUrl
}

export async function exportElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: {
    format?: 'a4' | 'letter'
    orientation?: 'portrait' | 'landscape'
    backgroundColor?: string
  }
) {
  const format = options?.format || 'a4'
  const orientation = options?.orientation || 'portrait'
  const isLandscape = orientation === 'landscape'

  const dataUrl = await captureElement(element, {
    backgroundColor: options?.backgroundColor || '#ffffff',
    scale: 2,
  })

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10

  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => {
    img.onload = resolve
  })

  const imgWidth = pageWidth - margin * 2
  const imgHeight = (img.height / img.width) * imgWidth

  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(dataUrl, 'PNG', margin, margin, imgWidth, imgHeight)
  } else {
    const heightLeft = imgHeight
    let position = margin

    pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight)
    let heightRemaining = heightLeft - (pageHeight - margin * 2)

    while (heightRemaining > 0) {
      position = -pageHeight + margin
      pdf.addPage()
      pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight)
      heightRemaining -= pageHeight - margin * 2
    }
  }

  pdf.save(filename)
  return dataUrl
}

export function exportRecordsAsExcel(
  records: ExportPhotoRecord[],
  filename: string,
  sheetName: string = '复核记录'
) {
  const headers = [
    '序号',
    '照片名称',
    '楼层',
    '楼层(原始)',
    '坐标',
    '坐标系',
    '材料名称',
    '异常类型',
    '异常说明',
    '复核状态',
    '复核备注',
    '更新时间',
  ]

  const rows = records.map((r, idx) => ({
    '序号': idx + 1,
    '照片名称': r.name,
    '楼层': r.floor,
    '楼层(原始)': r.floorRaw,
    '坐标': r.coordinate,
    '坐标系': r.coordinateSystem,
    '材料名称': r.materialName,
    '异常类型': r.anomalyType,
    '异常说明': r.anomalyDescription,
    '复核状态': r.status,
    '复核备注': r.reviewNote,
    '更新时间': r.updatedAt,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })

  const colWidths = [
    { wch: 6 },
    { wch: 24 },
    { wch: 8 },
    { wch: 12 },
    { wch: 16 },
    { wch: 8 },
    { wch: 20 },
    { wch: 14 },
    { wch: 40 },
    { wch: 10 },
    { wch: 40 },
    { wch: 20 },
  ]
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function formatExportDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}-${h}${min}`
}
