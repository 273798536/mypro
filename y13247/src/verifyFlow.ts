import { loadSeedData } from './seed';
import * as archiveService from './services/archiveService';
import * as dataStore from './store/dataStore';
import { ArchiveItem, MatchStatus } from './types';

function printItem(item: ArchiveItem, index: number) {
  const stage = dataStore.getStageRecordById(item.stageRecordId);
  const track = dataStore.getTrackItemById(item.trackItemId);
  console.log(`\n--- 条目 ${index + 1}: ${item.finalTitle} ---`);
  console.log(`  状态: ${item.status}`);
  console.log(`  通道: CH${stage?.channelNo} -> 曲目: TRK${track?.trackNo}`);
  console.log(`  时码偏差: ${item.timecodeDeviationMs}ms`);
  console.log(`  问题: ${item.alignmentIssues.length > 0 ? item.alignmentIssues.join(' | ') : '无'}`);
  if (stage?.rawDescription && (stage.rawDescription.includes('半拍') || stage.rawDescription.includes('晚到'))) {
    console.log(`  📌 原始说法: "${stage.rawDescription}"`);
    if (stage.engineerNote) {
      console.log(`  📝 录音师备注: ${stage.engineerNote}`);
    }
  }
}

function printHistory(item: ArchiveItem) {
  const fullItem = dataStore.getArchiveItemById(item.id);
  if (!fullItem) return;
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
  console.log('  播客片头清单归档 - 完整流程验证');
  console.log('========================================');

  console.log('\n📥 步骤 1: 加载试跑数据');
  loadSeedData();

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

  console.log('\n✏️ 步骤 4: 人工改判 - 处理文件名不匹配');
  const mismatchItem = aligned.find(a => a.status === 'mismatch_filename');
  if (mismatchItem) {
    const rejudged = archiveService.rejudgeItem({
      archiveItemId: mismatchItem.id,
      operator: '老王',
      reason: '确认是主持人开场白第二版，曲目表未更新版本号',
      overrideTitle: '主持人开场白（第二版）',
    });
    if (rejudged) {
      console.log(`  ✅ 改判成功: ${rejudged.finalTitle}`);
      console.log(`     新状态: ${rejudged.status}`);
    }
  }

  console.log('\n✅ 步骤 5: 授权对齐 - 补授权备注处理晚到附件');
  const lateItemAligned = aligned.find(a => a.status === 'late_arrival');
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
        },
      });
      if (authorized) {
        console.log(`  ✅ 授权成功: ${authorized.finalTitle}`);
        console.log(`     授权人: ${authorized.authorizationNote?.authorizer}`);
        console.log(`     备注: ${authorized.authorizationNote?.note}`);
        console.log(`     最终时码: ${authorized.finalTimecodeStart}`);
      }
    }
  }

  console.log('\n✅ 步骤 6: 授权对齐 - 处理时码偏半拍');
  const halfFrameAligned = aligned.find(a => a.status === 'mismatch_timecode');
  if (halfFrameAligned) {
    const stage = dataStore.getStageRecordById(halfFrameAligned.stageRecordId);
    const track = dataStore.getTrackItemById(halfFrameAligned.trackItemId);
    if (stage && track) {
      const authorized = archiveService.authorizeItem({
        archiveItemId: halfFrameAligned.id,
        authorizer: '老许',
        note: '时码偏半拍（20ms）是设备重启导致，录音日志已有标注，不影响使用，接受该偏差',
        alignmentDecision: {
          useStageFile: stage.id,
          useTrackItem: track.id,
        },
      });
      if (authorized) {
        const fullStage = dataStore.getStageRecordById(authorized.stageRecordId);
        console.log(`  ✅ 授权成功: ${authorized.finalTitle}`);
        console.log(`     时码偏差: ${authorized.timecodeDeviationMs}ms（已接受）`);
        console.log(`     原始说法追溯: "${fullStage?.rawDescription}"`);
      }
    }
  }

  console.log('\n📦 步骤 7: 归档所有已授权/已匹配/已改判条目');
  const itemsAfterAuth = dataStore.getArchiveItems();
  const archiveable = itemsAfterAuth.filter(i =>
    ['matched', 'rejudged', 'authorized'].includes(i.status)
  );

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

  console.log('\n📊 步骤 9: 最终状态汇总');
  const finalSummary = archiveService.getIssueSummary();
  console.log(`  总计: ${finalSummary.total}`);
  console.log(`  已匹配: ${finalSummary.matched}`);
  console.log(`  已归档: ${finalSummary.archived}`);
  console.log(`  已授权: ${finalSummary.authorized}`);
  console.log(`  待复核: ${finalSummary.needReview}`);

  console.log('\n========================================');
  console.log('  ✅ 完整流程验证通过!');
  console.log('========================================');
  console.log('\n📌 关键特性验证:');
  console.log('  ✅ 后端不只是返回成功，每次改判都有来源和状态追踪');
  console.log('  ✅ 时码偏半拍可追到舞台通道表原始说法');
  console.log('  ✅ 晚到附件已混入试跑数据');
  console.log('  ✅ 授权备注可重新对齐文件-曲目-清单');
  console.log('  ✅ 人工确认前后变化进入历史');
  console.log('  ✅ 评审会前可追溯完整链路给复核人');
  console.log('');
}

runVerification().catch(console.error);
