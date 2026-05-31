import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.issueMark.deleteMany()
  await prisma.statusHistory.deleteMany()
  await prisma.reviewResult.deleteMany()
  await prisma.verificationRecord.deleteMany()
  await prisma.areaDeclaration.deleteMany()
  await prisma.trackRecord.deleteMany()
  await prisma.subsidyRule.deleteMany()
  await prisma.farmer.deleteMany()
  await prisma.importBatch.deleteMany()

  const farmerBatch = await prisma.importBatch.create({
    data: {
      id: 'batch_farmer_init',
      type: 'farmer',
      filename: '农户档案_初始.xlsx',
      uploadedBy: 'admin',
      recordCount: 10,
      status: 'success',
    },
  })

  const areaBatch = await prisma.importBatch.create({
    data: {
      id: 'batch_area_init',
      type: 'area',
      filename: '面积申报_初始.xlsx',
      uploadedBy: 'admin',
      recordCount: 15,
      status: 'success',
    },
  })

  const trackBatch = await prisma.importBatch.create({
    data: {
      id: 'batch_track_init',
      type: 'track',
      filename: '北斗轨迹_初始.xlsx',
      uploadedBy: 'admin',
      recordCount: 15,
      status: 'success',
    },
  })

  const ruleBatch = await prisma.importBatch.create({
    data: {
      id: 'batch_rule_init',
      type: 'rule',
      filename: '补贴规则_初始.xlsx',
      uploadedBy: 'admin',
      recordCount: 3,
      status: 'success',
    },
  })

  const villages = ['东村', '西村', '南村', '北村', '中心村']
  const farmers = []
  for (let i = 1; i <= 10; i++) {
    const farmer = await prisma.farmer.create({
      data: {
        id: `farmer_${i}`,
        batchId: farmerBatch.id,
        idCard: `3201231980${String(i).padStart(2, '0')}01${String(i * 1111).padStart(4, '0')}`,
        name: `农户${i}`,
        village: villages[(i - 1) % villages.length],
        phone: `1380000${String(i * 1000 + 1234).slice(0, 4)}`,
      },
    })
    farmers.push(farmer)
  }

  const cropTypes = ['小麦', '玉米', '水稻']
  const signatureStatuses = ['signed', 'unsigned', 'missing']
  const areaDeclarations = []
  for (let i = 1; i <= 15; i++) {
    const farmerIdx = (i - 1) % 10
    const cropType = cropTypes[(i - 1) % 3]
    const sigStatus = i <= 2 ? 'signed' : i <= 4 ? 'unsigned' : i <= 5 ? 'missing' : 'signed'
    const area = await prisma.areaDeclaration.create({
      data: {
        id: `area_${i}`,
        batchId: areaBatch.id,
        farmerId: farmers[farmerIdx].id,
        plotNo: `P2024-${String(i).padStart(3, '0')}`,
        declaredArea: 5 + (i % 8) * 0.5,
        cropType,
        declareDate: new Date('2024-06-01'),
        signatureStatus: sigStatus,
      },
    })
    areaDeclarations.push(area)
  }

  const trackRecords = []
  for (let i = 1; i <= 15; i++) {
    const farmerIdx = (i - 1) % 10
    const declaredArea = Number(areaDeclarations[i - 1].declaredArea)
    const hasBreakpoint = i <= 3
    const trackArea = hasBreakpoint
      ? declaredArea * 0.85
      : i <= 8
        ? declaredArea * 0.98
        : declaredArea * 1.02

    const track = await prisma.trackRecord.create({
      data: {
        id: `track_${i}`,
        batchId: trackBatch.id,
        farmerId: farmers[farmerIdx].id,
        trackArea: Math.round(trackArea * 100) / 100,
        trackPointCount: hasBreakpoint ? 120 + i * 5 : 350 + i * 10,
        hasBreakpoint,
        breakpointDetail: hasBreakpoint ? `第${i * 12}号点位处存在${5 + i}分钟断点` : null,
        trackDate: new Date('2024-06-15'),
      },
    })
    trackRecords.push(track)
  }

  await prisma.subsidyRule.createMany({
    data: [
      { id: 'rule_wheat', batchId: ruleBatch.id, cropType: '小麦', subsidyPerMu: 150, year: 2024 },
      { id: 'rule_corn', batchId: ruleBatch.id, cropType: '玉米', subsidyPerMu: 120, year: 2024 },
      { id: 'rule_rice', batchId: ruleBatch.id, cropType: '水稻', subsidyPerMu: 200, year: 2024 },
    ],
  })

  const statuses = ['pending', 'verifying', 'toReview', 'passed', 'rejected']
  for (let i = 1; i <= 15; i++) {
    const declaredArea = Number(areaDeclarations[i - 1].declaredArea)
    const trackArea = Number(trackRecords[i - 1].trackArea)
    const hasBreakpoint = trackRecords[i - 1].hasBreakpoint

    let verifiedArea: number
    let hasIssues = false
    const issues: { type: string; description: string; severity: string }[] = []

    if (hasBreakpoint) {
      verifiedArea = declaredArea
      hasIssues = true
      issues.push({
        type: 'breakpoint',
        description: `轨迹存在断点：${trackRecords[i - 1].breakpointDetail}`,
        severity: 'high',
      })
    } else {
      verifiedArea = Math.min(declaredArea, trackArea)
      const diff = Math.abs(declaredArea - trackArea) / declaredArea
      if (diff > 0.05) {
        hasIssues = true
        issues.push({
          type: 'area_mismatch',
          description: `申报面积(${declaredArea}亩)与轨迹面积(${trackArea}亩)差值超过5%`,
          severity: 'medium',
        })
      }
    }

    const sigStatus = areaDeclarations[i - 1].signatureStatus
    if (sigStatus === 'missing') {
      hasIssues = true
      issues.push({
        type: 'missing_signature',
        description: '农户签字缺失',
        severity: 'high',
      })
    } else if (sigStatus === 'unsigned') {
      hasIssues = true
      issues.push({
        type: 'missing_signature',
        description: '农户未签字',
        severity: 'medium',
      })
    }

    if (i === 6 || i === 11) {
      hasIssues = true
      issues.push({
        type: 'duplicate',
        description: `地块编号${areaDeclarations[i - 1].plotNo}存在面积重复申报`,
        severity: 'medium',
      })
    }

    let status: string
    if (i <= 3) status = 'pending'
    else if (i <= 6) status = 'verifying'
    else if (i <= 9) status = 'toReview'
    else if (i <= 12) status = 'passed'
    else status = 'rejected'

    const record = await prisma.verificationRecord.create({
      data: {
        id: `verify_${i}`,
        farmerId: farmers[(i - 1) % 10].id,
        areaId: areaDeclarations[i - 1].id,
        trackId: trackRecords[i - 1].id,
        verifiedArea: Math.round(verifiedArea * 100) / 100,
        status,
        hasIssues,
      },
    })

    for (const issue of issues) {
      await prisma.issueMark.create({
        data: {
          recordId: record.id,
          type: issue.type,
          description: issue.description,
          severity: issue.severity,
          markedBy: 'system',
        },
      })
    }

    if (i > 3) {
      const statusFlow: Record<string, string[]> = {
        verifying: ['pending', 'verifying'],
        toReview: ['pending', 'verifying', 'toReview'],
        passed: ['pending', 'verifying', 'toReview', 'passed'],
        rejected: ['pending', 'verifying', 'toReview', 'rejected'],
      }
      const flow = statusFlow[status] || ['pending']
      for (let j = 0; j < flow.length - 1; j++) {
        await prisma.statusHistory.create({
          data: {
            recordId: record.id,
            fromStatus: flow[j],
            toStatus: flow[j + 1],
            operator: j < 2 ? 'admin' : 'reviewer',
            remark: j === flow.length - 2 ? (status === 'passed' ? '审核通过' : '数据异常，驳回') : null,
          },
        })
      }
    }

    if (status === 'passed' || status === 'rejected') {
      await prisma.reviewResult.create({
        data: {
          recordId: record.id,
          conclusion: status,
          reviewer: 'reviewer',
          opinion: status === 'passed' ? '数据核验无误，同意发放补贴' : '存在问题，驳回重新核实',
        },
      })
    }
  }

  console.log('Seed data created successfully!')
  console.log(`  - Farmers: 10`)
  console.log(`  - Area Declarations: 15`)
  console.log(`  - Track Records: 15 (3 with breakpoints)`)
  console.log(`  - Subsidy Rules: 3`)
  console.log(`  - Verification Records: 15`)
  console.log(`  - Issue Marks: created`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
