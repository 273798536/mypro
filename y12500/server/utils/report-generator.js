const { v4: uuidv4 } = require('uuid');
const { ViolationTypes, SeverityLevels } = require('./validation');

const SeverityPriority = {
  [SeverityLevels.CRITICAL]: 0,
  [SeverityLevels.WARNING]: 1,
  [SeverityLevels.INFO]: 2
};

const TypeNames = {
  [ViolationTypes.FORBIDDEN_ZONE]: '路线穿禁区',
  [ViolationTypes.BLIND_ZONE_MISS]: '盲区漏拍',
  [ViolationTypes.HEIGHT_LIMIT]: '高度超限'
};

const TypeColors = {
  [ViolationTypes.FORBIDDEN_ZONE]: '#dc2626',
  [ViolationTypes.BLIND_ZONE_MISS]: '#f59e0b',
  [ViolationTypes.HEIGHT_LIMIT]: '#7c3aed'
};

function generateReport(inspectionResult, warehouse, route, shelves, context = {}) {
  const violations = inspectionResult.violations || [];
  
  const groupedByType = {
    [ViolationTypes.FORBIDDEN_ZONE]: violations.filter(v => v.violation_type === ViolationTypes.FORBIDDEN_ZONE),
    [ViolationTypes.BLIND_ZONE_MISS]: violations.filter(v => v.violation_type === ViolationTypes.BLIND_ZONE_MISS),
    [ViolationTypes.HEIGHT_LIMIT]: violations.filter(v => v.violation_type === ViolationTypes.HEIGHT_LIMIT)
  };
  
  const groupedBySeverity = {
    [SeverityLevels.CRITICAL]: violations.filter(v => v.severity === SeverityLevels.CRITICAL),
    [SeverityLevels.WARNING]: violations.filter(v => v.severity === SeverityLevels.WARNING),
    [SeverityLevels.INFO]: violations.filter(v => v.severity === SeverityLevels.INFO)
  };
  
  const passRate = inspectionResult.total_points > 0
    ? ((inspectionResult.passed_points / inspectionResult.total_points) * 100).toFixed(1)
    : '0.0';
  
  const overallStatus = groupedBySeverity[SeverityLevels.CRITICAL].length > 0
    ? '不通过'
    : groupedBySeverity[SeverityLevels.WARNING].length > 0
      ? '有条件通过'
      : '通过';
  
  const typeSections = Object.keys(groupedByType).map(type => {
    const typeViolations = groupedByType[type];
    if (typeViolations.length === 0) return null;
    
    const sortedViolations = [...typeViolations].sort((a, b) => 
      SeverityPriority[a.severity] - SeverityPriority[b.severity]
    );
    
    const criticalCount = typeViolations.filter(v => v.severity === SeverityLevels.CRITICAL).length;
    const warningCount = typeViolations.filter(v => v.severity === SeverityLevels.WARNING).length;
    
    return {
      type,
      typeName: TypeNames[type],
      color: TypeColors[type],
      count: typeViolations.length,
      criticalCount,
      warningCount,
      violations: sortedViolations.map(v => formatViolation(v))
    };
  }).filter(Boolean);
  
  const recommendations = generateRecommendations(groupedByType, context);
  const actionPlan = generateActionPlan(groupedByType, context);
  const preventionMeasures = generatePreventionMeasures(context);
  
  const report = {
    id: uuidv4(),
    result_id: inspectionResult.id,
    generated_at: new Date().toISOString(),
    
    summary: {
      title: `仓库无人机巡检报告 - ${warehouse.name}`,
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        dimensions: `${warehouse.width}m × ${warehouse.depth}m × ${warehouse.height}m`
      },
      route: {
        id: route.id,
        name: route.name,
        version: route.version,
        waypointCount: route.waypoints ? route.waypoints.length : 0
      },
      inspectionTime: inspectionResult.created_at,
      totalPoints: inspectionResult.total_points,
      passedPoints: inspectionResult.passed_points,
      passRate: `${passRate}%`,
      overallStatus,
      
      violationStats: {
        total: violations.length,
        byType: {
          [ViolationTypes.FORBIDDEN_ZONE]: groupedByType[ViolationTypes.FORBIDDEN_ZONE].length,
          [ViolationTypes.BLIND_ZONE_MISS]: groupedByType[ViolationTypes.BLIND_ZONE_MISS].length,
          [ViolationTypes.HEIGHT_LIMIT]: groupedByType[ViolationTypes.HEIGHT_LIMIT].length
        },
        bySeverity: {
          [SeverityLevels.CRITICAL]: groupedBySeverity[SeverityLevels.CRITICAL].length,
          [SeverityLevels.WARNING]: groupedBySeverity[SeverityLevels.WARNING].length,
          [SeverityLevels.INFO]: groupedBySeverity[SeverityLevels.INFO].length
        }
      },
      
      flags: {
        hasForbiddenZoneViolation: inspectionResult.has_forbidden_zone_violation === 1,
        hasBlindZoneMiss: inspectionResult.has_blind_zone_miss === 1,
        hasHeightViolation: inspectionResult.has_height_violation === 1
      }
    },
    
    violationDetails: typeSections,
    
    recommendations,
    actionPlan,
    preventionMeasures,
    
    affectedShelves: getAffectedShelves(violations, shelves),
    
    appendix: {
      rawResultId: inspectionResult.id,
      dataVersion: context.dataVersion || '1.0',
      generatedBy: 'Warehouse Drone Inspection System v1.0'
    }
  };
  
  return report;
}

