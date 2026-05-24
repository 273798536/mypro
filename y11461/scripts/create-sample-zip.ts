import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const samplesDir = path.join(process.cwd(), 'samples');
const outputZip = path.join(samplesDir, 'history-archive.zip');

function createCsvContent(type: string, includeDirty: boolean = false): string {
  switch (type) {
    case 'implant':
      return `批号,材料名称,类型,数量,单价,金额,供应商
IMP-HIST-001,Straumann历史种植体,种植体,5,2500,12500,Straumann中国
IMP-HIST-002,Nobel历史种植体,种植体,3,3200,${includeDirty ? '9000' : '9600'},Nobel Biocare
IMP-HIST-003,Osstem历史种植体,种植体,${includeDirty ? '0' : '8'},1800,${includeDirty ? '0' : '14400'},奥齿泰上海
`;
    case 'appointment':
      return `患者ID,患者姓名,预约日期,种植体批号,材料名称,数量,单价,金额
HP001,历史患者1,2023-12-01,IMP-HIST-001,Straumann历史种植体,1,2500,2500
HP002,历史患者2,2023-12-05,IMP-HIST-002,Nobel历史种植体,1,3200,3200
HP003,历史患者3,${includeDirty ? '2023-12-15' : '2023-12-01'},IMP-HIST-001,Straumann历史种植体,1,2500,2500
`;
    case 'invoice':
      return `发票号,批号,货品名称,类型,数量,单价,总价,供货方
HINV-001,IMP-HIST-001,Straumann历史种植体,种植体,5,2500,12500,Straumann中国
HINV-002,IMP-HIST-002,Nobel历史种植体,种植体,3,3200,9600,Nobel Biocare
`;
    case 'manual':
      return `批号,材料名称,类型,数量,单价,金额,供应商,患者姓名,日期
IMP-HIST-004,历史愈合基台,基台,2,350,700,Straumann中国,历史患者4,2023-12-10
${includeDirty ? ',历史缺失批号材料,种植体,1,2000,2000,未知供应商,历史患者5,2023-12-11' : ''}
`;
    default:
      return '';
  }
}

function createSampleZip() {
  const zip = new AdmZip();

  zip.addFile('history/2023-12/implant_batch_history.csv', Buffer.from(createCsvContent('implant', false)));
  zip.addFile('history/2023-12/appointment_history.csv', Buffer.from(createCsvContent('appointment', true)));
  zip.addFile('history/2023-11/supplier_invoice_old.csv', Buffer.from(createCsvContent('invoice', false)));
  zip.addFile('history/2023-11/manual_entry_dirty.csv', Buffer.from(createCsvContent('manual', true)));

  zip.writeZip(outputZip);
  console.log(`✓ 历史压缩包已创建: ${outputZip}`);
  console.log('  包含文件:');
  console.log('    - history/2023-12/implant_batch_history.csv');
  console.log('    - history/2023-12/appointment_history.csv (含跨日脏数据)');
  console.log('    - history/2023-11/supplier_invoice_old.csv');
  console.log('    - history/2023-11/manual_entry_dirty.csv (含缺字段脏数据)');
}

createSampleZip();
