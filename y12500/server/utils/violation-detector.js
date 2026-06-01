const { ViolationTypes, SeverityLevels } = require('./validation');

const ErrorCodes = {
  FORBIDDEN_ZONE: {
    FZ_001: {
      code: 'FZ_001',
      type: ViolationTypes.FORBIDDEN_ZONE,
      severity: SeverityLevels.CRITICAL,
      name: '航线穿越禁飞区',
      description: '无人机航线经过已标记的禁飞区域',
      category: '安全合规'
    },
    FZ_002: {
      code: 'FZ_002',
      type: ViolationTypes.FORBIDDEN_ZONE,
      severity: SeverityLevels.WARNING,
      name: '航线接近禁飞区边界',
      description: '无人机航线距离禁飞区小于安全距离',
      category: '安全合规'
    },
    FZ_003: {
      code: 'FZ_003',
      type: ViolationTypes.FORBIDDEN_ZONE,
      severity: SeverityLevels.CRITICAL,
      name: '航点位于禁飞区内',
      description: '航线航点坐标落在禁飞区域内部',
      category: '安全合规'
    }
  },
  
  BLIND_ZONE: {
    BZ_001: {
      code: 'BZ_001',
      type: ViolationTypes.BLIND_ZONE_MISS,
      severity: SeverityLevels.WARNING,
      name: '盲区未覆盖',
      description: '已标记的盲区没有被巡检航线覆盖',
      category: '巡检质量'
    },
    BZ_002: {
      code: 'BZ_002',
      type: ViolationTypes.BLIND_ZONE_MISS,
      severity: SeverityLevels.INFO,
      name: '盲区部分覆盖',
      description: '盲区只有部分区域被航线覆盖',
      category: '巡检质量'
    },
    BZ_003: {
      code: 'BZ_003',
      type: ViolationTypes.BLIND_ZONE_MISS,
      severity: SeverityLevels.WARNING,
      name: '货架背面漏拍',
      description: '货架背面没有被巡检航线覆盖',
      category: '巡检质量'
    }
  },
  
  HEIGHT: {
    H_001: {
      code: 'H_001',
      type: ViolationTypes.HEIGHT_LIMIT,
      severity: SeverityLevels.CRITICAL,
      name: '高度超过仓库上限',
      description: '无人机飞行高度超过仓库净空高度',
      category: '飞行安全'
    },
    H_002: {
      code: 'H_002',
      type: ViolationTypes.HEIGHT_LIMIT,
      severity: SeverityLevels.WARNING,
      name: '高度低于安全下限',
      description: '无人机飞行高度低于最低安全高度',
      category: '飞行安全'
    },
    H_003: {
      code: 'H_003',
      type: ViolationTypes.HEIGHT_LIMIT,
      severity: SeverityLevels.WARNING,
      name: '与货架安全距离不足',
      description: '无人机与货架顶部的垂直安全距离不足',
      category: '飞行安全'
    },
    H_004: {
      code: 'H_004',
      type: ViolationTypes.HEIGHT_LIMIT,
      severity: SeverityLevels.INFO,
      name: '高度波动过大',
      description: '相邻航点之间高度变化超过阈值',
      category: '飞行安全'
    }
  }
};

