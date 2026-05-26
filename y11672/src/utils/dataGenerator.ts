import { Container, ModifyRecord } from '../types';

const containerPrefixes = ['MSKU', 'MAEU', 'HLCU', 'YMLU', 'OOLU', 'APLU', 'CMAU', 'NYKU'];
const dangerousClasses = [
  '', '爆炸品', '气体', '易燃液体', '易燃固体', 
  '氧化剂', '毒性物质', '放射性物质', '腐蚀品', '杂类'
];
const trainIds = ['TRAIN-001', 'TRAIN-002', 'TRAIN-003', 'TRAIN-004', 'TRAIN-005'];
const origins = ['EDI系统', '人工录入', '船公司同步', '码头作业系统', '预约平台'];
const operators = ['张计划员', '李调度', '王主管', '刘操作员', '陈班长'];

function generateContainerId(): string {
  const prefix = containerPrefixes[Math.floor(Math.random() * containerPrefixes.length)];
  const number = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}${number}`;
}

function generateModifyHistory(initialBay: number, initialRow: number): ModifyRecord[] {
  const history: ModifyRecord[] = [];
  const changes = Math.floor(Math.random() * 3);
  
  for (let i = 0; i < changes; i++) {
    const fields = ['bay', 'row', 'tier', 'booking.status'];
    const field = fields[Math.floor(Math.random() * fields.length)];
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    
    history.push({
      timestamp,
      field,
      oldValue: field === 'bay' ? initialBay - 1 : field === 'row' ? initialRow - 1 : 'pending',
      newValue: field === 'bay' ? initialBay : field === 'row' ? initialRow : 'ready',
      operator: operators[Math.floor(Math.random() * operators.length)]
    });
  }
  
  return history;
}

export function generateContainers(count: number = 200): Container[] {
  const containers: Container[] = [];
  const usedPositions = new Set<string>();
  const maxBay = 12;
  const maxRow = 8;
  const maxTier = 5;
  
  let pickupOrder = 1;
  
  for (let i = 0; i < count; i++) {
    let bay: number, row: number, tier: number;
    let positionKey: string;
    let attempts = 0;
    
    do {
      bay = Math.floor(Math.random() * maxBay) + 1;
      row = Math.floor(Math.random() * maxRow) + 1;
      tier = Math.floor(Math.random() * maxTier) + 1;
      positionKey = `${bay}-${row}-${tier}`;
      attempts++;
    } while (usedPositions.has(positionKey) && attempts < 100);
    
    if (attempts >= 100) continue;
    usedPositions.add(positionKey);
    
    const size = Math.random() > 0.3 ? 20 : 40;
    const isDangerous = Math.random() < 0.15;
    const dangerousLevel = isDangerous ? Math.floor(Math.random() * 9) + 1 : 0;
    const hasBooking = Math.random() < 0.7;
    
    const appointmentTime = new Date(Date.now() + (Math.random() - 0.3) * 48 * 60 * 60 * 1000);
    const now = new Date();
    let bookingStatus: Container['booking']['status'] = 'pending';
    if (appointmentTime < now) {
      bookingStatus = Math.random() < 0.7 ? 'expired' : 'completed';
    } else if (Math.random() < 0.5) {
      bookingStatus = 'ready';
    }
    
    containers.push({
      id: generateContainerId(),
      bay,
      row,
      tier,
      size,
      type: ['dry', 'reefer', 'tank', 'open'][Math.floor(Math.random() * 4)] as Container['type'],
      dangerousGoods: {
        level: dangerousLevel,
        class: dangerousClasses[dangerousLevel]
      },
      booking: {
        trainId: hasBooking ? trainIds[Math.floor(Math.random() * trainIds.length)] : '',
        pickupOrder: hasBooking ? pickupOrder++ : 0,
        appointmentTime: hasBooking ? appointmentTime.toISOString() : '',
        status: hasBooking ? bookingStatus : 'pending'
      },
      source: {
        origin: origins[Math.floor(Math.random() * origins.length)],
        lastModified: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        modifyHistory: generateModifyHistory(bay, row)
      }
    });
  }
  
  return containers;
}

export function createStackedContainers(baseContainers: Container[]): Container[] {
  const containers = [...baseContainers];
  
  for (let i = 0; i < 8; i++) {
    const baseContainer = containers[Math.floor(Math.random() * containers.length)];
    const newTier = baseContainer.tier + 1;
    if (newTier > 5) continue;
    
    const hasPosition = containers.some(
      c => c.bay === baseContainer.bay && c.row === baseContainer.row && c.tier === newTier
    );
    if (hasPosition) continue;
    
    containers.push({
      id: generateContainerId(),
      bay: baseContainer.bay,
      row: baseContainer.row,
      tier: newTier,
      size: 20,
      type: 'dry',
      dangerousGoods: { level: 0, class: '' },
      booking: {
        trainId: trainIds[Math.floor(Math.random() * trainIds.length)],
        pickupOrder: baseContainer.booking.pickupOrder - 1 > 0 ? baseContainer.booking.pickupOrder - 1 : containers.length,
        appointmentTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        status: 'ready'
      },
      source: {
        origin: '码头作业系统',
        lastModified: new Date().toISOString(),
        modifyHistory: []
      }
    });
  }
  
  return containers;
}

export function createDangerousAdjacentCases(containers: Container[]): Container[] {
  const dangerousContainers = containers.filter(c => c.dangerousGoods.level > 0);
  
  for (let i = 0; i < 3; i++) {
    const dangerous = dangerousContainers[Math.floor(Math.random() * dangerousContainers.length)];
    if (!dangerous) continue;
    
    const adjacentBay = dangerous.bay + 1;
    const adjacentRow = dangerous.row;
    const adjacentTier = dangerous.tier;
    
    const hasPosition = containers.some(
      c => c.bay === adjacentBay && c.row === adjacentRow && c.tier === adjacentTier
    );
    if (hasPosition) continue;
    
    containers.push({
      id: generateContainerId(),
      bay: adjacentBay,
      row: adjacentRow,
      tier: adjacentTier,
      size: 20,
      type: 'tank',
      dangerousGoods: {
        level: Math.floor(Math.random() * 4) + 1,
        class: dangerousClasses[Math.floor(Math.random() * 4) + 1]
      },
      booking: {
        trainId: '',
        pickupOrder: 0,
        appointmentTime: '',
        status: 'pending'
      },
      source: {
        origin: '船公司同步',
        lastModified: new Date().toISOString(),
        modifyHistory: []
      }
    });
  }
  
  return containers;
}

export function generateDemoData(): Container[] {
  let containers = generateContainers(180);
  containers = createStackedContainers(containers);
  containers = createDangerousAdjacentCases(containers);
  return containers;
}
