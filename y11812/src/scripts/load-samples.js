const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const sampleStores = [
  {
    id: uuidv4(),
    store_code: 'S001',
    store_name: '北京朝阳店',
    mall_name: '朝阳大悦城',
    address: '北京市朝阳区朝阳北路101号',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S002',
    store_name: '上海徐汇店',
    mall_name: '徐家汇港汇恒隆',
    address: '上海市徐汇区虹桥路1号',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S003',
    store_name: '广州天河店',
    mall_name: null,
    address: '广州市天河区天河路385号',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S004',
    store_name: '深圳南山店',
    mall_name: '海岸城购物中心',
    address: '深圳市南山区文心五路33号',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S005',
    store_name: '成都春熙店',
    mall_name: 'IFS国际金融中心',
    address: '成都市锦江区红星路三段1号',
    status: 'active'
  }
];

const sampleContracts = [
  {
    id: uuidv4(),
    store_code: 'S001',
    contract_no: 'HT-BJ-2024-001',
    version: 1,
    effective_date: '2024-01-01',
    end_date: '2024-12-31',
    base_rent: 50000,
    rent_type: 'guarantee_plus_commission',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S002',
    contract_no: 'HT-SH-2024-001',
    version: 1,
    effective_date: '2024-01-01',
    end_date: '2024-06-30',
    base_rent: 60000,
    rent_type: 'guarantee_plus_commission',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S002',
    contract_no: 'HT-SH-2024-002',
    version: 2,
    effective_date: '2024-07-01',
    end_date: '2024-12-31',
    base_rent: 75000,
    rent_type: 'guarantee_plus_commission',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S004',
    contract_no: 'HT-SZ-2024-001',
    version: 1,
    effective_date: '2024-01-01',
    end_date: '2024-12-31',
    base_rent: 45000,
    rent_type: 'guarantee_plus_commission',
    status: 'active'
  },
  {
    id: uuidv4(),
    store_code: 'S005',
    contract_no: 'HT-CD-2024-001',
    version: 1,
    effective_date: '2024-01-01',
    end_date: '2024-12-31',
    base_rent: 40000,
    rent_type: 'guarantee_plus_commission',
    status: 'active'
  }
];

const sampleCommissionRules = [
  { contract_no: 'HT-BJ-2024-001', rule_type: 'tiered', category: '服装', rate: 0.08, threshold: 0, tier_level: 1 },
  { contract_no: 'HT-BJ-2024-001', rule_type: 'tiered', category: '服装', rate: 0.10, threshold: 300000, tier_level: 2 },
  { contract_no: 'HT-BJ-2024-001', rule_type: 'tiered', category: '服装', rate: 0.12, threshold: 500000, tier_level: 3 },
  { contract_no: 'HT-SH-2024-001', rule_type: 'tiered', category: '服装', rate: 0.09, threshold: 0, tier_level: 1 },
  { contract_no: 'HT-SH-2024-001', rule_type: 'tiered', category: '服装', rate: 0.11, threshold: 350000, tier_level: 2 },
  { contract_no: 'HT-SH-2024-002', rule_type: 'tiered', category: '服装', rate: 0.09, threshold: 0, tier_level: 1 },
  { contract_no: 'HT-SH-2024-002', rule_type: 'tiered', category: '服装', rate: 0.11, threshold: 400000, tier_level: 2 },
  { contract_no: 'HT-SZ-2024-001', rule_type: 'tiered', category: '服装', rate: 0.07, threshold: 0, tier_level: 1 },
  { contract_no: 'HT-SZ-2024-001', rule_type: 'tiered', category: '服装', rate: 0.09, threshold: 250000, tier_level: 2 },
  { contract_no: 'HT-CD-2024-001', rule_type: 'tiered', category: '服装', rate: 0.08, threshold: 0, tier_level: 1 },
  { contract_no: 'HT-CD-2024-001', rule_type: 'tiered', category: '服装', rate: 0.10, threshold: 200000, tier_level: 2 }
];

