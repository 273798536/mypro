const { initDatabase } = require('./src/db/database');
const { parseCsvFile } = require('./src/utils/csvParser');
const { SOURCE_TYPES } = require('./src/constants');

initDatabase();

async function debug() {
  const rows = await parseCsvFile('examples/inventory.csv');
  
  console.log('Total rows parsed:', rows.length);
  console.log('\nFirst 3 row keys:', Object.keys(rows[0]));
  console.log('\nRow 11 (DEV011, index 10):');
  console.log('  Keys:', Object.keys(rows[10]));
  console.log('  Values:', JSON.stringify(rows[10]));
  console.log('  expected_quantity:', JSON.stringify(rows[10].expected_quantity));
  console.log('  expected_quantity === "":', rows[10].expected_quantity === '');
  console.log('  expected_quantity.length:', rows[10].expected_quantity ? rows[10].expected_quantity.length : 'undefined/null');
  
  console.log('\nRow 12 (DEV012, index 11):');
  console.log('  Values:', JSON.stringify(rows[11]));
  console.log('  actual_quantity:', JSON.stringify(rows[11].actual_quantity));
  console.log('  actual_quantity === "bad":', rows[11].actual_quantity === 'bad');
  
  console.log('\nAll rows device_id and expected/actual:');
  rows.forEach((row, i) => {
    const exp = row.expected_quantity;
    const act = row.actual_quantity;
    console.log(`  Line ${i + 2}: ${row.device_id} exp=${JSON.stringify(exp)} act=${JSON.stringify(act)}`);
  });
}

debug().catch(console.error);
