import { BoundaryCase, ConnectionPoolData } from '../../shared/types';
import crypto from 'crypto-js';

const now = Date.now();

const foreignKeyCaseData: ConnectionPoolData[] = [
  {
    id: 'conn-' + crypto.MD5('fk1').toString(),
    timestamp: now - 3600000,
    poolName: 'order-db-pool',
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 45,
    totalConnections: 0,
    maxConnections: 100,
    timeoutCount: 45,
    errorRate: 100,
    avgWaitTime: 30000,
    host: '192.168.1.99',
    port: 3306,
    database: 'order_db_not_exist'
  },
  {
    id: 'conn-' + crypto.MD5('fk2').toString(),
    timestamp: now - 3500000,
    poolName: 'order-db-pool',
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 52,
    totalConnections: 0,
    maxConnections: 100,
    timeoutCount: 52,
    errorRate: 100,
    avgWaitTime: 30000,
    host: '192.168.1.99',
    port: 3306,
    database: 'order_db_not_exist'
  }
];

const connectionLeakCaseData: ConnectionPoolData[] = [
  {
    id: 'conn-' + crypto.MD5('leak1').toString(),
    timestamp: now - 7200000,
    poolName: 'user-db-pool',
    activeConnections: 98,
    idleConnections: 2,
    waitingRequests: 23,
    totalConnections: 100,
    maxConnections: 100,
    timeoutCount: 15,
    errorRate: 12.5,
    avgWaitTime: 15000,
    host: '192.168.1.10',
    port: 3306,
    database: 'user_db'
  },
  {
    id: 'conn-' + crypto.MD5('leak2').toString(),
    timestamp: now - 7100000,
    poolName: 'user-db-pool',
    activeConnections: 99,
    idleConnections: 1,
    waitingRequests: 31,
    totalConnections: 100,
    maxConnections: 100,
    timeoutCount: 22,
    errorRate: 18.3,
    avgWaitTime: 18000,
    host: '192.168.1.10',
    port: 3306,
    database: 'user_db'
  },
  {
    id: 'conn-' + crypto.MD5('leak3').toString(),
    timestamp: now - 7000000,
    poolName: 'user-db-pool',
    activeConnections: 100,
    idleConnections: 0,
    waitingRequests: 45,
    totalConnections: 100,
    maxConnections: 100,
    timeoutCount: 38,
    errorRate: 28.5,
    avgWaitTime: 25000,
    host: '192.168.1.10',
    port: 3306,
    database: 'user_db'
  }
];

const timeoutResetCaseData: ConnectionPoolData[] = [
  {
    id: 'conn-' + crypto.MD5('to1').toString(),
    timestamp: now - 1800000,
    poolName: 'product-db-pool',
    activeConnections: 45,
    idleConnections: 25,
    waitingRequests: 8,
    totalConnections: 70,
    maxConnections: 100,
    timeoutCount: 12,
    errorRate: 8.5,
    avgWaitTime: 5000,
    host: '192.168.1.20',
    port: 3306,
    database: 'product_db'
  },
  {
    id: 'conn-' + crypto.MD5('to2').toString(),
    timestamp: now - 1700000,
    poolName: 'product-db-pool',
    activeConnections: 52,
    idleConnections: 18,
    waitingRequests: 12,
    totalConnections: 70,
    maxConnections: 100,
    timeoutCount: 18,
    errorRate: 11.2,
    avgWaitTime: 6500,
    host: '192.168.1.20',
    port: 3306,
    database: 'product_db'
  }
];

