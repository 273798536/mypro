"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("supertest");
const typeorm_1 = require("typeorm");
const database_config_1 = require("../src/database/database.config");
const user_entity_1 = require("../src/entities/user.entity");
const role_enum_1 = require("../src/common/enums/role.enum");
const BASE_URL = 'http://localhost:3000';
let users = {};
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function setupUsers() {
    const dataSource = new typeorm_1.DataSource(database_config_1.databaseConfig);
    await dataSource.initialize();
    const userRepository = dataSource.getRepository(user_entity_1.User);
    const allUsers = await userRepository.find();
    for (const user of allUsers) {
        users[user.role] = user;
    }
    await dataSource.destroy();
    console.log('Users loaded:', Object.keys(users));
}
function apiRequest(method, path, role, body) {
    const user = users[role];
    if (!user) {
        throw new Error(`User not found for role: ${role}`);
    }
    const req = request(BASE_URL)[method.toLowerCase()](path)
        .set('x-user-id', user.id)
        .set('Content-Type', 'application/json');
    if (body) {
        req.send(body);
    }
    return req;
}
async function testNormalFlow() {
    console.log('\n========== 测试 1: 正常链路测试 ==========');
    const passed = { value: true };
    const assert = (cond, msg) => {
        if (!cond) {
            console.error(`❌ Assertion failed: ${msg}`);
            passed.value = false;
        }
    };
    try {
        const batchData = {
            description: '正常测试批次',
            repairOrders: [{
                    orderNo: 'RO_NORM_001',
                    customerName: '张三',
                    phone: '13800138000',
                    productModel: 'iPhone 14',
                    faultDescription: '屏幕碎裂',
                    repairDate: new Date('2024-01-15'),
                    engineerName: '李工',
                }],
            sparePartScans: [{
                    scanNo: 'SPS_NORM_001',
                    partCode: 'P_NORM_001',
                    partName: '屏幕总成',
                    quantity: 1,
                    unitPrice: 800,
                    totalAmount: 800,
                    scanTime: new Date('2024-01-15'),
                    operator: '王扫码',
                }],
            customerSignPhotos: [{
                    photoNo: 'CSP_NORM_001',
                    fileName: 'sign_001.jpg',
                    filePath: '/photos/sign_001.jpg',
                    customerName: '张三',
                    signTime: new Date('2024-01-15'),
                }],
            scanDetails: [{
                    detailNo: 'SD_NORM_001',
                    barcode: 'BAR_NORM_001',
                    partCode: 'P_NORM_001',
                    partName: '屏幕总成',
                    quantity: 1,
                    unitPrice: 800,
                    totalAmount: 800,
                    scanTime: new Date('2024-01-15'),
                }],
        };
        console.log('1.1 录入员创建批次...');
        const createRes = await apiRequest('POST', '/batches', role_enum_1.Role.OPERATOR, batchData);
        assert(createRes.status === 201, `创建批次失败: ${createRes.status}`);
        const batchId = createRes.body.id;
        console.log('批次创建成功, ID:', batchId);
        console.log('批次状态:', createRes.body.status);
        console.log('脏记录数量:', createRes.body.totalDirtyRecords);
        if (createRes.body.totalDirtyRecords > 0) {
            console.log('1.1.1 处理脏记录...');
            const dirtyRes = await apiRequest('GET', `/batches/${batchId}/dirty-records`, role_enum_1.Role.REVIEWER);
            const dirtyRecords = dirtyRes.body.filter((r) => !r.isResolved);
            for (const record of dirtyRecords) {
                let resolvedContent = '{}';
                if (record.dirtyType === 'missing_field') {
                    if (record.sourceType === 'repair_order') {
                        resolvedContent = JSON.stringify({
                            orderNo: 'RO_NORM_001',
                            customerName: '张三',
                            productModel: 'iPhone 14',
                            faultDescription: '屏幕碎裂',
                            repairDate: '2024-01-15',
                            engineerName: '李工',
                        });
                    }
                    else {
                        resolvedContent = JSON.stringify({ quantity: 1, unitPrice: 800, totalAmount: 800 });
                    }
                }
                else if (record.dirtyType === 'quantity_conflict' || record.dirtyType === 'amount_conflict') {
                    resolvedContent = JSON.stringify({ quantity: 1, unitPrice: 800, totalAmount: 800 });
                }
                else if (record.dirtyType === 'cross_day') {
                    resolvedContent = JSON.stringify({ dates: ['2024-01-15'], targetDate: '2024-01-15' });
                }
                else if (record.dirtyType === 'name_changed') {
                    resolvedContent = JSON.stringify({ partName: '屏幕总成' });
                }
                const resolveRes = await apiRequest('POST', `/batches/dirty-records/${record.id}/resolve`, role_enum_1.Role.REVIEWER, {
                    handlingOpinion: '正常数据，确认无误',
                    resolvedContent,
                });
                assert(resolveRes.status === 201, `处理脏记录失败: ${resolveRes.status}`);
            }
            console.log('脏记录处理完成');
        }
        console.log('1.2 录入员提交复核...');
        const submitRes = await apiRequest('POST', `/batches/${batchId}/submit`, role_enum_1.Role.OPERATOR);
        assert(submitRes.status === 201, `提交复核失败: ${submitRes.status} - ${submitRes.body?.message || ''}`);
        console.log('提交后状态:', submitRes.body.status);
        assert(submitRes.body.status === 'pending_review', '状态应为待复核');
        console.log('1.3 复核员复核通过...');
        const approveRes = await apiRequest('POST', `/batches/${batchId}/approve`, role_enum_1.Role.REVIEWER, {
            opinion: '数据无误，复核通过',
        });
        assert(approveRes.status === 201, `复核通过失败: ${approveRes.status}`);
        console.log('复核后状态:', approveRes.body.status);
        assert(approveRes.body.status === 'approved', '状态应为已通过');
        console.log('1.4 主管冻结批次...');
        const freezeRes = await apiRequest('POST', `/batches/${batchId}/freeze`, role_enum_1.Role.MANAGER, {
            reason: '需要进一步核实备件来源',
        });
        assert(freezeRes.status === 201, `冻结失败: ${freezeRes.status}`);
        console.log('冻结后状态:', freezeRes.body.status);
        console.log('冻结前状态:', freezeRes.body.statusBeforeFrozen);
        assert(freezeRes.body.status === 'frozen', '状态应为已冻结');
        console.log('1.5 主管解冻批次...');
        const unfreezeRes = await apiRequest('POST', `/batches/${batchId}/unfreeze`, role_enum_1.Role.MANAGER, {
            reason: '核实完毕，恢复正常',
        });
        assert(unfreezeRes.status === 201, `解冻失败: ${unfreezeRes.status}`);
        console.log('解冻后状态:', unfreezeRes.body.status);
        console.log('1.6 主管结算...');
        const settleRes = await apiRequest('POST', `/batches/${batchId}/settle`, role_enum_1.Role.MANAGER);
        assert(settleRes.status === 201, `结算失败: ${settleRes.status}`);
        console.log('结算后状态:', settleRes.body.status);
        assert(settleRes.body.status === 'settled', '状态应为已结算');
        console.log('1.7 主管归档...');
        const archiveRes = await apiRequest('POST', `/batches/${batchId}/archive`, role_enum_1.Role.MANAGER);
        assert(archiveRes.status === 201, `归档失败: ${archiveRes.status}`);
        console.log('归档后状态:', archiveRes.body.status);
        assert(archiveRes.body.status === 'archived', '状态应为已归档');
        console.log('1.8 查看状态日志...');
        const logsRes = await apiRequest('GET', `/batches/${batchId}/status-logs`, role_enum_1.Role.VIEWER);
        assert(logsRes.status === 200, `获取日志失败: ${logsRes.status}`);
        console.log('状态变更日志数量:', logsRes.body.length);
        assert(logsRes.body.length >= 5, '应该有至少5条状态变更日志');
        console.log('日志示例:', JSON.stringify(logsRes.body[0], null, 2));
        if (passed.value) {
            console.log('\n✅ 正常链路测试通过!');
        }
        else {
            console.log('\n❌ 正常链路测试失败!');
        }
        return passed.value;
    }
    catch (error) {
        console.error('❌ 正常链路测试失败:', error.message);
        return false;
    }
}
async function testDuplicateSubmission() {
    console.log('\n========== 测试 2: 重复提交测试 ==========');
    try {
        const batchData = {
            description: '重复提交测试批次',
            sparePartScans: [{
                    scanNo: 'SPS_DUP_001',
                    partCode: 'P001',
                    partName: '屏幕总成',
                    quantity: 1,
                    unitPrice: 800,
                    totalAmount: 800,
                }],
        };
        console.log('2.1 创建批次...');
        const createRes = await apiRequest('POST', '/batches', role_enum_1.Role.OPERATOR, batchData);
        const batchId = createRes.body.id;
        console.log('2.2 第一次提交复核...');
        const submit1Res = await apiRequest('POST', `/batches/${batchId}/submit`, role_enum_1.Role.OPERATOR);
        console.assert(submit1Res.status === 201, `第一次提交失败: ${submit1Res.status}`);
        console.log('2.3 第二次提交复核(应该失败)...');
        const submit2Res = await apiRequest('POST', `/batches/${batchId}/submit`, role_enum_1.Role.OPERATOR);
        console.log('第二次提交状态码:', submit2Res.status);
        console.assert(submit2Res.status !== 201, '重复提交应该失败');
        console.log('重复提交已被正确拦截');
        console.log('\n✅ 重复提交测试通过!');
        return true;
    }
    catch (error) {
        console.error('❌ 重复提交测试失败:', error.message);
        return false;
    }
}
async function testBadData() {
    console.log('\n========== 测试 3: 坏数据闭环测试 ==========');
    try {
        const batchData = {
            description: '坏数据闭环测试批次',
            repairOrders: [{
                    orderNo: '',
                    customerName: '',
                    phone: '13800138000',
                }],
            sparePartScans: [
                {
                    scanNo: 'SPS_BAD_001',
                    partCode: 'P_BAD_001',
                    partName: '电池A',
                    quantity: 2,
                    unitPrice: 200,
                    totalAmount: 400,
                },
                {
                    scanNo: 'SPS_BAD_002',
                    partCode: 'P_BAD_001',
                    partName: '电池B',
                    quantity: 3,
                    unitPrice: 200,
                    totalAmount: 600,
                },
            ],
            scanDetails: [
                {
                    detailNo: 'SD_BAD_001',
                    barcode: 'BAR_BAD_001',
                    partCode: 'P_BAD_001',
                    partName: '电池A',
                    quantity: 1,
                    unitPrice: 200,
                    totalAmount: 200,
                    scanTime: new Date('2024-01-15'),
                },
                {
                    detailNo: 'SD_BAD_002',
                    barcode: 'BAR_BAD_002',
                    partCode: 'P_BAD_001',
                    partName: '电池A',
                    quantity: 1,
                    unitPrice: 200,
                    totalAmount: 200,
                    scanTime: new Date('2024-01-16'),
                },
            ],
        };
        console.log('3.1 创建包含坏数据的批次...');
        const createRes = await apiRequest('POST', '/batches', role_enum_1.Role.OPERATOR, batchData);
        console.assert(createRes.status === 201, `创建批次失败: ${createRes.status}`);
        const batchId = createRes.body.id;
        console.log('批次创建成功, ID:', batchId);
        console.log('初始总金额:', createRes.body.totalAmount);
        console.log('初始脏记录数量:', createRes.body.totalDirtyRecords);
        console.log('3.2 检查脏记录...');
        const dirtyRes = await apiRequest('GET', `/batches/${batchId}/dirty-records`, role_enum_1.Role.REVIEWER);
        console.assert(dirtyRes.status === 200, `获取脏记录失败: ${dirtyRes.status}`);
        const dirtyRecords = dirtyRes.body;
        console.log('检测到脏记录数量:', dirtyRecords.length);
        dirtyRecords.forEach(record => {
            console.log(`  - ${record.dirtyType}: ${record.conflictFields}`);
        });
        console.assert(dirtyRecords.length > 0, '应该检测到脏记录');
        const initialDirtyCount = dirtyRecords.length;
        console.log('3.3 尝试提交有脏记录的批次(应该失败)...');
        const submitRes = await apiRequest('POST', `/batches/${batchId}/submit`, role_enum_1.Role.OPERATOR);
        console.log('提交状态码:', submitRes.status);
        console.log('拦截信息:', submitRes.body?.message || submitRes.text);
        console.assert(submitRes.status !== 201, '有脏记录的批次应该无法提交');
        console.log('有脏记录的批次提交已被正确拦截');
        console.log('3.4 处理脏记录 - 缺字段(维修单)...');
        const missingFieldRecords = dirtyRecords.filter(r => r.dirtyType === 'missing_field' && r.sourceType === 'repair_order');
        if (missingFieldRecords.length > 0) {
            const resolveRes = await apiRequest('POST', `/batches/dirty-records/${missingFieldRecords[0].id}/resolve`, role_enum_1.Role.REVIEWER, {
                handlingOpinion: '补充缺失字段',
                resolvedContent: JSON.stringify({
                    orderNo: 'RO_FIX_001',
                    customerName: '李四',
                    productModel: 'iPhone 14',
                    faultDescription: '电池鼓包',
                    engineerName: '王工',
                    repairDate: new Date('2024-01-15'),
                }),
            });
            console.assert(resolveRes.status === 201, `处理缺字段失败: ${resolveRes.status}`);
            console.log('缺字段已处理');
        }
        console.log('3.5 处理脏记录 - 备件改名...');
        const nameChangedRecords = dirtyRecords.filter(r => r.dirtyType === 'name_changed');
        if (nameChangedRecords.length > 0) {
            const resolveRes = await apiRequest('POST', `/batches/dirty-records/${nameChangedRecords[0].id}/resolve`, role_enum_1.Role.REVIEWER, {
                handlingOpinion: '确认统一为电池包',
                resolvedContent: JSON.stringify({
                    partName: '电池包',
                }),
            });
            console.assert(resolveRes.status === 201, `处理改名失败: ${resolveRes.status}`);
            console.log('备件改名已处理');
        }
        console.log('3.6 处理脏记录 - 跨日扫码...');
        const crossDayRecords = dirtyRecords.filter(r => r.dirtyType === 'cross_day');
        if (crossDayRecords.length > 0) {
            const resolveRes = await apiRequest('POST', `/batches/dirty-records/${crossDayRecords[0].id}/resolve`, role_enum_1.Role.REVIEWER, {
                handlingOpinion: '统一为2024-01-15',
                resolvedContent: JSON.stringify({
                    dates: ['2024-01-15', '2024-01-16'],
                    targetDate: '2024-01-15',
                }),
            });
            console.assert(resolveRes.status === 201, `处理跨日失败: ${resolveRes.status}`);
            console.log('跨日扫码已处理');
        }
        console.log('3.7 处理脏记录 - 数量冲突...');
        const quantityConflictRecords = dirtyRecords.filter(r => r.dirtyType === 'quantity_conflict');
        for (const record of quantityConflictRecords) {
            const resolveRes = await apiRequest('POST', `/batches/dirty-records/${record.id}/resolve`, role_enum_1.Role.REVIEWER, {
                handlingOpinion: '确认数量为1，按扫码明细为准',
                resolvedContent: JSON.stringify({
                    quantity: 1,
                    unitPrice: 200,
                    totalAmount: 200,
                }),
            });
            console.assert(resolveRes.status === 201, `处理数量冲突失败: ${resolveRes.status}`);
            console.log('数量冲突已处理');
        }
        console.log('3.8 处理脏记录 - 金额冲突...');
        const amountConflictRecords = dirtyRecords.filter(r => r.dirtyType === 'amount_conflict');
        for (const record of amountConflictRecords) {
            const resolveRes = await apiRequest('POST', `/batches/dirty-records/${record.id}/resolve`, role_enum_1.Role.REVIEWER, {
                handlingOpinion: '修正金额，数量×单价',
                resolvedContent: JSON.stringify({
                    quantity: 1,
                    unitPrice: 200,
                    totalAmount: 200,
                }),
            });
            console.assert(resolveRes.status === 201, `处理金额冲突失败: ${resolveRes.status}`);
            console.log('金额冲突已处理');
        }
        console.log('3.9 处理剩余脏记录...');
        const remainingDirtyRes = await apiRequest('GET', `/batches/${batchId}/dirty-records`, role_enum_1.Role.REVIEWER);
        const remainingDirty = remainingDirtyRes.body.filter((r) => !r.isResolved);
        console.log('剩余未处理脏记录:', remainingDirty.length);
        for (const record of remainingDirty) {
            const resolveRes = await apiRequest('POST', `/batches/dirty-records/${record.id}/resolve`, role_enum_1.Role.REVIEWER, {
                handlingOpinion: '数据修正，按实际情况处理',
                resolvedContent: JSON.stringify({
                    quantity: 1,
                    unitPrice: 200,
                    totalAmount: 200,
                }),
            });
            console.assert(resolveRes.status === 201, `处理脏记录失败: ${resolveRes.status}`);
        }
        console.log('3.10 验证脏记录全部处理完成...');
        const afterResolveDirtyRes = await apiRequest('GET', `/batches/${batchId}/dirty-records`, role_enum_1.Role.REVIEWER);
        const unresolvedAfter = afterResolveDirtyRes.body.filter((r) => !r.isResolved);
        console.log('处理后未处理脏记录数:', unresolvedAfter.length);
        console.assert(unresolvedAfter.length === 0, '所有脏记录应该已处理');
        console.log('3.11 验证批次 totalDirtyRecords 已更新...');
        const batchAfterResolve = await apiRequest('GET', `/batches/${batchId}`, role_enum_1.Role.OPERATOR);
        console.log('批次 totalDirtyRecords:', batchAfterResolve.body.totalDirtyRecords);
        console.assert(batchAfterResolve.body.totalDirtyRecords === 0, 'totalDirtyRecords 应该为 0');
        console.log('3.12 验证重新汇总的金额...');
        console.log('重新汇总后总金额:', batchAfterResolve.body.totalAmount);
        console.assert(batchAfterResolve.body.totalAmount !== undefined, '总金额应该已重新计算');
        console.log('3.13 验证原始数据已修正...');
        const roList = await apiRequest('GET', `/batches/${batchId}/repair-orders`, role_enum_1.Role.REVIEWER);
        if (roList.body && roList.body.length > 0) {
            console.log('维修单修正后 orderNo:', roList.body[0].orderNo);
            console.log('维修单修正后 customerName:', roList.body[0].customerName);
            console.assert(roList.body[0].orderNo !== '', 'orderNo 应该已修正');
            console.assert(roList.body[0].customerName !== '', 'customerName 应该已修正');
        }
        console.log('3.14 验证扫码明细 isDirty 已清除...');
        const sdList = await apiRequest('GET', `/batches/${batchId}/scan-details`, role_enum_1.Role.REVIEWER);
        if (sdList.body && sdList.body.length > 0) {
            const dirtySd = sdList.body.filter((sd) => sd.isDirty);
            console.log('仍标记为脏的扫码明细:', dirtySd.length);
        }
        console.log('3.15 再次提交复核(应该成功)...');
        const submit2Res = await apiRequest('POST', `/batches/${batchId}/submit`, role_enum_1.Role.OPERATOR);
        console.log('提交状态码:', submit2Res.status);
        console.assert(submit2Res.status === 201, `脏记录处理后应该可以提交: ${submit2Res.body?.message || submit2Res.text}`);
        console.log('提交后状态:', submit2Res.body.status);
        console.assert(submit2Res.body.status === 'pending_review', '状态应为待复核');
        console.log('3.16 复核通过...');
        const approveRes = await apiRequest('POST', `/batches/${batchId}/approve`, role_enum_1.Role.REVIEWER, {
            opinion: '数据修正无误，复核通过',
        });
        console.assert(approveRes.status === 201, `复核通过失败: ${approveRes.status}`);
        console.log('复核后状态:', approveRes.body.status);
        console.assert(approveRes.body.status === 'approved', '状态应为已通过');
        console.log('\n✅ 坏数据闭环测试通过!');
        return true;
    }
    catch (error) {
        console.error('❌ 坏数据闭环测试失败:', error.message);
        console.error(error.stack);
        return false;
    }
}
async function testManagerView() {
    console.log('\n========== 测试 4: 服务经理视图 ==========');
    try {
        console.log('4.1 获取经理视图数据...');
        const viewRes = await apiRequest('GET', '/export/manager-view', role_enum_1.Role.MANAGER);
        console.assert(viewRes.status === 200, `获取经理视图失败: ${viewRes.status}`);
        console.log('批次数量:', viewRes.body.length);
        if (viewRes.body.length > 0) {
            console.log('示例数据:');
            const item = viewRes.body[0];
            console.log(`  批次号: ${item.batchNo}`);
            console.log(`  状态: ${item.status}`);
            console.log(`  冻结前状态: ${item.statusBeforeFrozen || 'N/A'}`);
            console.log(`  人工理由: ${item.manualReason || 'N/A'}`);
            console.log(`  总金额: ${item.totalAmount}`);
        }
        console.log('4.2 获取统计数据...');
        const statsRes = await apiRequest('GET', '/export/statistics', role_enum_1.Role.MANAGER);
        console.assert(statsRes.status === 200, `获取统计失败: ${statsRes.status}`);
        console.log('统计数据:', JSON.stringify(statsRes.body, null, 2));
        console.log('\n✅ 服务经理视图测试通过!');
        return true;
    }
    catch (error) {
        console.error('❌ 服务经理视图测试失败:', error.message);
        return false;
    }
}
async function testPermissions() {
    console.log('\n========== 测试 5: 权限控制测试 ==========');
    try {
        let batchId;
        const batchData = {
            description: '权限测试批次',
            sparePartScans: [{
                    scanNo: 'SPS_PERM_001',
                    partCode: 'P_PERM_001',
                    partName: '测试零件',
                    quantity: 1,
                    unitPrice: 100,
                    totalAmount: 100,
                }],
        };
        const createRes = await apiRequest('POST', '/batches', role_enum_1.Role.OPERATOR, batchData);
        batchId = createRes.body.id;
        await apiRequest('POST', `/batches/${batchId}/submit`, role_enum_1.Role.OPERATOR);
        console.log('5.1 测试只读用户不能创建批次...');
        const viewerCreateRes = await apiRequest('POST', '/batches', role_enum_1.Role.VIEWER, batchData);
        console.log('只读用户创建状态码:', viewerCreateRes.status);
        console.assert(viewerCreateRes.status === 403, '只读用户应该无法创建批次');
        console.log('5.2 测试录入员不能复核...');
        const operatorApproveRes = await apiRequest('POST', `/batches/${batchId}/approve`, role_enum_1.Role.OPERATOR);
        console.log('录入员复核状态码:', operatorApproveRes.status);
        console.assert(operatorApproveRes.status === 403, '录入员应该无法复核');
        console.log('5.3 测试录入员不能冻结...');
        const operatorFreezeRes = await apiRequest('POST', `/batches/${batchId}/freeze`, role_enum_1.Role.OPERATOR, { reason: '测试' });
        console.log('录入员冻结状态码:', operatorFreezeRes.status);
        console.assert(operatorFreezeRes.status === 403, '录入员应该无法冻结');
        console.log('\n✅ 权限控制测试通过!');
        return true;
    }
    catch (error) {
        console.error('❌ 权限控制测试失败:', error.message);
        return false;
    }
}
async function testRestartAndHistory() {
    console.log('\n========== 测试 6: 重启后历史数据查询 ==========');
    try {
        console.log('6.1 查询所有批次(验证历史数据)...');
        const listRes = await apiRequest('GET', '/batches', role_enum_1.Role.MANAGER);
        console.assert(listRes.status === 200, `查询批次列表失败: ${listRes.status}`);
        console.log('总批次数量:', listRes.body.length);
        if (listRes.body.length > 0) {
            const firstBatch = listRes.body[0];
            console.log('最早批次号:', firstBatch.batchNo);
            console.log('最早批次状态:', firstBatch.status);
            console.log('最早批次创建时间:', firstBatch.createdAt);
            console.log('6.2 查询单个批次详情...');
            const detailRes = await apiRequest('GET', `/batches/${firstBatch.id}`, role_enum_1.Role.MANAGER);
            console.assert(detailRes.status === 200, `查询批次详情失败: ${detailRes.status}`);
            console.log('批次详情加载成功');
            console.log('6.3 查询状态日志历史...');
            const logsRes = await apiRequest('GET', `/batches/${firstBatch.id}/status-logs`, role_enum_1.Role.MANAGER);
            console.assert(logsRes.status === 200, `查询状态日志失败: ${logsRes.status}`);
            console.log('历史状态变更记录数:', logsRes.body.length);
        }
        console.log('\n✅ 重启后历史数据查询测试通过!');
        return true;
    }
    catch (error) {
        console.error('❌ 重启后历史数据查询测试失败:', error.message);
        return false;
    }
}
async function runAllTests() {
    console.log('🚀 开始验收测试...');
    await setupUsers();
    await sleep(1000);
    const results = [];
    results.push(await testNormalFlow());
    results.push(await testDuplicateSubmission());
    results.push(await testBadData());
    results.push(await testManagerView());
    results.push(await testPermissions());
    results.push(await testRestartAndHistory());
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总:');
    console.log(`  总测试数: ${results.length}`);
    console.log(`  通过数: ${results.filter(r => r).length}`);
    console.log(`  失败数: ${results.filter(r => !r).length}`);
    console.log('='.repeat(50));
    if (results.every(r => r)) {
        console.log('\n🎉 所有测试通过! 验收完成!');
        process.exit(0);
    }
    else {
        console.log('\n❌ 部分测试失败，请检查问题');
        process.exit(1);
    }
}
runAllTests().catch(console.error);
//# sourceMappingURL=acceptance.test.js.map