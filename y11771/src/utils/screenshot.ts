import * as THREE from 'three'
import { type RobotArm } from './kinematics'
import { computeJointPositions, computeEndEffector } from './kinematics'

function addWatermark(
  canvas: HTMLCanvasElement,
  arm: RobotArm,
  timestamp: string
): HTMLCanvasElement {
  const w = canvas.width
  const h = canvas.height
  const output = document.createElement('canvas')
  output.width = w
  output.height = h
  const ctx = output.getContext('2d')!

  ctx.drawImage(canvas, 0, 0)

  const ee = computeEndEffector(arm)
  const lines = [
    `时间: ${timestamp}`,
    `末端位置: (${ee.x.toFixed(3)}, ${ee.y.toFixed(3)}, ${ee.z.toFixed(3)})`,
    `关节角度: ${arm.joints.map(j => `θ${j.id}=${j.angle.toFixed(1)}°`).join('  ')}`,
    `臂长: ${arm.joints.filter(j => j.length > 0).map(j => `L${j.id}=${j.length.toFixed(2)}`).join('  ')}`,
  ]

  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, h - 28 * lines.length - 12, w, 28 * lines.length + 12)

  ctx.font = '13px "JetBrains Mono", monospace'
  ctx.fillStyle = '#00e5ff'
  lines.forEach((line, i) => {
    ctx.fillText(line, 12, h - 28 * (lines.length - i) + 4)
  })

  return output
}

export function exportScreenshot(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  arm: RobotArm
): void {
  gl.render(scene, camera)

  const canvas = gl.domElement
  const timestamp = new Date().toLocaleString('zh-CN')

  const watermarked = addWatermark(canvas, arm, timestamp)

  const link = document.createElement('a')
  const jointStr = arm.joints.map(j => `j${j.id}_${j.angle.toFixed(0)}`).join('_')
  link.download = `机械臂_${timestamp.replace(/[/: ]/g, '-')}_${jointStr}.png`
  link.href = watermarked.toDataURL('image/png')
  link.click()
}