function formatViolation(v) {
  return {
    id: v.id,
    code: v.code,
    name: v.name,
    severity: v.severity,
    category: v.category,
    description: v.description,
    location: v.location_x !== null ? {
      x: v.location_x,
      y: v.location_y,
      z: v.location_z
    } : null,
    waypointSequence: v.waypoint_sequence,
    affectedShelfCode: v.affected_shelf_code,
    affectedZone: v.affected_zone,
    suggestion: v.suggestion,
    details: extractViolationDetails(v)
  };
}

function extractViolationDetails(v) {
  const details = {};
  if (v.distance !== undefined) details.distance = v.distance;
  if (v.limit !== undefined) details.limit = v.limit;
  if (v.excess !== undefined) details.excess = v.excess;
  if (v.deficit !== undefined) details.deficit = v.deficit;
  if (v.shelf_height !== undefined) details.shelfHeight = v.shelf_height;
  if (v.required_height !== undefined) details.requiredHeight = v.required_height;
  if (v.height_change !== undefined) details.heightChange = v.height_change;
  if (v.max_allowed !== undefined) details.maxAllowed = v.max_allowed;
  if (v.nearest_distance !== undefined) details.nearestDistance = v.nearest_distance;
  return details;
}

function generateRecommendations(groupedByType, context) {
  const recommendations = [];
  
  const fzCount = groupedByType[ViolationTypes.FORBIDDEN_ZONE].length;
  const bzCount = groupedByType[ViolationTypes.BLIND_ZONE_MISS].length;
  const hCount = groupedByType[ViolationTypes.HEIGHT_LIMIT].length;
  
  if (fzCount > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: '安全合规',
      title: '立即修正禁飞区穿越问题',
      description: `检测到 ${fzCount} 处禁飞区违规，其中 ${groupedByType[ViolationTypes.FORBIDDEN_ZONE].filter(v => v.severity === SeverityLevels.CRITICAL).length} 处为严重违规。`,
      actions: [
        '重新规划航线，所有航段必须绕开禁飞区域',
        '在航线规划系统中启用禁飞区自动避让功能',
        '对相关人员进行禁飞区管理培训'
      ]
    });
  }
  
  if (bzCount > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: '巡检质量',
      title: '优化航线覆盖盲区',
      description: `检测到 ${bzCount} 处盲区漏拍问题，影响巡检完整性。`,
      actions: [
        '在盲区附近增加巡检航点，确保100%覆盖',
        '调整飞行高度和摄像头角度，扩大覆盖范围',
        '对无法覆盖的区域制定人工巡检计划'
      ]
    });
  }
  
  if (hCount > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: '飞行安全',
      title: '规范飞行高度',
      description: `检测到 ${hCount} 处高度超限问题，存在碰撞风险。`,
      actions: [
        '统一调整航线高度至安全区间内',
        '设置航线高度自动校验，飞行前强制检查',
        '根据货架高度动态调整飞行高度，保持安全距离'
      ]
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'LOW',
      category: '持续优化',
      title: '巡检结果合格',
      description: '本次巡检未发现违规问题，航线规划符合要求。',
      actions: [
        '继续保持现有巡检标准',
        '定期复核航线合理性',
        '根据仓库布局变化及时更新航线'
      ]
    });
  }
  
  return recommendations;
}

function generateActionPlan(groupedByType, context) {
  const plan = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };
  
  groupedByType[ViolationTypes.FORBIDDEN_ZONE].forEach(v => {
    if (v.severity === SeverityLevels.CRITICAL) {
      plan.immediate.push({
        violationCode: v.code,
        description: v.description,
        action: '立即删除或移动违规航点，重新规划航线',
        deadline: '24小时内',
        responsible: '航线规划工程师'
      });
    } else {
      plan.shortTerm.push({
        violationCode: v.code,
        description: v.description,
        action: '调整航线，保持安全距离',
        deadline: '3个工作日内',
        responsible: '航线规划工程师'
      });
    }
  });
  
  groupedByType[ViolationTypes.HEIGHT_LIMIT].forEach(v => {
    if (v.severity === SeverityLevels.CRITICAL) {
      plan.immediate.push({
        violationCode: v.code,
        description: v.description,
        action: '立即调整飞行高度至安全范围',
        deadline: '24小时内',
        responsible: '飞行操作员'
      });
    } else {
      plan.shortTerm.push({
        violationCode: v.code,
        description: v.description,
        action: '优化航线高度设置',
        deadline: '3个工作日内',
        responsible: '航线规划工程师'
      });
    }
  });
  
  groupedByType[ViolationTypes.BLIND_ZONE_MISS].forEach(v => {
    plan.shortTerm.push({
      violationCode: v.code,
      description: v.description,
      action: '增加航点或调整角度确保覆盖',
      deadline: '5个工作日内',
      responsible: '巡检质量工程师'
    });
  });
  
  plan.longTerm.push({
    description: '建立航线定期复核机制',
    action: '每月复核所有巡检航线，与仓库布局变更联动',
    deadline: '持续执行',
    responsible: '运维团队'
  });
  
  return plan;
}