const Suggestions = {
  [ErrorCodes.FORBIDDEN_ZONE.FZ_001.code]: [
    '立即调整航线，绕开禁飞区域',
    '检查禁飞区设置是否正确，如属误标可联系管理员更新',
    '如确需进入该区域，需提交专项安全评估报告并获得审批',
    '建议在航线规划阶段启用禁飞区自动避让功能'
  ],
  [ErrorCodes.FORBIDDEN_ZONE.FZ_002.code]: [
    '建议调整航线，保持与禁飞区至少0.5米的安全距离',
    '可适当降低飞行速度，提高避障传感器灵敏度',
    '考虑在禁飞区边界增加虚拟警示带'
  ],
  [ErrorCodes.FORBIDDEN_ZONE.FZ_003.code]: [
    '立即删除或移动该航点，不允许在禁飞区内设置航点',
    '重新规划航线，采用绕行方案',
    '检查坐标输入是否有误'
  ],
  
  [ErrorCodes.BLIND_ZONE.BZ_001.code]: [
    '在盲区附近增加巡检航点，确保全覆盖',
    '调整无人机摄像头角度，采用俯拍+侧拍组合',
    '考虑增加环绕飞行模式，覆盖盲区',
    '如盲区无法覆盖，需在报告中注明并制定人工巡检方案'
  ],
  [ErrorCodes.BLIND_ZONE.BZ_002.code]: [
    '优化航线路径，增加覆盖范围',
    '调整飞行高度，扩大摄像头覆盖区域',
    '考虑在盲区边缘增加1-2个航点'
  ],
  [ErrorCodes.BLIND_ZONE.BZ_003.code]: [
    '在货架背面增加航点，采用双侧巡检模式',
    '调整航线为环绕货架飞行',
    '如条件允许，降低飞行速度提高拍摄帧率'
  ],
  
  [ErrorCodes.HEIGHT.H_001.code]: [
    '立即降低飞行高度，确保在仓库净空高度以下',
    '检查仓库高度设置是否正确',
    '设置航线高度上限告警，飞行前自动检查'
  ],
  [ErrorCodes.HEIGHT.H_002.code]: [
    '提高飞行高度至安全最低高度以上',
    '检查是否有低层障碍物影响飞行',
    '如确需低空飞行，需启用避障功能并降低速度'
  ],
  [ErrorCodes.HEIGHT.H_003.code]: [
    '提高飞行高度，保持与货架顶部至少0.5米安全距离',
    '检查货架高度数据是否准确',
    '可采用阶梯式高度调整，逐排适配货架高度'
  ],
  [ErrorCodes.HEIGHT.H_004.code]: [
    '平滑航线高度，减少相邻航点的高度差',
    '采用渐变式高度调整，避免急剧升降',
    '检查航点坐标输入是否存在异常值'
  ]
};

function pointInBox(px, py, pz, box) {
  return px >= box.x && px <= box.x + box.width &&
         py >= box.y && py <= box.y + box.depth &&
         pz >= box.z && pz <= box.z + box.height;
}

function distanceToBox(px, py, pz, box) {
  const cx = Math.max(box.x, Math.min(px, box.x + box.width));
  const cy = Math.max(box.y, Math.min(py, box.y + box.depth));
  const cz = Math.max(box.z, Math.min(pz, box.z + box.height));
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2);
}

function lineIntersectsBox(p1, p2, box) {
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1.x + (p2.x - p1.x) * t;
    const y = p1.y + (p2.y - p1.y) * t;
    const z = p1.z + (p2.z - p1.z) * t;
    if (pointInBox(x, y, z, box)) {
      return { intersects: true, point: { x, y, z }, t };
    }
  }
  return { intersects: false };
}

function checkForbiddenZoneViolations(waypoints, forbiddenZones, config) {
  const violations = [];
  const safeDistance = config.warehouse.droneSafeDistance;
  
  waypoints.forEach((wp, idx) => {
    forbiddenZones.forEach(zone => {
      if (pointInBox(wp.x, wp.y, wp.z, zone)) {
        violations.push({
          ...ErrorCodes.FORBIDDEN_ZONE.FZ_003,
          location_x: wp.x,
          location_y: wp.y,
          location_z: wp.z,
          waypoint_sequence: idx + 1,
          affected_zone: zone.name,
          description: `航点 ${idx + 1} 位于禁飞区「${zone.name}」内，坐标 (${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)})`,
          suggestion: Suggestions[ErrorCodes.FORBIDDEN_ZONE.FZ_003.code]
        });
      } else {
        const dist = distanceToBox(wp.x, wp.y, wp.z, zone);
        if (dist < safeDistance) {
          violations.push({
            ...ErrorCodes.FORBIDDEN_ZONE.FZ_002,
            location_x: wp.x,
            location_y: wp.y,
            location_z: wp.z,
            waypoint_sequence: idx + 1,
            affected_zone: zone.name,
            distance: dist,
            description: `航点 ${idx + 1} 距离禁飞区「${zone.name}」仅 ${dist.toFixed(3)}m，小于安全距离 ${safeDistance}m`,
            suggestion: Suggestions[ErrorCodes.FORBIDDEN_ZONE.FZ_002.code]
          });
        }
      }
    });
  });
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    
    forbiddenZones.forEach(zone => {
      const result = lineIntersectsBox(p1, p2, zone);
      if (result.intersects) {
        const hasFZ003 = violations.some(v => 
          v.code === 'FZ_003' && v.waypoint_sequence === i + 1
        ) || violations.some(v => 
          v.code === 'FZ_003' && v.waypoint_sequence === i + 2
        );
        
        if (!hasFZ003) {
          violations.push({
            ...ErrorCodes.FORBIDDEN_ZONE.FZ_001,
            location_x: result.point.x,
            location_y: result.point.y,
            location_z: result.point.z,
            waypoint_sequence: i + 1,
            affected_zone: zone.name,
            description: `航段 ${i + 1}→${i + 2} 穿越禁飞区「${zone.name}」，穿入点 (${result.point.x.toFixed(2)}, ${result.point.y.toFixed(2)}, ${result.point.z.toFixed(2)})`,
            suggestion: Suggestions[ErrorCodes.FORBIDDEN_ZONE.FZ_001.code]
          });
        }
      }
    });
  }
  
  return violations;
}

