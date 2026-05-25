"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TicketDao_1 = __importDefault(require("../daos/TicketDao"));
const TicketStateMachine_1 = __importDefault(require("../state-machine/TicketStateMachine"));
const BatchService_1 = __importDefault(require("../services/BatchService"));
const types_1 = require("../types");
async function generateSampleData() {
    const dao = new TicketDao_1.default();
    const stateMachine = new TicketStateMachine_1.default(dao);
    const batchService = new BatchService_1.default(dao, stateMachine);
    console.log('开始生成示例数据...');
    const slaRules = await dao.getSLARules();
    if (slaRules.length === 0) {
        console.log('请先运行 init-data.ts 初始化基础数据');
        return;
    }
    const highPrioSLA = slaRules.find(r => r.priority === 'high') || slaRules[0];
    console.log('创建示例批次...');
    const batch1 = await batchService.createBatch('2024年5月第一周客服工单', 'admin_001');
    const batch2 = await batchService.createBatch('2024年5月第二周客服工单', 'admin_001');
    console.log('向批次添加工单...');
    const tickets1 = await batchService.addTicketsToBatch(batch1.id, [
        {
            sessionSummary: {
                customerId: 'CUST001',
                issueType: 'delivery_delay',
                severity: 'high',
                description: '商品配送延迟超过3天，客户投诉',
                initialContactTime: new Date(Date.now() - 86400000 * 5),
                expectedResolutionTime: new Date(Date.now() + 86400000),
                agentId: 'AGENT001'
            },
            slaRuleId: highPrioSLA.id,
            createdBy: 'system'
        },
        {
            sessionSummary: {
                customerId: 'CUST002',
                issueType: 'product_damage',
                severity: 'high',
                description: '收到商品发现外包装破损，内部商品损坏',
                initialContactTime: new Date(Date.now() - 86400000 * 3),
                expectedResolutionTime: new Date(Date.now() + 86400000 * 2),
                agentId: 'AGENT002'
            },
            slaRuleId: highPrioSLA.id,
            createdBy: 'system'
        },
        {
            sessionSummary: {
                customerId: 'CUST003',
                issueType: 'service_attitude',
                severity: 'medium',
                description: '客服态度不好，客户要求道歉',
                initialContactTime: new Date(Date.now() - 86400000 * 2),
                expectedResolutionTime: new Date(Date.now() + 86400000 * 1),
                agentId: 'AGENT001'
            },
            slaRuleId: highPrioSLA.id,
            createdBy: 'system'
        }
    ], 'admin_001');
    const tickets2 = await batchService.addTicketsToBatch(batch2.id, [
        {
            sessionSummary: {
                customerId: 'CUST004',
                issueType: 'refund_issue',
                severity: 'high',
                description: '退款申请提交超过7天未处理',
                initialContactTime: new Date(Date.now() - 86400000 * 10),
                expectedResolutionTime: new Date(Date.now() - 86400000 * 3),
                agentId: 'AGENT003'
            },
            slaRuleId: highPrioSLA.id,
            createdBy: 'system'
        },
        {
            sessionSummary: {
                customerId: 'CUST005',
                issueType: 'delivery_delay',
                severity: 'low',
                description: '配送延迟1天，客户表示可以接受但需要补偿',
                initialContactTime: new Date(Date.now() - 86400000 * 1),
                expectedResolutionTime: new Date(Date.now() + 86400000 * 3),
                agentId: 'AGENT002'
            },
            slaRuleId: highPrioSLA.id,
            createdBy: 'system'
        }
    ], 'admin_001');
    console.log('模拟工单转派流程...');
    if (tickets1.length > 0) {
        await stateMachine.reassignTicket(tickets1[0].id, 'AGENT_SUPERVISOR', types_1.AssignmentType.ESCALATION, '问题复杂，需要主管介入', 'admin_001', highPrioSLA);
    }
    console.log('模拟补偿申请...');
    if (tickets1.length > 1) {
        await stateMachine.transition(tickets1[1].id, types_1.TicketStatus.PROCESSING, '开始处理工单', 'AGENT002');
        await stateMachine.requestCompensation(tickets1[1].id, 200, '商品损坏，客户要求赔偿', 'AGENT002');
        const approvals = await dao.getCompensationApprovalsByTicketId(tickets1[1].id);
        if (approvals.length > 0) {
            await stateMachine.reviewCompensation(tickets1[1].id, approvals[0].id, true, 150, '经核实确属我方责任，给予150元补偿', 'MANAGER001');
        }
    }
    console.log('模拟冻结工单...');
    if (tickets1.length > 2) {
        await stateMachine.freezeTicket(tickets1[2].id, types_1.FrozenType.REVIEW, '涉及服务态度问题，需要复核', 'QUALITY_TEAM');
    }
    console.log('模拟结算工单...');
    if (tickets1.length > 1) {
        await stateMachine.settleTicket(tickets1[1].id, '补偿已发放，客户满意', 'AGENT002');
    }
    console.log('提交第一个批次...');
    await batchService.submitBatch(batch1.id, 'admin_001');
    console.log('模拟盘点差异...');
    if (tickets1.length > 0) {
        await batchService.createInventoryDifference({
            ticketId: tickets1[0].id,
            productId: 'PROD001',
            expectedQuantity: 10,
            actualQuantity: 8,
            difference: -2,
            reason: '配送途中丢失'
        }, 'WAREHOUSE001');
        await batchService.createInventoryDifference({
            ticketId: tickets1[1].id,
            productId: 'PROD002',
            expectedQuantity: 5,
            actualQuantity: 5,
            difference: 0,
            reason: '盘点正常'
        }, 'WAREHOUSE001');
        await batchService.createInventoryDifference({
            ticketId: tickets2[0].id,
            productId: 'PROD003',
            expectedQuantity: 20,
            actualQuantity: 22,
            difference: 2,
            reason: '入库时多录入'
        }, 'WAREHOUSE001');
        await batchService.createInventoryDifference({
            ticketId: tickets1[0].id,
            productId: 'PROD004',
            expectedQuantity: 3,
            actualQuantity: 1,
            difference: -2
        }, 'WAREHOUSE001');
    }
    console.log('示例数据生成完成！');
    console.log(`批次1 ID: ${batch1.id}，包含 ${tickets1.length} 个工单`);
    console.log(`批次2 ID: ${batch2.id}，包含 ${tickets2.length} 个工单`);
    console.log('');
    console.log('可用的 API 端点:');
    console.log('  GET  /api/batches - 查看所有批次');
    console.log(`  GET  /api/batches/${batch1.id} - 查看批次1详情`);
    console.log(`  GET  /api/batches/${batch1.id}/stats - 查看批次1统计`);
    console.log('  GET  /api/inventory-differences - 查看盘点差异列表');
    console.log(`  GET  /api/tickets/${tickets1[0].id}/responsibility - 查看工单责任计算`);
    console.log('  GET  /api/operations/frozen-tickets - 查看冻结工单对比');
    console.log('  GET  /api/operations/summary-report - 查看汇总报表');
    console.log('  POST /api/exports/inventory-differences - 导出盘点差异');
}
generateSampleData().catch(console.error);
//# sourceMappingURL=generate-sample-data.js.map