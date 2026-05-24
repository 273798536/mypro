import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Command } from 'commander';
import { initializeDatabase, getRepository } from '../config/database';
import {
  createSampleUsers,
  createDeclarations,
  createTrajectoryNodes,
  createTaxNotices,
  createSupervisorComments,
  badDataExamples
} from '../data/sampleData';
import {
  User,
  Declaration,
  TrajectoryNode,
  TaxNotice,
  SupervisorComment,
  BadDataRecord,
  BadDataType,
  BadDataStatus,
  ReconciliationResult
} from '../entities';
import { ReconciliationService } from '../services/reconciliation.service';
import { reportService } from '../services/report.service';
import { validationService } from '../services/validation.service';

dotenv.config();

const program = new Command();

program
  .name('clearance-playback')
  .description('跨境小包清关验收回放链路服务 - 命令行工具')
  .version('1.0.0');

program
  .command('db:init')
  .description('初始化数据库，创建所有表')
  .action(async () => {
    console.log('🔧 正在初始化数据库...');
    try {
      await initializeDatabase();
      console.log('✅ 数据库初始化成功！');
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('db:seed')
  .description('导入样例数据')
  .action(async () => {
    console.log('📥 正在导入样例数据...');
    try {
      await initializeDatabase();

      const users = await createSampleUsers();
      const userRepo = getRepository(User);
      await userRepo.save(users);
      console.log(`✅ 已创建 ${users.length} 个用户`);
      users.forEach(u => {
        console.log(`   - ${u.username} (${u.role}): ${u.name}`);
      });

      const declarations = createDeclarations(users);
      const declarationRepo = getRepository(Declaration);
      await declarationRepo.save(declarations);
      console.log(`✅ 已创建 ${declarations.length} 个申报单`);

      const trajectoryNodes = createTrajectoryNodes(declarations);
      const trajectoryRepo = getRepository(TrajectoryNode);
      await trajectoryRepo.save(trajectoryNodes);
      console.log(`✅ 已创建 ${trajectoryNodes.length} 个轨迹节点`);

      const taxNotices = createTaxNotices(declarations);
      const taxRepo = getRepository(TaxNotice);
      await taxRepo.save(taxNotices);
      console.log(`✅ 已创建 ${taxNotices.length} 个补税通知`);

      const comments = createSupervisorComments(declarations, users);
      const commentRepo = getRepository(SupervisorComment);
      await commentRepo.save(comments);
      console.log(`✅ 已创建 ${comments.length} 条主管批注`);

      console.log('\n📋 样例数据概览:');
      console.log('   1. DECL-2024-000002: 缺附件场景（有异常轨迹节点）');
      console.log('   2. DECL-2024-000001: 正常申报单（重复提交测试用）');
      console.log('   3. DECL-2024-000004: 包裹拆分+人工改判场景');
      console.log('   4. DECL-2024-000003: 待审核状态');
      console.log('   5. DECL-2024-000005: 高价值物品审批');
      
    } catch (error) {
      console.error('❌ 导入样例数据失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('db:bad-data')
  .description('触发坏数据场景，生成测试用坏数据记录')
  .action(async () => {
    console.log('⚠️  正在触发坏数据场景...');
    try {
      await initializeDatabase();

      const validation1 = await validationService.validateDeclaration(badDataExamples.missingRequired);
      console.log(`📝 场景1: 缺少必填字段 -> ${validation1.isValid ? '通过' : '失败'}`);
      if (validation1.badDataId) {
        console.log(`   坏数据ID: ${validation1.badDataId}`);
      }

      const declarationRepo = getRepository(Declaration);
      const existing = await declarationRepo.findOne({ where: { declarationNo: 'DECL-2024-000001' } });
      if (existing) {
        const validation2 = await validationService.validateDeclaration(badDataExamples.duplicate);
        console.log(`📝 场景2: 重复提交 -> ${validation2.isValid ? '通过' : '失败'}`);
        if (validation2.badDataId) {
          console.log(`   坏数据ID: ${validation2.badDataId}`);
        }
      }

      const validation3 = await validationService.validateDeclaration(badDataExamples.invalidFormat);
      console.log(`📝 场景3: 格式错误(HS编码) -> ${validation3.isValid ? '通过' : '失败'}`);
      if (validation3.badDataId) {
        console.log(`   坏数据ID: ${validation3.badDataId}`);
      }

      const badDataRepo = getRepository(BadDataRecord);
      const count = await badDataRepo.count({ where: { status: BadDataStatus.OPEN } });
      console.log(`\n📊 当前坏数据记录数(待处理): ${count}`);

    } catch (error) {
      console.error('❌ 触发坏数据场景失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('reconcile')
  .description('运行对账流程')
  .option('-d, --declaration <id>', '指定申报单ID')
  .option('-p, --package <no>', '指定包裹号')
  .action(async (options) => {
    console.log('🔄 正在运行对账流程...');
    try {
      await initializeDatabase();

      const service = new ReconciliationService();
      const stats = await service.runReconciliation({
        declarationIds: options.declaration ? [options.declaration] : undefined,
        packageNos: options.package ? [options.package] : undefined
      });

      console.log(`\n📊 对账统计 (批次号: ${service['batchNo']}):`);
      console.log(`   总数: ${stats.total}`);
      console.log(`   ✅ 对账一致: ${stats.matched}`);
      console.log(`   ❌ 对账不一致: ${stats.mismatched}`);
      console.log(`   ⚠️  部分匹配: ${stats.partialMatch}`);
      console.log(`   📋 待复核: ${stats.pendingReview}`);

      const resultRepo = getRepository(ReconciliationResult);
      const results = await resultRepo.find({
        where: { batchNo: service['batchNo'] }
      });

      console.log(`\n📋 对账详情:`);
      results.forEach(r => {
        console.log(`   - ${r.packageNo}: ${r.status}${r.mismatchTypes?.length ? ` (${r.mismatchTypes.join(', ')})` : ''}`);
      });

    } catch (error) {
      console.error('❌ 对账流程失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('report:generate')
  .description('生成对账报告')
  .option('-b, --batch <no>', '指定批次号')
  .action(async (options) => {
    console.log('📊 正在生成对账报告...');
    try {
      await initializeDatabase();

      const report = await reportService.generateReport({
        batchNo: options.batch
      });

      console.log(`✅ 报告生成成功!`);
      console.log(`   批次号: ${report.batchNo}`);
      console.log(`   生成时间: ${report.generatedAt}`);
      console.log(`\n📈 汇总统计:`);
      console.log(`   申报单总数: ${report.totalDeclarations}`);
      console.log(`   对账一致: ${report.matched}`);
      console.log(`   对账不一致: ${report.mismatched}`);
      console.log(`   部分匹配: ${report.partialMatch}`);
      console.log(`   待复核: ${report.pendingReview}`);
      console.log(`   预期税费总额: ¥${report.totalTaxExpected.toFixed(2)}`);
      console.log(`   实际税费总额: ¥${report.totalTaxActual.toFixed(2)}`);
      console.log(`   税费差额: ¥${report.taxDifference.toFixed(2)}`);
      console.log(`\n📁 生成的文件:`);
      console.log(`   汇总报告: ${report.files.summary}`);
      console.log(`   明细报告: ${report.files.details}`);
      console.log(`   坏数据报告: ${report.files.badData}`);

    } catch (error) {
      console.error('❌ 生成报告失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('playback <declarationId>')
  .description('查看指定申报单的回放链路')
  .action(async (declarationId) => {
    console.log(`🎬 正在获取申报单 ${declarationId} 的回放链路...`);
    try {
      await initializeDatabase();

      const service = new ReconciliationService();
      const chain = await service.getPlaybackChain(declarationId);

      if (!chain) {
        console.log('❌ 未找到该申报单的回放链路');
        process.exit(1);
      }

      console.log('\n📋 回放链路详情:');
      console.log(`\n📄 申报单信息:`);
      console.log(`   申报单号: ${chain.declaration.declarationNo}`);
      console.log(`   包裹号: ${chain.declaration.packageNo}`);
      console.log(`   状态: ${chain.declaration.status}`);
      console.log(`   申报价值: ${chain.declaration.declaredValue} ${chain.declaration.currency}`);

      console.log(`\n📍 轨迹节点 (${chain.trajectoryNodes.length}个):`);
      chain.trajectoryNodes.forEach((node: any, i: number) => {
        const statusIcon = node.isAbnormal ? '⚠️ ' : '✅';
        console.log(`   ${i + 1}. ${statusIcon} ${node.nodeName} - ${node.occurredAt}`);
        if (node.isAbnormal) {
          console.log(`      异常原因: ${node.abnormalReason}`);
        }
      });

      console.log(`\n💵 补税通知 (${chain.taxNotices.length}个):`);
      chain.taxNotices.forEach((tax: any, i: number) => {
        console.log(`   ${i + 1}. ${tax.noticeNo} - ¥${tax.taxAmount} (${tax.status})`);
      });

      console.log(`\n📝 主管批注 (${chain.supervisorComments.length}条):`);
      chain.supervisorComments.forEach((comment: any, i: number) => {
        const overrideIcon = comment.isManualOverride ? '🔧 ' : '';
        console.log(`   ${i + 1}. ${overrideIcon}${comment.supervisorName} - ${comment.decision}`);
        console.log(`      ${comment.comment}`);
        if (comment.isManualOverride) {
          console.log(`      改判原因: ${comment.overrideReason}`);
        }
      });

    } catch (error) {
      console.error('❌ 获取回放链路失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program
  .command('test:flow')
  .description('运行完整测试流程: 初始化 -> 导入样例 -> 触发坏数据 -> 对账 -> 生成报告')
  .action(async () => {
    console.log('🧪 正在运行完整测试流程...\n');

    try {
      await initializeDatabase();
      console.log('✅ 1/6 数据库初始化完成');

      const users = await createSampleUsers();
      const userRepo = getRepository(User);
      await userRepo.save(users);
      console.log('✅ 2/6 样例用户创建完成');

      const declarations = createDeclarations(users);
      const declarationRepo = getRepository(Declaration);
      await declarationRepo.save(declarations);

      const trajectoryNodes = createTrajectoryNodes(declarations);
      const trajectoryRepo = getRepository(TrajectoryNode);
      await trajectoryRepo.save(trajectoryNodes);

      const taxNotices = createTaxNotices(declarations);
      const taxRepo = getRepository(TaxNotice);
      await taxRepo.save(taxNotices);

      const comments = createSupervisorComments(declarations, users);
      const commentRepo = getRepository(SupervisorComment);
      await commentRepo.save(comments);
      console.log('✅ 3/6 业务样例数据导入完成');

      await validationService.validateDeclaration(badDataExamples.missingRequired);
      await validationService.validateDeclaration(badDataExamples.duplicate);
      await validationService.validateDeclaration(badDataExamples.invalidFormat);
      console.log('✅ 4/6 坏数据场景触发完成');

      const reconciliationService = new ReconciliationService();
      const stats = await reconciliationService.runReconciliation();
      console.log(`✅ 5/6 对账流程完成 (${stats.matched}匹配/${stats.mismatched}不匹配/${stats.partialMatch}部分匹配)`);

      const report = await reportService.generateReport();
      console.log('✅ 6/6 报告生成完成');

      console.log('\n🎉 完整测试流程执行成功!');
      console.log('\n🔑 测试账号:');
      console.log('   data_entry / data_entry_123 (录入员)');
      console.log('   reviewer / reviewer_123 (复核员)');
      console.log('   supervisor / supervisor_123 (主管)');
      console.log('   readonly / readonly_123 (只读)');
      console.log('\n📁 生成的报告文件:');
      console.log(`   ${report.files.summary}`);
      console.log(`   ${report.files.details}`);
      console.log(`   ${report.files.badData}`);

    } catch (error) {
      console.error('❌ 测试流程失败:', error);
      process.exit(1);
    }
    process.exit(0);
  });

program.parseAsync(process.argv);
