import {
  DataChainNode,
  DataChainStep,
  Booking,
  DataSource,
} from '../types';
import { generateId, dayjsInstance } from '../utils/dateUtils';

export function createChainNode(
  step: DataChainStep,
  source: string,
  version: string,
  dataSnapshot: unknown,
  operator?: string,
  remark?: string,
): DataChainNode {
  return {
    step,
    timestamp: dayjsInstance().toISOString(),
    source,
    version,
    dataSnapshot,
    operator,
    remark,
  };
}

export function createImportChainNode(
  dataSource: DataSource,
  dataSnapshot: unknown,
): DataChainNode {
  return createChainNode(
    'import',
    dataSource.source,
    dataSource.version,
    dataSnapshot,
    'system',
    `导入数据: ${dataSource.name}`,
  );
}

export function createConflictDetectChainNode(
  dataSnapshot: unknown,
  conflictCount: number,
): DataChainNode {
  return createChainNode(
    'conflict_detect',
    'conflict-engine',
    'v1.0',
    dataSnapshot,
    'system',
    `检测到 ${conflictCount} 个冲突`,
  );
}

export function createAdjustChainNode(
  source: string,
  version: string,
  dataSnapshot: unknown,
  operator: string,
  remark: string,
): DataChainNode {
  return createChainNode(
    'adjust',
    source,
    version,
    dataSnapshot,
    operator,
    remark,
  );
}

export function createExportChainNode(
  dataSnapshot: unknown,
  format: string,
  operator: string,
): DataChainNode {
  return createChainNode(
    'export',
    'export-generator',
    'v1.0',
    dataSnapshot,
    operator,
    `导出 ${format} 格式日程`,
  );
}

export function addChainNode(
  booking: Booking,
  node: DataChainNode,
): Booking {
  return {
    ...booking,
    dataChain: [...booking.dataChain, node],
    version: generateId(),
  };
}

export function getBookingChainSummary(booking: Booking): string {
  const steps = booking.dataChain.map(node => {
    const stepNames: Record<DataChainStep, string> = {
      import: '导入',
      conflict_detect: '冲突检测',
      adjust: '调整',
      export: '导出',
    };
    return `${stepNames[node.step]}(${node.version})`;
  }).join(' → ');
  return steps || '无链路记录';
}

export function verifyChainIntegrity(booking: Booking): boolean {
  if (booking.dataChain.length === 0) return false;
  
  for (let i = 1; i < booking.dataChain.length; i++) {
    const prev = booking.dataChain[i - 1];
    const curr = booking.dataChain[i];
    if (dayjsInstance(curr.timestamp).isBefore(prev.timestamp)) {
      return false;
    }
  }
  return true;
}

export function getChainVersion(booking: Booking): string {
  if (booking.dataChain.length === 0) return 'v0.0';
  const lastNode = booking.dataChain[booking.dataChain.length - 1];
  return lastNode.version;
}

export function getChainSource(booking: Booking): string {
  if (booking.dataChain.length === 0) return 'unknown';
  const importNodes = booking.dataChain.filter(n => n.step === 'import');
  if (importNodes.length === 0) return 'unknown';
  return importNodes[importNodes.length - 1].source;
}