function checkBlindZoneCoverage(waypoints, blindZones, shelves, config) {
  const violations = [];
  const coverageThreshold = 0.8;
  
  blindZones.forEach(zone => {
    let covered = false;
    let minDistance = Infinity;
    
    waypoints.forEach(wp => {
      const dist = distanceToBox(wp.x, wp.y, wp.z, zone);
      minDistance = Math.min(minDistance, dist);
      if (dist < 3) {
        covered = true;
      }
    });
    
    if (!covered) {
      violations.push({
        ...ErrorCodes.BLIND_ZONE.BZ_001,
        location_x: zone.x + zone.width / 2,
        location_y: zone.y + zone.depth / 2,
        location_z: zone.z + zone.height / 2,
        affected_zone: zone.name,
        nearest_distance: minDistance,
        description: `盲区「${zone.name}」未被航线覆盖，最近航点距离 ${minDistance.toFixed(2)}m`,
        suggestion: Suggestions[ErrorCodes.BLIND_ZONE.BZ_001.code]
      });
    } else if (minDistance > 2) {
      violations.push({
        ...ErrorCodes.BLIND_ZONE.BZ_002,
        location_x: zone.x + zone.width / 2,
        location_y: zone.y + zone.depth / 2,
        location_z: zone.z + zone.height / 2,
        affected_zone: zone.name,
        nearest_distance: minDistance,
        description: `盲区「${zone.name}」仅部分覆盖，最近航点距离 ${minDistance.toFixed(2)}m`,
        suggestion: Suggestions[ErrorCodes.BLIND_ZONE.BZ_002.code]
      });
    }
  });
  
  shelves.forEach(shelf => {
    const backSide = {
      x: shelf.x,
      y: shelf.y + shelf.depth,
      z: shelf.z,
      width: shelf.width,
      depth: 0.5,
      height: shelf.height
    };
    
    let backCovered = false;
    waypoints.forEach(wp => {
      if (distanceToBox(wp.x, wp.y, wp.z, backSide) < 2) {
        backCovered = true;
      }
    });
    
    if (!backCovered) {
      violations.push({
        ...ErrorCodes.BLIND_ZONE.BZ_003,
        location_x: shelf.x + shelf.width / 2,
        location_y: shelf.y + shelf.depth,
        location_z: shelf.z + shelf.height / 2,
        affected_shelf_code: shelf.code,
        description: `货架「${shelf.code}」背面未被巡检覆盖`,
        suggestion: Suggestions[ErrorCodes.BLIND_ZONE.BZ_003.code]
      });
    }
  });
  
  return violations;
}

