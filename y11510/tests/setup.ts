import { initDatabase, db } from '../src/db';

beforeAll(async () => {
  process.env.DB_PATH = ':memory:';
  await initDatabase();
});

afterAll(async () => {
  await db.destroy();
});

afterEach(async () => {
  const tables = [
    'exception_receipts',
    'audit_logs',
    'batches',
    'attachments',
    'approval_emails',
    'auto_check_results',
    'borrow_applications',
    'express_orders',
    'reader_compensations',
    'supplier_bills',
  ];

  for (const table of tables) {
    await db(table).delete();
  }
});
