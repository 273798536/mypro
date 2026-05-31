import { prisma } from '../lib/prisma.js'

export async function getReviewList(params: { status?: string; page?: number; pageSize?: number }) {
  const { status = 'toReview', page = 1, pageSize = 10 } = params

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [records, total] = await Promise.all([
    prisma.verificationRecord.findMany({
      where,
      include: {
        farmer: true,
        area: true,
        track: true,
        issues: true,
        review: true,
        histories: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
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
    idCard: r.farmer?.idCard || '',
    village: r.farmer?.village || '',
    plotNo: r.area?.plotNo || '',
    declaredArea: Number(r.area?.declaredArea || 0),
    trackArea: Number(r.track?.trackArea || 0),
    verifiedArea: Number(r.verifiedArea),
    status: r.status,
    hasIssues: r.hasIssues,
    cropType: r.area?.cropType || '',
    signatureStatus: r.area?.signatureStatus || '',
    hasBreakpoint: r.track?.hasBreakpoint || false,
    breakpointDetail: r.track?.breakpointDetail || null,
    trackPointCount: r.track?.trackPointCount || 0,
    issues: r.issues,
    review: r.review,
    histories: r.histories,
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

export async function submitReview(
  recordId: string,
  conclusion: 'passed' | 'rejected',
  reviewer: string = 'reviewer',
  opinion?: string
) {
  const record = await prisma.verificationRecord.findUnique({ where: { id: recordId } })
  if (!record) throw new Error('核验记录不存在')
  if (record.status !== 'toReview') throw new Error('仅待复核状态记录可提交复核')

  const existingReview = await prisma.reviewResult.findUnique({ where: { recordId } })
  if (existingReview) throw new Error('该记录已存在复核结果')

  const review = await prisma.reviewResult.create({
    data: {
      recordId,
      conclusion,
      reviewer,
      opinion,
    },
  })

  await prisma.verificationRecord.update({
    where: { id: recordId },
    data: { status: conclusion },
  })

  await prisma.statusHistory.create({
    data: {
      recordId,
      fromStatus: 'toReview',
      toStatus: conclusion,
      operator: reviewer,
      remark: opinion,
    },
  })

  return review
}