const badDataCaseData: ConnectionPoolData[] = [
  {
    id: 'conn-' + crypto.MD5('bad1').toString(),
    timestamp: now - 300000,
    poolName: 'payment-db-pool',
    activeConnections: 67,
    idleConnections: 23,
    waitingRequests: 3,
    totalConnections: 90,
    maxConnections: 100,
    timeoutCount: 2,
    errorRate: 2.1,
    avgWaitTime: 1200,
    host: '192.168.1.30',
    port: 3306,
    database: 'payment_db'
  },
  {
    id: 'conn-' + crypto.MD5('bad2').toString(),
    timestamp: now - 200000,
    poolName: 'payment-db-pool',
    activeConnections: -1,
    idleConnections: NaN as unknown as number,
    waitingRequests: 99999,
    totalConnections: 999999,
    maxConnections: 100,
    timeoutCount: 999,
    errorRate: 150,
    avgWaitTime: -500,
    host: '192.168.1.30',
    port: 3306,
    database: 'payment_db'
  },
  {
    id: 'conn-' + crypto.MD5('bad3').toString(),
    timestamp: now - 100000,
    poolName: 'payment-db-pool乱码数据���',
    activeConnections: 45,
    idleConnections: 30,
    waitingRequests: 5,
    totalConnections: 75,
    maxConnections: 100,
    timeoutCount: 3,
    errorRate: 3.5,
    avgWaitTime: 2000,
    host: '192.168.1.30',
    port: 3306,
    database: 'payment_db'
  }
];

const normalCaseData: ConnectionPoolData[] = Array.from({ length: 12 }, (_, i) => ({
  id: 'conn-' + crypto.MD5('normal' + i).toString(),
  timestamp: now - (12 - i) * 300000,
  poolName: 'main-db-pool',
  activeConnections: 40 + Math.floor(Math.random() * 20),
  idleConnections: 30 + Math.floor(Math.random() * 15),
  waitingRequests: Math.floor(Math.random() * 3),
  totalConnections: 75 + Math.floor(Math.random() * 10),
  maxConnections: 100,
  timeoutCount: Math.floor(Math.random() * 2),
  errorRate: Math.random() * 2,
  avgWaitTime: 100 + Math.random() * 500,
  host: '192.168.1.5',
  port: 3306,
  database: 'main_db'
}));

export const boundaryCases: BoundaryCase[] = [
  {
    id: 'c001',
    name: '外键断链',
    description: '连接池配置指向不存在的数据库实例，导致所有连接建立失败。这是配置变更后常见的问题，database名称拼写错误或实例下线未更新配置都会触发。',
    type: 'foreign_key',
    testData: foreignKeyCaseData,
    expectedResult: {
      severity: 'critical',
      issueType: 'connection_failure'
    },
    isActive: true
  },
  {
    id: 'c002',
    name: '连接泄漏',
    description: '应用代码未在finally块中正确释放连接，导致连接池逐渐耗尽。这类问题通常在流量高峰时爆发，表现为连接数持续增长但不释放。',
    type: 'leak',
    testData: connectionLeakCaseData,
    expectedResult: {
      severity: 'critical',
      issueType: 'connection_leak'
    },
    isActive: true
  },
  {
    id: 'c003',
    name: '超时重置',
    description: '网络设备（防火墙、负载均衡）的空闲超时小于连接池的存活超时，导致连接被中间设备静默重置。应用拿到的连接实际已失效。',
    type: 'timeout',
    testData: timeoutResetCaseData,
    expectedResult: {
      severity: 'warning',
      issueType: 'connection_reset'
    },
    isActive: true
  },
  {
    id: 'c004',
    name: '坏数据样例',
    description: '模拟真实场景中混入的异常数据：负数连接数、NaN值、超大异常值、乱码字符。这类数据常出现在监控系统异常或日志解析失败时。',
    type: 'bad_data',
    testData: badDataCaseData,
    expectedResult: {
      severity: 'warning',
      issueType: 'data_anomaly'
    },
    isActive: true
  }
];

export const mockHistoryBatches = [
  {
    id: 'batch-' + crypto.MD5('batch001').toString(),
    timestamp: now - 86400000 * 3,
    operator: '张明',
    operatorId: 'u001',
    dataHash: crypto.MD5('batch001' + now).toString(),
    status: 'completed',
    rawData: normalCaseData.slice(0, 6)
  },
  {
    id: 'batch-' + crypto.MD5('batch002').toString(),
    timestamp: now - 86400000 * 2,
    operator: '张明',
    operatorId: 'u001',
    dataHash: crypto.MD5('batch002' + now).toString(),
    status: 'completed',
    rawData: normalCaseData.slice(3, 9)
  },
  {
    id: 'batch-' + crypto.MD5('batch003').toString(),
    timestamp: now - 86400000,
    operator: '李华',
    operatorId: 'u002',
    dataHash: crypto.MD5('batch003' + now).toString(),
    status: 'completed',
    rawData: connectionLeakCaseData
  }
];

