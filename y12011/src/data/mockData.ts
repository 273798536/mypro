import { Dealer, SalesOrder, Payment, RebateAgreement, RebateTrial, CorrectionSuggestion, TodoItem } from '../types';

export const mockDealers: Dealer[] = [
  {
    id: 'd001',
    code: 'JL-001',
    name: '北京康健医药有限公司',
    category: '三甲医院配送商',
    region: '华北区',
    remarks: '核心经销商，合作5年以上，季度结算，注意Q4有特殊协议待确认',
    createTime: '2024-01-15 09:30:00',
    updateTime: '2024-03-20 14:20:00'
  },
  {
    id: 'd002',
    code: 'JL-002',
    name: '上海国药控股有限公司',
    category: '全国性商业公司',
    region: '华东区',
    remarks: '一级经销商，月度结算，协议已续签至2024年底',
    createTime: '2024-01-10 10:00:00',
    updateTime: '2024-02-28 16:45:00'
  },
  {
    id: 'd003',
    code: 'JL-003',
    name: '广州医药股份有限公司',
    category: '区域经销商',
    region: '华南区',
    remarks: '新合作经销商，季度结算，返利比例需与销售达成率挂钩',
    createTime: '2024-02-01 11:30:00',
    updateTime: '2024-03-01 09:00:00'
  },
  {
    id: 'd004',
    code: 'JL-004',
    name: '成都科伦药业有限公司',
    category: '区域经销商',
    region: '西南区',
    remarks: '战略合作伙伴，账期60天',
    createTime: '2024-01-20 08:45:00',
    updateTime: '2024-02-15 13:30:00'
  },
  {
    id: 'd005',
    code: 'JL-005',
    name: '南京医药集团',
    category: '区域经销商',
    region: '华东区',
    remarks: '重点培育经销商，需关注回款进度',
    createTime: '2024-01-25 15:00:00',
    updateTime: '2024-03-10 10:20:00'
  },
  {
    id: 'd006',
    code: 'JL-006',
    name: '武汉九州通医药',
    category: '全国性商业公司',
    region: '华中区',
    remarks: '量大但利润薄，重点关注成本',
    createTime: '2024-02-10 09:30:00',
    updateTime: '2024-03-05 11:15:00'
  },
  {
    id: 'd007',
    code: 'JL-007',
    name: '西安杨森制药',
    category: '区域经销商',
    region: '西北区',
    remarks: '合作稳定，返利按时回款',
    createTime: '2024-01-18 14:00:00',
    updateTime: '2024-02-20 16:30:00'
  },
  {
    id: 'd008',
    code: 'JL-008',
    name: '哈尔滨医药集团',
    category: '区域经销商',
    region: '东北区',
    remarks: '季节性波动大，注意旺季备货',
    createTime: '2024-02-05 10:45:00',
    updateTime: '2024-03-15 09:50:00'
  },
  {
    id: 'd009',
    code: 'JL-009',
    name: '杭州民生药业',
    category: '区域经销商',
    region: '华东区',
    remarks: '中小经销商，需重点扶持',
    createTime: '2024-02-15 13:20:00',
    updateTime: '2024-03-18 14:10:00'
  },
  {
    id: 'd010',
    code: 'JL-010',
    name: '深圳康泰医药',
    category: '区域经销商',
    region: '华南区',
    remarks: '新开发经销商，需跟进首单返利核算',
    createTime: '2024-03-01 16:00:00',
    updateTime: '2024-03-22 10:30:00'
  }
];

const productList = [
  { code: 'P001', name: '阿莫西林胶囊', price: 25.5 },
  { code: 'P002', name: '头孢克肟分散片', price: 45.8 },
  { code: 'P003', name: '布洛芬缓释胶囊', price: 32.0 },
  { code: 'P004', name: '奥美拉唑肠溶胶囊', price: 68.5 },
  { code: 'P005', name: '氯雷他定片', price: 28.0 },
  { code: 'P006', name: '蒙脱石散', price: 18.5 },
  { code: 'P007', name: '维生素C片', price: 15.0 },
  { code: 'P008', name: '葡萄糖酸钙口服溶液', price: 35.0 },
  { code: 'P009', name: '复方甘草片', price: 12.0 },
  { code: 'P010', name: '盐酸左氧氟沙星片', price: 52.0 }
];

