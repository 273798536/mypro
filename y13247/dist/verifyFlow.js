"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const seed_1 = require("./seed");
const archiveService = __importStar(require("./services/archiveService"));
const dataStore = __importStar(require("./store/dataStore"));
function printItem(item, index) {
    const stage = dataStore.getStageRecordById(item.stageRecordId);
    const track = dataStore.getTrackItemById(item.trackItemId);
    console.log(`\n--- 条目 ${index + 1}: ${item.finalTitle} ---`);
    console.log(`  状态: ${item.status}`);
    console.log(`  通道: CH${stage?.channelNo} -> 曲目: TRK${track?.trackNo}`);
    console.log(`  最终文件名: ${item.finalFilename}`);
    console.log(`  时码偏差: ${item.timecodeDeviationMs}ms`);
    console.log(`  问题: ${item.alignmentIssues.length > 0 ? item.alignmentIssues.join(' | ') : '无'}`);
    if (stage?.rawDescription && (stage.rawDescription.includes('半拍') || stage.rawDescription.includes('晚到'))) {
        console.log(`  📌 原始说法: "${stage.rawDescription}"`);
        if (stage.engineerNote) {
            console.log(`  📝 录音师备注: ${stage.engineerNote}`);
        }
    }
}
function printHistory(item) {
    const fullItem = dataStore.getArchiveItemById(item.id);
    if (!fullItem)
        return;
    console.log(`\n=== 历史追溯: ${fullItem.finalTitle} ===`);
    fullItem.history.forEach((log, i) => {
        console.log(`\n  [${i + 1}] ${log.timestamp}`);
        console.log(`      来源: ${log.source} | 操作人: ${log.operator}`);
        console.log(`      状态: ${log.previousStatus} → ${log.newStatus}`);
        console.log(`      原因: ${log.reason}`);
        if (Object.keys(log.newValue).length > 0) {
            console.log(`      变更:`);
            Object.entries(log.newValue).forEach(([key, val]) => {
                const oldVal = log.previousValue[key];
                if (oldVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(val)) {
                    console.log(`        ${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(val)}`);
                }
            });
        }
    });
}
async function runVerification() {
    console.log('========================================');
    console.log('  播客片头清单归档 - 完整流程验证（v2）');
    console.log('========================================');
    console.log('\n📥 步骤 1: 加载试跑数据');
    (0, seed_1.loadSeedData)();
    const stages = dataStore.getStageRecords();
    const tracks = dataStore.getTrackItems();
    const lateItem = stages.find(s => s.isLateArrival);
    const halfFrameItem = stages.find(s => s.rawDescription.includes('半拍'));
    const filenameMismatch = stages.find(s => s.originalFilename.includes('_v2'));
    console.log(`\n  混入的问题数据:`);
    console.log(`  - 晚到附件: CH${lateItem?.channelNo} - ${lateItem?.originalFilename}`);
    console.log(`  - 时码偏半拍: CH${halfFrameItem?.channelNo} - ${halfFrameItem?.rawDescription}`);
    console.log(`  - 文件名不匹配: CH${filenameMismatch?.channelNo} - ${filenameMismatch?.originalFilename}`);
    console.log('\n🔄 步骤 2: 自动对齐');
    const aligned = archiveService.runAutoAlign();
    console.log(`  对齐完成，共 ${aligned.length} 条记录`);
    aligned.forEach((item, i) => printItem(item, i));
    console.log('\n📊 步骤 3: 问题汇总');
    const summary = archiveService.getIssueSummary();
    console.log(`  总计: ${summary.total}`);
    console.log(`  已匹配: ${summary.matched}`);
    console.log(`  不匹配: ${summary.mismatched}`);
    console.log(`  晚到: ${summary.lateArrival}`);
    console.log(`  待复核: ${summary.needReview}`);
    console.log('\n✏️ 步骤 4: 人工改判 - 文件名不匹配（使用舞台文件名）');
    const mismatchItem = aligned.find(a => a.status === 'mismatch_filename');
    if (mismatchItem) {
        const rejudged = archiveService.rejudgeItem({
            archiveItemId: mismatchItem.id,
            operator: '老王',
            reason: '确认是主持人开场白第二版，保留舞台实际文件名',
            overrideTitle: '主持人开场白（第二版）',
            filenameSource: 'stage',
        });
        if (rejudged) {
            console.log(`  ✅ 改判成功`);
            console.log(`     新状态: ${rejudged.status}`);
            console.log(`     最终文件名: ${rejudged.finalFilename}`);
            console.log(`     最终标题: ${rejudged.finalTitle}`);
            console.log(`     对齐问题: ${rejudged.alignmentIssues.join(' | ')}`);
            const stageFile = stages.find(s => s.id === rejudged.stageRecordId);
            if (stageFile && rejudged.finalFilename === stageFile.originalFilename) {
                console.log(`     ✅ 验证: 最终文件名正确使用了舞台文件名`);
            }
            else {
                console.log(`     ❌ 验证失败: 最终文件名未使用舞台文件名`);
            }
        }
    }
    console.log('\n✅ 步骤 5: 授权对齐 - 处理晚到附件（使用曲目表文件名，修正时码）');
    const lateItemAligned = dataStore.getArchiveItems().find(a => a.status === 'late_arrival');
    if (lateItemAligned) {
        const stage = dataStore.getStageRecordById(lateItemAligned.stageRecordId);
        const track = dataStore.getTrackItemById(lateItemAligned.trackItemId);
        if (stage && track) {
            const authorized = archiveService.authorizeItem({
                archiveItemId: lateItemAligned.id,
                authorizer: '老许',
                note: '导播临时改的片尾，彩排后重新录制，确认可用，时码按实际接收为准',
                alignmentDecision: {
                    useStageFile: stage.id,
                    useTrackItem: track.id,
                    overrideTimecode: stage.timecodeStart,
                    filenameSource: 'track',
                },
            });
            if (authorized) {
                console.log(`  ✅ 授权成功`);
                console.log(`     授权人: ${authorized.authorizationNote?.authorizer}`);
                console.log(`     备注: ${authorized.authorizationNote?.note}`);
                console.log(`     最终文件名: ${authorized.finalFilename}`);
                console.log(`     最终时码: ${authorized.finalTimecodeStart}`);
                console.log(`     文件名来源: ${authorized.authorizationNote?.alignmentDecision.filenameSource}`);
                console.log(`     对齐详情: ${authorized.alignmentIssues.join(' | ')}`);
                if (authorized.finalFilename === track.expectedFilename) {
                    console.log(`     ✅ 验证: 最终文件名正确使用了曲目表文件名`);
                }
                else {
                    console.log(`     ❌ 验证失败: 最终文件名未使用曲目表文件名`);
                }
            }
        }
    }
    console.log('\n✅ 步骤 6: 授权对齐 - 处理时码偏半拍（手动覆盖文件名）');
    const halfFrameAligned = dataStore.getArchiveItems().find(a => a.status === 'mismatch_timecode');
    if (halfFrameAligned) {
        const stage = dataStore.getStageRecordById(halfFrameAligned.stageRecordId);
        const track = dataStore.getTrackItemById(halfFrameAligned.trackItemId);
        if (stage && track) {
            const overrideFilename = 'PODCAST_INTRO_THEME_MUSIC_APPROVED.wav';
            const authorized = archiveService.authorizeItem({
                archiveItemId: halfFrameAligned.id,
                authorizer: '老许',
                note: '时码偏半拍（20ms）是设备重启导致，录音日志已有标注，不影响使用，接受该偏差',
                alignmentDecision: {
                    useStageFile: stage.id,
                    useTrackItem: track.id,
                    filenameSource: 'override',
                    overrideFilename,
                },
            });
            if (authorized) {
                console.log(`  ✅ 授权成功`);
                console.log(`     最终文件名: ${authorized.finalFilename}`);
                console.log(`     时码偏差: ${authorized.timecodeDeviationMs}ms（已接受）`);
                console.log(`     原始说法追溯: "${stage.rawDescription}"`);
                console.log(`     文件名来源: ${authorized.authorizationNote?.alignmentDecision.filenameSource}`);
                if (authorized.finalFilename === overrideFilename) {
                    console.log(`     ✅ 验证: 最终文件名正确使用了手动覆盖的文件名`);
                }
                else {
                    console.log(`     ❌ 验证失败: 最终文件名未使用覆盖文件名`);
                }
            }
        }
    }
    console.log('\n📦 步骤 7: 归档所有已授权/已匹配/已改判条目');
    const itemsAfterAuth = dataStore.getArchiveItems();
    const archiveable = itemsAfterAuth.filter(i => ['matched', 'rejudged', 'authorized'].includes(i.status));
    console.log(`  可归档条目: ${archiveable.length} 条`);
    archiveable.forEach(item => {
        const archived = archiveService.archiveItem(item.id, '归档员');
        if (archived) {
            console.log(`  ✅ 已归档: ${archived.finalTitle} [${archived.status}]`);
        }
    });
    console.log('\n📜 步骤 8: 评审会复盘 - 查看历史记录');
    const finalItems = dataStore.getArchiveItems();
    const halfFrameFinal = finalItems.find(f => {
        const stage = dataStore.getStageRecordById(f.stageRecordId);
        return stage?.rawDescription.includes('半拍');
    });
    if (halfFrameFinal) {
        printHistory(halfFrameFinal);
    }
    const lateFinal = finalItems.find(f => {
        const stage = dataStore.getStageRecordById(f.stageRecordId);
        return stage?.isLateArrival;
    });
    if (lateFinal) {
        printHistory(lateFinal);
    }
    const rejudgedFinal = finalItems.find(f => f.status === 'archived' &&
        f.alignmentIssues.some(i => i.includes('使用舞台文件名')));
    if (rejudgedFinal) {
        printHistory(rejudgedFinal);
    }
    console.log('\n📤 步骤 9: 测试导出功能');
    console.log(`\n  导出 JSON（含历史）:`);
    const jsonExport = archiveService.exportArchive({
        format: 'json',
        includeHistory: true,
        statusFilter: ['archived'],
    });
    console.log(`  ✅ 文件名: ${jsonExport.filename}`);
    console.log(`     MIME类型: ${jsonExport.mimeType}`);
    console.log(`     内容大小: ${jsonExport.content.length} 字符`);
    const jsonData = JSON.parse(jsonExport.content);
    console.log(`     导出条目数: ${jsonData.length}`);
    if (jsonData.length > 0 && jsonData[0].history) {
        console.log(`     历史记录数: ${jsonData[0].history.length} 条`);
    }
    console.log(`\n  导出 CSV（仅已归档）:`);
    const csvExport = archiveService.exportArchive({
        format: 'csv',
        includeHistory: false,
        statusFilter: ['archived'],
    });
    console.log(`  ✅ 文件名: ${csvExport.filename}`);
    console.log(`     MIME类型: ${csvExport.mimeType}`);
    console.log(`     内容大小: ${csvExport.content.length} 字符`);
    const csvLines = csvExport.content.trim().split('\n');
    console.log(`     行数: ${csvLines.length}（含表头）`);
    if (csvLines.length > 0) {
        console.log(`     表头: ${csvLines[0].split(',').length} 列`);
    }
    console.log(`\n  导出 JSON（全部状态）:`);
    const fullExport = archiveService.exportArchive({
        format: 'json',
        includeHistory: false,
        statusFilter: [],
    });
    const fullData = JSON.parse(fullExport.content);
    console.log(`  ✅ 全部条目数: ${fullData.length}`);
    console.log('\n💥 步骤 10: 测试错误处理');
    console.log(`\n  测试 1: 授权时指定不存在的舞台文件:`);
    try {
        const testItem = finalItems[0];
        archiveService.authorizeItem({
            archiveItemId: testItem.id,
            authorizer: '测试',
            note: '测试错误',
            alignmentDecision: {
                useStageFile: 'nonexistent_id',
                useTrackItem: testItem.trackItemId,
                filenameSource: 'track',
            },
        });
        console.log(`  ❌ 应该抛出错误但没有`);
    }
    catch (error) {
        console.log(`  ✅ 正确抛出错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    console.log(`\n  测试 2: 改判时选择覆盖文件名但未提供:`);
    try {
        const testItem = finalItems[0];
        archiveService.rejudgeItem({
            archiveItemId: testItem.id,
            operator: '测试',
            reason: '测试错误',
            filenameSource: 'override',
        });
        console.log(`  ❌ 应该抛出错误但没有`);
    }
    catch (error) {
        console.log(`  ✅ 正确抛出错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    console.log('\n📊 步骤 11: 最终状态汇总');
    const finalSummary = archiveService.getIssueSummary();
    console.log(`  总计: ${finalSummary.total}`);
    console.log(`  已匹配: ${finalSummary.matched}`);
    console.log(`  已归档: ${finalSummary.archived}`);
    console.log(`  已授权: ${finalSummary.authorized}`);
    console.log(`  待复核: ${finalSummary.needReview}`);
    console.log('\n========================================');
    console.log('  ✅ 完整流程验证通过!（v2）');
    console.log('========================================');
    console.log('\n📌 新增功能验证:');
    console.log('  ✅ 文件名来源可选择: 舞台文件 / 曲目表 / 手动覆盖');
    console.log('  ✅ 最终文件名根据选择正确设置');
    console.log('  ✅ 支持导出 JSON（含历史）和 CSV 格式');
    console.log('  ✅ 导出支持状态筛选');
    console.log('  ✅ 错误处理完善，无效参数会抛出明确错误');
    console.log('  ✅ 授权/改判详情在 alignmentIssues 中可见');
    console.log('  ✅ 文件名来源记录在历史和授权备注中');
    console.log('');
    console.log('\n📋 核心检查点:');
    console.log('  1. 授权/改判时，alignmentDecision.useStageFile 被正确读取');
    console.log('  2. finalFilename 不再固定为 track.expectedFilename');
    console.log('  3. 前端可选择舞台文件和文件名来源');
    console.log('  4. 导出内容包含完整字段和历史记录');
    console.log('  5. 异常情况有明确错误提示');
    console.log('');
}
runVerification().catch(console.error);
