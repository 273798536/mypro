"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_1 = require("../config/database");
const BorrowApplicationService_1 = require("../services/BorrowApplicationService");
const QueueService_1 = require("../services/QueueService");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const SupervisorComment_1 = require("../entities/SupervisorComment");
async function main() {
    try {
        await (0, database_1.initializeDatabase)();
        console.log('数据库连接成功\n');
        const operatorId = 'demo-operator-001';
        const operatorName = '演示操作员';
        const supervisorId = 'demo-supervisor-001';
        const supervisorName = '李主管';
        console.log('=== 创建示例借阅申请 ===\n');
        const applications = [
            {
                applicationNo: 'ILL-2024-00001',
                readerId: 'R2024001',
                readerName: '张三',
                bookTitle: '人工智能导论',
                isbn: '978-7-111-12345-6',
                sourceLibrary: '北京大学图书馆',
                targetLibrary: '清华大学图书馆',
                borrowType: BorrowApplication_1.BorrowType.INTER_LIBRARY
            },
            {
                applicationNo: 'ILL-2024-00002',
                readerId: 'R2024002',
                readerName: '李四',
                bookTitle: '机器学习实战',
                isbn: '978-7-111-23456-7',
                sourceLibrary: '复旦大学图书馆',
                targetLibrary: '上海交通大学图书馆',
                borrowType: BorrowApplication_1.BorrowType.INTER_LIBRARY
            },
            {
                applicationNo: 'ILL-2024-00003',
                readerId: 'R2024003',
                readerName: '王五',
                bookTitle: '数据结构与算法',
                isbn: '978-7-111-34567-8',
                sourceLibrary: '浙江大学图书馆',
                targetLibrary: '南京大学图书馆',
                borrowType: BorrowApplication_1.BorrowType.DOCUMENT_DELIVERY
            }
        ];
        for (const app of applications) {
            const result = await BorrowApplicationService_1.BorrowApplicationService.submitApplication(app, { strategy: 'ignore' }, operatorId, operatorName);
            console.log(`申请 ${app.applicationNo}: ${result.action}`);
            console.log(`  ID: ${result.application.id}`);
            console.log(`  状态: ${result.application.status}`);
            console.log(`  版本: ${result.application.version}`);
            console.log('');
        }
        console.log('=== 测试重复提交处理 ===\n');
        const duplicateResult = await BorrowApplicationService_1.BorrowApplicationService.submitApplication(applications[0], { strategy: 'append' }, operatorId, operatorName);
        console.log(`重复提交 ILL-2024-00001: ${duplicateResult.action}`);
        console.log(`新版本: ${duplicateResult.application.version}`);
        console.log('');
        console.log('=== 测试撤回后重新提交 ===\n');
        const app2 = await BorrowApplicationService_1.BorrowApplicationService.submitApplication(applications[1], { strategy: 'ignore' }, operatorId, operatorName);
        const withdrawn = await BorrowApplicationService_1.BorrowApplicationService.withdrawApplication(app2.application.id, '读者申请撤回', supervisorId, supervisorName);
        console.log(`撤回申请 ${withdrawn.applicationNo}: ${withdrawn.status}`);
        const resubmitted = await BorrowApplicationService_1.BorrowApplicationService.resubmitAfterWithdraw(app2.application.id, operatorId, operatorName);
        console.log(`重新提交: ${resubmitted.status}`);
        console.log(`新版本: ${resubmitted.version}`);
        console.log('');
        console.log('=== 添加主管批注 ===\n');
        const comment = await BorrowApplicationService_1.BorrowApplicationService.addSupervisorComment(app2.application.id, SupervisorComment_1.CommentType.FEE_ADJUSTMENT, '因首次逾期，减免一半逾期费用', supervisorId, supervisorName, true, { type: 'overdue', adjustment: -10 });
        console.log(`添加批注: ${comment.commentType}`);
        console.log(`内容: ${comment.content}`);
        console.log('');
        console.log('=== 获取申请完整详情 ===\n');
        const details = await BorrowApplicationService_1.BorrowApplicationService.getApplicationWithDetails(app2.application.id);
        console.log(`申请编号: ${details.application.applicationNo}`);
        console.log(`读者: ${details.application.readerName}`);
        console.log(`费用明细: ${details.feeCalculation.breakdown.length} 项`);
        console.log(`操作历史: ${details.history.length} 条`);
        console.log(`总费用: ${details.feeCalculation.totalFee} 元`);
        console.log('');
        console.log('=== 队列统计 ===\n');
        const stats = await QueueService_1.QueueService.getTaskStats();
        console.log(`队列状态:`);
        console.log(`  待处理: ${stats.queue.pending}`);
        console.log(`  处理中: ${stats.queue.processing}`);
        console.log(`  成功: ${stats.queue.success}`);
        console.log(`  失败: ${stats.queue.failed}`);
        console.log(`  人工处理: ${stats.queue.manual}`);
        console.log(`  已冻结: ${stats.queue.frozen}`);
        console.log(`死信队列: ${stats.deadLetter.total} 条`);
        console.log('');
        console.log('=== 示例数据创建完成 ===');
        console.log('\n接下来可以运行:');
        console.log('  npm run dev - 启动开发服务器');
        console.log('  npm run check - 运行自动化检查');
        console.log('\n测试 API 时请在请求头中添加:');
        console.log('  X-User-ID: demo-operator-001');
        console.log('  X-User-Name: 演示操作员');
        console.log('  X-User-Role: supervisor');
    }
    catch (error) {
        console.error('创建示例数据失败:', error);
        process.exit(1);
    }
}
main();