export const mockAuditLogs = [
  {
    id: 'audit-' + crypto.MD5('audit001').toString(),
    operationType: 'import' as const,
    operatorId: 'u001',
    operatorName: '张明',
    timestamp: now - 86400000 * 3,
    batchId: 'batch-' + crypto.MD5('batch001').toString(),
    description: '导入连接池监控数据，共6条记录',
    reason: '月结前例行检查'
  },
  {
    id: 'audit-' + crypto.MD5('audit002').toString(),
    operationType: 'diagnose' as const,
    operatorId: 'u001',
    operatorName: '张明',
    timestamp: now - 86400000 * 3 + 300000,
    batchId: 'batch-' + crypto.MD5('batch001').toString(),
    description: '执行诊断，发现1个警告，0个严重'
  },
  {
    id: 'audit-' + crypto.MD5('audit003').toString(),
    operationType: 'confirm' as const,
    operatorId: 'u001',
    operatorName: '张明',
    timestamp: now - 86400000 * 3 + 600000,
    batchId: 'batch-' + crypto.MD5('batch001').toString(),
    description: '确认诊断结果，属于正常波动'
  },
  {
    id: 'audit-' + crypto.MD5('audit004').toString(),
    operationType: 'modify' as const,
    operatorId: 'u002',
    operatorName: '李华',
    timestamp: now - 86400000 + 1200000,
    batchId: 'batch-' + crypto.MD5('batch003').toString(),
    description: '修正阈值参数，将连接池告警阈值从80%调整为75%',
    reason: '观察到历史数据在75%时已有性能下降趋势',
    approverId: 'u003',
    approverName: '王芳',
    changes: JSON.stringify([
      { field: 'pool.max_connections_warning', oldValue: '80', newValue: '75' }
    ])
  },
  {
    id: 'audit-' + crypto.MD5('audit005').toString(),
    operationType: 'rollback' as const,
    operatorId: 'u002',
    operatorName: '李华',
    timestamp: now - 86400000 + 2400000,
    batchId: 'batch-' + crypto.MD5('batch003').toString(),
    description: '回滚到上一版本，修正后产生了过多误报',
    reason: '阈值调整过于激进，恢复原值后重新评估'
  },
  {
    id: 'audit-' + crypto.MD5('audit006').toString(),
    operationType: 'permission' as const,
    operatorId: 'u001',
    operatorName: '张明',
    timestamp: now - 3600000,
    description: '申请越权操作：修改数据字典',
    reason: '需要调整超时阈值以适配新业务场景',
    approverId: 'u002',
    approverName: '李华'
  }
];

export const initBoundaryCases = (db: any) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM boundary_case').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO boundary_case (id, name, description, type, test_data, expected_result, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    boundaryCases.forEach(c => {
      insert.run(
        c.id,
        c.name,
        c.description,
        c.type,
        JSON.stringify(c.testData),
        JSON.stringify(c.expectedResult),
        c.isActive ? 1 : 0
      );
    });
  }
};

export const initMockData = (db: any) => {
  const batchCount = db.prepare('SELECT COUNT(*) as count FROM diagnosis_batch').get() as { count: number };
  if (batchCount.count === 0) {
    const insertBatch = db.prepare(`
      INSERT INTO diagnosis_batch (id, timestamp, operator, operator_id, data_hash, status, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    mockHistoryBatches.forEach(b => {
      insertBatch.run(
        b.id,
        b.timestamp,
        b.operator,
        b.operatorId,
        b.dataHash,
        b.status,
        JSON.stringify(b.rawData)
      );
    });

    const insertAudit = db.prepare(`
      INSERT INTO audit_log (id, operation_type, operator_id, operator_name, timestamp, batch_id, description, reason, approver_id, approver_name, changes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    mockAuditLogs.forEach(l => {
      insertAudit.run(
        l.id,
        l.operationType,
        l.operatorId,
        l.operatorName,
        l.timestamp,
        l.batchId || null,
        l.description,
        l.reason || null,
        l.approverId || null,
        l.approverName || null,
        l.changes || null
      );
    });
  }
};