function generateSalesOrders(): SalesOrder[] {
  const orders: SalesOrder[] = [];
  const dealers = mockDealers.slice(0, 5);
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < 100; i++) {
    const dealer = dealers[i % dealers.length];
    const product = productList[i % productList.length];
    const orderDate = new Date(startDate);
    orderDate.setDate(orderDate.getDate() + Math.floor(i / 5) * 2);
    const quantity = Math.floor(Math.random() * 500) + 100;
    const amount = quantity * product.price;
    const missingFields: string[] = [];
    
    if (i % 7 === 0) missingFields.push('batchNo');
    if (i % 11 === 0) missingFields.push('productCode');
    
    orders.push({
      id: `so${String(i + 1).padStart(3, '0')}`,
      dealerId: dealer.id,
      dealerName: dealer.name,
      orderNo: `SO${String(202401001 + i)}`,
      orderDate: orderDate.toISOString().split('T')[0],
      productCode: missingFields.includes('productCode') ? '' : product.code,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      amount: Math.round(amount * 100) / 100,
      batchNo: missingFields.includes('batchNo') ? '' : `B${2024 + Math.floor(i / 10)}`,
      status: i % 23 === 0 ? 'returned' : 'normal',
      modificationHistory: i === 5 || i === 15 ? [
        {
          id: `mh${i}`,
          fieldName: 'quantity',
          oldValue: String(quantity - 50),
          newValue: String(quantity),
          reason: '客户追加订单',
          operator: '财务BP-张三',
          operateTime: '2024-03-10 14:30:00'
        }
      ] : [],
      missingFields
    });
  }
  
  return orders;
}

export const mockSalesOrders = generateSalesOrders();

function generatePayments(): Payment[] {
  const payments: Payment[] = [];
  const dealers = mockDealers.slice(0, 5);
  
  for (let i = 0; i < 50; i++) {
    const dealer = dealers[i % dealers.length];
    const paymentDate = new Date('2024-01-10');
    paymentDate.setDate(paymentDate.getDate() + i * 3);
    
    const isDelayed = i % 8 === 0;
    const expectedDate = new Date(paymentDate);
    expectedDate.setDate(expectedDate.getDate() + (isDelayed ? 15 : 0));
    
    payments.push({
      id: `pay${String(i + 1).padStart(3, '0')}`,
      dealerId: dealer.id,
      dealerName: dealer.name,
      paymentNo: `PAY${202401001 + i}`,
      paymentDate: paymentDate.toISOString().split('T')[0],
      amount: Math.round((Math.random() * 50000 + 10000) * 100) / 100,
      bankFlowNo: `BK${Date.now()}${i}`,
      status: isDelayed ? 'delayed' : (i % 5 === 0 ? 'pending' : 'matched'),
      isDelayed,
      expectedArrivalDate: expectedDate.toISOString().split('T')[0],
      matchedOrderNos: []
    });
  }
  
  return payments;
}

export const mockPayments = generatePayments();

