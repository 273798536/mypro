import type { ProtectionRule, ProtectionResult } from '@/types'
import { getRulesForSurface } from '@/data/protectionRules'

function evaluateRule(rule: ProtectionRule, value: number): ProtectionResult {
  let triggered = false
  let clampedValue: number | undefined

  switch (rule.condition) {
    case 'range':
      if (value < rule.threshold) {
        triggered = true
        if (rule.action === 'clamp') {
          clampedValue = rule.threshold
        }
      }
      break
    case 'explosion':
      if (Math.abs(value) > rule.threshold) {
        triggered = true
      }
      break
    case 'discontinuity':
      if (value < rule.threshold) {
        triggered = true
      }
      break
  }

  return {
    ruleId: rule.id,
    triggered,
    action: rule.action,
    message: rule.message,
    source: rule.source,
    clampedValue,
  }
}

export function evaluateProtections(
  surfaceId: string,
  params: Record<string, number>
): ProtectionResult[] {
  const rules = getRulesForSurface(surfaceId)
  return rules.map(rule => {
    const value = params[rule.paramKey]
    if (value === undefined) {
      return {
        ruleId: rule.id,
        triggered: false,
        action: rule.action,
        message: rule.message,
        source: rule.source,
      }
    }
    return evaluateRule(rule, value)
  })
}

export function applyProtectionClamps(
  surfaceId: string,
  params: Record<string, number>
): Record<string, number> {
  const results = evaluateProtections(surfaceId, params)
  const clamped = { ...params }
  for (const result of results) {
    if (result.triggered && result.action === 'clamp' && result.clampedValue !== undefined) {
      const rule = getRulesForSurface(surfaceId).find(r => r.id === result.ruleId)
      if (rule) {
        clamped[rule.paramKey] = result.clampedValue
      }
    }
  }
  return clamped
}

export function hasBlockedProtections(results: ProtectionResult[]): boolean {
  return results.some(r => r.triggered && r.action === 'block')
}

export function getTriggeredResults(results: ProtectionResult[]): ProtectionResult[] {
  return results.filter(r => r.triggered)
}
