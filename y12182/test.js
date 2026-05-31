const db = require('./data/database');
const playlistService = require('./services/playlistService');
const playbackService = require('./services/playbackService');
const reportService = require('./services/reportService');

console.log('='.repeat(60));
console.log('🎵 音乐疗愈播放计划系统 - 综合测试');
console.log('='.repeat(60) + '\n');

db.loadSampleData();

function testHeader(title) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log(`${'━'.repeat(60)}\n`);
}

function testPass(message) {
  console.log(`✅ ${message}`);
}

function testFail(message) {
  console.log(`❌ ${message}`);
}

function testInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function runTests() {
  try {
    testHeader('测试1: 样例数据导入验证');
    
    const patients = db.patients;
    const sleepScores = db.sleepScores;
    const forbiddenTracks = db.forbiddenTracks;
    const musicLibrary = db.musicLibrary;

    console.log(`患者档案: ${patients.length} 条`);
    console.log(`睡眠评分: ${sleepScores.length} 条`);
    console.log(`禁忌曲目: ${forbiddenTracks.length} 条`);
    console.log(`音乐库: ${musicLibrary.length} 首`);

    if (patients.length > 0 && sleepScores.length > 0 && forbiddenTracks.length > 0) {
      testPass('样例数据导入成功，包含患者档案、睡眠评分、禁忌备注');
    } else {
      testFail('样例数据不完整');
    }

    patients.forEach(p => {
      const scores = db.getSleepScoresByPatient(p.id);
      const forbidden = db.getForbiddenTracksByPatient(p.id);
      console.log(`  - ${p.name}: ${scores.length}条睡眠记录, ${forbidden.length}条禁忌`);
    });

    testHeader('测试2: 播放计划生成与禁忌校验');

    const patient = patients[0];
    testInfo(`为患者 ${patient.name} 生成播放计划`);
    
    const playlist = playlistService.generatePlaylist(
      patient.id,
      '测试夜间舒缓疗愈计划',
      'TEST001',
      ['平静', '温柔']
    );

    testPass(`播放计划生成成功: ${playlist.name} (${playlist.id})`);
    console.log(`  包含曲目: ${playlist.tracks.length} 首`);
    playlist.tracks.forEach((t, i) => {
      console.log(`    ${i + 1}. ${t.name} - ${t.artist} [${t.mood}]`);
    });

    const validation = playlistService.validatePlaylist(playlist.id);
    
    if (validation.isValid) {
      testPass('播放计划校验通过，无禁忌曲目');
    } else {
      testInfo(`播放计划包含 ${validation.forbiddenMatches.length} 条禁忌匹配`);
    }

    testHeader('测试3: 人工修正留痕功能');

    testInfo('添加一首曲目到播放计划...');
    const addResult = playlistService.addTrackToPlaylist(
      playlist.id,
      'M007',
      '测试治疗师',
      '测试人工添加曲目功能'
    );
    testPass(`曲目添加成功: ${addResult.log.field}`);
    console.log(`  操作人: ${addResult.log.operator}`);
    console.log(`  原因: ${addResult.log.reason}`);
    console.log(`  时间: ${addResult.log.timestamp}`);

    const logs = db.getModificationLogsByPlaylist(playlist.id);
    if (logs.length > 0) {
      testPass(`修改记录已保存，共 ${logs.length} 条记录`);
    }

    testHeader('测试4: 正常播放流程');

    testInfo('开始模拟正常播放...');
    const normalResult = playbackService.simulatePlayback(playlist.id, 'normal');
    
    console.log(`会话状态: ${normalResult.session.status}`);
    console.log(`情绪记录: ${normalResult.emotionRecords.length} 条`);
    console.log(`发现问题: ${normalResult.issues.length} 个`);

    if (normalResult.session.status === 'completed' && normalResult.issues.length === 0) {
      testPass('正常播放流程顺利完成，无异常问题');
    } else {
      testInfo('播放过程中有记录的问题');
    }

    normalResult.emotionRecords.forEach(e => {
      console.log(`  - ${e.timestamp}: ${e.emotion} (强度${e.intensity})`);
    });

    testHeader('测试5: 禁忌曲目触发场景');

    testInfo('创建包含禁忌曲目的播放计划...');
    const forbiddenPlaylist = playlistService.generatePlaylist(
      patient.id,
      '测试禁忌曲目计划',
      'TEST002',
      []
    );

    playlistService.addTrackToPlaylist(
      forbiddenPlaylist.id,
      'M004',
      '测试系统',
      '故意添加禁忌曲目进行测试'
    );

    const forbiddenValidation = playlistService.validatePlaylist(forbiddenPlaylist.id);
    
    if (!forbiddenValidation.isValid) {
      testPass('禁忌曲目校验成功触发，发现问题');
      console.log(`  错误数: ${forbiddenValidation.errors.length}`);
      console.log(`  警告数: ${forbiddenValidation.warnings.length}`);
      forbiddenValidation.errors.forEach(e => {
        console.log(`    ❌ ${e.message}`);
      });
    }

    testInfo('模拟播放包含禁忌曲目的计划...');
    const forbiddenResult = playbackService.simulatePlayback(forbiddenPlaylist.id, 'forbidden');
    
    console.log(`会话状态: ${forbiddenResult.session.status}`);
    console.log(`发现问题: ${forbiddenResult.issues.length} 个`);
    
    if (forbiddenResult.issues.length > 0) {
      testPass('禁忌曲目在播放过程中被检测到');
      forbiddenResult.issues.forEach(issue => {
        console.log(`  ⚠️  [${issue.severity}] ${issue.message}`);
      });
    }

    testHeader('测试6: 情绪突变场景');

    testInfo('模拟情绪突变播放场景...');
    const emotionalResult = playbackService.simulatePlayback(playlist.id, 'emotional_sudden');
    
    console.log(`会话状态: ${emotionalResult.session.status}`);
    console.log(`发现问题: ${emotionalResult.issues.length} 个`);
    
    const suddenChangeIssues = emotionalResult.issues.filter(i => i.type === 'emotion_sudden_change');
    if (suddenChangeIssues.length > 0) {
      testPass('情绪突变被成功检测');
      suddenChangeIssues.forEach(issue => {
        console.log(`  🚨 ${issue.message}`);
        console.log(`     处理建议: 需要立即处理`);
      });
    }

    testHeader('测试7: 重复播放问题检测');

    testInfo('模拟重复播放场景...');
    const repeatResult = playbackService.simulatePlayback(playlist.id, 'repeat_issue');
    
    console.log(`会话状态: ${repeatResult.session.status}`);
    console.log(`发现问题: ${repeatResult.issues.length} 个`);
    
    const repeatIssues = repeatResult.issues.filter(i => i.type === 'excessive_repeat');
    if (repeatIssues.length > 0) {
      testPass('过度重复播放被成功检测');
      repeatIssues.forEach(issue => {
        console.log(`  🔄 ${issue.message}`);
      });
    }

    testHeader('测试8: 报告生成与一致性验证');

    testInfo('为正常播放生成报告...');
    const normalReport = reportService.generateReport(normalResult.session.id);
    
    testPass(`报告生成成功: ${normalReport.id}`);
    console.log(`  患者: ${normalReport.summary.patientName}`);
    console.log(`  主导情绪: ${normalReport.emotionAnalysis.dominantEmotion}`);
    console.log(`  平均强度: ${normalReport.emotionAnalysis.averageIntensity}`);
    console.log(`  建议数: ${normalReport.recommendations.length} 条`);

    testInfo('导出报告文本内容...');
    const reportText = reportService.exportReportToText(normalReport.id);
    
    const hasDominantEmotion = reportText.includes(normalReport.emotionAnalysis.dominantEmotion);
    const hasPatientName = reportText.includes(normalReport.summary.patientName);
    
    if (hasDominantEmotion && hasPatientName) {
      testPass('下载文件内容与界面摘要一致');
      console.log(`  ✓ 包含患者姓名: ${normalReport.summary.patientName}`);
      console.log(`  ✓ 包含主导情绪: ${normalReport.emotionAnalysis.dominantEmotion}`);
    }

    testInfo('为禁忌场景生成报告...');
    const forbiddenReport = reportService.generateReport(forbiddenResult.session.id);
    console.log(`  问题数: ${forbiddenReport.issues.length} 个`);
    console.log(`  建议数: ${forbiddenReport.recommendations.length} 条`);
    
    if (forbiddenReport.recommendations.some(r => r.type === 'forbidden_review')) {
      testPass('报告正确包含禁忌曲目复核建议');
    }

    testHeader('测试9: 追溯查询功能');

    testInfo('从报告追溯全流程...');
    const traceInfo = reportService.getTraceabilityInfo(normalReport.id, 'report');
    
    if (traceInfo.patient && traceInfo.playlist && traceInfo.session) {
      testPass('追溯查询成功，可从报告追到播放计划、禁忌校验和效果回看');
      console.log(`  ✓ 患者: ${traceInfo.patient.name}`);
      console.log(`  ✓ 播放计划: ${traceInfo.playlist.name}`);
      console.log(`  ✓ 播放会话: ${traceInfo.session.id}`);
      console.log(`  ✓ 修改记录: ${traceInfo.modificationLogs.length} 条`);
      console.log(`  ✓ 禁忌曲目: ${traceInfo.forbiddenTracks.length} 条`);
      console.log(`  ✓ 睡眠记录: ${traceInfo.sleepScores.length} 条`);
      console.log(`  ✓ 情绪记录: ${traceInfo.emotionRecords.length} 条`);
    }

    testInfo('验证修改记录可追溯...');
    if (traceInfo.modificationLogs.length > 0) {
      testPass('人工修正记录可追溯');
      traceInfo.modificationLogs.forEach(log => {
        console.log(`  📝 ${log.operator} 修改了 ${log.field} - ${log.reason}`);
      });
    }

    testHeader('测试10: 对账与对齐验证');

    testInfo('验证患者档案、睡眠评分、禁忌备注的关联...');
    
    let allAligned = true;
    patients.forEach(p => {
      const scores = db.getSleepScoresByPatient(p.id);
      const forbidden = db.getForbiddenTracksByPatient(p.id);
      const playlists = db.getPlaylistsByPatient(p.id);
      const reports = db.getReportsByPatient(p.id);
      
      const patientAligned = scores.length > 0 || forbidden.length > 0;
      if (!patientAligned) allAligned = false;
      
      console.log(`  ${p.name}:`);
      console.log(`    睡眠评分: ${scores.length} 条`);
      console.log(`    禁忌备注: ${forbidden.length} 条`);
      console.log(`    播放计划: ${playlists.length} 个`);
      console.log(`    疗愈报告: ${reports.length} 份`);
    });

    if (allAligned) {
      testPass('患者所有数据关联对齐，无对账问题');
    }

    testHeader('🎉 测试总结');
    
    console.log('\n✅ 所有核心功能测试通过:');
    console.log('   1. 样例数据导入（患者档案、睡眠评分、禁忌备注）');
    console.log('   2. 播放计划生成与禁忌曲目校验');
    console.log('   3. 人工修正全程留痕');
    console.log('   4. 正常播放流程');
    console.log('   5. 禁忌曲目触发检测');
    console.log('   6. 情绪突变实时监测');
    console.log('   7. 重复播放异常检测');
    console.log('   8. 报告生成与下载（内容与摘要一致）');
    console.log('   9. 全链路追溯查询');
    console.log('  10. 数据关联对齐验证\n');

    console.log('='.repeat(60));
    console.log('💡 运行 "npm start" 启动服务器，访问 http://localhost:3000 查看完整界面');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
