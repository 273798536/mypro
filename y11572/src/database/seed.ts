import { v4 as uuidv4 } from 'uuid';
import sequelize, { syncDatabase, testConnection } from './connection';
import { setupAssociations } from '../models';
import {
  CompensationTicketModel,
  StatusHistoryModel,
  AuditLogModel,
} from '../models';
import {
  TicketStatus,
  IdempotencyMode,
  CompensateType,
  TicketData,
  Operator,
} from '../types';
import logger from '../config/logger';

const testOperator: Operator = {
  id: 'operator-001',
  name: '测试管理员',
  role: 'admin',
};

const generateSessionSummary = (idx: number) => ({
  sessionId: `sess-${uuidv4()}`,
  customerId: `cust-${1000 + idx}`,
  customerName: `客户${idx}`,
  issueType: ['退款申请', '优惠券补发', '积分补偿', '服务投诉'][idx % 4],
  summary: `客户反映订单处理异常，经过多次转派后需要人工介入处理。转派次数: ${idx + 1}次`,
  transferCount: idx + 1,
  agentNotes: `客服${idx}号处理记录：客户情绪${idx % 2 === 0 ? '稳定' : '激动'}，建议优先处理`,
  createdAt: new Date(Date.now() - idx * 3600000),
});

const generateSLARule = (idx: number) => ({
  ruleId: `sla-rule-${idx}`,
  ruleName: ['普通工单SLA', '加急工单SLA', 'VIP工单SLA', '投诉工单SLA'][idx % 4],
  priority: idx % 3 + 1,
  responseHours: [24, 12, 6, 2][idx % 4],
  resolutionHours: [72, 48, 24, 12][idx % 4],
  escalateAfterHours: [48, 24, 12, 6][idx % 4],
  conditions: {
    vipLevel: idx % 3,
    issueCategory: ['billing', 'service', 'technical', 'other'][idx % 4],
  },
});

const generateCompensationApproval = (idx: number) => ({
  approvalId: `appr-${uuidv4()}`,
  approverId: `mgr-${100 + idx}`,
  approverName: `主管${idx}`,
  approvedAt: new Date(Date.now() - idx * 1800000),
  approvedAmount: [50, 100, 200, 50, 150][idx % 5],
  approvalNotes: '符合补偿政策，同意执行',
});

const generateCompensationAmounts = (idx: number) => {
  const types = [CompensateType.REFUND, CompensateType.COUPON, CompensateType.POINTS];
  const amounts = [
    { type: types[idx % 3], amount: [50, 100, 500][idx % 3], description: `${['现金退款', '优惠券', '积分'][idx % 3]}补偿` },
  ];
  if (idx % 2 === 0) {
    amounts.push({ type: CompensateType.COUPON, amount: 20, description: '额外优惠券补偿' });
  }
  return amounts;
};

const generateTicketData = (idx: number): TicketData => ({
  sourceType: ['manual', 'auto', 'batch', 'api'][idx % 4],
  sourceId: `src-${uuidv4()}`,
  sessionSummary: generateSessionSummary(idx),
  slaRule: generateSLARule(idx),
  compensationApproval: generateCompensationApproval(idx),
  secondaryConfirmation: idx % 3 === 0 ? {
    confirmationId: `conf-${uuidv4()}`,
    confirmerId: `qa-${10 + idx}`,
    confirmerName: `复核员${idx}`,
    confirmedAt: new Date(Date.now() - idx * 900000),
    confirmationType: 'double_check',
    confirmationNotes: '二次复核通过，补偿金额准确',
    customerAcknowledged: true,
  } : undefined,
  compensationAmounts: generateCompensationAmounts(idx),
  transferResponsibility: ['agent', 'supervisor', 'quality', 'other'][idx % 4] as any,
  externalReference: `ext-${idx}-${Date.now()}`,
  metadata: {
    importBatch: `batch-${Math.floor(idx / 5) + 1}`,
    region: ['北京', '上海', '广州', '深圳'][idx % 4],
  },
});

const seedTickets = async (count: number = 10) => {
  logger.info(`开始生成 ${count} 条测试工单数据...`);

  const batchId = `batch-demo-${Date.now()}`;

  for (let i = 0; i < count; i++) {
    const ticketNo = `CP${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(i).padStart(4, '0')}`;

    const statuses = [
      TicketStatus.PENDING,
      TicketStatus.SUBMITTED,
      TicketStatus.PROCESSING,
      TicketStatus.RETRYING,
      TicketStatus.COMPENSATED,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.DEAD_LETTER,
      TicketStatus.CLOSED,
    ];

    const ticket = await CompensationTicketModel.create({
      batchId,
      ticketNo,
      status: statuses[i % statuses.length],
      data: generateTicketData(i),
      retryCount: i % 3,
      maxRetries: 3,
      isFrozen: i % 7 === 0,
      idempotencyKey: `idem-key-${i}-${batchId}`,
      idempotencyMode: [IdempotencyMode.IGNORE, IdempotencyMode.OVERWRITE, IdempotencyMode.APPEND][i % 3],
      submittedBy: testOperator,
      retryCategory: i % 2 === 0 ? undefined : ['system_error', 'network_error', 'data_error', 'business_error'][i % 4] as any,
      nextRetryAt: i % 3 === 1 ? new Date(Date.now() + 300000) : undefined,
      lastRetryAt: i % 3 === 1 ? new Date(Date.now() - 300000) : undefined,
      compensatedAt: statuses[i % statuses.length] === TicketStatus.COMPENSATED ? new Date() : undefined,
      closedAt: statuses[i % statuses.length] === TicketStatus.CLOSED ? new Date() : undefined,
      manualOverride: i % 5 === 0,
      overrideBy: i % 5 === 0 ? testOperator : undefined,
      overrideReason: i % 5 === 0 ? '特殊情况人工判定' : undefined,
    });

    await StatusHistoryModel.create({
      ticketId: ticket.id,
      fromStatus: TicketStatus.PENDING,
      toStatus: ticket.status,
      operator: testOperator,
      reason: '测试数据初始化',
      metadata: { seed: true, index: i },
    });

    await AuditLogModel.create({
      ticketId: ticket.id,
      action: 'SEED_DATA',
      operator: testOperator,
      metadata: { batchId, index: i },
    });

    if (i % 10 === 0) {
      logger.info(`已生成 ${i + 1}/${count} 条工单`);
    }
  }

  logger.info(`测试数据生成完成！批次ID: ${batchId}`);
  return batchId;
};

const seed = async () => {
  try {
    logger.info('=== 开始数据库数据初始化 ===');

    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }

    setupAssociations();

    const forceReset = process.argv.includes('--force');
    if (forceReset) {
      logger.warn('检测到 --force 参数，将清空现有数据！');
    }
    await syncDatabase(forceReset);

    const count = parseInt(process.env.SEED_COUNT || '10', 10);
    const batchId = await seedTickets(count);

    logger.info('=== 数据初始化完成 ===');
    logger.info(`- 数据库表已创建${forceReset ? '并清空重建' : ''}`);
    logger.info(`- 已生成 ${count} 条测试工单`);
    logger.info(`- 批次ID: ${batchId}`);
    logger.info(`- 测试操作员: ${testOperator.name} (ID: ${testOperator.id})`);
    logger.info('');
    logger.info('快速验证命令:');
    logger.info(`  curl -H "x-operator-id: ${testOperator.id}" -H "x-operator-name: ${testOperator.name}" http://localhost:3000/api/v1/tickets`);

    process.exit(0);
  } catch (error) {
    logger.error('数据初始化失败:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

export { seedTickets, testOperator };
export default seed;
