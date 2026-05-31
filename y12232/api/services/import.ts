import { prisma } from '../lib/prisma.js'
import * as XLSX from 'xlsx'

type ImportType = 'farmer' | 'area' | 'track' | 'rule'

const validTypes: ImportType[] = ['farmer', 'area', 'track', 'rule']

export async function importData(
  type: ImportType,
  filePath: string,
  originalName: string,
  operator: string = 'admin'
) {
  if (!validTypes.includes(type)) {
    throw new Error(`无效的导入类型: ${type}，支持: ${validTypes.join('/')}`)
  }

  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  if (rows.length === 0) {
    throw new Error('文件内容为空')
  }

  const batch = await prisma.importBatch.create({
    data: {
      type,
      filename: originalName,
      uploadedBy: operator,
      recordCount: rows.length,
      status: 'success',
    },
  })

  try {
    switch (type) {
      case 'farmer':
        await importFarmers(batch.id, rows)
        break
      case 'area':
        await importAreas(batch.id, rows)
        break
      case 'track':
        await importTracks(batch.id, rows)
        break
      case 'rule':
        await importRules(batch.id, rows)
        break
    }
  } catch (err) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: 'failed' },
    })
    throw err
  }

  return batch
}

async function importFarmers(batchId: string, rows: Record<string, unknown>[]) {
  const data = rows.map((row) => ({
    batchId,
    idCard: String(row['身份证号'] || row['idCard'] || ''),
    name: String(row['姓名'] || row['name'] || ''),
    village: String(row['所在村组'] || row['village'] || ''),
    phone: String(row['联系电话'] || row['phone'] || ''),
  }))

  for (const item of data) {
    if (!item.idCard || !item.name) continue
    await prisma.farmer.create({ data: item })
  }
}

async function importAreas(batchId: string, rows: Record<string, unknown>[]) {
  for (const row of rows) {
    const farmerIdCard = String(row['身份证号'] || row['idCard'] || '')
    const farmer = await prisma.farmer.findFirst({ where: { idCard: farmerIdCard } })
    if (!farmer) continue

    await prisma.areaDeclaration.create({
      data: {
        batchId,
        farmerId: farmer.id,
        plotNo: String(row['地块编号'] || row['plotNo'] || ''),
        declaredArea: Number(row['申报面积'] || row['declaredArea'] || 0),
        cropType: String(row['作物类型'] || row['cropType'] || ''),
        declareDate: parseDate(row['申报日期'] || row['declareDate']),
        signatureStatus: String(row['签字状态'] || row['signatureStatus'] || 'unsigned'),
      },
    })
  }
}

async function importTracks(batchId: string, rows: Record<string, unknown>[]) {
  for (const row of rows) {
    const farmerIdCard = String(row['身份证号'] || row['idCard'] || '')
    const farmer = await prisma.farmer.findFirst({ where: { idCard: farmerIdCard } })
    if (!farmer) continue

    await prisma.trackRecord.create({
      data: {
        batchId,
        farmerId: farmer.id,
        trackArea: Number(row['轨迹面积'] || row['trackArea'] || 0),
        trackPointCount: Number(row['轨迹点数'] || row['trackPointCount'] || 0),
        hasBreakpoint: Boolean(row['有断点'] || row['hasBreakpoint'] || false),
        breakpointDetail: row['断点详情'] || row['breakpointDetail']
          ? String(row['断点详情'] || row['breakpointDetail'])
          : null,
        trackDate: parseDate(row['轨迹日期'] || row['trackDate']),
      },
    })
  }
}

async function importRules(batchId: string, rows: Record<string, unknown>[]) {
  const data = rows.map((row) => ({
    batchId,
    cropType: String(row['作物类型'] || row['cropType'] || ''),
    subsidyPerMu: Number(row['补贴标准'] || row['subsidyPerMu'] || 0),
    year: Number(row['年份'] || row['year'] || new Date().getFullYear()),
  }))

  for (const item of data) {
    if (!item.cropType || !item.subsidyPerMu) continue
    await prisma.subsidyRule.create({ data: item })
  }
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value)
    if (d) return new Date(d.y, d.m - 1, d.d)
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

export async function getBatches(type?: string) {
  const where: Record<string, unknown> = {}
  if (type) where.type = type
  return prisma.importBatch.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  })
}
