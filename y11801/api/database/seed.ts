import { v4 as uuidv4 } from 'uuid';
import db from './index.js';
import { calculateRemainingBalance, calculateFinalAmount } from '../../shared/utils/calculator.js';
import type { VehicleRecord, LoanContract, ResidualTable, PendingItem, ImportLog, CalculationResult } from '../../shared/types/index.js';

function uuid(): string {
  return uuidv4();
}

function generateId(): string {
  return uuid();
}

function now(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function checkDataExists(): boolean {
  const count = db.prepare('SELECT COUNT(*) as count FROM vehicle_record').get() as { count: number };
  return count.count > 0;
}

interface SeedVehicle extends Omit<VehicleRecord, 'createdAt' | 'updatedAt'> {
  contract: Omit<LoanContract, 'createdAt' | 'updatedAt'>;
  residual?: Omit<ResidualTable, 'createdAt' | 'updatedAt'>;
  pendingItems?: Omit<PendingItem, 'createdAt'>[];
  resultStatus: 'ready' | 'need_confirm' | 'cannot_calculate';
  statusReason: string;
}

const seedData: SeedVehicle[] = [
  {
    id: generateId(),
    vin: 'LSVNV2182K2123456',
    plateNumber: '京A12345',
    brand: '比亚迪',
    model: '汉EV 2024款',
    purchasePrice: 239800.00,
    storePrice: 158000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S001',
    storeName: '北京朝阳店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0001',
      vin: 'LSVNV2182K2123456',
      customerName: '张三',
      loanAmount: 180000.00,
      loanTerm: 36,
      interestRate: 4.35,
      monthlyPayment: 5342.18,
      remainingPrincipal: 105000.00,
      remainingInterest: 8245.60,
      startDate: daysAgo(365),
      endDate: daysFromNow(730),
      isVehicleReplaced: false,
      subsidyAmount: 18000.00,
      subsidyType: 'national',
      subsidyClawbackRequired: false,
      importBatchId: 'BATCH-002',
    },
    residual: {
      id: generateId(),
      vin: 'LSVNV2182K2123456',
      residualValue: 128000.00,
      residualDate: daysAgo(30),
      expiryDate: daysFromNow(335),
      valuationCompany: '中汽研认证中心',
      isExpired: false,
      importBatchId: 'BATCH-003',
    },
    resultStatus: 'ready',
    statusReason: '数据完整，试算结果有效',
  },
  {
    id: generateId(),
    vin: 'LSVNV2182K2123457',
    plateNumber: '京B67890',
    brand: '特斯拉',
    model: 'Model 3 2023款',
    purchasePrice: 261400.00,
    storePrice: 185000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S001',
    storeName: '北京朝阳店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0002',
      vin: 'LSVNV2182K2123457',
      customerName: '李四',
      loanAmount: 200000.00,
      loanTerm: 24,
      interestRate: 4.15,
      monthlyPayment: 8680.56,
      remainingPrincipal: 125000.00,
      remainingInterest: 5234.80,
      startDate: daysAgo(180),
      endDate: daysFromNow(545),
      isVehicleReplaced: false,
      subsidyAmount: 20000.00,
      subsidyType: 'national',
      subsidyClawbackRequired: false,
      importBatchId: 'BATCH-002',
    },
    residual: {
      id: generateId(),
      vin: 'LSVNV2182K2123457',
      residualValue: 162000.00,
      residualDate: daysAgo(90),
      expiryDate: daysAgo(5),
      valuationCompany: '瓜子二手车评估',
      isExpired: true,
      importBatchId: 'BATCH-003',
    },
    pendingItems: [
      {
        id: generateId(),
        type: 'residual_expired',
        relatedRecordId: '',
        relatedRecordType: 'residual',
        title: '残值评估报告已过期',
        description: '该车辆的残值评估报告已于5天前过期，请重新评估后再进行试算',
        level: 'high',
        remainingDays: -5,
        status: 'pending',
      },
    ],
    resultStatus: 'need_confirm',
    statusReason: '残值评估报告已过期，需重新评估',
  },
  {
    id: generateId(),
    vin: 'LSVNV2182K2123458',
    plateNumber: '沪C11111',
    brand: '蔚来',
    model: 'ES6 2024款',
    purchasePrice: 368000.00,
    storePrice: 258000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S002',
    storeName: '上海浦东店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0003',
      vin: 'LSVNV2182K2123458',
      customerName: '王五',
      loanAmount: 280000.00,
      loanTerm: 60,
      interestRate: 4.65,
      monthlyPayment: 5263.47,
      remainingPrincipal: 245000.00,
      remainingInterest: 32156.70,
      startDate: daysAgo(90),
      endDate: daysFromNow(1725),
      isVehicleReplaced: true,
      replacementReason: '原车辆存在质量问题，厂家更换新车',
      subsidyAmount: 28000.00,
      subsidyType: 'local',
      subsidyClawbackRequired: false,
      importBatchId: 'BATCH-002',
    },
    residual: {
      id: generateId(),
      vin: 'LSVNV2182K2123458',
      residualValue: 235000.00,
      residualDate: daysAgo(15),
      expiryDate: daysFromNow(350),
      valuationCompany: '优信二手车评估',
      isExpired: false,
      importBatchId: 'BATCH-003',
    },
    pendingItems: [
      {
        id: generateId(),
        type: 'contract_replaced',
        relatedRecordId: '',
        relatedRecordType: 'contract',
        title: '合同车辆已更换',
        description: '贷款合同对应的车辆已更换，请确认新车信息是否与残值评估匹配',
        level: 'medium',
        status: 'pending',
      },
    ],
    resultStatus: 'need_confirm',
    statusReason: '合同车辆已更换，需确认信息一致性',
  },
  {
    id: generateId(),
    vin: 'LSVNV2182K2123459',
    plateNumber: '粤D22222',
    brand: '小鹏',
    model: 'G6 2024款',
    purchasePrice: 219900.00,
    storePrice: 165000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S003',
    storeName: '广州天河店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0004',
      vin: 'LSVNV2182K2123459',
      customerName: '赵六',
      loanAmount: 160000.00,
      loanTerm: 36,
      interestRate: 4.25,
      monthlyPayment: 4742.89,
      remainingPrincipal: 95000.00,
      remainingInterest: 6890.50,
      startDate: daysAgo(400),
      endDate: daysFromNow(695),
      isVehicleReplaced: false,
      subsidyAmount: 16000.00,
      subsidyType: 'national',
      subsidyClawbackRequired: true,
      clawbackAmount: 8000.00,
      importBatchId: 'BATCH-002',
    },
    residual: {
      id: generateId(),
      vin: 'LSVNV2182K2123459',
      residualValue: 138000.00,
      residualDate: daysAgo(20),
      expiryDate: daysFromNow(345),
      valuationCompany: '天天拍车评估中心',
      isExpired: false,
      importBatchId: 'BATCH-003',
    },
    pendingItems: [
      {
        id: generateId(),
        type: 'subsidy_clawback',
        relatedRecordId: '',
        relatedRecordType: 'contract',
        title: '补贴需追回',
        description: '根据最新政策，该笔贷款对应的国家补贴8000元需追回，请确认处理方式',
        level: 'high',
        status: 'pending',
      },
    ],
    resultStatus: 'need_confirm',
    statusReason: '存在补贴追回事项，需确认处理',
  },
  {
    id: generateId(),
    vin: 'LSVNV2182K2123460',
    plateNumber: '浙E33333',
    brand: '理想',
    model: 'L7 2024款',
    purchasePrice: 319800.00,
    storePrice: 245000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S002',
    storeName: '上海浦东店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0005',
      vin: 'LSVNV2182K2123460',
      customerName: '钱七',
      loanAmount: 250000.00,
      loanTerm: 48,
      interestRate: 4.45,
      monthlyPayment: 5689.23,
      remainingPrincipal: 210000.00,
      remainingInterest: 28456.30,
      startDate: daysAgo(120),
      endDate: daysFromNow(1320),
      isVehicleReplaced: false,
      subsidyAmount: 25000.00,
      subsidyType: 'dealer',
      subsidyClawbackRequired: false,
      importBatchId: 'BATCH-002',
    },
    residual: {
      id: generateId(),
      vin: 'LSVNV2182K2123460',
      residualValue: 228000.00,
      residualDate: daysAgo(10),
      expiryDate: daysFromNow(355),
      valuationCompany: '汽车之家评估中心',
      isExpired: false,
      importBatchId: 'BATCH-003',
    },
    resultStatus: 'ready',
    statusReason: '数据完整，试算结果有效',
  },
  {
    id: generateId(),
    vin: 'LSVNV2182K2123461',
    plateNumber: '苏F44444',
    brand: '极氪',
    model: '001 2024款',
    purchasePrice: 309000.00,
    storePrice: 238000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S004',
    storeName: '深圳南山店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0006',
      vin: 'LSVNV2182K2123461',
      customerName: '孙八',
      loanAmount: 240000.00,
      loanTerm: 60,
      interestRate: 4.55,
      monthlyPayment: 4498.67,
      remainingPrincipal: 228000.00,
      remainingInterest: 29920.15,
      startDate: daysAgo(30),
      endDate: daysFromNow(1770),
      isVehicleReplaced: true,
      replacementReason: '客户主动申请更换配置车型',
      subsidyAmount: 24000.00,
      subsidyType: 'national',
      subsidyClawbackRequired: true,
      clawbackAmount: 12000.00,
      importBatchId: 'BATCH-002',
    },
    residual: undefined,
    pendingItems: [
      {
        id: generateId(),
        type: 'contract_replaced',
        relatedRecordId: '',
        relatedRecordType: 'contract',
        title: '合同车辆已更换',
        description: '贷款合同对应的车辆已更换，但新车辆缺少残值评估数据',
        level: 'high',
        status: 'pending',
      },
      {
        id: generateId(),
        type: 'subsidy_clawback',
        relatedRecordId: '',
        relatedRecordType: 'contract',
        title: '补贴需追回',
        description: '该笔贷款对应的国家补贴12000元需追回',
        level: 'high',
        status: 'pending',
      },
    ],
    resultStatus: 'cannot_calculate',
    statusReason: '缺少残值评估数据，且存在多个待确认事项',
  },
  {
    id: generateId(),
    vin: 'LSVNV2182K2123462',
    plateNumber: '川A55555',
    brand: '比亚迪',
    model: '海豹 2024款',
    purchasePrice: 189800.00,
    storePrice: 132000.00,
    storePriceUpdatedAt: now(),
    storeId: 'S005',
    storeName: '成都武侯店',
    importBatchId: 'BATCH-001',
    contract: {
      id: generateId(),
      contractNo: 'LOAN-2024-0007',
      vin: 'LSVNV2182K2123462',
      customerName: '周九',
      loanAmount: 140000.00,
      loanTerm: 24,
      interestRate: 4.10,
      monthlyPayment: 6089.34,
      remainingPrincipal: 72000.00,
      remainingInterest: 3142.08,
      startDate: daysAgo(300),
      endDate: daysFromNow(430),
      isVehicleReplaced: false,
      subsidyAmount: 14000.00,
      subsidyType: 'national',
      subsidyClawbackRequired: false,
      importBatchId: 'BATCH-002',
    },
    residual: {
      id: generateId(),
      vin: 'LSVNV2182K2123462',
      residualValue: 115000.00,
      residualDate: daysAgo(5),
      expiryDate: daysFromNow(360),
      valuationCompany: '中汽研认证中心',
      isExpired: false,
      importBatchId: 'BATCH-003',
    },
    resultStatus: 'ready',
    statusReason: '数据完整，试算结果有效',
  },
];