function generatePreventionMeasures(context) {
  return [
    {
      measure: '航线规划阶段自动校验',
      description: '在航线规划系统中集成实时校验功能，规划时即时检测禁飞区穿越、高度超限等问题',
      tools: ['航线规划软件', '实时校验引擎']
    },
    {
      measure: '飞行前强制安全检查',
      description: '每次执行巡检任务前，自动运行完整的安全检查，不通过不允许起飞',
      checklist: ['禁飞区检查', '高度合规检查', '盲区覆盖检查', '电池状态检查']
    },
    {
      measure: '仓库数据变更联动',
      description: '当仓库布局、货架位置、禁飞区等数据变更时，自动触发相关航线的复核',
      trigger: ['货架位置调整', '禁飞区变更', '仓库扩建改造']
    },
    {
      measure: '定期巡检质量评审',
      description: '每月组织巡检质量评审会议，分析问题原因，持续优化航线规划',
      frequency: '每月一次'
    }
  ];
}

function getAffectedShelves(violations, shelves) {
  const affectedCodes = new Set();
  violations.forEach(v => {
    if (v.affected_shelf_code) {
      affectedCodes.add(v.affected_shelf_code);
    }
  });
  
  return shelves
    .filter(s => affectedCodes.has(s.code))
    .map(s => ({
      id: s.id,
      code: s.code,
      position: `(${s.x}, ${s.y}, ${s.z})`,
      dimensions: `${s.width}m × ${s.depth}m × ${s.height}m`,
      levelCount: s.level_count
    }));
}

function formatReportAsText(report) {
  let text = '';
  
  text += '='.repeat(60) + '\n';
  text += '仓库无人机货架巡检报告\n';
  text += '='.repeat(60) + '\n\n';
  
  const s = report.summary;
  text += `仓库: ${s.warehouse.name} (${s.warehouse.id})\n`;
  text += `航线: ${s.route.name} (v${s.route.version})\n`;
  text += `巡检时间: ${s.inspectionTime}\n`;
  text += `总航点数: ${s.totalPoints} | 通过: ${s.passedPoints} | 通过率: ${s.passRate}\n`;
  text += `总体结论: ${s.overallStatus}\n\n`;
  
  text += `违规统计: 共 ${s.violationStats.total} 处\n`;
  text += `  - 路线穿禁区: ${s.violationStats.byType[ViolationTypes.FORBIDDEN_ZONE]} 处\n`;
  text += `  - 盲区漏拍: ${s.violationStats.byType[ViolationTypes.BLIND_ZONE_MISS]} 处\n`;
  text += `  - 高度超限: ${s.violationStats.byType[ViolationTypes.HEIGHT_LIMIT]} 处\n\n`;
  
  report.violationDetails.forEach(section => {
    text += '-'.repeat(60) + '\n';
    text += `【${section.typeName}】 ${section.count} 处 (严重${section.criticalCount}，警告${section.warningCount})\n`;
    text += '-'.repeat(60) + '\n\n';
    
    section.violations.forEach((v, idx) => {
      text += `  ${idx + 1}. [${v.severity}] ${v.name} (${v.code})\n`;
      text += `     ${v.description}\n`;
      if (v.location) {
        text += `     位置: (${v.location.x.toFixed(2)}, ${v.location.y.toFixed(2)}, ${v.location.z.toFixed(2)})\n`;
      }
      if (v.waypointSequence) {
        text += `     航点: #${v.waypointSequence}\n`;
      }
      text += `     处理建议:\n`;
      v.suggestion.forEach((s, i) => {
        text += `       ${i + 1}. ${s}\n`;
      });
      text += '\n';
    });
  });
  
  if (report.recommendations.length > 0) {
    text += '-'.repeat(60) + '\n';
    text += '整改建议\n';
    text += '-'.repeat(60) + '\n\n';
    
    report.recommendations.forEach((r, idx) => {
      text += `  ${idx + 1}. [${r.priority}] ${r.title}\n`;
      text += `     ${r.description}\n`;
      text += `     行动项:\n`;
      r.actions.forEach((a, i) => {
        text += `       ${i + 1}. ${a}\n`;
      });
      text += '\n';
    });
  }
  
  if (report.actionPlan.immediate.length > 0) {
    text += '-'.repeat(60) + '\n';
    text += '行动计划 - 立即处理 (24小时内)\n';
    text += '-'.repeat(60) + '\n\n';
    
    report.actionPlan.immediate.forEach((a, idx) => {
      text += `  ${idx + 1}. ${a.description}\n`;
      text += `     行动: ${a.action}\n`;
      text += `     责任人: ${a.responsible}\n\n`;
    });
  }
  
  return text;
}

module.exports = {
  generateReport,
  formatReportAsText,
  TypeNames,
  TypeColors
};
