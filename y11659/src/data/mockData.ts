import type { Material, Vehicle, Difficulty } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const containerNumbers = [
  'MSKU1234567',
  'MAEU9876543',
  'CSLU4567890',
  'HJCU2468135',
  'NYKU1357924',
  'OOCL8642097',
  'YMLU5792468',
  'ZIMU3692581',
];

const plateNumbers = [
  '沪A12345',
  '沪B67890',
  '苏E11111',
  '浙A22222',
  '皖M33333',
  '鲁Q44444',
];

const dangerousClasses = [
  { number: '1', name: '爆炸品' },
  { number: '2', name: '气体' },
  { number: '3', name: '易燃液体' },
  { number: '4', name: '易燃固体' },
  { number: '5', name: '氧化剂' },
  { number: '6', name: '毒性物质' },
  { number: '7', name: '放射性物质' },
  { number: '8', name: '腐蚀性物质' },
  { number: '9', name: '杂类危险物质' },
];

const cargoTypes = [
  '电子产品',
  '服装纺织',
  '机械设备',
  '化工原料',
  '食品饮料',
  '建材家具',
];

export const generateMockMaterials = (): Material[] => {
  const materials: Material[] = [];
  const batchId = generateId();
  const now = Date.now();

  containerNumbers.forEach((cn, idx) => {
    materials.push({
      id: `container-${idx}`,
      type: 'container',
      source: '系统预置',
      data: {
        containerNumber: cn,
        size: idx % 2 === 0 ? '40ft' : '20ft',
        type: 'GP',
      },
      importTime: now,
      importBatch: batchId,
    });
  });

  plateNumbers.forEach((pn, idx) => {
    materials.push({
      id: `plate-${idx}`,
      type: 'license_plate',
      source: '系统预置',
      data: {
        plateNumber: pn,
        vehicleType: '集卡',
      },
      importTime: now,
      importBatch: batchId,
    });
  });

  return materials;
};

export const generateMockVehicles = (): Vehicle[] => {
  const vehicles: Vehicle[] = [];
  const now = Date.now();
  const batchId = generateId();

  const scenarios = [
    {
      difficulty: 'easy' as Difficulty,
      containerNumber: 'MSKU1234567',
      plateNumber: '沪A12345',
      bookingContainer: 'MSKU1234567',
      bookingPlate: '沪A12345',
      hasDangerous: false,
      bookingValid: true,
      correctAction: 'release' as const,
    },
    {
      difficulty: 'easy' as Difficulty,
      containerNumber: 'MAEU9876543',
      plateNumber: '沪B67890',
      bookingContainer: 'MAEU9876543',
      bookingPlate: '沪B67890',
      hasDangerous: false,
      bookingValid: true,
      correctAction: 'release' as const,
    },
    {
      difficulty: 'medium' as Difficulty,
      containerNumber: 'CSLU4567890',
      plateNumber: '苏E11111',
      bookingContainer: 'CSLU4567899',
      bookingPlate: '苏E11111',
      hasDangerous: false,
      bookingValid: true,
      correctAction: 'intercept' as const,
      interceptReason: ['预约不匹配'],
    },
    {
      difficulty: 'medium' as Difficulty,
      containerNumber: 'HJCU2468135',
      plateNumber: '浙A22222',
      bookingContainer: 'HJCU2468135',
      bookingPlate: '浙A22222',
      hasDangerous: true,
      dangerousClass: '3',
      bookingValid: true,
      correctAction: 'intercept' as const,
      interceptReason: ['危品未申报'],
    },
    {
      difficulty: 'hard' as Difficulty,
      containerNumber: 'NYKU1357924',
      plateNumber: '皖M33333',
      bookingContainer: 'NYKU1357924',
      bookingPlate: '皖M33334',
      hasDangerous: false,
      bookingValid: true,
      correctAction: 'intercept' as const,
      interceptReason: ['预约不匹配'],
    },
    {
      difficulty: 'hard' as Difficulty,
      containerNumber: 'OOCL8642097',
      plateNumber: '鲁Q44444',
      bookingContainer: 'OOCL8642097',
      bookingPlate: '鲁Q44444',
      hasDangerous: true,
      dangerousClass: '8',
      bookingValid: false,
      correctAction: 'intercept' as const,
      interceptReason: ['预约无效', '危品未申报'],
    },
    {
      difficulty: 'easy' as Difficulty,
      containerNumber: 'YMLU5792468',
      plateNumber: '沪A12345',
      bookingContainer: 'YMLU5792468',
      bookingPlate: '沪A12345',
      hasDangerous: false,
      bookingValid: true,
      correctAction: 'release' as const,
    },
    {
      difficulty: 'medium' as Difficulty,
      containerNumber: 'ZIMU3692581',
      plateNumber: '沪B67890',
      bookingContainer: 'ZIMU3692581',
      bookingPlate: '沪B67890',
      hasDangerous: false,
      bookingValid: false,
      correctAction: 'intercept' as const,
      interceptReason: ['预约无效'],
    },
  ];

  scenarios.forEach((s, idx) => {
    const dangerousClass = dangerousClasses.find(c => c.number === s.dangerousClass);
    
    vehicles.push({
      id: `vehicle-${idx}`,
      difficulty: s.difficulty,
      correctAction: s.correctAction,
      interceptReason: s.interceptReason,
      materials: {
        container: {
          id: `v-${idx}-container`,
          type: 'container',
          source: '模拟数据',
          data: {
            containerNumber: s.containerNumber,
            size: '40ft',
            type: 'GP',
          },
          importTime: now,
          importBatch: batchId,
        },
        licensePlate: {
          id: `v-${idx}-plate`,
          type: 'license_plate',
          source: '模拟数据',
          data: {
            plateNumber: s.plateNumber,
            vehicleType: '集卡',
          },
          importTime: now,
          importBatch: batchId,
        },
        bookingNote: {
          id: `v-${idx}-booking`,
          type: 'booking_note',
          source: '模拟数据',
          data: {
            bookingNumber: `BK${String(idx + 1).padStart(6, '0')}`,
            containerNumber: s.bookingContainer,
            plateNumber: s.bookingPlate,
            cargoType: cargoTypes[idx % cargoTypes.length],
            isDangerous: s.hasDangerous && s.bookingValid,
            dangerousClass: s.hasDangerous && s.bookingValid ? s.dangerousClass : undefined,
            valid: s.bookingValid,
          },
          importTime: now,
          importBatch: batchId,
        },
        ...(s.hasDangerous ? {
          dangerousMark: {
            id: `v-${idx}-dangerous`,
            type: 'dangerous_mark',
            source: '模拟数据',
            data: {
              classNumber: s.dangerousClass!,
              className: dangerousClass?.name || '',
              hasMark: true,
            },
            importTime: now,
            importBatch: batchId,
          },
        } : {}),
      },
    });
  });

  return vehicles;
};

export const mockVehicles = generateMockVehicles();
