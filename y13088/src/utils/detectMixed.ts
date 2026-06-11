import type { MixedInputResult } from '@/types'

export function detectMixedInput(input: string): MixedInputResult {
  const mixedPattern = /^([0-9B]+[F层]?)[-_\s]*([A-Z]区?)$/i
  const match = input.match(mixedPattern)
  if (match) {
    return {
      isMixed: true,
      floor: match[1],
      unit: match[2],
      reason: '检测到楼层与单位混写（如"3F-A区"），需拆分为独立楼层和单位字段以确保筛选准确'
    }
  }
  return { isMixed: false, floor: input, unit: '' }
}
