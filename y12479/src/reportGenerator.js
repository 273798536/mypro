const { MATERIAL_TYPES, ERROR_MESSAGES } = require('./constants')

class ReportGenerator {
  constructor() {
    this.smoothReports = []
    this.broadcastReports = []
  }

  addReport(report, materialType) {
    if (materialType === MATERIAL_TYPES.SMOOTH) {
      this.smoothReports.push(report)
    } else if (materialType === MATERIAL_TYPES.BROADCAST) {
      this.broadcastReports.push(report)
    }
  }

  generateSummary() {
    return {
      smooth: this.generateTypeSummary(this.smoothReports, '顺利材料'),
      broadcast: this.generateTypeSummary(this.broadcastReports, '广播冷却材料')
    }
  }

  generateTypeSummary(reports, typeName) {
    if (reports.length === 0) {
      return {
        type: typeName,
        count: 0,
        message: '暂无测试数据'
      }
    }

    const avgScore = reports.reduce((sum, r) => sum + r.score, 0) / reports.length
    const totalErrors = reports.reduce((sum, r) => sum + r.errors.length, 0)
    const avgExitTime = reports.reduce((sum, r) => sum + r.averageExitTime, 0) / reports.length
    const totalExited = reports.reduce((sum, r) => sum + r.exitedCount, 0)
    const totalAudience = reports.reduce((sum, r) => sum + r.totalAudience, 0)

    return {
      type: typeName,
      count: reports.length,
      averageScore: Math.round(avgScore),
      totalErrors,
      averageExitTime: Math.round(avgExitTime),
      exitRate: Math.round((totalExited / totalAudience) * 100),
      details: reports.map(r => ({
        name: r.name || '未命名测试',
        score: r.score,
        errors: r.errors.length,
        exitedCount: r.exitedCount,
        totalAudience: r.totalAudience
      }))
    }
  }

  printSummary() {
    const summary = this.generateSummary()
    
    console.log('\n' + '='.repeat(70))
    console.log('📋 音乐会场疏散棋 - 综合测试报告')
    console.log('='.repeat(70))

    this.printTypeSummary(summary.smooth)
    this.printTypeSummary(summary.broadcast)

    console.log('='.repeat(70) + '\n')
  }

  printTypeSummary(typeSummary) {
    console.log(`\n【${typeSummary.type}】`)
    console.log('-'.repeat(40))
    
    if (typeSummary.count === 0) {
      console.log(`  ${typeSummary.message}`)
      return
    }

    console.log(`  测试数量: ${typeSummary.count}`)
    console.log(`  平均得分: ${typeSummary.averageScore}`)
    console.log(`  总错误数: ${typeSummary.totalErrors}`)
    console.log(`  平均疏散时间: ${typeSummary.averageExitTime} 步`)
    console.log(`  疏散成功率: ${typeSummary.exitRate}%`)
    
    console.log(`  详细结果:`)
    for (const detail of typeSummary.details) {
      console.log(`    - ${detail.name}: ${detail.score}分, ${detail.exitedCount}/${detail.totalAudience}人疏散, ${detail.errors}个错误`)
    }
  }

  printErrorDetails(report) {
    if (report.errors.length === 0) {
      console.log('  ✅ 无错误')
      return
    }

    console.log('  ❌ 错误详情:')
    const groupedErrors = {}
    
    for (const error of report.errors) {
      if (!groupedErrors[error.type]) {
        groupedErrors[error.type] = []
      }
      groupedErrors[error.type].push(error)
    }

    for (const [type, errors] of Object.entries(groupedErrors)) {
      const errorInfo = ERROR_MESSAGES[type] || { title: type, suggestion: '无建议' }
      console.log(`    [${errors.length}次] ${errorInfo.title}`)
      console.log(`       说明: ${errorInfo.description}`)
      console.log(`       建议: ${errorInfo.suggestion}`)
    }
  }

  exportToJSON(filePath) {
    const summary = this.generateSummary()
    const json = JSON.stringify(summary, null, 2)
    const fs = require('fs')
    fs.writeFileSync(filePath, json, 'utf8')
    console.log(`\n📄 报告已导出到: ${filePath}`)
  }
}

module.exports = ReportGenerator
