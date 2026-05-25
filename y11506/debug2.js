const { initDatabase, getDatabase } = require('./src/db/database');
const { validateInventoryDiff } = require('./src/services/validationService');
const { createBatch } = require('./src/services/importService');
const { SOURCE_TYPES, IMPORT_MODES } = require('./src/constants');

initDatabase();
const db = getDatabase();

const batchId = createBatch(SOURCE_TYPES.INVENTORY, IMPORT_MODES.APPEND, 'debug.csv', 'debugger');
console.log('Batch ID:', batchId);

const testRow1 = {
  device_id: 'DEV011',
  device_name: '听诊器',
  department: '内科',
  expected_quantity: '',
  actual_quantity: '20',
  inventory_date: '2024-01-31'
};

const testRow2 = {
  device_id: 'DEV012',
  device_name: '体温计',
  department: '急诊科',
  expected_quantity: '50',
  actual_quantity: 'bad',
  inventory_date: '2024-01-31'
};

const testRow3 = {
  device_id: 'DEV001',
  device_name: '心电图机',
  department: '内科',
  expected_quantity: '2',
  actual_quantity: '3',
  inventory_date: '2024-01-31'
};

console.log('\nTest 1 (missing required - DEV011):');
console.log('Row:', JSON.stringify(testRow1));
console.log('expected_quantity === empty string:', testRow1.expected_quantity === '');
const result1 = validateInventoryDiff(db, testRow1, 12, batchId);
console.log('Is valid:', result1);

console.log('\nTest 2 (invalid amount - DEV012):');
console.log('Row:', JSON.stringify(testRow2));
console.log('actual_quantity === "bad":', testRow2.actual_quantity === 'bad');
const result2 = validateInventoryDiff(db, testRow2, 13, batchId);
console.log('Is valid:', result2);

console.log('\nTest 3 (valid with diff - DEV001):');
console.log('Row:', JSON.stringify(testRow3));
const result3 = validateInventoryDiff(db, testRow3, 2, batchId);
console.log('Is valid:', result3);

console.log('\nAll validation errors recorded:');
const errors = db.prepare(`
  SELECT original_line_no, error_code, error_message, severity, field_name, field_value 
  FROM validation_errors 
  WHERE batch_id = ? 
  ORDER BY original_line_no, severity DESC
`).all(batchId);

errors.forEach(e => {
  console.log(`  Line ${e.original_line_no}: ${e.error_code} - ${e.error_message} (${e.severity})`);
  if (e.field_name) {
    console.log(`    Field: ${e.field_name}, Value: ${JSON.stringify(e.field_value)}`);
  }
});

const errorCount = errors.filter(e => e.severity === 'error').length;
const warningCount = errors.filter(e => e.severity === 'warning').length;
console.log(`\nTotal errors: ${errorCount}, warnings: ${warningCount}`);