export const mockAgreements: RebateAgreement[] = [
  {
    id: 'a001',
    dealerId: 'd001',
    dealerName: '北京康健医药有限公司',
    agreementNo: 'RA-2024-001',
    name: '2024年度Q1季度返利协议',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    status: 'active',
    currentVersion: 2,
    versions: [
      {
        id: 'av001-v1',
        agreementId: 'a001',
        versionNo: 1,
        effectiveDate: '2024-01-01',
        terms: {
          rebateRate: 0.05,
          tieredRates: [
            { minAmount: 0, maxAmount: 500000, rate: 0.03 },
            { minAmount: 500000, maxAmount: 1000000, rate: 0.05 },
            { minAmount: 1000000, maxAmount: 99999999, rate: 0.07 }
          ],
          minimumPurchase: 300000,
          paymentDeadline: 60,
          specialConditions: '季度末统一结算'
        },
        changeReason: '初始版本',
        operator: '合同管理员',
        createTime: '2024-01-01 10:00:00'
      },
      {
        id: 'av001-v2',
        agreementId: 'a001',
        versionNo: 2,
        effectiveDate: '2024-02-15',
        terms: {
          rebateRate: 0.06,
          tieredRates: [
            { minAmount: 0, maxAmount: 500000, rate: 0.04 },
            { minAmount: 500000, maxAmount: 1000000, rate: 0.06 },
            { minAmount: 1000000, maxAmount: 99999999, rate: 0.08 }
          ],
          minimumPurchase: 300000,
          paymentDeadline: 60,
          specialConditions: '季度末统一结算，Q1追加1%特别奖励'
        },
        changeReason: '根据Q1中期调整返利比例，追加奖励政策',
        operator: '销售总监',
        createTime: '2024-02-15 16:30:00'
      }
    ]
  },
  {
    id: 'a002',
    dealerId: 'd002',
    dealerName: '上海国药控股有限公司',
    agreementNo: 'RA-2024-002',
    name: '2024年度月度返利协议',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    currentVersion: 1,
    versions: [
      {
        id: 'av002-v1',
        agreementId: 'a002',
        versionNo: 1,
        effectiveDate: '2024-01-01',
        terms: {
          rebateRate: 0.045,
          tieredRates: [
            { minAmount: 0, maxAmount: 2000000, rate: 0.04 },
            { minAmount: 2000000, maxAmount: 5000000, rate: 0.05 },
            { minAmount: 5000000, maxAmount: 99999999, rate: 0.06 }
          ],
          minimumPurchase: 1000000,
          paymentDeadline: 30,
          specialConditions: '月度结算，年终统算补差'
        },
        changeReason: '初始版本',
        operator: '合同管理员',
        createTime: '2024-01-01 09:00:00'
      }
    ]
  },
  {
    id: 'a003',
    dealerId: 'd003',
    dealerName: '广州医药股份有限公司',
    agreementNo: 'RA-2024-003',
    name: '2024年度战略合作协议',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    status: 'active',
    currentVersion: 1,
    versions: [
      {
        id: 'av003-v1',
        agreementId: 'a003',
        versionNo: 1,
        effectiveDate: '2024-01-01',
        terms: {
          rebateRate: 0.055,
          tieredRates: [
            { minAmount: 0, maxAmount: 800000, rate: 0.05 },
            { minAmount: 800000, maxAmount: 2000000, rate: 0.06 },
            { minAmount: 2000000, maxAmount: 99999999, rate: 0.07 }
          ],
          minimumPurchase: 500000,
          paymentDeadline: 45,
          specialConditions: '新经销商首季度额外1%扶持奖励'
        },
        changeReason: '初始版本',
        operator: '合同管理员',
        createTime: '2024-02-01 11:00:00'
      }
    ]
  },
  {
    id: 'a004',
    dealerId: 'd004',
    dealerName: '成都科伦药业有限公司',
    agreementNo: 'RA-2024-004',
    name: '2024年度西南区返利协议',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    currentVersion: 3,
    versions: [
      {
        id: 'av004-v1',
        agreementId: 'a004',
        versionNo: 1,
        effectiveDate: '2024-01-01',
        terms: {
          rebateRate: 0.05,
          tieredRates: [],
          minimumPurchase: 500000,
          paymentDeadline: 60,
          specialConditions: ''
        },
        changeReason: '初始版本',
        operator: '合同管理员',
        createTime: '2024-01-10 08:30:00'
      },
      {
        id: 'av004-v2',
        agreementId: 'a004',
        versionNo: 2,
        effectiveDate: '2024-02-01',
        terms: {
          rebateRate: 0.055,
          tieredRates: [],
          minimumPurchase: 500000,
          paymentDeadline: 60,
          specialConditions: ''
        },
        changeReason: '战略客户返利比例上调0.5%',
        operator: '销售经理',
        createTime: '2024-01-25 15:00:00'
      },
      {
        id: 'av004-v3',
        agreementId: 'a004',
        versionNo: 3,
        effectiveDate: '2024-03-01',
        terms: {
          rebateRate: 0.06,
          tieredRates: [],
          minimumPurchase: 500000,
          paymentDeadline: 60,
          specialConditions: '3月份起额外0.5%物流补贴'
        },
        changeReason: '追加物流补贴政策',
        operator: '销售总监',
        createTime: '2024-02-28 17:00:00'
      }
    ]
  },
  {
    id: 'a005',
    dealerId: 'd005',
    dealerName: '南京医药集团',
    agreementNo: 'RA-2024-005',
    name: '2024年度Q1返利协议',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    status: 'active',
    currentVersion: 1,
    versions: [
      {
        id: 'av005-v1',
        agreementId: 'a005',
        versionNo: 1,
        effectiveDate: '2024-01-01',
        terms: {
          rebateRate: 0.04,
          tieredRates: [],
          minimumPurchase: 200000,
          paymentDeadline: 45,
          specialConditions: ''
        },
        changeReason: '初始版本',
        operator: '合同管理员',
        createTime: '2024-01-15 10:00:00'
      }
    ]
  }
];

