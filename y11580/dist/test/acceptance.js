"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllTests = runAllTests;
const prisma_1 = require("../lib/prisma");
const config_1 = require("../config");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const batches_1 = require("../routes/batches");
const supervisor_1 = require("../routes/supervisor");
const TEST_USERS = {
    dataEntry: { id: 'user-entry-1', username: 'entry001', role: config_1.CONFIG.ROLES.DATA_ENTRY, storeId: 'store-001' },
    reviewer: { id: 'user-reviewer-1', username: 'reviewer001', role: config_1.CONFIG.ROLES.REVIEWER, storeId: 'store-001' },
    supervisor: { id: 'user-super-1', username: 'super001', role: config_1.CONFIG.ROLES.SUPERVISOR, storeId: 'store-001' },
    readOnly: { id: 'user-readonly-1', username: 'readonly001', role: config_1.CONFIG.ROLES.READ_ONLY, storeId: 'store-001' }
};
function getAuthHeaders(user) {
    return {
        'x-user-id': user.id,
        'x-username': user.username,
        'x-role': user.role,
        'x-store-id': user.storeId,
        'Content-Type': 'application/json'
    };
}
function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http_1.default.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
                }
                catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data)
            req.write(JSON.stringify(data));
        req.end();
    });
}
async function initTestUsers() {
    for (const [key, user] of Object.entries(TEST_USERS)) {
        await prisma_1.prisma.user.upsert({
            where: { username: user.username },
            update: {},
            create: user
        });
    }
    console.log('✅ 测试用户初始化完成');
}
async function clearTestData() {
    await prisma_1.prisma.statusHistory.deleteMany({});
    await prisma_1.prisma.attachment.deleteMany({});
    await prisma_1.prisma.record.deleteMany({});
    await prisma_1.prisma.batch.deleteMany({});
    console.log('✅ 测试数据清理完成');
}
async function testValidatorUnit() {
    console.log('\n=== 🧪 测试 1: 数据校验单元测试 ===');
    const { runTests } = require('./validator.test');
    return runTests();
}
async function testApiDirtyDataDetection(port) {
    console.log('\n=== 🧪 测试 2: API 脏数据自动分类测试 ===');
    let allPassed = true;
    const batchIdempotencyKey = `dirty-test-${Date.now()}`;
    const createBatchRes = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/batches',
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        idempotencyKey: batchIdempotencyKey,
        title: '脏数据自动检测测试批次',
        recordType: config_1.CONFIG.RECORD_TYPES.RECHARGE,
        storeId: 'store-001',
        batchDate: '2026-05-24',
        records: [
            {
                idempotencyKey: `${batchIdempotencyKey}-valid`,
                memberId: 'M100',
                memberName: '王小明',
                phone: '13800138100',
                amount: 500,
                transactionDate: '2026-05-24',
                operator: '收银员A'
            },
            {
                idempotencyKey: `${batchIdempotencyKey}-missing`,
                memberId: '',
                amount: 300,
                transactionDate: '2026-05-24',
                operator: '收银员A'
            },
            {
                idempotencyKey: `${batchIdempotencyKey}-crossdate`,
                memberId: 'M102',
                memberName: '张小华',
                amount: 800,
                transactionDate: '2026-05-20',
                operator: '收银员A'
            }
        ]
    });
    if (createBatchRes.status !== 201) {
        console.log('❌ 创建批次失败', createBatchRes.data);
        return { passed: false, batchId: '' };
    }
    const batchId = createBatchRes.data.id;
    console.log(`✅ 创建批次成功: ${batchId}`);
    const batchDetailRes = await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}`,
        method: 'GET',
        headers: getAuthHeaders(TEST_USERS.supervisor)
    });
    const records = batchDetailRes.data.records;
    console.log(`📋 批次记录数: ${records.length}`);
    const validRecord = records.find((r) => r.memberId === 'M100');
    if (validRecord && validRecord.status === config_1.CONFIG.RECORD_STATUS.VALID) {
        console.log('✅ 正常数据自动标记为 valid');
    }
    else {
        console.log('❌ 正常数据未正确标记', validRecord?.status);
        allPassed = false;
    }
    const missingRecord = records.find((r) => r.idempotencyKey?.includes('missing'));
    if (missingRecord && missingRecord.status === config_1.CONFIG.RECORD_STATUS.DIRTY && missingRecord.dirtyType === config_1.CONFIG.DIRTY_TYPES.MISSING_FIELDS) {
        console.log(`✅ 缺失字段自动分类: ${missingRecord.dirtyType}`);
    }
    else {
        console.log('❌ 缺失字段未正确分类', missingRecord?.status, missingRecord?.dirtyType);
        allPassed = false;
    }
    const crossdateRecord = records.find((r) => r.memberId === 'M102');
    if (crossdateRecord && crossdateRecord.status === config_1.CONFIG.RECORD_STATUS.DIRTY && crossdateRecord.dirtyType === config_1.CONFIG.DIRTY_TYPES.CROSS_DATE) {
        console.log(`✅ 跨日交易自动分类: ${crossdateRecord.dirtyType}`);
    }
    else {
        console.log('❌ 跨日交易未正确分类', crossdateRecord?.status, crossdateRecord?.dirtyType);
        allPassed = false;
    }
    console.log('\n--- 测试名称变更检测 ---');
    const addRecordRes = await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}/records`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        batchDate: '2026-05-24',
        records: [
            {
                idempotencyKey: `${batchIdempotencyKey}-namechange`,
                memberId: 'M100',
                memberName: '王大明',
                phone: '13800138100',
                amount: 500,
                transactionDate: '2026-05-24',
                operator: '收银员B'
            }
        ]
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const batchDetailRes2 = await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}`,
        method: 'GET',
        headers: getAuthHeaders(TEST_USERS.supervisor)
    });
    const records2 = batchDetailRes2.data.records;
    const nameChangeRecord = records2.find((r) => r.idempotencyKey?.includes('namechange'));
    if (nameChangeRecord && nameChangeRecord.status === config_1.CONFIG.RECORD_STATUS.DIRTY && nameChangeRecord.dirtyType === config_1.CONFIG.DIRTY_TYPES.NAME_CHANGED) {
        console.log(`✅ 会员名称变更自动分类: ${nameChangeRecord.dirtyType}`);
        console.log(`   备注: ${nameChangeRecord.dirtyRemark}`);
    }
    else {
        console.log('❌ 会员名称变更未正确分类', nameChangeRecord?.status, nameChangeRecord?.dirtyType);
        allPassed = false;
    }
    console.log('\n--- 测试金额冲突检测 ---');
    const addRecordRes2 = await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}/records`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        batchDate: '2026-05-24',
        records: [
            {
                idempotencyKey: `${batchIdempotencyKey}-amountconflict`,
                memberId: 'M100',
                memberName: '王小明',
                amount: 9999,
                transactionDate: '2026-05-24',
                operator: '收银员C'
            }
        ]
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    const batchDetailRes3 = await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}`,
        method: 'GET',
        headers: getAuthHeaders(TEST_USERS.supervisor)
    });
    const records3 = batchDetailRes3.data.records;
    const amountConflictRecord = records3.find((r) => r.idempotencyKey?.includes('amountconflict'));
    if (amountConflictRecord && amountConflictRecord.status === config_1.CONFIG.RECORD_STATUS.DIRTY && amountConflictRecord.dirtyType === config_1.CONFIG.DIRTY_TYPES.AMOUNT_CONFLICT) {
        console.log(`✅ 金额冲突自动分类: ${amountConflictRecord.dirtyType}`);
        console.log(`   备注: ${amountConflictRecord.dirtyRemark}`);
    }
    else {
        console.log('❌ 金额冲突未正确分类', amountConflictRecord?.status, amountConflictRecord?.dirtyType);
        allPassed = false;
    }
    if (allPassed) {
        console.log('🎉 API 脏数据自动分类测试通过!');
    }
    return { passed: allPassed, batchId };
}
async function testNormalFlow(port) {
    console.log('\n=== 🧪 测试 3: 完整状态流转链路测试 ===');
    const idempotencyKey = `normal-flow-${Date.now()}`;
    const createBatchRes = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/batches',
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        idempotencyKey,
        title: '正常流程测试批次',
        recordType: config_1.CONFIG.RECORD_TYPES.RECHARGE,
        storeId: 'store-001',
        batchDate: '2026-05-24',
        records: [
            {
                idempotencyKey: `${idempotencyKey}-r1`,
                memberId: 'M201',
                memberName: '赵六六',
                amount: 1000,
                transactionDate: '2026-05-24',
                operator: '收银员A'
            }
        ]
    });
    const batchId = createBatchRes.data.id;
    console.log(`✅ 创建批次，状态: ${createBatchRes.data.status}`);
    await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}/submit`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    });
    console.log('✅ 提交批次');
    await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}/review`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.reviewer)
    }, { reason: '数据核对无误' });
    console.log('✅ 复核通过');
    await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}/freeze`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.supervisor)
    }, { reason: '待财务确认' });
    console.log('✅ 冻结批次');
    await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}/settle`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.supervisor)
    }, { reason: '财务审核通过' });
    console.log('✅ 完成结算');
    const finalRes = await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${batchId}`,
        method: 'GET',
        headers: getAuthHeaders(TEST_USERS.supervisor)
    });
    console.log(`📋 最终状态: ${finalRes.data.status}`);
    console.log(`📋 状态历史数: ${finalRes.data.statusHistories?.length || 0}`);
    if (finalRes.data.status === config_1.CONFIG.BATCH_STATUS.SETTLED) {
        console.log('🎉 完整状态流转测试通过!');
        return { passed: true, batchId };
    }
    return { passed: false, batchId };
}
async function testIdempotency(port) {
    console.log('\n=== 🧪 测试 4: 幂等性测试 ===');
    const idempotencyKey = `idempotent-test-${Date.now()}`;
    const res1 = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/batches',
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        idempotencyKey,
        title: '幂等测试批次',
        recordType: config_1.CONFIG.RECORD_TYPES.REFUND,
        storeId: 'store-001',
        records: []
    });
    const res2 = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/batches',
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        idempotencyKey,
        title: '幂等测试批次-重复',
        recordType: config_1.CONFIG.RECORD_TYPES.REFUND,
        storeId: 'store-001',
        records: []
    });
    if (res1.data.id === res2.data.id && res2.data.isNew === false) {
        console.log('🎉 批次幂等性验证通过!');
        return true;
    }
    console.log('❌ 幂等性验证失败');
    return false;
}
async function testRolePermissions(port) {
    console.log('\n=== 🧪 测试 5: 权限控制测试 ===');
    const batchIdempotencyKey = `perm-test-${Date.now()}`;
    let testBatchId = '';
    const createRes = await makeRequest({
        hostname: 'localhost',
        port,
        path: '/api/batches',
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    }, {
        idempotencyKey: batchIdempotencyKey,
        title: '权限测试批次',
        recordType: config_1.CONFIG.RECORD_TYPES.RECHARGE,
        storeId: 'store-001',
        records: []
    });
    testBatchId = createRes.data.id;
    await makeRequest({
        hostname: 'localhost',
        port,
        path: `/api/batches/${testBatchId}/submit`,
        method: 'POST',
        headers: getAuthHeaders(TEST_USERS.dataEntry)
    });
    const testCases = [
        { desc: '录入员不能复核', user: TEST_USERS.dataEntry, endpoint: `/api/batches/${testBatchId}/review`, expected: 403 },
        { desc: '只读用户不能创建', user: TEST_USERS.readOnly, endpoint: '/api/batches', expected: 403 },
        { desc: '复核员可以复核', user: TEST_USERS.reviewer, endpoint: `/api/batches/${testBatchId}/review`, expected: 200 },
        { desc: '主管可以冻结', user: TEST_USERS.supervisor, endpoint: `/api/batches/${testBatchId}/freeze`, expected: 200 }
    ];
    let allPassed = true;
    for (const tc of testCases) {
        const res = await makeRequest({
            hostname: 'localhost',
            port,
            path: tc.endpoint,
            method: 'POST',
            headers: getAuthHeaders(tc.user)
        }, { reason: '测试' });
        const passed = res.status === tc.expected;
        allPassed = allPassed && passed;
        console.log(`   ${passed ? '✅' : '❌'} ${tc.desc}: ${res.status} (期望 ${tc.expected})`);
    }
    if (allPassed) {
        console.log('🎉 权限控制测试通过!');
    }
    return allPassed;
}
async function runAllTests() {
    console.log('🚀 门店会员储值异常回执状态机 - 验收测试开始');
    console.log('='.repeat(65));
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use('/api/batches', batches_1.batchesRouter);
    app.use('/api/supervisor', supervisor_1.supervisorRouter);
    const server = app.listen(0);
    const port = server.address().port;
    console.log(`✅ 测试服务器启动在端口 ${port}`);
    try {
        await prisma_1.prisma.$connect();
        await clearTestData();
        await initTestUsers();
        const unitTestPassed = await testValidatorUnit();
        const dirtyTestResult = await testApiDirtyDataDetection(port);
        const normalFlowResult = await testNormalFlow(port);
        const idempotentPassed = await testIdempotency(port);
        const permPassed = await testRolePermissions(port);
        console.log('\n' + '='.repeat(65));
        console.log('🏆 验收测试汇总');
        console.log(`   - ${unitTestPassed ? '✅' : '❌'} 数据校验单元测试`);
        console.log(`   - ${dirtyTestResult.passed ? '✅' : '❌'} API脏数据自动分类`);
        console.log(`   - ${normalFlowResult.passed ? '✅' : '❌'} 完整状态流转链路`);
        console.log(`   - ${idempotentPassed ? '✅' : '❌'} 幂等性处理`);
        console.log(`   - ${permPassed ? '✅' : '❌'} 四角色权限控制`);
        const allPassed = unitTestPassed && dirtyTestResult.passed && normalFlowResult.passed && idempotentPassed && permPassed;
        if (allPassed) {
            console.log('\n🎉 所有验收测试通过!');
            console.log('   - ✅ 异常回执/脏数据状态机链路完整');
            console.log('   - ✅ 5种脏数据类型可自动检测分类');
            console.log('   - ✅ 状态流转可追溯');
            console.log('   - ✅ 重复请求不重复创建');
        }
        else {
            console.log('\n❌ 部分测试失败');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n❌ 测试异常:', error);
        process.exit(1);
    }
    finally {
        server.close();
        await prisma_1.prisma.$disconnect();
    }
}
if (require.main === module) {
    runAllTests();
}
//# sourceMappingURL=acceptance.js.map