const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'audit-db.json');

if (fs.existsSync(dbPath)) {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  for (const batch of data.importBatches) {
    const checkinCount = data.checkinRecords.filter(r => r.importBatch === batch.id).length;
    const depositCount = data.depositRecords.filter(r => r.importBatch === batch.id).length;
    const roomChangeCount = data.roomChangeRecords.filter(r => r.importBatch === batch.id).length;
    const shiftCount = data.shiftRecords.filter(r => r.importBatch === batch.id).length;
    const supplementCount = data.supplementRecords.filter(r => r.importBatch === batch.id).length;
    
    const actualTotal = checkinCount + depositCount + roomChangeCount + shiftCount + supplementCount;
    
    console.log(`批次 ${batch.batchNo}:`);
    console.log(`  原总数: ${batch.totalRecords}, 实际总数: ${actualTotal}`);
    console.log(`  入住单: ${checkinCount}, 押金: ${depositCount}, 换房: ${roomChangeCount}, 班次: ${shiftCount}, 补录: ${supplementCount}`);
    
    batch.totalRecords = actualTotal;
    batch.importedRecords = actualTotal;
  }
  
  for (const report of data.auditReports) {
    const batch = data.importBatches.find(b => b.batchNo === report.batchNo);
    if (batch) {
      const checkinCount = data.checkinRecords.filter(r => r.importBatch === batch.id).length;
      const depositCount = data.depositRecords.filter(r => r.importBatch === batch.id).length;
      const roomChangeCount = data.roomChangeRecords.filter(r => r.importBatch === batch.id).length;
      const shiftCount = data.shiftRecords.filter(r => r.importBatch === batch.id).length;
      const supplementCount = data.supplementRecords.filter(r => r.importBatch === batch.id).length;
      
      const actualTotal = checkinCount + depositCount + roomChangeCount + shiftCount + supplementCount;
      report.summary.totalRecords = actualTotal;
      report.summary.cleanRecords = actualTotal - report.summary.pendingRecords;
    }
  }
  
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('\n数据修正完成！');
}
