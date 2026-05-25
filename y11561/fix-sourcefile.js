const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'audit-db.json');

if (fs.existsSync(dbPath)) {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  for (const record of data.depositRecords) {
    if (record.sourceFile === 'checkin_normal.csv') {
      record.sourceFile = 'deposit.csv';
      console.log(`修复押金流水 ${record.transactionNo}: sourceFile -> deposit.csv`);
    }
  }
  
  for (const record of data.roomChangeRecords) {
    if (record.sourceFile === 'checkin_normal.csv') {
      record.sourceFile = 'roomChange.csv';
      console.log(`修复换房记录 ${record.changeNo}: sourceFile -> roomChange.csv`);
    }
  }
  
  for (const record of data.shiftRecords) {
    if (record.sourceFile === 'checkin_normal.csv') {
      record.sourceFile = 'shift.csv';
      console.log(`修复班次记录 ${record.shiftNo}: sourceFile -> shift.csv`);
    }
  }
  
  for (const record of data.supplementRecords) {
    if (record.sourceFile === 'checkin_normal.csv') {
      record.sourceFile = 'supplement.csv';
      console.log(`修复补录记录 ${record.supplementNo}: sourceFile -> supplement.csv`);
    }
  }
  
  for (const dirty of data.dirtyRecords) {
    if (dirty.recordType === 'deposit') {
      if (dirty.originalContent?.sourceFile === 'checkin_normal.csv') {
        dirty.originalContent.sourceFile = 'deposit.csv';
        console.log(`修复脏记录(deposit) ${dirty.id}: sourceFile -> deposit.csv`);
      }
      if (dirty.originalContent?.deposit?.sourceFile === 'checkin_normal.csv') {
        dirty.originalContent.deposit.sourceFile = 'deposit.csv';
        console.log(`修复脏记录(deposit nested) ${dirty.id}: sourceFile -> deposit.csv`);
      }
    }
    if (dirty.recordType === 'roomChange') {
      if (dirty.originalContent?.sourceFile === 'checkin_normal.csv') {
        dirty.originalContent.sourceFile = 'roomChange.csv';
        console.log(`修复脏记录(roomChange) ${dirty.id}: sourceFile -> roomChange.csv`);
      }
    }
    if (dirty.recordType === 'shift') {
      if (dirty.originalContent?.sourceFile === 'checkin_normal.csv') {
        dirty.originalContent.sourceFile = 'shift.csv';
        console.log(`修复脏记录(shift) ${dirty.id}: sourceFile -> shift.csv`);
      }
    }
    if (dirty.recordType === 'supplement') {
      if (dirty.originalContent?.sourceFile === 'checkin_normal.csv') {
        dirty.originalContent.sourceFile = 'supplement.csv';
        console.log(`修复脏记录(supplement) ${dirty.id}: sourceFile -> supplement.csv`);
      }
    }
  }
  
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('\n数据修正完成！');
}
