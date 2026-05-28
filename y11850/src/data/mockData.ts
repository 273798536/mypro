import { DataPackage, Building, Apartment, SetbackLine, SunPath } from '@/types';
import { generateSunPath, parseTimezone } from '@/utils/sunCalculator';

const BEIJING_LAT = 39.9042;
const BEIJING_LNG = 116.4074;

function generateApartments(buildingId: string, floors: number, aptsPerFloor: number): Apartment[] {
  const apartments: Apartment[] = [];
  const orientations: Array<'N' | 'S' | 'E' | 'W'> = ['E', 'S', 'W', 'N'];
  
  for (let floor = 1; floor <= floors; floor++) {
    for (let apt = 0; apt < aptsPerFloor; apt++) {
      const orientation = orientations[apt % 4];
      const floorHeight = floor * 3 - 1.5;
      const windowPositions: [number, number, number][] = [];
      
      if (orientation === 'S') {
        windowPositions.push([-8, floorHeight, 0]);
        windowPositions.push([8, floorHeight, 0]);
      } else if (orientation === 'N') {
        windowPositions.push([-8, floorHeight, -10]);
        windowPositions.push([8, floorHeight, -10]);
      } else if (orientation === 'E') {
        windowPositions.push([12, floorHeight, -5]);
      } else if (orientation === 'W') {
        windowPositions.push([-12, floorHeight, -5]);
      }
      
      apartments.push({
        id: `${buildingId}-${floor}-${apt + 1}`,
        unitNumber: `${floor}0${apt + 1}`,
        floor,
        orientation,
        windowPositions,
      });
    }
  }
  
  return apartments;
}

const mockBuildings: Building[] = [
  {
    id: 'building-a',
    name: 'A栋住宅楼',
    height: 54,
    floors: 18,
    position: [0, 0, 0],
    dimensions: [30, 54, 15],
    color: '#60A5FA',
    apartments: generateApartments('building-a', 18, 4),
  },
  {
    id: 'building-b',
    name: 'B栋住宅楼',
    height: 45,
    floors: 15,
    position: [50, 0, -20],
    dimensions: [25, 45, 12],
    color: '#34D399',
    apartments: generateApartments('building-b', 15, 3),
  },
  {
    id: 'building-c',
    name: 'C栋办公楼',
    height: 72,
    floors: 24,
    position: [-45, 0, 10],
    dimensions: [28, 72, 20],
    color: '#F472B6',
    apartments: generateApartments('building-c', 24, 4),
  },
  {
    id: 'building-d',
    name: 'D栋商住楼',
    height: 36,
    floors: 12,
    position: [20, 0, 40],
    dimensions: [35, 36, 18],
    color: '#FBBF24',
    apartments: generateApartments('building-d', 12, 4),
  },
];

const mockSetbackLines: SetbackLine[] = [
  {
    id: 'setback-north',
    type: 'boundary',
    points: [
      [-80, 0.01, -60],
      [80, 0.01, -60],
    ],
  },
  {
    id: 'setback-south',
    type: 'boundary',
    points: [
      [-80, 0.01, 60],
      [80, 0.01, 60],
    ],
  },
  {
    id: 'setback-east',
    type: 'setback',
    points: [
      [-70, 0.01, -50],
      [-70, 0.01, 50],
    ],
  },
  {
    id: 'setback-west',
    type: 'setback',
    points: [
      [70, 0.01, -50],
      [70, 0.01, 50],
    ],
  },
];

function createSunPath(timezone: string): SunPath {
  const offset = parseTimezone(timezone) || 8;
  const pathData = generateSunPath(BEIJING_LAT, BEIJING_LNG, offset);
  
  return {
    timezone,
    latitude: BEIJING_LAT,
    longitude: BEIJING_LNG,
    spring: pathData.spring,
    summer: pathData.summer,
    autumn: pathData.autumn,
    winter: pathData.winter,
  };
}

export const mockDataPackageCorrect: DataPackage = {
  id: 'demo-package-correct',
  name: '望京新城住宅项目',
  timezone: 'UTC+8',
  buildings: mockBuildings,
  sunPath: createSunPath('UTC+8'),
  setbackLines: mockSetbackLines,
};

export const mockDataPackageTimezoneError: DataPackage = {
  id: 'demo-package-tz-error',
  name: '望京新城住宅项目（时区错误）',
  timezone: 'UTC',
  buildings: mockBuildings,
  sunPath: createSunPath('UTC'),
  setbackLines: mockSetbackLines,
};

export const mockDataPackageFloorError: DataPackage = {
  id: 'demo-package-floor-error',
  name: '望京新城住宅项目（楼层数据异常）',
  timezone: 'UTC+8',
  buildings: [
    ...mockBuildings.slice(0, 1),
    {
      ...mockBuildings[1],
      apartments: mockBuildings[1].apartments.filter(apt => apt.floor !== 5 && apt.floor !== 6),
    },
    ...mockBuildings.slice(2),
  ],
  sunPath: createSunPath('UTC+8'),
  setbackLines: mockSetbackLines,
};

export const mockDataPackages: Record<string, DataPackage> = {
  correct: mockDataPackageCorrect,
  timezoneError: mockDataPackageTimezoneError,
  floorError: mockDataPackageFloorError,
};

export function getMockDataPackage(type: 'correct' | 'timezoneError' | 'floorError' = 'correct'): DataPackage {
  return JSON.parse(JSON.stringify(mockDataPackages[type]));
}
