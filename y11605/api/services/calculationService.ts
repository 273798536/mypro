import prisma from '../prisma'
import { createAuditLog } from './auditService'
import type { CalculationResult, Participant } from '../../shared/types'

const CHANNEL_CONFIGS: Record<string, { feeRate: number; fixedFee: number }> = {
  alipay: { feeRate: 0.006, fixedFee: 0 },
  wechat: { feeRate: 0.006, fixedFee: 0 },
  card: { feeRate: 0.01, fixedFee: 2 },
}

function detectAnomalies(participant: any, allParticipants: any[]): string[] {
  const anomalies: string[] = []

  const sameUserOrders = allParticipants.filter((p) => p.userId === participant.userId)
  if (sameUserOrders.length > 1) {
    anomalies.push('同用户多档位')
  }

  if (participant.giftShipped && participant.giftValue > 0) {
    anomalies.push('赠品已发货')
  }

  if (participant.earlyBirdDiscount > 0) {
    anomalies.push('含早鸟折扣')
  }

  return anomalies
}

export function calculateRefund(
  participant: any,
  rule: any,
  allParticipants: any[]
): CalculationResult {
  const anomalies = detectAnomalies(participant, allParticipants)
  const channelConfig = CHANNEL_CONFIGS[participant.payChannel] || CHANNEL_CONFIGS.alipay

  let refundAmount = participant.payAmount

  switch (rule.earlyBirdHandling) {
    case 'full_refund':
      break
    case 'deduct_discount':
      refundAmount -= participant.earlyBirdDiscount
      break
    case 'custom':
      refundAmount -= participant.earlyBirdDiscount * rule.customEarlyBirdRate
      break
  }

  refundAmount = Math.max(0, refundAmount)

  let feeAmount = 0
  if (rule.deductFee) {
    feeAmount = refundAmount * channelConfig.feeRate + channelConfig.fixedFee
    feeAmount = Math.round(feeAmount * 100) / 100
  }

  let giftDeduction = 0
  if (participant.giftShipped && participant.giftValue > 0) {
    giftDeduction = participant.giftValue * rule.giftDeductRate
    giftDeduction = Math.round(giftDeduction * 100) / 100
  }

  let actualRefund = refundAmount - feeAmount - giftDeduction
  actualRefund = Math.max(0, Math.round(actualRefund * 100) / 100)

  if (channelConfig.feeRate !== CHANNEL_CONFIGS.alipay.feeRate || channelConfig.fixedFee !== 0) {
    anomalies.push('渠道手续费差异')
  }

  return {
    participantId: participant.id,
    refundAmount: Math.round(refundAmount * 100) / 100,
    feeAmount,
    actualRefund,
    anomalies,
  }
}

export async function calculateBatchRefunds(
  participantIds: string[],
  ruleId: string,
  operator: string
): Promise<Participant[]> {
  const [participants, rule] = await Promise.all([
    prisma.participant.findMany({
      where: { id: { in: participantIds } },
    }),
    prisma.refundRule.findUnique({ where: { id: ruleId } }),
  ])

  if (!rule) {
    throw new Error('退款规则不存在')
  }

  const updatedParticipants: Participant[] = []

  for (const participant of participants) {
    const result = calculateRefund(participant, rule, participants)

    const beforeSnapshot = { ...participant }

    const updated = await prisma.participant.update({
      where: { id: participant.id },
      data: {
        refundAmount: result.refundAmount,
        feeAmount: result.feeAmount,
        actualRefund: result.actualRefund,
        anomalies: JSON.stringify(result.anomalies),
        status: 'calculated',
        version: { increment: 1 },
      },
    })

    updatedParticipants.push({
      ...updated,
      status: updated.status as any,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      anomalies: result.anomalies,
    } as unknown as Participant)

    await createAuditLog(
      'participant',
      participant.id,
      'calculate',
      operator,
      beforeSnapshot,
      updated,
      '自动计算退款'
    )
  }

  return updatedParticipants
}

export async function getRules() {
  return prisma.refundRule.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createRule(data: any) {
  return prisma.refundRule.create({ data })
}

export async function updateRule(id: string, data: any) {
  return prisma.refundRule.update({ where: { id }, data })
}

export async function getChannelConfigs() {
  return prisma.channelConfig.findMany()
}

export async function initDefaultData() {
  const existingRules = await prisma.refundRule.count()
  if (existingRules === 0) {
    await prisma.refundRule.create({
      data: {
        name: '默认规则',
        deductFee: true,
        giftDeductRate: 1,
        earlyBirdHandling: 'full_refund',
        customEarlyBirdRate: 0,
      },
    })
  }

  const existingChannels = await prisma.channelConfig.count()
  if (existingChannels === 0) {
    await prisma.channelConfig.createMany({
      data: [
        { channel: 'alipay', feeRate: 0.006, fixedFee: 0 },
        { channel: 'wechat', feeRate: 0.006, fixedFee: 0 },
        { channel: 'card', feeRate: 0.01, fixedFee: 2 },
      ],
    })
  }
}