function seedDatabase() {
  if (checkDataExists()) {
    console.log('[SEED] Data already exists, skipping seed');
    return;
  }

  console.log('[SEED] Starting data seeding...');

  const transaction = db.transaction(() => {
    const importLogs: Omit<ImportLog, 'importedAt'>[] = [
      {
        id: generateId(),
        batchId: 'BATCH-001',
        dataType: 'vehicle',
        fileName: 'vehicle_records_2024.xlsx',
        recordCount: 7,
        importOrder: 1,
        importedBy: 'admin',
        status: 'success',
      },
      {
        id: generateId(),
        batchId: 'BATCH-002',
        dataType: 'contract',
        fileName: 'loan_contracts_2024.xlsx',
        recordCount: 7,
        importOrder: 2,
        importedBy: 'admin',
        status: 'success',
      },
      {
        id: generateId(),
        batchId: 'BATCH-003',
        dataType: 'residual',
        fileName: 'residual_tables_2024.xlsx',
        recordCount: 6,
        importOrder: 3,
        importedBy: 'admin',
        status: 'success',
      },
    ];

    const insertImportLog = db.prepare(`
      INSERT INTO import_log (id, batch_id, data_type, file_name, record_count, import_order, imported_by, status)
      VALUES (@id, @batchId, @dataType, @fileName, @recordCount, @importOrder, @importedBy, @status)
    `);

    for (const log of importLogs) {
      insertImportLog.run(log);
    }

    const insertVehicle = db.prepare(`
      INSERT INTO vehicle_record (id, vin, plate_number, brand, model, purchase_price, store_price, store_price_updated_at, store_id, store_name, import_batch_id)
      VALUES (@id, @vin, @plateNumber, @brand, @model, @purchasePrice, @storePrice, @storePriceUpdatedAt, @storeId, @storeName, @importBatchId)
    `);

    const insertContract = db.prepare(`
      INSERT INTO loan_contract (id, contract_no, vin, customer_name, loan_amount, loan_term, interest_rate, monthly_payment, remaining_principal, remaining_interest, start_date, end_date, is_vehicle_replaced, replacement_reason, subsidy_amount, subsidy_type, subsidy_clawback_required, clawback_amount, import_batch_id)
      VALUES (@id, @contractNo, @vin, @customerName, @loanAmount, @loanTerm, @interestRate, @monthlyPayment, @remainingPrincipal, @remainingInterest, @startDate, @endDate, @isVehicleReplaced, @replacementReason, @subsidyAmount, @subsidyType, @subsidyClawbackRequired, @clawbackAmount, @importBatchId)
    `);

    const insertResidual = db.prepare(`
      INSERT INTO residual_table (id, vin, residual_value, residual_date, expiry_date, valuation_company, is_expired, import_batch_id)
      VALUES (@id, @vin, @residualValue, @residualDate, @expiryDate, @valuationCompany, @isExpired, @importBatchId)
    `);

    const insertPendingItem = db.prepare(`
      INSERT INTO pending_item (id, type, related_record_id, related_record_type, title, description, level, remaining_days, status)
      VALUES (@id, @type, @relatedRecordId, @relatedRecordType, @title, @description, @level, @remainingDays, @status)
    `);

    const insertCalculationResult = db.prepare(`
      INSERT INTO calculation_result (id, vin, vehicle_id, contract_id, residual_id, store_price, remaining_balance, residual_value, subsidy_deduction, subsidy_clawback, final_payable, final_receivable, status, status_reason, calculated_at)
      VALUES (@id, @vin, @vehicleId, @contractId, @residualId, @storePrice, @remainingBalance, @residualValue, @subsidyDeduction, @subsidyClawback, @finalPayable, @finalReceivable, @status, @statusReason, @calculatedAt)
    `);

    for (const vehicleData of seedData) {
      insertVehicle.run({
        id: vehicleData.id,
        vin: vehicleData.vin,
        plateNumber: vehicleData.plateNumber,
        brand: vehicleData.brand,
        model: vehicleData.model,
        purchasePrice: vehicleData.purchasePrice,
        storePrice: vehicleData.storePrice,
        storePriceUpdatedAt: vehicleData.storePriceUpdatedAt,
        storeId: vehicleData.storeId,
        storeName: vehicleData.storeName,
        importBatchId: vehicleData.importBatchId,
      });

      insertContract.run({
        id: vehicleData.contract.id,
        contractNo: vehicleData.contract.contractNo,
        vin: vehicleData.contract.vin,
        customerName: vehicleData.contract.customerName,
        loanAmount: vehicleData.contract.loanAmount,
        loanTerm: vehicleData.contract.loanTerm,
        interestRate: vehicleData.contract.interestRate,
        monthlyPayment: vehicleData.contract.monthlyPayment,
        remainingPrincipal: vehicleData.contract.remainingPrincipal,
        remainingInterest: vehicleData.contract.remainingInterest,
        startDate: vehicleData.contract.startDate,
        endDate: vehicleData.contract.endDate,
        isVehicleReplaced: vehicleData.contract.isVehicleReplaced ? 1 : 0,
        replacementReason: vehicleData.contract.replacementReason,
        subsidyAmount: vehicleData.contract.subsidyAmount,
        subsidyType: vehicleData.contract.subsidyType,
        subsidyClawbackRequired: vehicleData.contract.subsidyClawbackRequired ? 1 : 0,
        clawbackAmount: vehicleData.contract.clawbackAmount ?? 0,
        importBatchId: vehicleData.contract.importBatchId,
      });

      let residualId: string | undefined;
      let residualValue = 0;
      if (vehicleData.residual) {
        residualId = vehicleData.residual.id;
        residualValue = vehicleData.residual.residualValue;
        insertResidual.run({
          id: vehicleData.residual.id,
          vin: vehicleData.residual.vin,
          residualValue: vehicleData.residual.residualValue,
          residualDate: vehicleData.residual.residualDate,
          expiryDate: vehicleData.residual.expiryDate,
          valuationCompany: vehicleData.residual.valuationCompany,
          isExpired: vehicleData.residual.isExpired ? 1 : 0,
          importBatchId: vehicleData.residual.importBatchId,
        });
      }

      if (vehicleData.pendingItems) {
        for (const item of vehicleData.pendingItems) {
          let relatedRecordId = '';
          if (item.relatedRecordType === 'residual' && vehicleData.residual) {
            relatedRecordId = vehicleData.residual.id;
          } else if (item.relatedRecordType === 'contract') {
            relatedRecordId = vehicleData.contract.id;
          } else if (item.relatedRecordType === 'vehicle') {
            relatedRecordId = vehicleData.id;
          }
          insertPendingItem.run({
            id: item.id,
            type: item.type,
            relatedRecordId,
            relatedRecordType: item.relatedRecordType,
            title: item.title,
            description: item.description,
            level: item.level,
            remainingDays: item.remainingDays,
            status: item.status,
          });
        }
      }

      const remainingBalance = calculateRemainingBalance(
        vehicleData.contract.remainingPrincipal,
        vehicleData.contract.remainingInterest,
        vehicleData.contract.loanTerm
      );

      const finalAmount = calculateFinalAmount(
        vehicleData.storePrice,
        residualValue,
        vehicleData.contract.subsidyAmount,
        vehicleData.contract.clawbackAmount ?? 0
      );

      const resultId = generateId();
      insertCalculationResult.run({
        id: resultId,
        vin: vehicleData.vin,
        vehicleId: vehicleData.id,
        contractId: vehicleData.contract.id,
        residualId,
        storePrice: vehicleData.storePrice,
        remainingBalance,
        residualValue,
        subsidyDeduction: vehicleData.contract.subsidyAmount,
        subsidyClawback: vehicleData.contract.clawbackAmount ?? 0,
        finalPayable: finalAmount.payable,
        finalReceivable: finalAmount.receivable,
        status: vehicleData.resultStatus,
        statusReason: vehicleData.statusReason,
        calculatedAt: now(),
      });
    }
  });

  try {
    transaction();
    console.log('[SEED] Data seeding completed successfully');
    console.log(`[SEED] Inserted ${seedData.length} vehicle records with associated data`);
  } catch (error) {
    console.error('[SEED] Data seeding failed:', error);
    throw error;
  }
}

export { seedDatabase, seedData };
export default seedDatabase;
