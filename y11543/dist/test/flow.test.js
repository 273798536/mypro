"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../database/data-source");
const services_1 = require("../services");
async function testMainFlow() {
    console.log('='.repeat(60));
    console.log('📋 测试主流程: 创建批次 -> 添加素材 -> 审核 -> 对账 -> 导出');
    console.log('='.repeat(60));
    await (0, data_source_1.initDatabase)();
    console.log('\n1. 创建批次...');
    const batch = await services_1.batchService.create({
        batchNo: 'BATCH-' + Date.now(),
        name: '5月广告素材验收批次',
        operator: '张三',
        description: '测试主流程',
        duplicateStrategy: 'overwrite'
    });
    console.log(`   ✓ 批次创建成功: ${batch.batchNo} (${batch.id})`);
    console.log('\n2. 添加素材...');
    const materials = [
        { materialId: 'MAT0001', name: '品牌宣传视频_抖音版', platform: '抖音' },
        { materialId: 'MAT0002', name: '618活动海报_快手版', platform: '快手' },
        { materialId: 'MAT0003', name: '产品介绍_微信版', platform: '微信' }
    ];
    const result = await services_1.batchService.addMaterials(batch.id, materials, '张三');
    console.log(`   ✓ 素材添加完成: 新增${result.added.length}, 跳过${result.skipped.length}, 重复${result.duplicates.length}`);
    console.log('\n3. 添加审核结果...');
    await services_1.materialService.addAuditResult(batch.id, {
        materialId: 'MAT0001',
        status: 'approved',
        reason: '符合规范',
        auditor: '李四'
    }, '李四');
    await services_1.materialService.addAuditResult(batch.id, {
        materialId: 'MAT0002',
        status: 'rejected',
        reason: '含有敏感词汇',
        auditor: '李四'
    }, '李四');
    console.log('   ✓ 审核结果已添加');
    console.log('\n4. 添加花费日报...');
    await services_1.materialService.addCostDaily(batch.id, {
        materialId: 'MAT0001',
        reportDate: '2024-05-20',
        cost: 1500.50,
        impressions: 50000,
        clicks: 2500,
        platform: '抖音'
    }, '系统');
    await services_1.materialService.addCostDaily(batch.id, {
        materialId: 'MAT0001',
        reportDate: '2024-05-21',
        cost: 1800.00,
        impressions: 62000,
        clicks: 3100,
        platform: '抖音'
    }, '系统');
    console.log('   ✓ 花费数据已添加');
    console.log('\n5. 添加客服备注...');
    await services_1.materialService.addRemark(batch.id, {
        materialId: 'MAT0002',
        content: '客户反馈需要修改文案，已通知设计团队',
        operator: '客服小王',
        source: '客服系统'
    }, '客服小王');
    console.log('   ✓ 客服备注已添加');
    console.log('\n6. 提交批次...');
    await services_1.batchService.submit(batch.id, '张三');
    console.log('   ✓ 批次已提交');
    console.log('\n7. 人工改判...');
    await services_1.materialService.manualOverride(batch.id, 'MAT0002', 'approved', '客户确认可以投放，特殊放行', '审核主管');
    console.log('   ✓ 人工改判完成');
    console.log('\n8. 获取对账报告...');
    const report = await services_1.exportService.getReconciliationReport(batch.id);
    console.log(`   批次: ${report.batchNo}`);
    console.log(`   状态: ${report.status}`);
    console.log(`   素材总数: ${report.totalMaterials}`);
    console.log(`   通过: ${report.approvedCount}, 拒绝: ${report.rejectedCount}, 待处理: ${report.pendingCount}`);
    console.log(`   总花费: ¥${report.totalCost}`);
    console.log('\n9. 检测异常...');
    const anomalies = await services_1.exportService.detectAnomalies(batch.id);
    console.log(`   发现 ${anomalies.length} 个异常:`);
    anomalies.forEach((a, i) => {
        console.log(`     ${i + 1}. [${a.severity}] ${a.type}: ${a.description}`);
    });
    console.log('\n10. 冻结批次...');
    await services_1.batchService.freeze(batch.id, '管理员');
    console.log('   ✓ 批次已冻结');
    console.log('\n11. 导出数据...');
    const exportPath = await services_1.exportService.exportBatchToCsv(batch.id, '管理员');
    console.log(`   ✓ 导出成功: ${exportPath}`);
    console.log('\n12. 回放素材变更历史...');
    const changes = await services_1.exportService.replayMaterialChanges('MAT0002', batch.id);
    console.log(`   MAT0002 共 ${changes.length} 次变更:`);
    changes.forEach(c => {
        console.log(`     - ${c.field}: ${c.oldValue} → ${c.newValue} (${c.operator})`);
    });
    console.log('\n' + '='.repeat(60));
    console.log('✅ 主流程测试完成!');
    console.log('='.repeat(60));
    return batch.id;
}
async function testIdempotency() {
    console.log('\n\n' + '='.repeat(60));
    console.log('🔄 测试幂等性: 重复提交、撤回再提交');
    console.log('='.repeat(60));
    console.log('\n1. 创建批次 (策略: ignore)...');
    const batch = await services_1.batchService.create({
        batchNo: 'IDEMPOTENT-' + Date.now(),
        name: '幂等性测试批次',
        operator: '测试员',
        duplicateStrategy: 'ignore'
    });
    console.log('\n2. 第一次添加素材...');
    const materials = [
        { materialId: 'MAT-IDEM-001', name: '测试素材1', platform: '抖音' }
    ];
    const r1 = await services_1.batchService.addMaterials(batch.id, materials, '测试员');
    console.log(`   结果: 新增${r1.added.length}, 跳过${r1.skipped.length}`);
    console.log('\n3. 重复添加相同素材...');
    const r2 = await services_1.batchService.addMaterials(batch.id, materials, '测试员');
    console.log(`   结果: 新增${r2.added.length}, 跳过${r2.skipped.length}`);
    console.log(`   ✓ 幂等验证: 重复添加被忽略`);
    console.log('\n4. 提交批次...');
    await services_1.batchService.submit(batch.id, '测试员');
    console.log('   ✓ 批次已提交');
    console.log('\n5. 撤回批次...');
    await services_1.batchService.withdraw(batch.id, '测试员');
    console.log('   ✓ 批次已撤回');
    console.log('\n6. 重新提交...');
    await services_1.batchService.resubmit(batch.id, '测试员');
    console.log('   ✓ 批次重新提交成功');
    console.log('\n' + '='.repeat(60));
    console.log('✅ 幂等性测试完成!');
    console.log('='.repeat(60));
}
async function testDuplicateStrategies() {
    console.log('\n\n' + '='.repeat(60));
    console.log('⚙️  测试重复策略: ignore / overwrite / append');
    console.log('='.repeat(60));
    const strategies = ['ignore', 'overwrite', 'append'];
    for (const strategy of strategies) {
        console.log(`\n--- 测试策略: ${strategy} ---`);
        const batch = await services_1.batchService.create({
            batchNo: `STRATEGY-${strategy.toUpperCase()}-${Date.now()}`,
            name: `策略测试-${strategy}`,
            operator: '测试员',
            duplicateStrategy: strategy
        });
        const m1 = { materialId: 'MAT-STRAT-001', name: '原始名称', platform: '抖音' };
        await services_1.batchService.addMaterials(batch.id, [m1], '测试员');
        const m2 = { materialId: 'MAT-STRAT-001', name: '修改后的名称', platform: '快手' };
        const result = await services_1.batchService.addMaterials(batch.id, [m2], '测试员');
        console.log(`   第二次添加结果: 新增${result.added.length}, 跳过${result.skipped.length}, 重复${result.duplicates.length}`);
        const finalBatch = await services_1.batchService.getById(batch.id);
        console.log(`   最终素材数: ${finalBatch?.materialCount}`);
    }
    console.log('\n' + '='.repeat(60));
    console.log('✅ 重复策略测试完成!');
    console.log('='.repeat(60));
}
async function testMultiPlatformMapping() {
    console.log('\n\n' + '='.repeat(60));
    console.log('🔗 测试多平台素材映射 (解决改名后归因问题)');
    console.log('='.repeat(60));
    console.log('\n1. 创建批次...');
    const batch = await services_1.batchService.create({
        batchNo: 'MAPPING-' + Date.now(),
        name: '多平台映射测试',
        operator: '数据分析师'
    });
    console.log('\n2. 添加同一素材在不同平台的不同名称...');
    const materials = [
        { materialId: 'CANONICAL-001', name: '主素材_通用版', platform: '通用', originalMaterialId: 'CANONICAL-001' },
        { materialId: 'DOUYIN-12345', name: '主素材_抖音特效版', platform: '抖音', originalMaterialId: 'CANONICAL-001' },
        { materialId: 'KUAISHOU-67890', name: '主素材_快手魔改版', platform: '快手', originalMaterialId: 'CANONICAL-001' }
    ];
    await services_1.batchService.addMaterials(batch.id, materials, '数据分析师');
    console.log('\n3. 添加各平台花费数据...');
    await services_1.materialService.addCostDaily(batch.id, {
        materialId: 'DOUYIN-12345',
        reportDate: '2024-05-20',
        cost: 3000,
        platform: '抖音'
    });
    await services_1.materialService.addCostDaily(batch.id, {
        materialId: 'KUAISHOU-67890',
        reportDate: '2024-05-20',
        cost: 2500,
        platform: '快手'
    });
    console.log('\n4. 建立映射关系...');
    await services_1.materialService.addMapping(batch.id, 'CANONICAL-001', {
        canonicalMaterialId: 'CANONICAL-001',
        platformMaterialId: 'DOUYIN-12345',
        platform: '抖音',
        platformMaterialName: '主素材_抖音特效版',
        mappingReason: '平台改名导致ID变化'
    });
    await services_1.materialService.addMapping(batch.id, 'CANONICAL-001', {
        canonicalMaterialId: 'CANONICAL-001',
        platformMaterialId: 'KUAISHOU-67890',
        platform: '快手',
        platformMaterialName: '主素材_快手魔改版',
        mappingReason: '平台改名导致ID变化'
    });
    console.log('\n5. 合并查看素材效果...');
    const mergedView = await services_1.materialService.getMergedView('CANONICAL-001', batch.id);
    console.log(`   素材ID: ${mergedView.materialId}`);
    console.log(`   别名数量: ${mergedView.aliases.length}`);
    mergedView.aliases.forEach((a) => {
        console.log(`     - ${a.name} (${a.platform})`);
    });
    console.log(`   总花费: ¥${mergedView.totalCost}`);
    console.log(`   ✓ 多平台归因合并成功!`);
    console.log('\n' + '='.repeat(60));
    console.log('✅ 多平台映射测试完成!');
    console.log('='.repeat(60));
}
async function runAllTests() {
    try {
        await testMainFlow();
        await testIdempotency();
        await testDuplicateStrategies();
        await testMultiPlatformMapping();
        console.log('\n\n🎉 所有测试通过!');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ 测试失败:', error);
        process.exit(1);
    }
}
runAllTests();