function generateTrials(): RebateTrial[] {
  const dealerSales = mockSalesOrders.filter(o => o.dealerId === 'd001');
  const baseAmount = dealerSales.reduce((sum, o) => sum + o.amount, 0);
  const rateV1 = 0.05;
  const rateV2 = 0.06;
  
  return [
    {
      id: 't001',
      dealerId: 'd001',
      dealerName: '北京康健医药有限公司',
      agreementId: 'a001',
      period: '2024年Q1',
      status: 'calculated',
      currentVersion: 2,
      createTime: '2024-03-25 09:00:00',
      versions: [
        {
          id: 'tv001-v1',
          trialId: 't001',
          versionNo: 1,
          agreementVersionId: 'av001-v1',
          baseAmount,
          calculatedRebate: Math.round(baseAmount * rateV1 * 100) / 100,
          totalDeduction: 5000,
          finalRebateAmount: Math.round((baseAmount * rateV1 - 5000) * 100) / 100,
          calculationDetails: dealerSales.slice(0, 10).map((order) => ({
            id: `cd-${order.id}`,
            orderNo: order.orderNo,
            orderAmount: order.amount,
            rebateRate: rateV1,
            rebateAmount: Math.round(order.amount * rateV1 * 100) / 100,
            remark: ''
          })),
          deductions: [
            {
              id: 'ded001',
              type: 'return',
              amount: 3000,
              explanation: '2月份退货订单SO202401023冲减',
              basis: '退货单号：RT20240215'
            },
            {
              id: 'ded002',
              type: 'penalty',
              amount: 2000,
              explanation: '逾期回款罚息',
              basis: '回款逾期15天，按协议第5条'
            }
          ],
          status: 'calculated',
          createTime: '2024-03-25 09:00:00',
          operator: '财务BP-张三',
          correctionLogs: [],
          reviewHistory: [
            {
              id: 'rh001',
              trialVersionId: 'tv001-v1',
              reviewer: '复核员-李四',
              comment: '数据无误',
              result: 'approved',
              reviewTime: '2024-03-26 10:00:00'
            }
          ]
        },
        {
          id: 'tv001-v2',
          trialId: 't001',
          versionNo: 2,
          agreementVersionId: 'av001-v2',
          baseAmount,
          calculatedRebate: Math.round(baseAmount * rateV2 * 100) / 100,
          totalDeduction: 5000,
          finalRebateAmount: Math.round((baseAmount * rateV2 - 5000) * 100) / 100,
          calculationDetails: dealerSales.slice(0, 10).map((order, idx) => ({
            id: `cd2-${order.id}`,
            orderNo: order.orderNo,
            orderAmount: order.amount,
            rebateRate: rateV2,
            rebateAmount: Math.round(order.amount * rateV2 * 100) / 100,
            remark: idx === 0 ? '协议版本更新后重新计算' : ''
          })),
          deductions: [
            {
              id: 'ded003',
              type: 'return',
              amount: 3000,
              explanation: '2月份退货订单SO202401023冲减',
              basis: '退货单号：RT20240215'
            },
            {
              id: 'ded004',
              type: 'penalty',
              amount: 2000,
              explanation: '逾期回款罚息',
              basis: '回款逾期15天，按协议第5条'
            }
          ],
          status: 'calculated',
          createTime: '2024-03-26 14:30:00',
          operator: '财务BP-张三',
          correctionLogs: [
            {
              id: 'cl001',
              trialVersionId: 'tv001-v2',
              fieldName: 'agreementVersion',
              oldValue: 'V1.0',
              newValue: 'V2.0',
              reason: '协议版本更新，返利比例上调',
              operator: '财务BP-张三',
              operateTime: '2024-03-26 14:30:00'
            }
          ],
          reviewHistory: []
        }
      ]
    }
  ];
}

