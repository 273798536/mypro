const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const sampleDir = path.join(__dirname, '../sample-data');
fs.mkdirSync(sampleDir, { recursive: true });

function generateReturnApplications(count = 50) {
  const data = [];
  const suppliers = ['SUP001', 'SUP002', 'SUP003', 'SUP004', 'SUP005'];
  const skus = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005', 'SKU006'];
  const statuses = ['pending', 'part_confirmed', 'fully_confirmed'];
  const reasons = [
    '供应商只认部分批次，剩余货品状态没人维护',
    '部分商品检验不合格，供应商拒绝接收',
    '物流延误，供应商尚未确认',
    '价格协商中，暂未确认'
  ];

  for (let i = 1; i <= count; i++) {
    const batchNo = `BATCH${String(Math.floor(i / 10) + 1).padStart(3, '0')}`;
    const applyQty = Math.floor(Math.random() * 100) + 10;
    const confirmRatio = Math.random();
    const confirmQty = confirmRatio > 0.7 ? applyQty : confirmRatio > 0.3 ? Math.floor(applyQty * Math.random()) : 0;
    
    data.push({
      申请单号: `RA${String(i).padStart(6, '0')}`,
      批次号: batchNo,
      供应商编码: suppliers[Math.floor(Math.random() * suppliers.length)],
      供应商名称: `供应商${Math.floor(Math.random() * 10) + 1}`,
      商品编码: skus[Math.floor(Math.random() * skus.length)],
      商品名称: `商品${Math.floor(Math.random() * 20) + 1}`,
      申请数量: applyQty,
      供应商确认数量: confirmQty,
      申请金额: (applyQty * (Math.random() * 100 + 10)).toFixed(2),
      申请日期: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      处理原因: confirmQty < applyQty ? reasons[Math.floor(Math.random() * reasons.length)] : ''
    });
  }
  return data;
}

function generateQualityPhotos(count = 100) {
  const data = [];
  const suppliers = ['SUP001', 'SUP002', 'SUP003', 'SUP004', 'SUP005'];
  const skus = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005', 'SKU006'];
  const results = ['qualified', 'unqualified', 'pending'];

  for (let i = 1; i <= count; i++) {
    const batchNo = `BATCH${String(Math.floor(i / 20) + 1).padStart(3, '0')}`;
    data.push({
      照片编号: `QP${String(i).padStart(6, '0')}`,
      批次号: batchNo,
      供应商编码: suppliers[Math.floor(Math.random() * suppliers.length)],
      商品编码: skus[Math.floor(Math.random() * skus.length)],
      照片URL: `http://example.com/photos/qp${i}.jpg`,
      照片哈希: crypto.randomBytes(16).toString('hex'),
      质检结果: results[Math.floor(Math.random() * results.length)],
      质检员: `质检员${Math.floor(Math.random() * 5) + 1}`,
      质检日期: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      备注: ''
    });
  }
  return data;
}

function generateLogisticsReceipts(count = 60) {
  const data = [];
  const suppliers = ['SUP001', 'SUP002', 'SUP003', 'SUP004', 'SUP005'];
  const companies = ['顺丰', '圆通', '中通', '韵达', '京东物流'];
  const statuses = ['pending', 'signed', 'rejected', 'lost'];

  for (let i = 1; i <= count; i++) {
    const batchNo = `BATCH${String(Math.floor(i / 12) + 1).padStart(3, '0')}`;
    const deliveryQty = Math.floor(Math.random() * 100) + 10;
    data.push({
      回单号: `LR${String(i).padStart(6, '0')}`,
      批次号: batchNo,
      供应商编码: suppliers[Math.floor(Math.random() * suppliers.length)],
      运单号: `SF${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      物流公司: companies[Math.floor(Math.random() * companies.length)],
      发货数量: deliveryQty,
      签收数量: Math.floor(deliveryQty * (0.8 + Math.random() * 0.2)),
      发货日期: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      签收日期: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      签收状态: statuses[Math.floor(Math.random() * statuses.length)],
      签收人: `签收人${Math.floor(Math.random() * 10) + 1}`,
      回单图片: `http://example.com/receipts/lr${i}.jpg`,
      备注: ''
    });
  }
  return data;
}

function generatePriceAdjustments(count = 40) {
  const data = [];
  const suppliers = ['SUP001', 'SUP002', 'SUP003', 'SUP004', 'SUP005'];
  const skus = ['SKU001', 'SKU002', 'SKU003', 'SKU004', 'SKU005', 'SKU006'];
  const statuses = ['pending', 'approved', 'rejected', 'executed'];
  const reasons = ['质量问题', '市场调价', '补偿', '促销', '其他'];

  for (let i = 1; i <= count; i++) {
    const batchNo = `BATCH${String(Math.floor(i / 8) + 1).padStart(3, '0')}`;
    const originalPrice = Math.random() * 200 + 50;
    data.push({
      改价单号: `PA${String(i).padStart(6, '0')}`,
      批次号: batchNo,
      供应商编码: suppliers[Math.floor(Math.random() * suppliers.length)],
      商品编码: skus[Math.floor(Math.random() * skus.length)],
      原价: originalPrice.toFixed(2),
      调整后价格: (originalPrice * (0.7 + Math.random() * 0.5)).toFixed(2),
      调整数量: Math.floor(Math.random() * 50) + 5,
      调整金额: '',
      改价日期: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      改价原因: reasons[Math.floor(Math.random() * reasons.length)],
      操作人: `操作人${Math.floor(Math.random() * 5) + 1}`,
      状态: statuses[Math.floor(Math.random() * statuses.length)]
    });
  }
  return data;
}

function writeExcel(data, sheetName, fileName) {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  const filePath = path.join(sampleDir, fileName);
  xlsx.writeFile(workbook, filePath);
  console.log(`生成文件: ${filePath}`);
  return filePath;
}

async function generateAll() {
  console.log('开始生成测试数据...');
  
  const returnApps = generateReturnApplications(50);
  writeExcel(returnApps, '退供申请', '退供申请.xlsx');
  
  const photos = generateQualityPhotos(100);
  writeExcel(photos, '质检照片', '质检照片.xlsx');
  
  const receipts = generateLogisticsReceipts(60);
  writeExcel(receipts, '物流回单', '物流回单.xlsx');
  
  const adjustments = generatePriceAdjustments(40);
  writeExcel(adjustments, '手工改价', '手工改价表.xlsx');
  
  console.log('测试数据生成完成！');
  console.log(`文件位置: ${sampleDir}`);
}

generateAll();
