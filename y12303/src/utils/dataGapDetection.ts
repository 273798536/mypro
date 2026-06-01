import { CrackPoint, DataGap } from '../types';

export function detectDataGaps(cracks: CrackPoint[]): DataGap[] {
  const gaps: DataGap[] = [];

  cracks.forEach((crack) => {
    if (!crack.rainfall) {
      gaps.push({
        id: `gap_rain_${crack.id}`,
        type: 'rainfall',
        description: `${crack.name} 缺少雨量数据`,
        crackId: crack.id,
        affects3D: false,
      });
    }
    if (!crack.residentCoords) {
      gaps.push({
        id: `gap_coords_${crack.id}`,
        type: 'coords',
        description: `${crack.name} 住户坐标有误或缺席`,
        crackId: crack.id,
        affects3D: false,
      });
    }
    if (crack.z < 0 || crack.z > 5000) {
      gaps.push({
        id: `gap_z_${crack.id}`,
        type: 'other',
        description: `${crack.name} 高程数据异常，可能影响3D显示`,
        crackId: crack.id,
        affects3D: true,
      });
    }
  });

  return gaps;
}

export function get3DAffectingGaps(gaps: DataGap[]): DataGap[] {
  return gaps.filter((gap) => gap.affects3D);
}

export function has3DDataIssues(gaps: DataGap[]): boolean {
  return gaps.some((gap) => gap.affects3D);
}
