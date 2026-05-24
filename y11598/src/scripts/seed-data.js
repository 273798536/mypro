const {
  batchCreateChangeOrders,
} = require('../models/changeOrder');
const {
  batchCreateAuditOpinions,
} = require('../models/auditOpinion');
const {
  batchCreateAgentQuotes,
} = require('../models/agentQuote');
const {
  batchCreateSupplierStatements,
} = require('../models/supplierStatement');
const { createAuditTrail, ACTION_TYPES, ACTION_STATUSES } = require('../models/auditTrail');

const dayjs = require('dayjs');

function generateSeedData() {
  const now = dayjs();

  const kbArticles = [
    { id: 'KB001', title: '退款政策说明' },
    { id: 'KB002', title: '物流配送时效' },
    { id: 'KB003', title: '会员权益详解' },
  ];

  const agents = [
    { id: 'AG001', name: '张三' },
    { id: 'AG002', name: '李四' },
    { id: 'AG003', name: '王五' },
  ];

  const suppliers = [
    { id: 'SUP001', name: '知识库供应商A' },
    { id: 'SUP002', name: '内容服务商B' },
  ];

  const changeOrders = [];
  const auditOpinions = [];
  const agentQuotes = [];
  const supplierStatements = [];

  for (let i = 1; i <= 5; i++) {
    const kb = kbArticles[i % kbArticles.length];
    const orderNo = `CO${String(i).padStart(4, '0')}`;

    changeOrders.push({
      order_no: orderNo,
      title: `${kb.title} - 版本更新 v${i}.0`,
      content: `这是${kb.title}的第${i}次更新内容，修正了之前版本的描述错误...`,
      kb_article_id: kb.id,
      kb_article_title: kb.title,
      status: i % 3 === 0 ? 'approved' : 'pending',
      submitter: 'admin',
      submit_time: now.subtract(i, 'day').toISOString(),
      approver: i % 3 === 0 ? 'manager' : null,
      approve_time: i % 3 === 0 ? now.subtract(i - 1, 'day').toISOString() : null,
      version: `${i}.0`,
    });

    auditOpinions.push({
      change_order_id: `temp-${i}`,
      order_no: orderNo,
      auditor: 'manager',
      opinion: i % 3 === 0 ? '审核通过，内容准确' : '需要补充细节',
      result: i % 3 === 0 ? 'pass' : 'reject',
      audit_time: now.subtract(i, 'day').add(2, 'hour').toISOString(),
    });
  }

  changeOrders.push({
    order_no: 'CO0006',
    title: '测试脏数据 - 缺字段',
    kb_article_id: 'KB001',
    status: 'pending',
    submitter: '',
    submit_time: now.toISOString(),
    version: '1.0',
  });

  for (let i = 1; i <= 30; i++) {
    const kb = kbArticles[i % kbArticles.length];
    const agent = agents[i % agents.length];
    const quoteDay = Math.floor(i / 3);

    agentQuotes.push({
      kb_article_id: kb.id,
      kb_article_title: kb.title,
      kb_version: '1.0',
      agent_id: agent.id,
      agent_name: agent.name,
      customer_id: `CUST${String(100 + i).padStart(4, '0')}`,
      customer_name: `客户${i}`,
      quote_time: now.subtract(quoteDay, 'day').subtract(i % 8, 'hour').toISOString(),
      conversation_id: `CONV${String(i).padStart(6, '0')}`,
      session_id: `SESS${String(i).padStart(6, '0')}`,
      quote_content: kb.title,
      order_no: `CO${String((i % 5) + 1).padStart(4, '0')}`,
    });
  }

  agentQuotes.push({
    kb_article_id: 'KB001',
    kb_article_title: '退款政策说明 - 旧名称',
    kb_version: '1.0',
    agent_id: 'AG001',
    agent_name: '张三',
    quote_time: now.toISOString(),
  });

  for (let i = 1; i <= 4; i++) {
    const kb = kbArticles[i % kbArticles.length];
    const supplier = suppliers[i % suppliers.length];
    const quoteCount = 10 + i * 2;

    supplierStatements.push({
      statement_no: `STMT${String(i).padStart(4, '0')}`,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      kb_article_id: kb.id,
      kb_article_title: kb.title,
      quantity: quoteCount,
      amount: quoteCount * 10,
      currency: 'CNY',
      statement_date: now.subtract(i, 'month').date(1).toISOString(),
      period_start: now.subtract(i, 'month').date(1).toISOString(),
      period_end: now.subtract(i, 'month').date(31).toISOString(),
      status: 'confirmed',
    });
  }

  supplierStatements.push({
    statement_no: 'STMT0005',
    supplier_id: 'SUP001',
    supplier_name: '知识库供应商A',
    kb_article_id: 'KB001',
    kb_article_title: '退款政策说明',
    quantity: 999,
    amount: 9990,
    currency: 'CNY',
    statement_date: now.subtract(1, 'month').date(15).toISOString(),
    period_start: now.subtract(2, 'month').date(1).toISOString(),
    period_end: now.subtract(1, 'month').date(31).toISOString(),
    status: 'pending',
  });

  supplierStatements.push({
    statement_no: 'STMT0006',
    supplier_id: 'SUP001',
    kb_article_id: 'KB002',
    quantity: 50,
    amount: 500,
    statement_date: now.toISOString(),
  });

  return { changeOrders, auditOpinions, agentQuotes, supplierStatements };
}

function runSeed() {
  const startTime = Date.now();
  const data = generateSeedData();

  console.log('开始造数...');

  const orderIds = batchCreateChangeOrders(data.changeOrders);
  console.log(`创建变更单: ${orderIds.length} 条`);

  data.auditOpinions.forEach((op, idx) => {
    op.change_order_id = orderIds[idx] || op.change_order_id;
  });
  const opinionIds = batchCreateAuditOpinions(data.auditOpinions);
  console.log(`创建审核意见: ${opinionIds.length} 条`);

  const quoteIds = batchCreateAgentQuotes(data.agentQuotes);
  console.log(`创建客服引用记录: ${quoteIds.length} 条`);

  const stmtIds = batchCreateSupplierStatements(data.supplierStatements);
  console.log(`创建供应商对账单: ${stmtIds.length} 条`);

  const durationMs = Date.now() - startTime;

  createAuditTrail({
    action_type: ACTION_TYPES.SEED,
    action_subtype: 'full_seed',
    operator: 'system',
    status: ACTION_STATUSES.SUCCESS,
    detail: '批量造数完成',
    record_count: orderIds.length + opinionIds.length + quoteIds.length + stmtIds.length,
    duration_ms: durationMs,
  });

  console.log(`造数完成，耗时 ${durationMs}ms`);
  console.log(`总计: ${orderIds.length + opinionIds.length + quoteIds.length + stmtIds.length} 条记录`);
}

if (require.main === module) {
  runSeed();
}

module.exports = {
  generateSeedData,
  runSeed,
};