function generateSalesData(storeId, storeCode, year, month) {
  const sales = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const saleDate = `${year}-${monthStr}-${dayStr}`;
    
    const isWeekend = new Date(year, month - 1, day).getDay() % 6 === 0;
    const baseAmount = isWeekend ? 25000 : 15000;
    const variation = (Math.random() - 0.5) * 0.3;
    const grossAmount = Math.round(baseAmount * (1 + variation) * 100) / 100;
    
    const hasRefund = Math.random() < 0.3;
    const refundAmount = hasRefund ? Math.round(grossAmount * Math.random() * 0.1 * 100) / 100 : 0;
    
    const hasActivity = Math.random() < 0.2;
    const activityDeduction = hasActivity ? Math.round(grossAmount * Math.random() * 0.05 * 100) / 100 : 0;
    
    sales.push({
      id: uuidv4(),
      store_id: storeId,
      store_code: storeCode,
      sale_date: saleDate,
      category: '服装',
      gross_amount: grossAmount,
      refund_amount: refundAmount,
      activity_deduction: activityDeduction,
      net_amount: grossAmount - refundAmount - activityDeduction,
      source_batch: `SALES-${year}${monthStr}`
    });
  }
  
  return sales;
}

db.serialize(async () => {
  try {
    console.log('开始加载样例数据...');
    
    const storeIdMap = {};
    for (const store of sampleStores) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO stores (id, store_code, store_name, mall_name, address, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [store.id, store.store_code, store.store_name, store.mall_name, store.address, store.status], 
        function(err) {
          if (err) reject(err);
          else {
            storeIdMap[store.store_code] = store.id;
            resolve();
          }
        });
      });
    }
    console.log(`已加载 ${sampleStores.length} 个门店`);
    
    for (const contract of sampleContracts) {
      const storeId = storeIdMap[contract.store_code];
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO contracts 
          (id, store_id, contract_no, version, effective_date, end_date, base_rent, rent_type, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [contract.id, storeId, contract.contract_no, contract.version, 
            contract.effective_date, contract.end_date, contract.base_rent, 
            contract.rent_type, contract.status], 
        function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log(`已加载 ${sampleContracts.length} 个合同`);
    
    const contractIdMap = {};
    await new Promise((resolve, reject) => {
      db.all('SELECT id, contract_no FROM contracts', (err, rows) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            contractIdMap[row.contract_no] = row.id;
          });
          resolve();
        }
      });
    });
    
    for (const rule of sampleCommissionRules) {
      const contractId = contractIdMap[rule.contract_no];
      if (contractId) {
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO commission_rules 
            (id, contract_id, rule_type, category, rate, threshold, tier_level)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [uuidv4(), contractId, rule.rule_type, rule.category, 
              rule.rate, rule.threshold, rule.tier_level], 
          function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }
    console.log(`已加载 ${sampleCommissionRules.length} 条抽成规则`);
    
    let totalSales = 0;
    for (const store of sampleStores) {
      const salesData = generateSalesData(store.id, store.store_code, 2024, 1);
      for (const sale of salesData) {
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO sales_data 
            (id, store_id, sale_date, category, gross_amount, refund_amount, net_amount, activity_deduction, source_batch)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [sale.id, sale.store_id, sale.sale_date, sale.category, 
              sale.gross_amount, sale.refund_amount, sale.net_amount, 
              sale.activity_deduction, sale.source_batch], 
          function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        totalSales++;
      }
    }
    console.log(`已加载 ${totalSales} 条销售数据`);
    
    console.log('\n样例数据加载完成!');
    console.log('\n数据概览:');
    console.log(`- 门店: ${sampleStores.length} 家 (S003 缺少商场名称, 用于演示数据校验)`);
    console.log(`- 合同: ${sampleContracts.length} 份 (S002 有2个版本, 用于演示保底切换)`);
    console.log(`- 抽成规则: ${sampleCommissionRules.length} 条`);
    console.log(`- 销售数据: ${totalSales} 条 (2024年1月全月)`);
    
    db.close();
  } catch (err) {
    console.error('加载样例数据失败:', err);
    db.close();
  }
});
