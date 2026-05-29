import type {
  SceneData,
  Runway,
  Building,
  ClearanceSurface,
  ValidationIssue,
  IssueType,
  IssueSeverity
} from '../types';

function generateId(): string {
  return `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createIssue(
  severity: IssueSeverity,
  type: IssueType,
  message: string,
  suggestion: string,
  elementId: string,
  elementType: 'runway' | 'building' | 'surface' | 'scene'
): ValidationIssue {
  return {
    id: generateId(),
    severity,
    type,
    message,
    suggestion,
    elementId,
    elementType
  };
}

function isValidCoordinate(coord: number, system: string): boolean {
  if (system === 'WGS84') {
    return coord >= -180 && coord <= 180;
  }
  if (system === 'local') {
    return Math.abs(coord) < 100000;
  }
  return true;
}

function detectCoordinateSystem(value: number): 'WGS84' | 'local' | 'unknown' {
  if (value >= -180 && value <= 180 && value !== 0) {
    return 'WGS84';
  }
  if (Math.abs(value) >= 100 && Math.abs(value) < 100000) {
    return 'local';
  }
  return 'unknown';
}

export function validateRunway(runway: Runway): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!runway.id) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        '跑道缺少唯一标识ID',
        '请为跑道添加 id 字段，用于数据关联和问题追踪',
        'runway-unknown',
        'runway'
      )
    );
  }

  if (!runway.name) {
    issues.push(
      createIssue(
        'warning',
        'missing_field',
        `跑道 ${runway.id || 'unknown'} 缺少名称`,
        '建议添加跑道名称，便于识别和报告',
        runway.id || 'runway-unknown',
        'runway'
      )
    );
  }

  if (!runway.length || runway.length <= 0) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `跑道 ${runway.name || runway.id} 长度无效: ${runway.length}`,
        '跑道长度必须大于0，单位为米',
        runway.id || 'runway-unknown',
        'runway'
      )
    );
  }

  if (!runway.width || runway.width <= 0) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `跑道 ${runway.name || runway.id} 宽度无效: ${runway.width}`,
        '跑道宽度必须大于0，单位为米',
        runway.id || 'runway-unknown',
        'runway'
      )
    );
  }

  if (!runway.coordinates || runway.coordinates.length !== 3) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `跑道 ${runway.name || runway.id} 坐标格式错误`,
        '跑道坐标应为 [x, y, z] 格式的三元数组',
        runway.id || 'runway-unknown',
        'runway'
      )
    );
  } else {
    const [x, y, z] = runway.coordinates;
    const detectedX = detectCoordinateSystem(x);
    const detectedY = detectCoordinateSystem(y);
    
    if (runway.coordinateSystem === 'WGS84') {
      if (!isValidCoordinate(x, 'WGS84') || !isValidCoordinate(y, 'WGS84')) {
        issues.push(
          createIssue(
            'error',
            'coordinate_error',
            `跑道 ${runway.name || runway.id} 声明为 WGS84 坐标系，但坐标值 [${x}, ${y}] 超出经纬度范围`,
            'WGS84 经纬度范围应为经度 -180~180，纬度 -90~90。请检查坐标系设置或转换为局部坐标系。',
            runway.id || 'runway-unknown',
            'runway'
          )
        );
      }
    } else if (runway.coordinateSystem === 'local') {
      if (detectedX === 'WGS84' || detectedY === 'WGS84') {
        issues.push(
          createIssue(
            'warning',
            'coordinate_error',
            `跑道 ${runway.name || runway.id} 声明为局部坐标系，但坐标值 [${x}, ${y}] 疑似经纬度格式`,
            '检测到坐标值在经纬度范围内，可能存在坐标系混用。建议确认坐标系后统一转换。',
            runway.id || 'runway-unknown',
            'runway'
          )
        );
      }
    }
  }

  return issues;
}

export function validateBuilding(building: Building, allBuildings: Building[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const buildingId = building.id || 'building-unknown';

  if (!building.id) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        '建筑缺少唯一标识ID',
        '请为建筑添加 id 字段',
        buildingId,
        'building'
      )
    );
  }

  if (!building.name) {
    issues.push(
      createIssue(
        'warning',
        'missing_field',
        `建筑 ${buildingId} 缺少名称`,
        '建议添加建筑名称',
        buildingId,
        'building'
      )
    );
  }

  if (building.height === undefined || building.height === null) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `建筑 ${building.name || buildingId} 缺少高度字段`,
        '建筑高度是净空检测的必要字段，请补充 height 值',
        buildingId,
        'building'
      )
    );
  } else if (building.height <= 0) {
    issues.push(
      createIssue(
        'error',
        'coordinate_error',
        `建筑 ${building.name || buildingId} 高度无效: ${building.height}米`,
        '建筑高度必须为正数，请检查数据录入错误',
        buildingId,
        'building'
      )
    );
  }

  if (!building.position || building.position.length !== 3) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `建筑 ${building.name || buildingId} 位置坐标格式错误`,
        '建筑位置应为 [x, y, z] 格式的三元数组',
        buildingId,
        'building'
      )
    );
  }

  if (!building.footprint || building.footprint.length !== 2) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `建筑 ${building.name || buildingId} 建筑尺寸格式错误`,
        '建筑 footprint 应为 [宽度, 深度] 格式',
        buildingId,
        'building'
      )
    );
  }

  if (!building.status) {
    issues.push(
      createIssue(
        'warning',
        'missing_field',
        `建筑 ${building.name || buildingId} 缺少状态字段`,
        '建议设置 status 为 existing/planned/proposed，便于筛选和分析',
        buildingId,
        'building'
      )
    );
  }

  const duplicates = allBuildings.filter(b => b.id === building.id);
  if (duplicates.length > 1) {
    issues.push(
      createIssue(
        'error',
        'duplicate',
        `建筑ID重复: ${building.id} 出现 ${duplicates.length} 次`,
        '建筑ID必须唯一，请检查并修正重复数据。重复数据会导致碰撞检测和筛选结果不准确。',
        buildingId,
        'building'
      )
    );
  }

  if (building.position && building.position.length === 3) {
    const [bx, by] = building.position;
    const overlaps = allBuildings.filter(b => {
      if (b.id === building.id) return false;
      if (!b.position || b.position.length !== 3) return false;
      const [ox, oy] = b.position;
      const dist = Math.sqrt((bx - ox) ** 2 + (by - oy) ** 2);
      return dist < 10;
    });
    
    if (overlaps.length > 0) {
      issues.push(
        createIssue(
          'warning',
          'occlusion',
          `建筑 ${building.name || buildingId} 与 ${overlaps.map(o => o.name || o.id).join(', ')} 位置接近`,
          '检测到建筑位置间距小于10米，可能存在数据录入错误或建筑重叠，建议核实。',
          buildingId,
          'building'
        )
      );
    }
  }

  return issues;
}

export function validateSurface(surface: ClearanceSurface, allSurfaces: ClearanceSurface[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const surfaceId = surface.id || 'surface-unknown';

  if (!surface.id) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        '净空面缺少唯一标识ID',
        '请为净空面添加 id 字段',
        surfaceId,
        'surface'
      )
    );
  }

  if (!surface.type) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `净空面 ${surfaceId} 缺少类型字段`,
        '净空面类型是计算限高的必要依据，请设置 type 字段',
        surfaceId,
        'surface'
      )
    );
  }

  if (surface.maxHeight === undefined || surface.maxHeight === null) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `净空面 ${surface.type || surfaceId} 缺少最大高度限制`,
        '请设置 maxHeight 字段，单位为米',
        surfaceId,
        'surface'
      )
    );
  }

  if (!surface.boundaryPoints || surface.boundaryPoints.length < 3) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        `净空面 ${surface.type || surfaceId} 边界点不足`,
        '净空面 boundaryPoints 至少需要3个点来定义一个多边形面，当前仅有 ' + (surface.boundaryPoints?.length || 0) + ' 个点',
        surfaceId,
        'surface'
      )
    );
  }

  if (surface.boundaryPoints && surface.boundaryPoints.length > 0) {
    const coordSystems = surface.boundaryPoints.map(p => {
      const detected = detectCoordinateSystem(p[0]);
      return detected === 'unknown' ? detectCoordinateSystem(p[1]) : detected;
    });
    const uniqueSystems = [...new Set(coordSystems.filter(s => s !== 'unknown'))];
    if (uniqueSystems.length > 1) {
      issues.push(
        createIssue(
          'error',
          'coordinate_error',
          `净空面 ${surface.type || surfaceId} 边界点存在坐标系混用`,
          `检测到边界点同时使用 ${uniqueSystems.join(' 和 ')} 坐标系，请统一转换后再导入。`,
          surfaceId,
          'surface'
        )
      );
    }
  }

  return issues;
}

export function validateScene(scene: SceneData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!scene.id) {
    issues.push(
      createIssue(
        'warning',
        'missing_field',
        '场景缺少ID',
        '建议为场景添加唯一标识',
        'scene-unknown',
        'scene'
      )
    );
  }

  if (!scene.name) {
    issues.push(
      createIssue(
        'warning',
        'missing_field',
        '场景缺少名称',
        '建议添加场景名称',
        scene.id || 'scene-unknown',
        'scene'
      )
    );
  }

  if (!scene.runway) {
    issues.push(
      createIssue(
        'error',
        'missing_field',
        '场景缺少跑道数据',
        '跑道是净空分析的核心，请补充 runway 数据',
        scene.id || 'scene-unknown',
        'scene'
      )
    );
  } else {
    issues.push(...validateRunway(scene.runway));
  }

  if (!scene.buildings || scene.buildings.length === 0) {
    issues.push(
      createIssue(
        'info',
        'missing_field',
        '场景没有建筑数据',
        '当前场景仅包含跑道和净空面，如需碰撞检测请添加建筑数据',
        scene.id || 'scene-unknown',
        'scene'
      )
    );
  } else {
    scene.buildings.forEach(building => {
      issues.push(...validateBuilding(building, scene.buildings));
    });
  }

  if (!scene.surfaces || scene.surfaces.length === 0) {
    issues.push(
      createIssue(
        'warning',
        'missing_field',
        '场景缺少净空面数据',
        '净空面是限高分析的基础，请添加 surfaces 数据',
        scene.id || 'scene-unknown',
        'scene'
      )
    );
  } else {
    scene.surfaces.forEach(surface => {
      issues.push(...validateSurface(surface, scene.surfaces));
    });
  }

  if (scene.runway && scene.buildings && scene.buildings.length > 0) {
    const runwaySystem = scene.runway.coordinateSystem;
    const buildingSystems = new Set(
      scene.buildings
        .filter(b => b.position && b.position.length === 3)
        .map(b => {
          const [x] = b.position;
          return detectCoordinateSystem(x);
        })
        .filter(s => s !== 'unknown')
    );

    if (buildingSystems.size > 0 && runwaySystem !== 'unknown') {
      const buildingSystemsArray = [...buildingSystems];
      const hasMismatch = !buildingSystemsArray.includes(runwaySystem);
      
      if (hasMismatch) {
        const detected = buildingSystemsArray[0];
        issues.push(
          createIssue(
            'error',
            'coordinate_error',
            `坐标系不匹配：跑道声明为 ${runwaySystem}，但建筑坐标疑似 ${detected} 格式`,
            `跑道使用 ${runwaySystem} 坐标系，而建筑坐标值看起来是 ${detected} 格式。` +
            `坐标系混用会导致3D模型位置错乱，必须统一转换后才能进行准确的净空分析。` +
            `建议：将所有数据转换为局部坐标系（以跑道中心为原点）。`,
            scene.id || 'scene-unknown',
            'scene'
          )
        );
      }
    }
  }

  return issues;
}

export function getIssueSummary(issues: ValidationIssue[]): {
  errors: number;
  warnings: number;
  infos: number;
  byType: Record<string, number>;
} {
  const summary = {
    errors: 0,
    warnings: 0,
    infos: 0,
    byType: {} as Record<string, number>
  };

  issues.forEach(issue => {
    if (issue.severity === 'error') summary.errors++;
    else if (issue.severity === 'warning') summary.warnings++;
    else summary.infos++;

    summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
  });

  return summary;
}
