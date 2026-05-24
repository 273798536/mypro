import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import { RecordType } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');

function generateBorrowApplications(count: number): any[] {
  const records = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const applicationDate = now - Math.random() * 90 * 24 * 60 * 60 * 1000;
    records.push({
      applicationNo: `BORROW-${String(10000 + i).padStart(6, '0')}`,
      readerId: `READER-${String(1000 + Math.floor(Math.random() * 9000)).padStart(4, '0')}`,
      readerName: faker.person.fullName(),
      isbn: faker.commerce.isbn(),
      bookTitle: faker.lorem.words(5),
      applicantLibrary: ['北京大学图书馆', '清华大学图书馆', '复旦大学图书馆'][Math.floor(Math.random() * 3)],
      lendingLibrary: ['国家图书馆', '上海图书馆', '南京图书馆'][Math.floor(Math.random() * 3)],
      applicationDate: Math.floor(applicationDate),
      status: ['pending', 'approved', 'rejected', 'lent', 'returned'][Math.floor(Math.random() * 5)],
      expectedReturnDate: Math.floor(applicationDate + 30 * 24 * 60 * 60 * 1000),
      actualReturnDate: Math.random() > 0.5
        ? Math.floor(applicationDate + 25 * 24 * 60 * 60 * 1000 + Math.random() * 20 * 24 * 60 * 60 * 1000)
        : '',
    });
  }

  return records;
}

function generateExpressOrders(count: number, borrowApps: any[]): any[] {
  const records = [];

  for (let i = 0; i < Math.min(count, borrowApps.length); i++) {
    const borrowApp = borrowApps[i];
    records.push({
      expressNo: `EXP-${Date.now()}-${String(i).padStart(4, '0')}`,
      relatedApplicationNo: borrowApp.applicationNo,
      sender: borrowApp.lendingLibrary,
      receiver: borrowApp.applicantLibrary,
      sendDate: Math.floor(borrowApp.applicationDate + 2 * 24 * 60 * 60 * 1000),
      receiveDate: Math.floor(borrowApp.applicationDate + 5 * 24 * 60 * 60 * 1000),
      expressCompany: ['顺丰', '中通', '圆通', '京东物流'][Math.floor(Math.random() * 4)],
      freight: parseFloat((10 + Math.random() * 40).toFixed(2)),
      status: ['created', 'shipped', 'delivered', 'returned'][Math.floor(Math.random() * 4)],
    });
  }

  return records;
}

function generateCompensationRecords(count: number, borrowApps: any[]): any[] {
  const records = [];
  const lentApps = borrowApps.filter(a => a.status === 'returned' || a.status === 'lent');

  for (let i = 0; i < Math.min(count, lentApps.length); i++) {
    const borrowApp = lentApps[i];
    const compType = ['overdue', 'damage', 'lost'][Math.floor(Math.random() * 3)] as 'overdue' | 'damage' | 'lost';
    records.push({
      compensationNo: `COMP-${String(1000 + i).padStart(6, '0')}`,
      relatedApplicationNo: borrowApp.applicationNo,
      readerId: borrowApp.readerId,
      compensationType: compType,
      amount: parseFloat((compType === 'lost' ? 50 + Math.random() * 100 : 5 + Math.random() * 30).toFixed(2)),
      compensationDate: Math.floor(borrowApp.applicationDate + 35 * 24 * 60 * 60 * 1000),
      status: ['pending', 'paid', 'waived'][Math.floor(Math.random() * 3)],
      remark: faker.lorem.sentence(),
    });
  }

  return records;
}

function generateShiftRecords(count: number): any[] {
  const records = [];
  const now = Date.now();
  const operators = [
    { id: 'OP001', name: '张三' },
    { id: 'OP002', name: '李四' },
    { id: 'OP003', name: '王五' },
    { id: 'OP004', name: '赵六' },
  ];

  for (let i = 0; i < count; i++) {
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const shiftDate = now - i * 24 * 60 * 60 * 1000;
    const shiftType = ['morning', 'afternoon', 'night'][i % 3] as 'morning' | 'afternoon' | 'night';

    records.push({
      shiftNo: `SHIFT-${new Date(shiftDate).toISOString().slice(0, 10)}-${shiftType.toUpperCase()}`,
      operatorId: operator.id,
      operatorName: operator.name,
      shiftDate: Math.floor(shiftDate),
      shiftType,
      processedRecords: Math.floor(20 + Math.random() * 80),
      remark: Math.random() > 0.7 ? faker.lorem.sentence() : '',
    });
  }

  return records;
}

function saveAsJson(data: any[], filename: string): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ 已生成 JSON: ${filePath} (${data.length} 条记录)`);
}

function saveAsCsv(data: any[], filename: string): void {
  const parser = new Parser();
  const csv = parser.parse(data);
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, csv, 'utf-8');
  console.log(`✅ 已生成 CSV: ${filePath} (${data.length} 条记录)`);
}

function main(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log('\n📦 开始生成测试数据...\n');

  const borrowApps = generateBorrowApplications(50);
  saveAsJson(borrowApps, 'borrow_applications.json');
  saveAsCsv(borrowApps, 'borrow_applications.csv');

  const expressOrders = generateExpressOrders(40, borrowApps);
  saveAsJson(expressOrders, 'express_orders.json');
  saveAsCsv(expressOrders, 'express_orders.csv');

  const compensations = generateCompensationRecords(20, borrowApps);
  saveAsJson(compensations, 'compensation_records.json');
  saveAsCsv(compensations, 'compensation_records.csv');

  const shiftRecords = generateShiftRecords(30);
  saveAsJson(shiftRecords, 'shift_records.json');
  saveAsCsv(shiftRecords, 'shift_records.csv');

  console.log('\n🎉 测试数据生成完成！');
  console.log(`📁 数据目录: ${DATA_DIR}`);
  console.log(`
使用示例:
  # 导入借阅申请
  curl -X POST http://localhost:3000/api/records/borrow_application/import \\
    -H "Content-Type: application/json" \\
    -d '{
      "sourceFile": "borrow_applications.json",
      "records": [ ... ]
    }'

  # 上传 CSV 文件
  curl -X POST http://localhost:3000/api/records/express_order/upload \\
    -F "file=@data/express_orders.csv"
  `);
}

main();
