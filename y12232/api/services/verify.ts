import { prisma } from '../lib/prisma.js'

type VerifyStatus = 'pending' | 'verifying' | 'toReview' | 'passed' | 'rejected'
type IssueType = 'breakpoint' | 'duplicate' | 'missing_signature' | 'area_mismatch'

const validStatuses: VerifyStatus[] = ['pending', 'verifying', 'toReview', 'passed', 'rejected']
const statusTransitions: Record<VerifyStatus, VerifyStatus[]> = {
  pending: ['verifying'],
  verifying: ['toReview', 'pending'],
  toReview: ['passed', 'rejected', 'verifying'],
  passed: [],
  rejected: ['verifying'],
}

export interface VerifyListParams {
  status?: string
  issueType?: string
  page?: number
  pageSize?: number
}

export async function getVerifyList(params: VerifyListParams) {
  const { status, issueType, page = 1, pageSize = 10 } = params

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (issueType) {
    where.issues = { some: { type: issueType } }
  }

  const [records, total] = await Promise.all([
    prisma.verificationRecord.findMany({
      where,
      include: {
        farmer: true,
        area: true,
        track: true,
        issues: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.verificationRecord.count({ where }),
  ])

  const flatRecords = records.map((r) => ({
    id: r.id,
    farmerId: r.farmerId,
    areaId: r.areaId,
    trackId: r.trackId,
    farmerName: r.farmer?.name || '',
    plotNo: r.area?.plotNo || '',
    declaredArea: Number(r.area?.declaredArea || 0),
    trackArea: Number(r.track?.trackArea || 0),
    verifiedArea: Number(r.verifiedArea),
    status: r.status,
    hasIssues: r.hasIssues,
    cropType: r.area?.cropType || '',
    issues: r.issues,
    review: r.review,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))

  return {
    data: flatRecords,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getVerifyStats() {
  const [total, pending, verifying, toReview, passed, rejected, withIssues] = await Promise.all([
    prisma.verificationRecord.count(),
    prisma.verificationRecord.count({ where: { status: 'pending' } }),
    prisma.verificationRecord.count({ where: { status: 'verifying' } }),
    prisma.verificationRecord.count({ where: { status: 'toReview' } }),
    prisma.verificationRecord.count({ where: { status: 'passed' } }),
    prisma.verificationRecord.count({ where: { status: 'rejected' } }),
    prisma.verificationRecord.count({ where: { hasIssues: true } }),
  ])

  const breakpointCount = await prisma.issueMark.count({ where: { type: 'breakpoint' } })
  const duplicateCount = await prisma.issueMark.count({ where: { type: 'duplicate' } })
  const missingSignatureCount = await prisma.issueMark.count({ where: { type: 'missing_signature' } })
  const areaMismatchCount = await prisma.issueMark.count({ where: { type: 'area_mismatch' } })

  return {
    total,
    pending,
    verifying,
    toReview,
    passed,
    rejected,
    issues: withIssues,
    issueDistribution: {
      breakpoint: breakpointCount,
      duplicate: duplicateCount,
      missing_signature: missingSignatureCount,
      area_mismatch: areaMismatchCount,
    },
  }
}

export async function updateStatus(
  recordId: string,
  toStatus: VerifyStatus,
  operator: string = 'admin',
  remark?: string
) {
  const record = await prisma.verificationRecord.findUnique({ where: { id: recordId } })
  if (!record) throw new Error('核验记录不存在')

  const fromStatus = record.status as VerifyStatus
  if (!validStatuses.includes(toStatus)) throw new Error(`无效的目标状态: ${toStatus}`)
  if (!statusTransitions[fromStatus].includes(toStatus)) {
    throw new Error(`不允许从 ${fromStatus} 转换到 ${toStatus}`)
  }

  const updated = await prisma.verificationRecord.update({
    where: { id: recordId },
    data: { status: toStatus },
  })

  await prisma.statusHistory.create({
    data: {
      recordId,
      fromStatus,
      toStatus,
      operator,
      remark,
    },
  })

  return updated
}

export async function batchUpdateStatus(
  recordIds: string[],
  toStatus: VerifyStatus,
  operator: string = 'admin',
  remark?: string
) {
  const results = []
  for (const id of recordIds) {
    try {
      const result = await updateStatus(id, toStatus, operator, remark)
      results.push({ id, success: true, data: result })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '操作失败'
      results.push({ id, success: false, error: message })
    }
  }
  return results
}

export async function upsertIssue(
  recordId: string,
  type: IssueType,
  description: string,
  severity: 'low' | 'medium' | 'high' = 'medium',
  markedBy: string = 'admin'
) {
  const record = await prisma.verificationRecord.findUnique({ where: { id: recordId } })
  if (!record) throw new Error('核验记录不存在')

  const existing = await prisma.issueMark.findFirst({
    where: { recordId, type },
  })

  let issue
  if (existing) {
    issue = await prisma.issueMark.update({
      where: { id: existing.id },
      data: { description, severity, markedBy },
    })
  } else {
    issue = await prisma.issueMark.create({
      data: { recordId, type, description, severity, markedBy },
    })
  }

  await prisma.verificationRecord.update({
    where: { id: recordId },
    data: { hasIssues: true },
  })

  return issue
}

export async function autoVerify() {
  const areas = await prisma.areaDeclaration.findMany()
  const tracks = await prisma.trackRecord.findMany()
  const trackMap = new Map(tracks.map((t) => t.farmerId))

  let created = 0
  for (const area of areas) {
    const track = trackMap.get(area.farmerId)
    if (!track) continue

    const existing = await prisma.verificationRecord.findFirst({
      where: { areaId: area.id, trackId: track.id },
    })
    if (existing) continue

    const declaredArea = Number(area.declaredArea)
    const trackArea = Number(track.trackArea)
    const hasBreakpoint = track.hasBreakpoint

    let verifiedArea: number
    let hasIssues = false

    if (hasBreakpoint) {
      verifiedArea = declaredArea
      hasIssues = true
    } else {
      verifiedArea = Math.min(declaredArea, trackArea)
      const diff = Math.abs(declaredArea - trackArea) / declaredArea
      if (diff > 0.05) {
        hasIssues = true
      }
    }

    const record = await prisma.verificationRecord.create({
      data: {
        farmerId: area.farmerId,
        areaId: area.id,
        trackId: track.id,
        verifiedArea: Math.round(verifiedArea * 100) / 100,
        status: 'pending',
        hasIssues,
      },
    })

    if (hasBreakpoint) {
      await prisma.issueMark.create({
        data: {
          recordId: record.id,
          type: 'breakpoint',
          description: `轨迹存在断点：${track.breakpointDetail || '详情未知'}`,
          severity: 'high',
          markedBy: 'system',
        },
      })
    }

    if (!hasBreakpoint) {
      const diff = Math.abs(declaredArea - trackArea) / declaredArea
      if (diff > 0.05) {
        await prisma.issueMark.create({
          data: {
            recordId: record.id,
            type: 'area_mismatch',
            description: `申报面积(${declaredArea}亩)与轨迹面积(${trackArea}亩)差值超过5%`,
            severity: 'medium',
            markedBy: 'system',
          },
        })
      }
    }

    if (area.signatureStatus === 'missing') {
      await prisma.issueMark.create({
        data: {
          recordId: record.id,
          type: 'missing_signature',
          description: '农户签字缺失',
          severity: 'high',
          markedBy: 'system',
        },
      })
    } else if (area.signatureStatus === 'unsigned') {
      await prisma.issueMark.create({
        data: {
          recordId: record.id,
          type: 'missing_signature',
          description: '农户未签字',
          severity: 'medium',
          markedBy: 'system',
        },
      })
    }

    const duplicateAreas = areas.filter(
      (a) => a.farmerId === area.farmerId && a.plotNo === area.plotNo && a.id !== area.id
    )
    if (duplicateAreas.length > 0) {
      await prisma.issueMark.create({
        data: {
          recordId: record.id,
          type: 'duplicate',
          description: `地块编号${area.plotNo}存在面积重复申报`,
          severity: 'medium',
          markedBy: 'system',
        },
      })
    }

    created++
  }

  return { created }
}
