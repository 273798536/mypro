import type { AirflowPath, PathNode } from '@/types'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  color: string
  pathIndex: number
  nodeProgress: number
  temperature: number
  velocity: number
}

export class ParticleSystem {
  particles: Particle[] = []
  maxParticles: number = 200
  private paths: AirflowPath[] = []
  private lastSpawnTime: number = 0
  private spawnInterval: number = 50

  setPaths(paths: AirflowPath[]) {
    this.paths = paths
  }

  private getPositionOnPath(
    path: AirflowPath,
    progress: number
  ): PathNode | null {
    if (path.pathNodes.length < 2) return null
    const scaledProgress = progress * (path.pathNodes.length - 1)
    const index = Math.floor(scaledProgress)
    const t = scaledProgress - index

    if (index >= path.pathNodes.length - 1) {
      return path.pathNodes[path.pathNodes.length - 1]
    }

    const current = path.pathNodes[index]
    const next = path.pathNodes[index + 1]

    return {
      x: current.x + (next.x - current.x) * t,
      y: current.y + (next.y - current.y) * t,
      velocity: current.velocity + (next.velocity - current.velocity) * t,
      temperature: current.temperature + (next.temperature - current.temperature) * t,
    }
  }

  private spawnParticle(currentTime: number) {
    if (this.particles.length >= this.maxParticles) return
    if (currentTime - this.lastSpawnTime < this.spawnInterval) return

    this.lastSpawnTime = currentTime

    for (const path of this.paths) {
      if (this.particles.length >= this.maxParticles) break

      const particle: Particle = {
        x: path.startX,
        y: path.startY,
        vx: 0,
        vy: 0,
        size: 3 + Math.random() * 3,
        life: 1,
        maxLife: 1,
        color: path.color,
        pathIndex: this.paths.indexOf(path),
        nodeProgress: 0,
        temperature: path.temperature,
        velocity: path.velocity,
      }

      this.particles.push(particle)
    }
  }

  update(deltaTime: number, currentTime: number) {
    this.spawnParticle(currentTime)

    this.particles = this.particles.filter((p) => {
      p.nodeProgress += deltaTime * 0.0005 * p.velocity

      const path = this.paths[p.pathIndex]
      if (path) {
        const pos = this.getPositionOnPath(path, p.nodeProgress)
        if (pos) {
          p.x = pos.x
          p.y = pos.y
          p.temperature = pos.temperature
          p.velocity = pos.velocity
        }
      }

      p.life -= deltaTime * 0.0003

      if (p.nodeProgress >= 1 || p.life <= 0) {
        return false
      }

      return true
    })
  }

  render(ctx: CanvasRenderingContext2D) {
    this.particles.forEach((p) => {
      const alpha = p.life / p.maxLife
      ctx.save()
      ctx.globalAlpha = alpha * 0.9
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.restore()
    })
  }

  reset() {
    this.particles = []
    this.lastSpawnTime = 0
  }
}