function checkHeightViolations(waypoints, warehouse, shelves, config) {
  const violations = [];
  const maxAltitude = config.warehouse.droneMaxAltitude;
  const minAltitude = config.warehouse.droneMinAltitude;
  const safeDistance = config.warehouse.droneSafeDistance;
  const maxHeightChange = 2;
  
  waypoints.forEach((wp, idx) => {
    if (wp.z > warehouse.height) {
      violations.push({
        ...ErrorCodes.HEIGHT.H_001,
        location_x: wp.x,
        location_y: wp.y,
        location_z: wp.z,
        waypoint_sequence: idx + 1,
        limit: warehouse.height,
        excess: wp.z - warehouse.height,
        description: `航点 ${idx + 1} 高度 ${wp.z.toFixed(2)}m 超过仓库高度 ${warehouse.height}m，超出 ${(wp.z - warehouse.height).toFixed(2)}m`,
        suggestion: Suggestions[ErrorCodes.HEIGHT.H_001.code]
      });
    }
    
    if (wp.z > maxAltitude) {
      violations.push({
        ...ErrorCodes.HEIGHT.H_001,
        location_x: wp.x,
        location_y: wp.y,
        location_z: wp.z,
        waypoint_sequence: idx + 1,
        limit: maxAltitude,
        excess: wp.z - maxAltitude,
        description: `航点 ${idx + 1} 高度 ${wp.z.toFixed(2)}m 超过无人机最大飞行高度 ${maxAltitude}m，超出 ${(wp.z - maxAltitude).toFixed(2)}m`,
        suggestion: Suggestions[ErrorCodes.HEIGHT.H_001.code]
      });
    }
    
    if (wp.z < minAltitude) {
      violations.push({
        ...ErrorCodes.HEIGHT.H_002,
        location_x: wp.x,
        location_y: wp.y,
        location_z: wp.z,
        waypoint_sequence: idx + 1,
        limit: minAltitude,
        deficit: minAltitude - wp.z,
        description: `航点 ${idx + 1} 高度 ${wp.z.toFixed(2)}m 低于最低安全高度 ${minAltitude}m，低了 ${(minAltitude - wp.z).toFixed(2)}m`,
        suggestion: Suggestions[ErrorCodes.HEIGHT.H_002.code]
      });
    }
    
    shelves.forEach(shelf => {
      const wpAboveShelf = wp.x >= shelf.x && wp.x <= shelf.x + shelf.width &&
                          wp.y >= shelf.y && wp.y <= shelf.y + shelf.depth;
      
      if (wpAboveShelf && wp.z < shelf.height + safeDistance) {
        violations.push({
          ...ErrorCodes.HEIGHT.H_003,
          location_x: wp.x,
          location_y: wp.y,
          location_z: wp.z,
          waypoint_sequence: idx + 1,
          affected_shelf_code: shelf.code,
          shelf_height: shelf.height,
          required_height: shelf.height + safeDistance,
          deficit: (shelf.height + safeDistance) - wp.z,
          description: `航点 ${idx + 1} 与货架「${shelf.code}」顶部安全距离不足，飞行高度 ${wp.z.toFixed(2)}m，货架高度 ${shelf.height}m，需至少 ${(shelf.height + safeDistance).toFixed(2)}m`,
          suggestion: Suggestions[ErrorCodes.HEIGHT.H_003.code]
        });
      }
    });
  });
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const heightChange = Math.abs(waypoints[i + 1].z - waypoints[i].z);
    if (heightChange > maxHeightChange) {
      violations.push({
        ...ErrorCodes.HEIGHT.H_004,
        location_x: waypoints[i].x,
        location_y: waypoints[i].y,
        location_z: waypoints[i].z,
        waypoint_sequence: i + 1,
        height_change: heightChange,
        max_allowed: maxHeightChange,
        description: `航段 ${i + 1}→${i + 2} 高度变化 ${heightChange.toFixed(2)}m 超过阈值 ${maxHeightChange}m`,
        suggestion: Suggestions[ErrorCodes.HEIGHT.H_004.code]
      });
    }
  }
  
  return violations;
}

function runInspection(waypoints, warehouse, forbiddenZones, blindZones, shelves, config) {
  const allViolations = [];
  
  const fzViolations = checkForbiddenZoneViolations(waypoints, forbiddenZones, config);
  allViolations.push(...fzViolations);
  
  const bzViolations = checkBlindZoneCoverage(waypoints, blindZones, shelves, config);
  allViolations.push(...bzViolations);
  
  const hViolations = checkHeightViolations(waypoints, warehouse, shelves, config);
  allViolations.push(...hViolations);
  
  const grouped = {
    [ViolationTypes.FORBIDDEN_ZONE]: fzViolations,
    [ViolationTypes.BLIND_ZONE_MISS]: bzViolations,
    [ViolationTypes.HEIGHT_LIMIT]: hViolations
  };
  
  const stats = {
    total: allViolations.length,
    critical: allViolations.filter(v => v.severity === SeverityLevels.CRITICAL).length,
    warning: allViolations.filter(v => v.severity === SeverityLevels.WARNING).length,
    info: allViolations.filter(v => v.severity === SeverityLevels.INFO).length,
    byType: {
      [ViolationTypes.FORBIDDEN_ZONE]: fzViolations.length,
      [ViolationTypes.BLIND_ZONE_MISS]: bzViolations.length,
      [ViolationTypes.HEIGHT_LIMIT]: hViolations.length
    }
  };
  
  return {
    violations: allViolations,
    grouped,
    stats,
    passed: stats.critical === 0
  };
}

module.exports = {
  ErrorCodes,
  Suggestions,
  checkForbiddenZoneViolations,
  checkBlindZoneCoverage,
  checkHeightViolations,
  runInspection,
  pointInBox,
  distanceToBox,
  lineIntersectsBox
};
