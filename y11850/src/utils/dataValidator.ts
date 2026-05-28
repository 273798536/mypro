import { DataPackage, ValidationResult, ValidationError, ValidationWarning, ReviewItem } from '@/types';
import { validateTimezone, parseTimezone } from './timezoneUtils';

export function validateDataPackage(pkg: DataPackage): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const needsReview: ReviewItem[] = [];

  const tzResult = validateTimezone(pkg.timezone, pkg.sunPath?.latitude, pkg.sunPath?.longitude);
  if (!tzResult.valid && tzResult.error) {
    errors.push(tzResult.error);
  }

  if (!pkg.buildings || pkg.buildings.length === 0) {
    errors.push({
      code: 'NO_BUILDINGS',
      message: '数据包中没有建筑数据',
      humanMessage: '未检测到任何建筑体块，请确认数据包是否完整',
      step: '建筑数据完整性检查',
      details: { buildingCount: pkg.buildings?.length || 0 },
    });
  } else {
    for (let i = 0; i < pkg.buildings.length; i++) {
      const building = pkg.buildings[i];
      
      if (!building.id || !building.name) {
        errors.push({
          code: 'BUILDING_MISSING_ID',
          message: `第${i + 1}栋建筑缺少ID或名称`,
          humanMessage: `发现一栋未命名的建筑，请补充建筑信息`,
          step: '建筑数据完整性检查',
          details: { index: i, building },
        });
      }
      
      if (building.height <= 0 || building.floors <= 0) {
        errors.push({
          code: 'BUILDING_INVALID_DIMENSIONS',
          message: `建筑"${building.name}"的高度或楼层数无效`,
          humanMessage: `建筑"${building.name}"的高度或楼层数据不正确，请检查`,
          step: '建筑数据一致性检查',
          details: { buildingId: building.id, height: building.height, floors: building.floors },
        });
      }
      
      const expectedHeight = building.floors * 3;
      if (Math.abs(building.height - expectedHeight) > 5) {
        warnings.push({
          code: 'BUILDING_HEIGHT_FLOOR_MISMATCH',
          message: `建筑"${building.name}"的高度与楼层数不匹配`,
          humanMessage: `建筑"${building.name}"共${building.floors}层，按每层3米估算约${expectedHeight}米，但数据显示为${building.height}米，可能需要确认`,
          details: { 
            buildingId: building.id, 
            actualHeight: building.height, 
            expectedHeight, 
            floors: building.floors 
          },
        });
      }
      
      if (!building.apartments || building.apartments.length === 0) {
        warnings.push({
          code: 'BUILDING_NO_APARTMENTS',
          message: `建筑"${building.name}"没有住户数据`,
          humanMessage: `建筑"${building.name}"未包含住户信息，将无法进行日照明细分析`,
          details: { buildingId: building.id },
        });
      } else {
        const floorNumbers = new Set<number>();
        for (const apt of building.apartments) {
          floorNumbers.add(apt.floor);
        }
        
        const expectedFloors = Array.from({ length: building.floors }, (_, i) => i + 1);
        const missingFloors = expectedFloors.filter(f => !floorNumbers.has(f));
        
        if (missingFloors.length > 0 && missingFloors.length < building.floors) {
          needsReview.push({
            id: `floor-confusion-${building.id}`,
            type: 'floor_confusion',
            description: `建筑"${building.name}"存在缺失楼层`,
            humanDescription: `建筑"${building.name}"共${building.floors}层，但住户数据只覆盖了${floorNumbers.size}层，缺失楼层：${missingFloors.join('、')}，请确认是否正确`,
            buildingId: building.id,
            status: 'pending',
          });
        }
        
        const sortedFloors = Array.from(floorNumbers).sort((a, b) => a - b);
        for (let j = 1; j < sortedFloors.length; j++) {
          if (sortedFloors[j] - sortedFloors[j - 1] > 1) {
            needsReview.push({
              id: `floor-gap-${building.id}-${sortedFloors[j - 1]}-${sortedFloors[j]}`,
              type: 'floor_confusion',
              description: `建筑"${building.name}"楼层编号不连续`,
              humanDescription: `建筑"${building.name}"的${sortedFloors[j - 1]}层和${sortedFloors[j]}层之间存在跳层，请确认是否正确`,
              buildingId: building.id,
              status: 'pending',
            });
          }
        }
      }
      
      for (let j = i + 1; j < pkg.buildings.length; j++) {
        const other = pkg.buildings[j];
        if (checkBuildingOverlap(building, other)) {
          warnings.push({
            code: 'BUILDING_OVERLAP',
            message: `建筑"${building.name}"与"${other.name}"位置重叠`,
            humanMessage: `检测到"${building.name}"和"${other.name}"的位置存在重叠，请确认建筑定位是否正确`,
            details: { building1: building.id, building2: other.id },
          });
        }
      }
    }
  }

  if (!pkg.sunPath) {
    errors.push({
      code: 'NO_SUN_PATH',
      message: '缺少太阳路径数据',
      humanMessage: '未检测到太阳路径数据，无法进行日照分析',
      step: '太阳路径数据检查',
      details: {},
    });
  } else {
    if (pkg.sunPath.latitude < -90 || pkg.sunPath.latitude > 90) {
      errors.push({
        code: 'INVALID_LATITUDE',
        message: `纬度值无效: ${pkg.sunPath.latitude}`,
        humanMessage: `纬度数据${pkg.sunPath.latitude}超出有效范围（-90至90），请检查`,
        step: '经纬度数据校验',
        details: { latitude: pkg.sunPath.latitude },
      });
    }
    
    if (pkg.sunPath.longitude < -180 || pkg.sunPath.longitude > 180) {
      errors.push({
        code: 'INVALID_LONGITUDE',
        message: `经度值无效: ${pkg.sunPath.longitude}`,
        humanMessage: `经度数据${pkg.sunPath.longitude}超出有效范围（-180至180），请检查`,
        step: '经纬度数据校验',
        details: { longitude: pkg.sunPath.longitude },
      });
    }
    
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
    for (const season of seasons) {
      if (!pkg.sunPath[season] || pkg.sunPath[season].length === 0) {
        warnings.push({
          code: `NO_${season.toUpperCase()}_DATA`,
          message: `缺少${season}季节的太阳位置数据`,
          humanMessage: `未检测到${season}季节的太阳轨迹数据，该季节分析可能不准确`,
          details: { season },
        });
      }
    }
  }

  if (!pkg.setbackLines || pkg.setbackLines.length === 0) {
    warnings.push({
      code: 'NO_SETBACK_LINES',
      message: '缺少退界线数据',
      humanMessage: '未检测到退界线数据，将无法显示用地边界信息',
      details: {},
    });
  }

  if (errors.length > 0) {
    for (const building of pkg.buildings || []) {
      for (const apt of building.apartments || []) {
        if (apt.windowPositions && apt.windowPositions.length > 0) {
          for (let i = 0; i < apt.windowPositions.length; i++) {
            const wp = apt.windowPositions[i];
            if (Math.abs(wp[0]) < 0.01 || Math.abs(wp[2]) < 0.01) {
              needsReview.push({
                id: `occlusion-miss-${building.id}-${apt.id}-${i}`,
                type: 'occlusion_miss',
                description: `${building.name} ${apt.unitNumber}窗户位置可能遗漏遮挡计算`,
                humanDescription: `${building.name} ${apt.unitNumber}的窗户位于建筑边缘，建议人工复核是否有其他建筑会造成遮挡`,
                buildingId: building.id,
                apartmentId: apt.id,
                status: 'pending',
              });
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    needsReview,
  };
}

function checkBuildingOverlap(b1: { position: [number, number, number]; dimensions: [number, number, number] }, 
                              b2: { position: [number, number, number]; dimensions: [number, number, number] }): boolean {
  const b1MinX = b1.position[0] - b1.dimensions[0] / 2;
  const b1MaxX = b1.position[0] + b1.dimensions[0] / 2;
  const b1MinZ = b1.position[2] - b1.dimensions[2] / 2;
  const b1MaxZ = b1.position[2] + b1.dimensions[2] / 2;
  
  const b2MinX = b2.position[0] - b2.dimensions[0] / 2;
  const b2MaxX = b2.position[0] + b2.dimensions[0] / 2;
  const b2MinZ = b2.position[2] - b2.dimensions[2] / 2;
  const b2MaxZ = b2.position[2] + b2.dimensions[2] / 2;
  
  return !(b1MaxX < b2MinX || b1MinX > b2MaxX || b1MaxZ < b2MinZ || b1MinZ > b2MaxZ);
}

export function getValidationSummary(result: ValidationResult): { status: 'error' | 'warning' | 'success'; message: string } {
  if (result.errors.length > 0) {
    const tzError = result.errors.find(e => e.code.startsWith('TIMEZONE_'));
    if (tzError) {
      return { status: 'error', message: tzError.humanMessage };
    }
    return { status: 'error', message: `发现${result.errors.length}个错误，需要先修复才能继续` };
  }
  
  if (result.warnings.length > 0 || result.needsReview.length > 0) {
    return { 
      status: 'warning', 
      message: `数据基本可用，但有${result.warnings.length}条警告和${result.needsReview.length}项需要人工复核` 
    };
  }
  
  return { status: 'success', message: '数据验证通过，所有检查项均正常' };
}

export function getStepProgress(error: ValidationError): { current: number; total: number; steps: string[] } {
  const steps = ['时区格式校验', '时区与地理位置匹配校验', '建筑数据完整性检查', '建筑数据一致性检查', '太阳路径数据检查', '经纬度数据校验'];
  const currentIndex = steps.indexOf(error.step);
  return {
    current: currentIndex >= 0 ? currentIndex + 1 : 1,
    total: steps.length,
    steps,
  };
}
