import { TerrainData, MonitoringDevice, CrackPoint, RainfallDataPoint, Household } from '@/types';

function generateTerrainElevation(width: number, height: number, resolution: number): number[][] {
  const elevation: number[][] = [];
  const scale = 15;
  
  for (let z = 0; z < resolution; z++) {
    elevation[z] = [];
    for (let x = 0; x < resolution; x++) {
      const nx = (x / resolution) * width;
      const nz = (z / resolution) * height;
      
      let h = 0;
      h += Math.sin(nx / scale) * Math.cos(nz / scale) * 8;
      h += Math.sin(nx / (scale * 0.5) + 1) * Math.cos(nz / (scale * 0.7)) * 4;
      h += Math.sin(nx / (scale * 2) + 2) * 3;
      h += Math.cos(nz / (scale * 1.5)) * 2;
      
      if (nx > width * 0.3 && nx < width * 0.7 && nz > height * 0.2 && nz < height * 0.6) {
        h += 6 * Math.sin((nx - width * 0.5) / 8) * Math.cos((nz - height * 0.4) / 10);
      }
      
      elevation[z][x] = h + 10;
    }
  }
  
  return elevation;
}

export const terrainData: TerrainData = {
  width: 100,
  height: 80,
  resolution: 50,
  elevation: generateTerrainElevation(100, 80, 50),
};

export function getTerrainHeight(x: number, z: number): number {
  const resolution = terrainData.resolution;
  const gridX = Math.floor((x / terrainData.width) * resolution);
  const gridZ = Math.floor((z / terrainData.height) * resolution);
  
  const clampedX = Math.max(0, Math.min(resolution - 1, gridX));
  const clampedZ = Math.max(0, Math.min(resolution - 1, gridZ));
  
  return terrainData.elevation[clampedZ][clampedX];
}

export const monitoringDevices: MonitoringDevice[] = [
  { id: 'dev-001', name: '监测站A-东坡', position: [25, getTerrainHeight(25, 20), 20], status: 'normal' },
  { id: 'dev-002', name: '监测站B-西坡', position: [75, getTerrainHeight(75, 30), 30], status: 'warning' },
  { id: 'dev-003', name: '监测站C-沟口', position: [50, getTerrainHeight(50, 55), 55], status: 'normal' },
  { id: 'dev-004', name: '监测站D-山顶', position: [50, getTerrainHeight(50, 15), 15], status: 'error' },
];

export const crackPoints: CrackPoint[] = [
  { id: 'crack-001', deviceId: 'dev-001', position: [30, getTerrainHeight(30, 25), 25], width: 0.15, depth: 1.2, type: 'tensile', isDuplicate: false, timestamp: '2024-05-15' },
  { id: 'crack-002', deviceId: 'dev-001', position: [35, getTerrainHeight(35, 28), 28], width: 0.08, depth: 0.5, type: 'shear', isDuplicate: false, timestamp: '2024-05-16' },
  { id: 'crack-003', deviceId: 'dev-002', position: [70, getTerrainHeight(70, 35), 35], width: 0.2, depth: 2.1, type: 'tensile', isDuplicate: false, timestamp: '2024-05-17' },
  { id: 'crack-004', deviceId: 'dev-002', position: [72, getTerrainHeight(72, 38), 38], width: 0.12, depth: 0.8, type: 'compression', isDuplicate: true, duplicateWith: 'crack-003', timestamp: '2024-05-18' },
  { id: 'crack-005', deviceId: 'dev-003', position: [48, getTerrainHeight(48, 50), 50], width: 0.05, depth: 0.3, type: 'shear', isDuplicate: false, timestamp: '2024-05-19' },
  { id: 'crack-006', deviceId: 'dev-004', position: [45, getTerrainHeight(45, 20), 20], width: 0.25, depth: 3.0, type: 'tensile', isDuplicate: false, timestamp: '2024-05-20' },
  { id: 'crack-007', deviceId: 'dev-004', position: [55, getTerrainHeight(55, 22), 22], width: 0.18, depth: 1.5, type: 'shear', isDuplicate: true, duplicateWith: 'crack-006', timestamp: '2024-05-20' },
  { id: 'crack-008', deviceId: 'dev-002', position: [68, getTerrainHeight(68, 40), 40], width: 0.1, depth: 0.6, type: 'compression', isDuplicate: false, timestamp: '2024-05-21' },
];

function generateRainfallData(): RainfallDataPoint[] {
  const data: RainfallDataPoint[] = [];
  const startDate = new Date('2024-05-01');
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const isMissing = (i === 7 || i === 14 || i === 21);
    const rainfall = isMissing ? 0 : Math.floor(Math.random() * 150 + (i > 10 ? 30 : 10));
    
    data.push({
      timestamp: date.toISOString().split('T')[0],
      rainfall,
      isMissing,
    });
  }
  
  return data;
}

export const rainfallData: RainfallDataPoint[] = generateRainfallData();

export const households: Household[] = [
  { id: 'house-001', name: '张家大院', actualPosition: [40, getTerrainHeight(40, 45), 45], reportedPosition: [40, getTerrainHeight(40, 45), 45], hasCoordinateError: false },
  { id: 'house-002', name: '李家老宅', actualPosition: [60, getTerrainHeight(60, 50), 50], reportedPosition: [70, getTerrainHeight(70, 55), 55], hasCoordinateError: true },
  { id: 'house-003', name: '王家新屋', actualPosition: [30, getTerrainHeight(30, 55), 55], reportedPosition: [30, getTerrainHeight(30, 55), 55], hasCoordinateError: false },
  { id: 'house-004', name: '陈家沟口', actualPosition: [55, getTerrainHeight(55, 65), 65], reportedPosition: [50, getTerrainHeight(50, 60), 60], hasCoordinateError: true },
  { id: 'house-005', name: '赵家坡上', actualPosition: [45, getTerrainHeight(45, 35), 35], reportedPosition: [45, getTerrainHeight(45, 35), 35], hasCoordinateError: false },
];

export function calculateSlope(x: number, z: number): number {
  const h1 = getTerrainHeight(x - 1, z);
  const h2 = getTerrainHeight(x + 1, z);
  const h3 = getTerrainHeight(x, z - 1);
  const h4 = getTerrainHeight(x, z + 1);
  
  const dx = (h2 - h1) / 2;
  const dz = (h4 - h3) / 2;
  
  const slopeRad = Math.atan(Math.sqrt(dx * dx + dz * dz));
  return slopeRad * (180 / Math.PI);
}

export function getRiskLevel(slope: number, rainfall: number, slopeThreshold: number, rainfallThreshold: number): 'low' | 'medium' | 'high' | 'critical' {
  let score = 0;
  if (slope > slopeThreshold) score += 2;
  if (slope > slopeThreshold * 1.2) score += 1;
  if (rainfall > rainfallThreshold) score += 2;
  if (rainfall > rainfallThreshold * 1.5) score += 1;
  
  if (score >= 4) return 'critical';
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
