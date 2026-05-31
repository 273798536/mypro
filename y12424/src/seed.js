const { getDb } = require("./db");

const db = getDb();

const tx = db.transaction(() => {
  db.prepare(
    `INSERT OR IGNORE INTO contracts (id, landlord_name, commission_rate, bank_account)
     VALUES (?, ?, ?, ?)`
  ).run("C001", "张三民宿", 0.10, "6222000000001");

  db.prepare(
    `INSERT OR IGNORE INTO contracts (id, landlord_name, commission_rate, bank_account)
     VALUES (?, ?, ?, ?)`
  ).run("C002", "李四公寓", 0.12, "6222000000002");

  const orders = [
    { id: "O001", contract_id: "C001", check_in: "2026-05-01", check_out: "2026-05-03", gross_amount: 1200, deposit: 200, cleaning_fee: 100, subsidy: 0 },
    { id: "O002", contract_id: "C001", check_in: "2026-05-05", check_out: "2026-05-07", gross_amount: 800, deposit: 0, cleaning_fee: 80, subsidy: 50 },
    { id: "O003", contract_id: "C001", check_in: "2026-05-10", check_out: "2026-05-12", gross_amount: 1500, deposit: 300, cleaning_fee: 120, subsidy: 100 },
    { id: "O004", contract_id: "C002", check_in: "2026-05-01", check_out: "2026-05-04", gross_amount: 2100, deposit: 500, cleaning_fee: 150, subsidy: 0 },
    { id: "O005", contract_id: "C002", check_in: "2026-05-08", check_out: "2026-05-10", gross_amount: 600, deposit: 0, cleaning_fee: 60, subsidy: 0 },
  ];

  const insertOrder = db.prepare(
    `INSERT OR IGNORE INTO orders (id, contract_id, check_in, check_out, gross_amount, deposit, cleaning_fee, subsidy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const o of orders) {
    insertOrder.run(o.id, o.contract_id, o.check_in, o.check_out, o.gross_amount, o.deposit, o.cleaning_fee, o.subsidy);
  }
});

tx();
console.log("种子数据已写入：2 份合同、5 笔订单");
console.log("可创建结算单测试：POST /api/settlements  { contract_id: 'C001', period_start: '2026-05-01', period_end: '2026-05-31' }");
