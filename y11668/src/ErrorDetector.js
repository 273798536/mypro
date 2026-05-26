export class ErrorDetector {
  constructor() {
    this.MAX_SUPPORTS = 10
    this.MAX_LOADS = 10
    this.MAX_LOAD_MAGNITUDE = 1000
    this.MIN_SCALE = 0.1
    this.MAX_SCALE = 5
    this.EXCESSIVE_SCALE = 3
  }

  checkAll(supports, loads, bridgeLength, density, modes) {
    const errors = []
    errors.push(...this.checkSupports(supports, bridgeLength))
    errors.push(...this.checkLoads(loads))
    errors.push(...this.checkPhysics(bridgeLength, density, modes))
    return errors
  }

  checkSupports(supports, bridgeLength) {
    const warnings = []

    if (!supports || supports.length === 0) {
      warnings.push({
        title: '⚠️ 支点缺失',
        message: '桥梁没有设置任何支点！这将导致结构无法稳定，计算结果可能不准确或无法计算。请至少设置2个支点（两端各一个）。'
      })
      return warnings
    }

    if (supports.length === 1) {
      warnings.push({
        title: '⚠️ 支点不足',
        message: '只有1个支点，桥梁可能不稳定。建议至少设置2个支点以形成稳定结构。'
      })
    }

    if (supports.length > this.MAX_SUPPORTS) {
      warnings.push({
        title: '⚠️ 支点过多',
        message: `当前设置了${supports.length}个支点，建议不超过${this.MAX_SUPPORT}个以避免过度约束。`
      })
    }

    const hasPin = supports.some(s => s.type === 'pin')
    const hasRoller = supports.some(s => s.type === 'roller')
    
    if (supports.length >= 2) {
      if (!hasPin && !hasRoller) {
        warnings.push({
          title: '⚠️ 支点类型配置',
          message: '建议使用"铰支+滚动"组合以允许热胀冷缩，使用固定端会限制所有位移。'
        })
      }
    }

    const pinSupports = supports.filter(s => s.type === 'pin')
    const rollerSupports = supports.filter(s => s.type === 'roller')
    const fixedSupports = supports.filter(s => s.type === 'fixed')

    if (fixedSupports.length > 2) {
      warnings.push({
        title: '⚠️ 过多固定端',
        message: '设置了多个固定端，这会产生很大的约束应力，在实际工程中不常见。'
      })
    }

    if (bridgeLength) {
      const sortedSupports = [...supports].sort((a, b) => a.x - b.x)
      const minSpacing = bridgeLength * 0.1
      for (let i = 1; i < sortedSupports.length; i++) {
        const spacing = sortedSupports[i].x - sortedSupports[i - 1].x
        if (spacing < minSpacing) {
          warnings.push({
            title: '⚠️ 支点间距过小',
            message: `两个支点间距仅${spacing.toFixed(2)}m，可能导致局部应力集中。建议间距不小于桥长的10%（${minSpacing.toFixed(2)}m）。`
          })
          break
        }
      }
    }

    return warnings
  }

  checkLoads(loads) {
    const warnings = []

    if (loads && loads.length > this.MAX_LOADS) {
      warnings.push({
        title: '⚠️ 载荷过多',
        message: `当前设置了${loads.length}个载荷，建议不超过${this.MAX_LOADS}个以保持计算稳定。`
      })
    }

    if (loads) {
      loads.forEach((load, index) => {
        if (load.magnitude > this.MAX_LOAD_MAGNITUDE) {
          warnings.push({
            title: '⚠️ 载荷过大',
            message: `载荷${index + 1}大小为${load.magnitude.toFixed(1)}kN，超过建议上限${this.MAX_LOAD_MAGNITUDE}kN。过大的载荷可能导致结构失效或计算发散。`
          })
        }

        if (load.magnitude < 0) {
          warnings.push({
            title: '⚠️ 载荷方向异常',
            message: `载荷${index + 1}为负值（${load.magnitude.toFixed(1)}kN），表示向上作用。请确认这是否为预期载荷方向。`
          })
        }

        if (load.magnitude === 0) {
          warnings.push({
            title: '⚠️ 零载荷',
            message: `载荷${index + 1}大小为0，将不会产生任何效果。可以删除此载荷。`
          })
        }
      })
    }

    return warnings
  }

  checkPhysics(bridgeLength, density, modes) {
    const warnings = []

    if (density <= 0) {
      warnings.push({
        title: '⚠️ 材料参数错误',
        message: '密度必须大于0。当前密度设置无效，请检查材料参数。'
      })
    }

    if (bridgeLength <= 0) {
      warnings.push({
        title: '⚠️ 几何参数错误',
        message: '桥梁长度必须大于0。当前长度设置无效，请检查几何参数。'
      })
    }

    return warnings
  }

  checkScale(scale) {
    if (scale > this.EXCESSIVE_SCALE) {
      return {
        title: '⚠️ 变形缩放过大',
        message: `当前变形缩放为${scale.toFixed(1)}倍，可能导致视觉上的误导。实际变形通常很小（毫米级），请谨慎解读放大后的变形图。建议缩放不超过${this.EXCESSIVE_SCALE}倍。`
      }
    }

    if (scale < this.MIN_SCALE) {
      return {
        title: '⚠️ 变形缩放过小',
        message: `当前变形缩放为${scale.toFixed(1)}倍，可能难以看清变形效果。建议使用0.5倍以上的缩放以便观察。`
      }
    }

    return null
  }

  checkModeNumber(modeNum, totalModes) {
    const warnings = []

    if (modeNum > totalModes) {
      warnings.push({
        title: '⚠️ 振型阶数超出范围',
        message: `当前选择第${modeNum}阶振型，但只能计算${totalModes}阶。请选择有效的振型阶数。`
      })
    }

    return warnings
  }

  checkDeformationResult(deformation, threshold = 1.0) {
    const warnings = []

    if (deformation) {
      let maxDisp = 0
      for (let i = 0; i < deformation.length; i++) {
        const disp = Math.abs(deformation[i][0] || 0)
        if (disp > maxDisp) maxDisp = disp
      }

      if (maxDisp > threshold) {
        warnings.push({
          title: '⚠️ 变形过大',
          message: `计算的最大位移为${(maxDisp * 1000).toFixed(2)}mm，超过了${threshold * 1000}mm的警告阈值。这可能表示结构设计不合理或载荷过大。`
        })
      }
    }

    return warnings
  }
}
