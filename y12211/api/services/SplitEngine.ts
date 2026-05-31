import type { WaterfallStep, SplitDetail, TicketOrder, SplitResult, ExceptionItem } from '../../shared/types'
import { mockRuleVersions, mockRules } from '../data/mockData'

export class SplitEngine {
  private generateId(): string {
    return Math.random().toString(36).substring(2, 10)
  }

  public calculateWaterfall(totalAmount: number, steps: WaterfallStep[]): SplitDetail[] {
    const sortedSteps = [...steps].sort((a, b) => a.priority - b.priority)
    const results: SplitDetail[] = []
    let remainingAmount = totalAmount

    for (const step of sortedSteps) {
      let amount: number

      if (step.type === 'FIXED') {
        amount = Math.min(step.value, remainingAmount)
      } else {
        amount = Math.round((totalAmount * step.value / 100) * 100) / 100
      }

      results.push({
        stepId: step.id,
        stepName: step.name,
        recipient: step.recipient,
        amount,
      })

      remainingAmount -= amount
    }

    if (remainingAmount > 0.01) {
      results.push({
        stepId: 'remaining',
        stepName: '剩余金额',
        recipient: '风险准备金',
        amount: Math.round(remainingAmount * 100) / 100,
      })
    }

    return results
  }

  public getRuleVersion(ruleId: string, version?: number): WaterfallStep[] | null {
    const rule = mockRules.find(r => r.id === ruleId)
    if (!rule) return null

    const targetVersion = version ?? rule.currentVersion
    const ruleVersion = mockRuleVersions.find(
      rv => rv.ruleId === ruleId && rv.version === targetVersion
    )

    return ruleVersion?.waterfallConfig ?? null
  }

  public detectExceptions(order: TicketOrder): ExceptionItem[] {
    const exceptions: ExceptionItem[] = []
    const now = new Date().toISOString()

    if (order.isComboSplit) {
      exceptions.push({
        id: this.generateId(),
        orderId: order.id,
        type: 'COMBO_SPLIT',
        severity: 'PENDING',
        title: '联票需要拆分',
        description: `订单${order.orderNo}包含${order.ticketCount}张联票，需要拆分为不同场次分别分账`,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      })
    }

    if (order.refundCrossExhibition) {
      exceptions.push({
        id: this.generateId(),
        orderId: order.id,
        type: 'REFUND_CROSS',
        severity: 'PENDING',
        title: '跨场退款待确认',
        description: `订单${order.orderNo}存在跨场退款，需要确认分账调整方式`,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      })
    }

    return exceptions
  }

  public processSplit(
    order: TicketOrder,
    ruleId: string,
    version?: number
  ): { result: SplitResult | null; exceptions: ExceptionItem[] } {
    const exceptions = this.detectExceptions(order)
    const waterfallConfig = this.getRuleVersion(ruleId, version)

    if (!waterfallConfig) {
      exceptions.push({
        id: this.generateId(),
        orderId: order.id,
        type: 'RULE_MISSING',
        severity: 'ERROR',
        title: '分账规则缺失',
        description: `找不到规则ID ${ruleId} 的分账配置`,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      return { result: null, exceptions }
    }

    const rule = mockRules.find(r => r.id === ruleId)
    const splitDetails = this.calculateWaterfall(order.totalAmount, waterfallConfig)
    const hasSponsorshipDeduction = waterfallConfig.some(s => s.name.includes('赞助'))
    const sponsorshipAmount = splitDetails
      .filter(d => d.stepName.includes('赞助'))
      .reduce((sum, d) => sum + d.amount, 0)

    const result: SplitResult = {
      id: this.generateId(),
      orderId: order.id,
      ruleId,
      ruleVersion: version ?? rule!.currentVersion,
      totalAmount: order.totalAmount,
      splitDetails,
      hasSponsorshipDeduction,
      sponsorshipAmount,
      finalAmount: order.totalAmount,
      splitTime: new Date().toISOString(),
      status: exceptions.length > 0 ? 'PENDING' : 'CONFIRMED',
      createdAt: new Date().toISOString(),
    }

    return { result, exceptions }
  }

  public compareRuleVersions(
    ruleId: string,
    version1: number,
    version2: number,
    sampleAmount: number = 1000
  ): { v1Details: SplitDetail[]; v2Details: SplitDetail[]; diff: { name: string; v1: number; v2: number; delta: number }[] } | null {
    const config1 = this.getRuleVersion(ruleId, version1)
    const config2 = this.getRuleVersion(ruleId, version2)

    if (!config1 || !config2) return null

    const v1Details = this.calculateWaterfall(sampleAmount, config1)
    const v2Details = this.calculateWaterfall(sampleAmount, config2)

    const allNames = new Set([...v1Details.map(d => d.stepName), ...v2Details.map(d => d.stepName)])
    const diff = Array.from(allNames).map(name => {
      const v1 = v1Details.find(d => d.stepName === name)?.amount ?? 0
      const v2 = v2Details.find(d => d.stepName === name)?.amount ?? 0
      return { name, v1, v2, delta: Math.round((v2 - v1) * 100) / 100 }
    })

    return { v1Details, v2Details, diff }
  }
}

export const splitEngine = new SplitEngine()
