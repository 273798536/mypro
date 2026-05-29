import type { Tug, Berth, Ship, DispatchValidation, FailReason } from '@/types'
import { FUEL_COST_PER_DISPATCH } from '@/data/sampleData'

export function validateDispatch(
  ship: Ship,
  tugs: Tug[],
  berth: Berth,
  currentTime: number,
): DispatchValidation {
  const reasons: FailReason[] = []
  const messages: string[] = []

  if (currentTime < ship.tideWindowStart || currentTime > ship.tideWindowEnd) {
    reasons.push('tide_missed')
    const windowEnd = ship.tideWindowEnd
    if (currentTime > windowEnd) {
      messages.push(`潮汐窗口已于 ${formatMin(windowEnd)} 关闭，当前时间 ${formatMin(currentTime)}`)
    } else {
      messages.push(`潮汐窗口 ${formatMin(ship.tideWindowStart)}-${formatMin(windowEnd)} 尚未开放`)
    }
  }

  const busyTugs = tugs.filter(t => t.status === 'busy')
  if (busyTugs.length > 0) {
    reasons.push('tug_conflict')
    messages.push(`拖轮 ${busyTugs.map(t => t.name).join('、')} 正在执行任务，无法指派`)
  }

  for (const tug of tugs) {
    if (tug.currentFuel < FUEL_COST_PER_DISPATCH) {
      reasons.push('fuel_shortage')
      messages.push(`拖轮 ${tug.name} 燃油不足（当前 ${tug.currentFuel}/${tug.maxFuel}，需 ${FUEL_COST_PER_DISPATCH}）`)
    }
  }

  if (berth.status === 'occupied') {
    reasons.push('berth_occupied')
    messages.push(`${berth.name} 已被占用，预计 ${formatMin(berth.occupiedUntil)} 释放`)
  } else if (berth.maxTonnage < ship.tonnage) {
    reasons.push('berth_occupied')
    messages.push(`${berth.name} 最大吨位 ${berth.maxTonnage / 10000} 万吨，无法容纳 ${ship.tonnage / 10000} 万吨船舶`)
  }

  return {
    valid: reasons.length === 0,
    reasons,
    messages,
  }
}

function formatMin(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

export function checkTideWindowExpired(ships: Ship[], currentTime: number): { shipId: string; shipName: string }[] {
  return ships
    .filter(s => s.status === 'arrived' && currentTime > s.tideWindowEnd)
    .map(s => ({ shipId: s.id, shipName: s.name }))
}