export const mockTrials = generateTrials();

export const mockSuggestions: CorrectionSuggestion[] = [
  {
    id: 's001',
    type: 'payment_writeoff',
    priority: 'high',
    title: '回款延迟回款冲销建议',
    description: '北京康健医药有限公司有3笔回款逾期超过15天，建议进行罚息处理',
    actionableSteps: [
      '1. 确认逾期回款明细：PAY202401008、PAY202401016、PAY202401024',
      '2. 按协议条款计算罚息金额',
      '3. 在返利中扣除相应罚息',
      '4. 生成调整后通知销售跟进回款'
    ],
    affectedOrders: ['SO202401008', 'SO202401016', 'SO202401024'],
    impactPreview: {
      affectedCount: 3,
      amountChange: -4500,
      affectedOrders: ['SO202401008', 'SO202401016', 'SO202401024']
    },
    status: 'pending'
  },
  {
    id: 's002',
    type: 'sales_return',
    priority: 'high',
    title: '销量退货处理建议',
    description: '发现3笔退货订单未在返利计算中扣除',
    actionableSteps: [
      '1. 核对退货单号：RT202402001、RT202402005',
      '2. 确认退货对应的销售订单',
      '3. 调整返利计算基数',
      '4. 重新计算返利金额'
    ],
    affectedOrders: ['SO202401023', 'SO202401045'],
    impactPreview: {
      affectedCount: 2,
      amountChange: -12500,
      affectedOrders: ['SO202401023', 'SO202401045']
    },
    status: 'pending'
  },
  {
    id: 's003',
    type: 'data_clean',
    priority: 'medium',
    title: '数据清洗建议',
    description: '发现15条销售发货记录缺少批次号字段',
    actionableSteps: [
      '1. 导出缺字段记录列表',
      '2. 从ERP系统补全批次号',
      '3. 重新导入系统',
      '4. 触发重新计算'
    ],
    affectedOrders: mockSalesOrders.filter(o => o.missingFields.length > 0).map(o => o.orderNo),
    impactPreview: {
      affectedCount: 15,
      amountChange: 0,
      affectedOrders: mockSalesOrders.filter(o => o.missingFields.length > 0).map(o => o.orderNo)
    },
    status: 'pending'
  },
  {
    id: 's004',
    type: 'payment_writeoff',
    priority: 'low',
    title: '成都科伦药业回款匹配',
    description: '成都科伦药业有2笔回款未匹配销售订单',
    actionableSteps: [
      '1. 核对银行流水',
      '2. 人工匹配对应订单',
      '3. 更新匹配状态'
    ],
    affectedOrders: [],
    impactPreview: {
      affectedCount: 2,
      amountChange: 0,
      affectedOrders: []
    },
    status: 'pending'
  }
];

export const mockTodos: TodoItem[] = [
  {
    id: 'todo001',
    title: '完成北京康健Q1返利复核',
    priority: 'high',
    dueDate: '2024-03-28',
    status: 'pending'
  },
  {
    id: 'todo002',
    title: '处理延迟回款罚息',
    priority: 'high',
    dueDate: '2024-03-30',
    status: 'pending'
  },
  {
    id: 'todo003',
    title: '补全销售发货批次号',
    priority: 'medium',
    dueDate: '2024-04-02',
    status: 'pending'
  },
  {
    id: 'todo004',
    title: '生成Q1返利报告',
    priority: 'medium',
    dueDate: '2024-04-05',
    status: 'pending'
  },
  {
    id: 'todo005',
    title: '与上海国药协议续签跟进',
    priority: 'low',
    dueDate: '2024-04-10',
    status: 'completed'
  }
];
