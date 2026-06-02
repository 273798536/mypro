import { createDemoRecords } from '../src/utils/demoData';

const records = createDemoRecords();

console.log('=== Demo Data Verification ===\n');

records.forEach((record) => {
  console.log(`[${record.id}] ${record.metricA} → ${record.metricB}`);
  console.log(`  Status: ${record.status}`);
  console.log(`  Sample Size: ${record.sampleSize}`);
  console.log(`  Correlation: r=${record.correlationCoeff.toFixed(3)}, p=${record.pValue.toFixed(4)}`);
  console.log(`  Lag Value: ${record.lagValue} days`);
  if (record.pendingReason) console.log(`  Pending Reason: ${record.pendingReason}`);
  if (record.abnormalReason) console.log(`  Abnormal Reason: ${record.abnormalReason}`);
  console.log(`  Judgment: ${record.judgment}`);
  console.log();
});

const normal = records.filter(r => r.status === 'normal').length;
const pending = records.filter(r => r.status === 'pending').length;
const abnormal = records.filter(r => r.status === 'abnormal').length;

console.log('=== Summary ===');
console.log(`  Normal: ${normal} (DEMO-001 should be normal)`);
console.log(`  Pending: ${pending} (DEMO-003 should be pending)`);
console.log(`  Abnormal: ${abnormal} (DEMO-002 should be abnormal)`);

const allCorrect = 
  records[0].status === 'normal' && 
  records[1].status === 'abnormal' && 
  records[2].status === 'pending';

console.log();
console.log(`Verification: ${allCorrect ? '✓ PASSED' : '✗ FAILED'}`);

if (!allCorrect) {
  console.log();
  console.log('ERROR: Expected classification:');
  console.log('  DEMO-001: normal');
  console.log('  DEMO-002: abnormal (too few samples)');
  console.log('  DEMO-003: pending (lag relation)');
  process.exit(1);
}
