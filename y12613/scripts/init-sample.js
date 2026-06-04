const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'uav_review.db');
if (fs.existsSync(dbPath)) {
  console.log('⚠️  检测到现有数据库，正在备份...');
  const backupPath = dbPath + '.backup_' + Date.now();
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ 已备份到: ${backupPath}`);
  fs.unlinkSync(dbPath);
  console.log('🗑️  已清除旧数据库');
}

const db = require('../src/db');
const services = require('../src/services');

const sampleAnnotations = [
  {
    batch_no: 'UAV-2026-001',
    image_id: 'DJI_0001',
    anomaly_type: '拼接错位',
    anomaly_desc: '东北区域道路错位约5米，拼接缝明显',
    coordinate_x: 116.397128,
    coordinate_y: 39.916527,
    zoom_level: 18,
    pan_offset_x: 125,
    pan_offset_y: 89,
    operator: '张三',
    operate_time: '2026-06-01T09:30:00',
    source_file: 'UAV-2026-001/DJI_0001.JPG'
  },
  {
    batch_no: 'UAV-2026-001',
    image_id: 'DJI_0002',
    anomaly_type: '色彩差异',
    anomaly_desc: '西南角农田区域存在明显色差，时相差异',
    coordinate_x: 116.397200,
    coordinate_y: 39.916400,
    zoom_level: 16,
    pan_offset_x: -45,
    pan_offset_y: 120,
    operator: '李四',
    operate_time: '2026-06-01T10:15:00',
    source_file: 'UAV-2026-001/DJI_0002.JPG'
  },
  {
    batch_no: 'UAV-2026-001',
    image_id: 'DJI_0003',
    anomaly_type: '重影模糊',
    anomaly_desc: '建筑物边缘重影，运动模糊导致',
    coordinate_x: 116.397500,
    coordinate_y: 39.916800,
    zoom_level: 20,
    pan_offset_x: 200,
    pan_offset_y: -30,
    operator: '张三',
    operate_time: '2026-06-01T11:00:00',
    source_file: 'UAV-2026-001/DJI_0003.JPG'
  },
  {
    batch_no: 'UAV-2026-001',
    image_id: 'DJI_0001',
    anomaly_type: '拼接错位',
    anomaly_desc: '东南区域河道错位约3米',
    coordinate_x: 116.397300,
    coordinate_y: 39.916300,
    zoom_level: 19,
    pan_offset_x: 80,
    pan_offset_y: 150,
    operator: '王五',
    operate_time: '2026-06-01T14:20:00',
    source_file: 'UAV-2026-001/DJI_0001.JPG'
  },
  {
    batch_no: 'UAV-2026-002',
    image_id: 'DJI_0100',
    anomaly_type: '漏洞缺失',
    anomaly_desc: '东北角存在约20平米数据缺失',
    coordinate_x: 116.400000,
    coordinate_y: 39.920000,
    zoom_level: 17,
    pan_offset_x: -100,
    pan_offset_y: -80,
    operator: '李四',
    operate_time: '2026-06-02T09:00:00',
    source_file: 'UAV-2026-002/DJI_0100.JPG'
  },
  {
    batch_no: 'UAV-2026-002',
    image_id: 'DJI_0101',
    anomaly_type: '拼接错位',
    anomaly_desc: '道路中线错位，影响导航精度',
    coordinate_x: 116.400200,
    coordinate_y: 39.920500,
    zoom_level: 18,
    pan_offset_x: 60,
    pan_offset_y: 40,
    operator: '赵六',
    operate_time: '2026-06-02T10:30:00',
    source_file: 'UAV-2026-002/DJI_0101.JPG'
  },
  {
    batch_no: 'UAV-2026-002',
    image_id: 'DJI_0102',
    anomaly_type: '色彩差异',
    anomaly_desc: '云影区域过渡不自然',
    coordinate_x: 116.400500,
    coordinate_y: 39.920800,
    zoom_level: 16,
    pan_offset_x: -50,
    pan_offset_y: 100,
    operator: '张三',
    operate_time: '2026-06-02T11:45:00',
    source_file: 'UAV-2026-002/DJI_0102.JPG'
  },
  {
    batch_no: 'UAV-2026-001',
    image_id: 'DJI_0002',
    anomaly_type: '拼接错位',
    anomaly_desc: '重复标注测试-同一位置',
    coordinate_x: 116.397200,
    coordinate_y: 39.916400,
    zoom_level: 16,
    pan_offset_x: -45,
    pan_offset_y: 120,
    operator: '测试员',
    operate_time: '2026-06-01T16:00:00',
    source_file: 'UAV-2026-001/DJI_0002.JPG'
  }
];

const duplicateForTest = {
  batch_no: 'UAV-2026-001',
  image_id: 'DJI_0001',
  anomaly_type: '拼接错位',
  anomaly_desc: '这是一条重复导入的测试数据',
  coordinate_x: 116.397128,
  coordinate_y: 39.916527,
  zoom_level: 18,
  pan_offset_x: 125,
  pan_offset_y: 89,
  operator: '测试员',
  operate_time: '2026-06-03T09:00:00',
  source_file: 'UAV-2026-001/DJI_0001.JPG'
};

async function initSampleData() {
  console.log('\n📦 开始初始化样例数据...\n');
  
  let successCount = 0;
  let duplicateCount = 0;
  
  for (let i = 0; i < sampleAnnotations.length; i++) {
    const record = sampleAnnotations[i];
    console.log(`  处理 [${i + 1}/${sampleAnnotations.length}]: ${record.batch_no} - ${record.image_id} - ${record.anomaly_type}`);
    
    const result = await services.importAnnotation(record, record.operator);
    if (result.success) {
      successCount++;
      console.log(`    ✅ 导入成功，ID: ${result.id}`);
    } else if (result.duplicate) {
      duplicateCount++;
      console.log(`    ⚠️  检测到重复，已跳过`);
    }
  }
  
  console.log('\n🔍 测试重复导入检测...');
  const dupResult = await services.importAnnotation(duplicateForTest, '测试员');
  if (dupResult.duplicate) {
    duplicateCount++;
    console.log(`    ✅ 重复检测正常: ${dupResult.message}`);
  }
  
  console.log('\n✍️  插入测试复核结果...');
  await services.submitReview({
    annotation_id: 1,
    review_result: 'pass',
    review_comment: '错位原因已确认，为航摄时相差异导致，在允许范围内',
    score: 85,
    zoom_verify_passed: true,
    pan_verify_passed: true
  }, '培训师A');
  
  await services.submitReview({
    annotation_id: 2,
    review_result: 'fail',
    review_comment: '色彩差异过大，影响判读，需重新拼接',
    score: 45,
    zoom_verify_passed: false,
    pan_verify_passed: true
  }, '培训师A');
  
  await services.submitReview({
    annotation_id: 3,
    review_result: 'pass',
    review_comment: '重影轻微，不影响整体使用',
    score: 78,
    zoom_verify_passed: true,
    pan_verify_passed: false
  }, '培训师B');
  
  console.log('    ✅ 复核结果已插入');
  
  console.log('\n📝 测试补录功能...');
  await services.supplementAnnotation(4, {
    anomaly_desc: '东南区域河道错位约3米，经核查为水位变化导致的视觉差异',
    zoom_level: 19,
    status: 'pending'
  }, '补录员');
  console.log('    ✅ 补录完成');
  
  console.log('\n🔗 测试追溯链路...');
  const trace = await services.getAnnotationWithTrace(1);
  console.log(`    ✅ 追溯链路完整，共 ${trace.traceability_chain.length} 个节点`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 样例数据初始化完成!');
  console.log('═'.repeat(60));
  console.log(`
  📊 导入统计:
    成功导入: ${successCount} 条
    重复跳过: ${duplicateCount} 条
    已有复核: 3 条
    补录测试: 1 条
    
  🎯 验收测试点:
    1. 重复导入测试: 查看 ID=1 的记录是否唯一
    2. 追溯链路测试: 从 ID=1 的结果回溯来源
    3. 导出一致性: 界面显示"通过"的记录导出也应为"通过"
    4. 补录不乱: ID=4 的补录记录不应产生重复
    
  📁 样例数据位置:
    - 数据库: data/uav_review.db
    - 测试重复数据: DJI_0001 拼接错位 (坐标: 116.397128, 39.916527)
    
  🚀 启动服务: npm start
  🌐 访问地址: http://localhost:3000
  `);
  
  process.exit(0);
}

setTimeout(initSampleData, 500);
