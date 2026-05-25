"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TicketDao_1 = __importDefault(require("../daos/TicketDao"));
async function initData() {
    const dao = new TicketDao_1.default();
    console.log('开始初始化数据...');
    const existingSLARules = await dao.getSLARules();
    if (existingSLARules.length === 0) {
        console.log('创建默认 SLA 规则...');
        await dao.createSLARule({
            ticketType: 'complaint',
            priority: 'high',
            firstResponseTime: 15,
            resolutionTime: 240,
            escalationThreshold: 2,
            createdAt: new Date()
        });
        await dao.createSLARule({
            ticketType: 'complaint',
            priority: 'medium',
            firstResponseTime: 30,
            resolutionTime: 480,
            escalationThreshold: 3,
            createdAt: new Date()
        });
        await dao.createSLARule({
            ticketType: 'complaint',
            priority: 'low',
            firstResponseTime: 60,
            resolutionTime: 1440,
            escalationThreshold: 5,
            createdAt: new Date()
        });
        console.log('SLA 规则创建完成');
    }
    else {
        console.log('SLA 规则已存在，跳过创建');
    }
    const existingCompRules = await dao.getCompensationRules();
    if (existingCompRules.length === 0) {
        console.log('创建默认补偿规则...');
        await dao.createCompensationRule({
            issueType: 'delivery_delay',
            baseAmount: 50,
            maxAmount: 500,
            multiplier: 1.5,
            createdAt: new Date()
        });
        await dao.createCompensationRule({
            issueType: 'product_damage',
            baseAmount: 100,
            maxAmount: 1000,
            multiplier: 2.0,
            createdAt: new Date()
        });
        await dao.createCompensationRule({
            issueType: 'service_attitude',
            baseAmount: 30,
            maxAmount: 300,
            multiplier: 1.2,
            createdAt: new Date()
        });
        await dao.createCompensationRule({
            issueType: 'refund_issue',
            baseAmount: 80,
            maxAmount: 800,
            multiplier: 1.8,
            createdAt: new Date()
        });
        console.log('补偿规则创建完成');
    }
    else {
        console.log('补偿规则已存在，跳过创建');
    }
    console.log('数据初始化完成！');
}
initData().catch(console.error);
//# sourceMappingURL=init-data.js.map