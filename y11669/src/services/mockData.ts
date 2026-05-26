import type { Rack, ACUnit, Alert, TemperatureSample, DataCorrection, DataQualityIssue, Position3D } from '../types/scene'

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function generateRacks(): Rack[] {
  const racks: Rack[] = []
  const rows = 4
  const cols = 6
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseTemp = 22 + Math.random() * 8
      const powerUsage = 2 + Math.random() * 5
      const status = Math.random() > 0.85 ? (Math.random() > 0.5 ? 'warning' : 'critical') : 'normal'
      
      racks.push({
        id: `rack-${row}-${col}`,
        name: `机柜 R${row + 1}${String.fromCharCode(65 + col)}`,
        position: {
          x: col * 2.5 - (cols - 1) * 1.25,
          y: 0,
          z: row * 3 - (rows - 1) * 1.5,
        },
        size: { width: 0.6, height: 2.0, depth: 1.0 },
        totalSlots: 42,
        maxPower: 10,
        usedSlots: Math.floor(30 + Math.random() * 12),
        currentPower: powerUsage,
        inletTemp: baseTemp,
        outletTemp: baseTemp + 3 + Math.random() * 5,
        status: status as Rack['status'],
        hasAlert: status !== 'normal',
      })
    }
  }
  
  return racks
}

export function generateACUnits(): ACUnit[] {
  return [
    {
      id: 'ac-1',
      name: '精密空调 AC-01',
      position: { x: -8, y: 0, z: -5 },
      size: { width: 1.2, height: 2.2, depth: 1.5 },
      coolingCapacity: 50,
      supplyTemp: 16,
      returnTemp: 28,
      fanSpeed: 75,
      running: true,
      dataLagSeconds: 0,
      status: 'normal',
    },
    {
      id: 'ac-2',
      name: '精密空调 AC-02',
      position: { x: 8, y: 0, z: -5 },
      size: { width: 1.2, height: 2.2, depth: 1.5 },
      coolingCapacity: 50,
      supplyTemp: 16.5,
      returnTemp: 29,
      fanSpeed: 80,
      running: true,
      dataLagSeconds: 180,
      status: 'warning',
    },
    {
      id: 'ac-3',
      name: '精密空调 AC-03',
      position: { x: 0, y: 0, z: 5 },
      size: { width: 1.2, height: 2.2, depth: 1.5 },
      coolingCapacity: 50,
      supplyTemp: 15.5,
      returnTemp: 27,
      fanSpeed: 65,
      running: true,
      dataLagSeconds: 0,
      status: 'normal',
    },
  ]
}

export function generateAlerts(racks: Rack[], acUnits: ACUnit[]): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()
  
  racks.filter(r => r.status === 'critical').forEach(rack => {
    alerts.push({
      id: generateId(),
      sourceType: 'temperature',
      sourceId: rack.id,
      timestamp: new Date(now.getTime() - Math.random() * 30 * 60 * 1000),
      level: 'critical',
      message: `${rack.name} 出风温度过高 (${rack.outletTemp.toFixed(1)}°C)`,
      status: 'pending',
      needsManualConfirm: false,
      position: { ...rack.position, y: 1 },
    })
  })
  
  racks.filter(r => r.status === 'warning').forEach(rack => {
    alerts.push({
      id: generateId(),
      sourceType: 'temperature',
      sourceId: rack.id,
      timestamp: new Date(now.getTime() - Math.random() * 60 * 60 * 1000),
      level: 'warning',
      message: `${rack.name} 温度接近阈值 (${rack.outletTemp.toFixed(1)}°C)`,
      status: Math.random() > 0.5 ? 'acknowledged' : 'pending',
      needsManualConfirm: Math.random() > 0.7,
      position: { ...rack.position, y: 1 },
    })
  })
  
  acUnits.filter(a => a.status !== 'normal').forEach(ac => {
    alerts.push({
      id: generateId(),
      sourceType: 'ac',
      sourceId: ac.id,
      timestamp: new Date(now.getTime() - Math.random() * 2 * 60 * 60 * 1000),
      level: 'warning',
      message: `${ac.name} 数据滞后 ${Math.floor(ac.dataLagSeconds / 60)} 分钟`,
      status: 'pending',
      needsManualConfirm: true,
      position: { ...ac.position, y: 1 },
    })
  })
  
  alerts.push({
    id: generateId(),
    sourceType: 'power',
    sourceId: 'rack-2-2',
    timestamp: new Date(now.getTime() - 45 * 60 * 1000),
    level: 'warning',
    message: '机柜 R3C 负载超过80%',
    status: 'auto-resolved',
    correctionNote: '负载已自动回落至正常范围',
    needsManualConfirm: true,
    position: { x: -2.5, y: 1, z: 0 },
  })
  
  return alerts
}

