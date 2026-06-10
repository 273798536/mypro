const db = require('../db');

function now() {
  return new Date().toISOString();
}

function evaluateConclusion(tv, lv) {
  if (tv == null || lv == null) return '待确认';
  return tv <= lv ? '通过' : '不通过';
}

const samples = [
  {
    batch_no: '20250512A01',
    reagent_name: '甲醇',
    specification: '色谱纯 500mL',
    manufacturer: '国药集团化学试剂有限公司',
    arrival_date: '2025-05-12',
    quantity: 20,
    unit: '瓶',
    supplier: '国药上海分公司',
    remark: '常规检测用',
    tests: [
      { test_item: '农残-有机磷', test_value: 0.002, limit_value: 0.01, unit: 'mg/kg', test_method: 'GC-MS', test_date: '2025-05-13', tester: '张工' },
      { test_item: '农残-有机氯', test_value: 0.001, limit_value: 0.005, unit: 'mg/kg', test_method: 'GC-ECD', test_date: '2025-05-13', tester: '张工' },
      { test_item: '农残-氨基甲酸酯', test_value: 0.003, limit_value: 0.02, unit: 'mg/kg', test_method: 'HPLC-FLD', test_date: '2025-05-13', tester: '李工' }
    ]
  },
  {
    batch_no: '20250508B03',
    reagent_name: '乙腈',
    specification: '色谱纯 4L',
    manufacturer: '默克化工技术(上海)有限公司',
    arrival_date: '2025-05-08',
    quantity: 5,
    unit: '桶',
    supplier: '默克中国',
    remark: '',
    tests: [
      { test_item: '农残-有机磷', test_value: 0.008, limit_value: 0.01, unit: 'mg/kg', test_method: 'GC-MS', test_date: '2025-05-09', tester: '王工' },
      { test_item: '农残-拟除虫菊酯', test_value: 0.015, limit_value: 0.01, unit: 'mg/kg', test_method: 'GC-ECD', test_date: '2025-05-09', tester: '王工' }
    ]
  },
  {
    batch_no: '20250428C02',
    reagent_name: '正己烷',
    specification: '农残级 500mL',
    manufacturer: '美国Fisher Scientific',
    arrival_date: '2025-04-28',
    quantity: 30,
    unit: '瓶',
    supplier: '赛默飞世尔',
    remark: '进口试剂',
    tests: [
      { test_item: '农残-有机氯', test_value: 0.0005, limit_value: 0.005, unit: 'mg/kg', test_method: 'GC-ECD', test_date: '2025-04-29', tester: '赵工' }
    ]
  }
];

const tx = db.transaction(() => {
  samples.forEach(b => {
    const ts = now();
    let batch = db.prepare(
      'SELECT * FROM reagent_batches WHERE batch_no = ? AND reagent_name = ?'
    ).get(b.batch_no, b.reagent_name);

    let batchId;
    if (!batch) {
      const info = db.prepare(`
        INSERT INTO reagent_batches
        (batch_no, reagent_name, specification, manufacturer, arrival_date,
         quantity, unit, supplier, remark, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(b.batch_no, b.reagent_name, b.specification, b.manufacturer,
             b.arrival_date, b.quantity, b.unit, b.supplier, b.remark, ts, ts);
      batchId = info.lastInsertRowid;
      console.log(`新增批次: ${b.batch_no} ${b.reagent_name}`);
    } else {
      batchId = batch.id;
      console.log(`已存在批次，跳过: ${b.batch_no} ${b.reagent_name}`);
    }

    b.tests.forEach(t => {
      const conclusion = evaluateConclusion(t.test_value, t.limit_value);
      let existing = db.prepare(
        'SELECT * FROM pesticide_tests WHERE batch_id = ? AND test_item = ?'
      ).get(batchId, t.test_item);

      if (!existing) {
        db.prepare(`
          INSERT INTO pesticide_tests
          (batch_id, test_item, test_value, limit_value, unit, test_method,
           test_date, tester, result_status, conclusion, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, ?, ?)
        `).run(batchId, t.test_item, t.test_value, t.limit_value, t.unit,
               t.test_method, t.test_date, t.tester, conclusion, ts, ts);
        console.log(`  新增检测项: ${t.test_item} = ${t.test_value} → ${conclusion}`);
      }
    });
  });
});

tx();
console.log('\n样例数据初始化完成！');
