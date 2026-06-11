import type { Bar, Collision, BarFrame } from '@/types'

const COLLISION_THRESHOLD = 0.3

export function detectCollisions(bars: Bar[], frames: BarFrame[], frameIndex: number): Collision[] {
  const frameData = frames.filter(f => f.frameIndex === frameIndex)
  const collisions: Collision[] = []

  const getPositionY = (barId: string): number => {
    const frame = frameData.find(f => f.barId === barId)
    if (frame) return frame.positionY
    const bar = bars.find(b => b.id === barId)
    return bar ? bar.positionY : 0
  }

  for (let i = 0; i < bars.length; i++) {
    for (let j = i + 1; j < bars.length; j++) {
      const a = bars[i]
      const b = bars[j]
      if (Math.abs(a.positionZ - b.positionZ) > 2) continue

      const aY = getPositionY(a.id)
      const bY = getPositionY(b.id)
      const dist = Math.abs(aY - bY)

      if (dist < COLLISION_THRESHOLD) {
        collisions.push({
          id: `col-auto-${a.id}-${b.id}-f${frameIndex}`,
          objectAId: a.id,
          objectBId: b.id,
          distance: Math.round(dist * 1000) / 1000,
          frameIndex,
          status: 'collision',
        })
      }
    }
  }
  return collisions
}

export function getBarPositionAtFrame(bar: Bar, frames: BarFrame[], frameIndex: number): number {
  const frame = frames.find(f => f.barId === bar.id && f.frameIndex === frameIndex)
  return frame ? frame.positionY : bar.positionY
}

export function generateOverlapHint(collision: Collision, bars: Bar[]): string {
  const barA = bars.find(b => b.id === collision.objectAId)
  const barB = bars.find(b => b.id === collision.objectBId)
  if (!barA || !barB) return '请检查碰撞对象的位置关系'
  const diff = collision.distance
  const needed = (0.3 - diff) / 2
  return `请将${barA.name}上升${needed.toFixed(2)}m，或将${barB.name}下降${needed.toFixed(2)}m，确保间距达到安全阈值0.3m`
}