export function generateTemperatureSamples(racks: Rack[]): TemperatureSample[] {
  const samples: TemperatureSample[] = []
  const now = new Date()
  
  racks.forEach(rack => {
    const sampleCount = 5
    for (let i = 0; i < sampleCount; i++) {
      const yPos = 0.3 + (i / sampleCount) * 1.8
      const tempVariation = Math.sin(i * 0.8) * 2
      
      samples.push({
        id: `${rack.id}-sample-${i}`,
        rackId: rack.id,
        position: {
          x: rack.position.x,
          y: yPos,
          z: rack.position.z + rack.size.depth / 2 + 0.1,
        },
        timestamp: new Date(now.getTime() - Math.random() * 5 * 60 * 1000),
        inletTemp: rack.inletTemp + tempVariation * 0.3,
        outletTemp: rack.outletTemp + tempVariation,
        dataSource: i % 5 === 0 ? 'BMS系统' : '机柜传感器',
        qualityFlag: Math.random() > 0.9 ? 'missing' : 'good',
      })
    }
  })
  
  return samples
}

export function generateDataCorrections(): DataCorrection[] {
  const now = new Date()
  return [
    {
      id: generateId(),
      sampleId: 'rack-1-1-sample-2',
      correctedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      operator: '张工',
      originalValue: 45.2,
      correctedValue: 32.5,
      reason: '传感器漂移，已校准',
      dataSource: '人工修正',
    },
    {
      id: generateId(),
      sampleId: 'rack-2-3-sample-1',
      correctedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      operator: '李工',
      originalValue: 18.0,
      correctedValue: 24.5,
      reason: '数据异常，参考相邻机柜修正',
      dataSource: '人工修正',
    },
  ]
}

export function generateDataQualityIssues(samples: TemperatureSample[], acUnits: ACUnit[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  const now = new Date()
  
  const missingSamples = samples.filter(s => s.qualityFlag === 'missing')
  missingSamples.forEach(sample => {
    issues.push({
      type: 'gap',
      severity: 'warning',
      message: `采样点 ${sample.id} 数据缺失`,
      location: sample.position,
      timestamp: sample.timestamp,
    })
  })
  
  acUnits.filter(a => a.dataLagSeconds > 60).forEach(ac => {
    issues.push({
      type: 'lag',
      severity: 'warning',
      message: `${ac.name} 数据滞后 ${Math.floor(ac.dataLagSeconds / 60)} 分钟`,
      location: ac.position,
      timestamp: now,
    })
  })
  
  issues.push({
    type: 'occlusion',
    severity: 'info',
    message: 'R2D区域高温点可能被遮挡，建议调整视角查看',
    timestamp: now,
  })
  
  return issues
}

export function generateTemperatureFieldData(racks: Rack[]): { positions: Float32Array; temperatures: Float32Array } {
  const gridSize = 20
  const positions = new Float32Array(gridSize * gridSize * gridSize * 3)
  const temperatures = new Float32Array(gridSize * gridSize * gridSize)
  
  const bounds = { minX: -10, maxX: 10, minY: 0, maxY: 3, minZ: -8, maxZ: 8 }
  const stepX = (bounds.maxX - bounds.minX) / (gridSize - 1)
  const stepY = (bounds.maxY - bounds.minY) / (gridSize - 1)
  const stepZ = (bounds.maxZ - bounds.minZ) / (gridSize - 1)
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      for (let k = 0; k < gridSize; k++) {
        const idx = i * gridSize * gridSize + j * gridSize + k
        const x = bounds.minX + i * stepX
        const y = bounds.minY + j * stepY
        const z = bounds.minZ + k * stepZ
        
        positions[idx * 3] = x
        positions[idx * 3 + 1] = y
        positions[idx * 3 + 2] = z
        
        let temp = 22
        racks.forEach(rack => {
          const dx = x - rack.position.x
          const dz = z - rack.position.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          const heightFactor = Math.exp(-Math.pow(y - 1, 2) / 2)
          
          if (dist < 3) {
            const influence = (1 - dist / 3) * heightFactor
            temp += (rack.outletTemp - 22) * influence * 0.5
          }
        })
        
        temperatures[idx] = temp
      }
    }
  }
  
  return { positions, temperatures }
}
