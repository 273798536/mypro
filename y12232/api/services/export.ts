import { prisma } from '../lib/prisma.js'
import * as XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const exportDir = path.resolve(__dirname, '../../data/exports')

const statusLabels: Record<string, string> = {
  pending: '待核验',
  verifying: '核验中',
  toReview: '待复核',
  passed: '已通过',
  rejected: '已驳回',
}

const issueTypeLabels: Record<string, string> = {
  breakpoint: '轨迹断点',
  duplicate: '面积重复',
  missing_signature: '签字缺失',
  area_mismatch: '面积不一致',
}

export async function generateReport() {
  const records = await prisma.verificationRecord.findMany({
    include: {
      farmer: true,
      area: true,
      track: true,
      issues: true,
      review: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const stats = {
    total: records.length,
    passed: records.filter((r) => r.status === 'passed').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    pending: records.filter((r) => r.status === 'pending').length,
    withIssues: records.filter((r) => r.hasIssues).length,
    issueTypes: {
      breakpoint: records.filter((r) => r.issues.some((i) => i.type === 'breakpoint')).length,
      duplicate: records.filter((r) => r.issues.some((i) => i.type === 'duplicate')).length,
      missing_signature: records.filter((r) => r.issues.some((i) => i.type === 'missing_signature')).length,
      area_mismatch: records.filter((r) => r.issues.some((i) => i.type === 'area_mismatch')).length,
    },
  }

  const overviewData = [
    ['核验报告'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [],
    ['统计概览'],
    ['总条数', stats.total],
    ['已通过', stats.passed],
    ['已驳回', stats.rejected],
    ['待处理', stats.pending],
    ['有问题', stats.withIssues],
    [],
    ['问题分布'],
    ['轨迹断点', stats.issueTypes.breakpoint],
    ['面积重复', stats.issueTypes.duplicate],
    ['签字缺失', stats.issueTypes.missing_signature],
    ['面积不一致', stats.issueTypes.area_mismatch],
  ]

  const detailHeaders = [
    '农户姓名', '身份证号', '所在村组', '地块编号',
    '申报面积(亩)', '轨迹面积(亩)', '核验面积(亩)',
    '核验状态', '问题标记', '问题说明',
  ]

  const detailRows = records.map((r) => {
    const issueMarks = r.issues.map((i) => issueTypeLabels[i.type] || i.type).join('、')
    const issueDescs = r.issues.map((i) => i.description).join('；')
    return [
      r.farmer.name,
      r.farmer.idCard,
      r.farmer.village,
      r.area.plotNo,
      Number(r.area.declaredArea),
      Number(r.track.trackArea),
      Number(r.verifiedArea),
      statusLabels[r.status] || r.status,
      issueMarks || '无',
      issueDescs || '无',
    ]
  })

  const problemRecords = records.filter((r) => r.hasIssues)
  const problemHeaders = ['问题类型', '问题描述', '严重程度', '农户姓名', '地块编号', '核验状态']
  const problemRows: unknown[][] = []
  for (const r of problemRecords) {
    for (const issue of r.issues) {
      problemRows.push([
        issueTypeLabels[issue.type] || issue.type,
        issue.description,
        issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低',
        r.farmer.name,
        r.area.plotNo,
        statusLabels[r.status] || r.status,
      ])
    }
  }

  const batches = await prisma.importBatch.findMany({ orderBy: { uploadedAt: 'desc' } })
  const materialHeaders = ['批次ID', '导入类型', '文件名', '导入人', '导入时间', '记录数', '状态']
  const materialRows = batches.map((b) => [
    b.id,
    b.type,
    b.filename,
    b.uploadedBy,
    b.uploadedAt.toLocaleString('zh-CN'),
    b.recordCount,
    b.status,
  ])

  const wb = XLSX.utils.book_new()
  const overviewRows = overviewData.map((row) => row.map(String))
  const ws1 = XLSX.utils.aoa_to_sheet([['核验报告'], [], ...overviewRows, [], ['核验明细'], detailHeaders, ...detailRows])
  XLSX.utils.book_append_sheet(wb, ws1, '核验明细')
  const ws2 = XLSX.utils.aoa_to_sheet([problemHeaders, ...problemRows])
  XLSX.utils.book_append_sheet(wb, ws2, '问题清单')
  const ws3 = XLSX.utils.aoa_to_sheet([materialHeaders, ...materialRows])
  XLSX.utils.book_append_sheet(wb, ws3, '原始材料索引')

  const filename = `核验报告_${formatDate(new Date())}.xlsx`
  const filepath = path.join(exportDir, filename)
  XLSX.writeFile(wb, filepath)

  return { filename, filepath }
}

export async function generateList() {
  const records = await prisma.verificationRecord.findMany({
    include: {
      farmer: true,
      area: true,
      track: true,
      issues: true,
      review: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const rules = await prisma.subsidyRule.findMany()
  const ruleMap = new Map(rules.map((r) => [r.cropType, Number(r.subsidyPerMu)]))

  const headers = [
    '农户姓名', '身份证号', '所在村组', '地块编号',
    '申报面积(亩)', '轨迹面积(亩)', '核验面积(亩)',
    '补贴标准(元/亩)', '补贴金额(元)',
    '问题标记', '问题说明', '核验状态', '复核结论',
  ]

  const rows = records.map((r) => {
    const subsidyPerMu = ruleMap.get(r.area.cropType) || 0
    const verifiedArea = Number(r.verifiedArea)
    const subsidyAmount = Math.round(verifiedArea * subsidyPerMu * 100) / 100
    const issueMarks = r.issues.map((i) => issueTypeLabels[i.type] || i.type).join('、')
    const issueDescs = r.issues.map((i) => i.description).join('；')
    const reviewConclusion = r.review
      ? r.review.conclusion === 'passed'
        ? '通过'
        : '驳回'
      : ''

    return [
      r.farmer.name,
      r.farmer.idCard,
      r.farmer.village,
      r.area.plotNo,
      Number(r.area.declaredArea),
      Number(r.track.trackArea),
      verifiedArea,
      subsidyPerMu,
      subsidyAmount,
      issueMarks || '无',
      issueDescs || '无',
      statusLabels[r.status] || r.status,
      reviewConclusion,
    ]
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  XLSX.utils.book_append_sheet(wb, ws, '补贴发放清单')

  const filename = `补贴发放清单_${formatDate(new Date())}.xlsx`
  const filepath = path.join(exportDir, filename)
  XLSX.writeFile(wb, filepath)

  return { filename, filepath }
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function getExportFilePath(filename: string): string {
  return path.join(exportDir, filename)
}
