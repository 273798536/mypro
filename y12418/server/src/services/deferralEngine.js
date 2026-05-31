import db from '../db.js'
import dayjs from 'dayjs'

export function calculateMonthlyDeferral(contract, month, options = {}) {
  const { ruleVersion = null, ignoreFreeze = false, ignoreMakeup = false, ignoreTransfer = false } = options
  
  const monthStart = dayjs(month + '-01')
  const monthEnd = monthStart.endOf('month')
  const contractStart = dayjs(contract.start_date)
  const contractEnd = dayjs(contract.end_date)

  if (monthEnd.isBefore(contractStart) || monthStart.isAfter(contractEnd)) {
    return { deferred: 0, recognized: 0, logic: '不在合同期内', affectedBy: [] }
  }

  let effectiveStart = monthStart.isBefore(contractStart) ? contractStart : monthStart
  let effectiveEnd = monthEnd.isAfter(contractEnd) ? contractEnd : monthEnd
  let totalDays = effectiveEnd.diff(effectiveStart, 'day') + 1

  const freezes = ignoreFreeze ? [] : db.prepare(`
    SELECT * FROM freeze_applications 
    WHERE contract_id = ? AND status = 'approved'
  `).all(contract.id)

  let freezeDaysInMonth = 0
  const freezeImpacts = []

  freezes.forEach(freeze => {
    const fStart = dayjs(freeze.freeze_start_date)
    const fEnd = dayjs(freeze.freeze_end_date)
    const overlapStart = fStart.isBefore(effectiveStart) ? effectiveStart : fStart
    const overlapEnd = fEnd.isAfter(effectiveEnd) ? effectiveEnd : fEnd

    if (overlapStart.isBefore(overlapEnd) || overlapStart.isSame(overlapEnd)) {
      const days = overlapEnd.diff(overlapStart, 'day') + 1
      freezeDaysInMonth += days
      freezeImpacts.push({
        type: 'freeze',
        id: freeze.id,
        days,
        isCrossMonth: freeze.is_cross_month,
        description: `冻结${freeze.freeze_start_date}至${freeze.freeze_end_date}，影响${days}天`
      })
    }
  })

  const makeups = ignoreMakeup ? [] : db.prepare(`
    SELECT * FROM makeup_lessons 
    WHERE contract_id = ? AND is_withdrawn = 0 AND status = 'completed'
  `).all(contract.id)

  const makeupImpacts = []
  makeups.forEach(makeup => {
    if (dayjs(makeup.makeup_date).format('YYYY-MM') === month) {
      makeupImpacts.push({
        type: 'makeup',
        id: makeup.id,
        description: `补课单完成于${makeup.makeup_date}`
      })
    }
  })

  const transfers = ignoreTransfer ? [] : db.prepare(`
    SELECT * FROM transfer_records 
    WHERE contract_id = ?
  `).all(contract.id)

  const transferImpacts = []
  transfers.forEach(transfer => {
    if (transfer.is_retroactive && transfer.retroactive_month === month) {
      transferImpacts.push({
        type: 'transfer',
        id: transfer.id,
        description: `转让追溯至${transfer.retroactive_month}，手续费${transfer.transfer_fee}元`
      })
    }
  })

  const withdrawnMakeups = db.prepare(`
    SELECT * FROM makeup_lessons 
    WHERE contract_id = ? AND is_withdrawn = 1
  `).all(contract.id)

  const withdrawnImpacts = []
  withdrawnMakeups.forEach(makeup => {
    const originalMonth = dayjs(makeup.lesson_date).format('YYYY-MM')
    if (originalMonth === month) {
      withdrawnImpacts.push({
        type: 'makeup_withdrawn',
        id: makeup.id,
        description: `补课单于${makeup.withdrawn_at}撤回，原计划${makeup.lesson_date}`
      })
    }
  })

  const actualServiceDays = totalDays - freezeDaysInMonth
  const dailyRate = contract.total_amount / (contractEnd.diff(contractStart, 'day') + 1)
  const recognizedAmount = actualServiceDays * dailyRate

  let adjustedRecognized = recognizedAmount
  
  transferImpacts.forEach(t => {
    adjustedRecognized -= t.description.includes('手续费') ? 0 : 0
  })

  const monthlyExpected = contract.monthly_fee
  const deferredAmount = monthlyExpected - adjustedRecognized

  const affectedBy = [...freezeImpacts, ...makeupImpacts, ...transferImpacts, ...withdrawnImpacts]
  let logic = `基础计算：${totalDays}天 × ${dailyRate.toFixed(2)}元/天 = ${recognizedAmount.toFixed(2)}元`
  
  if (freezeDaysInMonth > 0) {
    logic += `；扣除冻结${freezeDaysInMonth}天`
  }
  if (makeupImpacts.length > 0) {
    logic += `；含${makeupImpacts.length}条补课记录`
  }
  if (withdrawnImpacts.length > 0) {
    logic += `；含${withdrawnImpacts.length}条已撤回补课`
  }

  return {
    deferred: Math.round(deferredAmount * 100) / 100,
    recognized: Math.round(adjustedRecognized * 100) / 100,
    baseDays: totalDays,
    freezeDays: freezeDaysInMonth,
    actualDays: actualServiceDays,
    logic,
    affectedBy,
    hasWithdrawnMakeup: withdrawnImpacts.length > 0
  }
}

export function analyzeDiscrepancy(contract, month) {
  const calcResult = calculateMonthlyDeferral(contract, month)
  const contractMonthly = contract.monthly_fee
  const difference = contractMonthly - calcResult.recognized

  if (Math.abs(difference) < 0.01) {
    return null
  }

  const causes = []
  
  calcResult.affectedBy.forEach(impact => {
    if (impact.type === 'freeze') {
      causes.push({
        type: 'freeze',
        recordId: impact.id,
        description: impact.description,
        impactAmount: Math.round(impact.days * (contract.total_amount / 365) * 100) / 100
      })
    } else if (impact.type === 'transfer') {
      causes.push({
        type: 'transfer',
        recordId: impact.id,
        description: impact.description,
        impactAmount: 0
      })
    } else if (impact.type === 'makeup_withdrawn') {
      causes.push({
        type: 'makeup_withdrawn',
        recordId: impact.id,
        description: impact.description,
        impactAmount: 0
      })
    }
  })

  if (causes.length === 0) {
    causes.push({
      type: 'entry_record',
      description: '入场记录统计差异',
      impactAmount: difference
    })
  }

  return {
    contractAmount: contractMonthly,
    deferredAmount: calcResult.deferred,
    recognizedAmount: calcResult.recognized,
    differenceAmount: Math.round(difference * 100) / 100,
    causes,
    primaryCause: causes[0]
  }
}

export function generateCalculationHash(contractId, month, ruleVersionId, options = {}) {
  const str = `${contractId}-${month}-${ruleVersionId}-${JSON.stringify(options)}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}
