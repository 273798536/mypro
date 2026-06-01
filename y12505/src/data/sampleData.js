export const generateSampleLattice = (size = 3) => {
  const nodes = []
  const defects = []
  let nodeId = 0

  for (let x = -size; x <= size; x++) {
    for (let y = -size; y <= size; y++) {
      for (let z = -size; z <= size; z++) {
        nodes.push({
          id: `node_${nodeId++}`,
          position: { x, y, z },
          type: 'lattice'
        })
      }
    }
  }

  defects.push({
    id: 'defect_1',
    type: 'VACANCY',
    position: { x: 1, y: 0, z: 0 },
    description: '空位缺陷 - 晶格节点缺失'
  })

  defects.push({
    id: 'defect_2',
    type: 'INTERSTITIAL',
    position: { x: 0.5, y: 0.5, z: 0.5 },
    description: '间隙原子 - 晶格间隙中的额外原子'
  })

  defects.push({
    id: 'defect_3',
    type: 'DISLOCATION',
    position: { x: -1, y: 1, z: 0 },
    description: '位错 - 晶格排列错位'
  })

  return { nodes, defects }
}

export const generateAnomalySample = () => {
  const size = 3
  const nodes = []
  const defects = []
  let nodeId = 0

  for (let x = -size; x <= size; x++) {
    for (let y = -size; y <= size; y++) {
      for (let z = -size; z <= size; z++) {
        nodes.push({
          id: `node_${nodeId++}`,
          position: { x, y, z },
          type: 'lattice'
        })
      }
    }
  }

  nodes.push({
    id: `node_${nodeId++}`,
    position: { x: 6, y: 3, z: 0 },
    type: 'lattice'
  })

  defects.push({
    id: 'defect_overlap_1',
    type: 'IMPURITY',
    position: { x: 0, y: 0, z: 0 },
    description: '杂质原子 A'
  })

  defects.push({
    id: 'defect_overlap_2',
    type: 'VACANCY',
    position: { x: 0.1, y: 0.1, z: 0.1 },
    description: '空位缺陷 - 与杂质原子重叠'
  })

  defects.push({
    id: 'defect_normal',
    type: 'GRAIN_BOUNDARY',
    position: { x: 2, y: -1, z: 1 },
    description: '晶界 - 正常位置'
  })

  return { nodes, defects }
}

export const generateStressData = (nodes, includeExplosion = false) => {
  const stresses = {}
  
  nodes.forEach((node, index) => {
    const baseStress = 50 + Math.random() * 200
    const distFromCenter = Math.sqrt(
      node.position.x * node.position.x +
      node.position.y * node.position.y +
      node.position.z * node.position.z
    )
    const stressMultiplier = 1 + distFromCenter * 0.1

    let stressValue = baseStress * stressMultiplier
    
    if (includeExplosion && index === 0) {
      stressValue = 2500
    }

    stresses[node.id] = {
      xx: stressValue * (0.8 + Math.random() * 0.4),
      yy: stressValue * (0.7 + Math.random() * 0.5),
      zz: stressValue * (0.6 + Math.random() * 0.6),
      xy: stressValue * 0.1 * (Math.random() - 0.5),
      yz: stressValue * 0.1 * (Math.random() - 0.5),
      xz: stressValue * 0.1 * (Math.random() - 0.5)
    }
  })

  return stresses
}

export const generateStressExplosionSample = (nodes) => {
  return generateStressData(nodes, true)
}
