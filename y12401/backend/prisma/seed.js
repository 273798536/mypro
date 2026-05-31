const prisma = require('./client');
const dayjs = require('dayjs');

async function seed() {
  console.log('开始初始化种子数据...');

  await prisma.auditLog.deleteMany({});
  await prisma.quoteHistory.deleteMany({});
  await prisma.discountQuote.deleteMany({});
  await prisma.discountRule.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.paymentPlan.deleteMany({});

  const suppliers = ['华为技术有限公司', '阿里巴巴云计算', '腾讯科技', '字节跳动', '京东物流'];
  const invoiceStatuses = ['NORMAL', 'NORMAL', 'NORMAL', 'RED_INVOICED', 'PAID'];
  const today = dayjs();

  const paymentPlans = [];
  for (let i = 1; i <= 5; i++) {
    const plan = await prisma.paymentPlan.create({
      data: {
        planNo: `PP${String(i).padStart(6, '0')}`,
        supplierName: suppliers[i - 1],
        plannedAmount: 100000 + i * 50000,
        plannedDate: today.add(i, 'month').toDate(),
        status: 'PENDING',
        sourceType: 'ERP_SYSTEM',
        sourceId: `ERP_SRC_${i}`,
      },
    });
    paymentPlans.push(plan);
  }

  for (let i = 1; i <= 10; i++) {
    const supplierIndex = (i - 1) % suppliers.length;
    const status = i <= 7 ? 'NORMAL' : (i === 8 ? 'RED_INVOICED' : (i === 9 ? 'PAID' : 'NORMAL'));
    const paymentPlanIndex = supplierIndex < paymentPlans.length ? supplierIndex : 0;
    
    await prisma.invoice.create({
      data: {
        invoiceNo: `INV${String(i).padStart(8, '0')}`,
        supplierName: suppliers[supplierIndex],
        amount: 80000 + i * 10000,
        taxAmount: (80000 + i * 10000) * 0.13,
        totalAmount: (80000 + i * 10000) * 1.13,
        invoiceDate: today.subtract(i * 5, 'day').toDate(),
        dueDate: today.add(30 - i * 2, 'day').toDate(),
        status: status,
        paymentPlanId: status !== 'RED_INVOICED' ? paymentPlans[paymentPlanIndex].id : null,
      },
    });
  }

  const rules = [
    { name: '提前30天折扣', minDays: 20, maxDays: 40, rate: 0.02 },
    { name: '提前60天折扣', minDays: 41, maxDays: 80, rate: 0.035 },
    { name: '提前90天折扣', minDays: 81, maxDays: 120, rate: 0.05 },
  ];

  for (let i = 0; i < rules.length; i++) {
    await prisma.discountRule.create({
      data: {
        ruleName: rules[i].name,
        supplierName: suppliers[i % suppliers.length],
        minAdvanceDays: rules[i].minDays,
        maxAdvanceDays: rules[i].maxDays,
        discountRate: rules[i].rate,
        effectiveFrom: today.subtract(30, 'day').toDate(),
        effectiveTo: today.add(180, 'day').toDate(),
        isActive: true,
      },
    });
  }

  await prisma.discountRule.create({
    data: {
      ruleName: '通用折扣规则-所有供应商',
      supplierName: '*',
      minAdvanceDays: 10,
      maxAdvanceDays: 30,
      discountRate: 0.015,
      effectiveFrom: today.subtract(30, 'day').toDate(),
      effectiveTo: today.add(365, 'day').toDate(),
      isActive: true,
    },
  });

  console.log('种子数据初始化完成！');
}

seed()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
