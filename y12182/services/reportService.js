const db = require('../data/database');
const { Report } = require('../data/models');
const fs = require('fs');
const path = require('path');

class ReportService {
  generateReportId() {
    const count = db.reports.length + 1;
    return `RP${String(count).padStart(3, '0')}`;
  }

  analyzeEmotions(emotionRecords) {
    if (!emotionRecords || emotionRecords.length === 0) {
      return {
        averageIntensity: 0,
        dominantEmotion: '无数据',
        emotionDistribution: {},
        trend: '无数据'
      };
    }

    const emotionCount = {};
    let totalIntensity = 0;

    emotionRecords.forEach(record => {
      emotionCount[record.emotion] = (emotionCount[record.emotion] || 0) + 1;
      totalIntensity += parseInt(record.intensity);
    });

    const sortedEmotions = Object.entries(emotionCount).sort((a, b) => b[1] - a[1]);
    const dominantEmotion = sortedEmotions[0] ? sortedEmotions[0][0] : '无数据';

    return {
      averageIntensity: Math.round(totalIntensity / emotionRecords.length),
      dominantEmotion,
      emotionDistribution: emotionCount,
      totalRecords: emotionRecords.length
    };
  }

  generateReport(sessionId) {
    const session = db.playSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`播放会话 ${sessionId} 不存在`);
    }

    const playlist = db.getPlaylist(session.playlistId);
    const patient = db.getPatient(playlist.patientId);
    const sleepScores = db.getSleepScoresByPatient(playlist.patientId);
    const emotionRecords = session.emotionRecords.map(id => 
      db.emotionRecords.find(e => e.id === id)
    ).filter(Boolean);

    const emotionAnalysis = this.analyzeEmotions(emotionRecords);

    const summary = this.generateSummary(patient, playlist, session, emotionAnalysis, sleepScores);
    const issues = this.analyzeIssues(session.issues, playlist);
    const recommendations = this.generateRecommendations(emotionAnalysis, issues, playlist);

    const report = new Report(
      this.generateReportId(),
      playlist.patientId,
      session.playlistId,
      sessionId,
      summary,
      emotionAnalysis,
      issues,
      recommendations,
      new Date().toISOString()
    );

    db.addReport(report);

    console.log(`报告 ${report.id} 已生成`);
    console.log(`  - 患者: ${patient.name}`);
    console.log(`  - 主导情绪: ${emotionAnalysis.dominantEmotion}`);
    console.log(`  - 发现问题: ${issues.length} 个`);
    console.log(`  - 建议: ${recommendations.length} 条`);

    return report;
  }

  generateSummary(patient, playlist, session, emotionAnalysis, sleepScores) {
    const avgSleepScore = sleepScores.length > 0 
      ? Math.round(sleepScores.reduce((sum, s) => sum + s.score, 0) / sleepScores.length)
      : '无数据';

    const sessionDuration = session.endTime 
      ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60)
      : '进行中';

    return {
      patientName: patient.name,
      patientId: patient.id,
      diagnosis: patient.diagnosis,
      playlistName: playlist.name,
      playlistId: playlist.id,
      sessionId: session.id,
      sessionStatus: session.status,
      sessionDuration: sessionDuration,
      avgSleepScore: avgSleepScore,
      avgEmotionIntensity: emotionAnalysis.averageIntensity,
      dominantEmotion: emotionAnalysis.dominantEmotion,
      totalTracks: playlist.tracks.length,
      emotionRecordsCount: emotionAnalysis.totalRecords || 0
    };
  }

  analyzeIssues(issues, playlist) {
    const analyzedIssues = issues.map(issue => {
      const track = issue.track || (issue.trackId ? playlist.tracks.find(t => t.id === issue.trackId) : null);
      
      return {
        ...issue,
        trackName: track ? track.name : '未知曲目',
        explanation: this.getIssueExplanation(issue.type),
        actionRequired: this.getActionRequired(issue.severity)
      };
    });

    return analyzedIssues;
  }

  getIssueExplanation(type) {
    const explanations = {
      'forbidden_high': '严重禁忌曲目：该曲目已被明确标记为患者禁忌，可能引发严重情绪反应或生理不适。',
      'forbidden_medium': '中度禁忌曲目：该曲目可能对患者产生负面影响，建议谨慎使用。',
      'forbidden_during_playback': '播放时发现禁忌曲目：该曲目在播放过程中触发了禁忌警报。',
      'emotion_sudden_change': '情绪突变：患者在播放过程中出现剧烈情绪变化，需要立即关注。',
      'negative_emotion': '负面情绪：患者出现较强的负面情绪反应，建议观察。',
      'excessive_repeat': '过度重复播放：曲目被重复播放多次，可能表明强迫行为或其他问题。',
      'duplicate': '重复曲目：播放列表中存在重复曲目。',
      'duration': '时长过长：播放总时长超过建议值，可能导致患者疲劳。'
    };
    return explanations[type] || '未知问题类型';
  }

  getActionRequired(severity) {
    if (severity === 'high') {
      return '需要立即处理：建议暂停播放，评估患者状态，必要时进行干预。';
    } else if (severity === 'medium') {
      return '需要关注：建议密切观察患者反应，考虑调整播放计划。';
    }
    return '建议关注：可继续观察，根据情况决定是否需要调整。';
  }

  generateRecommendations(emotionAnalysis, issues, playlist) {
    const recommendations = [];

    const negativeEmotions = ['焦虑', '悲伤', '恐惧', '烦躁'];
    if (negativeEmotions.includes(emotionAnalysis.dominantEmotion)) {
      recommendations.push({
        type: 'playlist_adjustment',
        priority: 'high',
        title: '调整播放列表情绪倾向',
        content: `当前主导情绪为"${emotionAnalysis.dominantEmotion}"，建议增加更多平静、舒缓的曲目。`
      });
    }

    if (emotionAnalysis.averageIntensity >= 7) {
      recommendations.push({
        type: 'intensity_management',
        priority: 'medium',
        title: '情绪强度管理',
        content: `患者平均情绪强度较高(${emotionAnalysis.averageIntensity})，建议增加渐进式放松曲目。`
      });
    }

    const forbiddenIssues = issues.filter(i => 
      i.type.includes('forbidden') || i.type === 'forbidden_during_playback'
    );
    if (forbiddenIssues.length > 0) {
      recommendations.push({
        type: 'forbidden_review',
        priority: 'high',
        title: '禁忌曲目复核',
        content: `发现 ${forbiddenIssues.length} 个禁忌相关问题，建议立即复核播放列表并更新禁忌曲目库。`
      });
    }

    const emotionIssues = issues.filter(i => 
      i.type === 'emotion_sudden_change' || i.type === 'negative_emotion'
    );
    if (emotionIssues.length > 0) {
      recommendations.push({
        type: 'emotion_support',
        priority: 'high',
        title: '情绪支持干预',
        content: `记录到 ${emotionIssues.length} 次显著情绪反应，建议配合心理咨询或其他支持性干预。`
      });
    }

    const repeatIssues = issues.filter(i => i.type === 'excessive_repeat');
    if (repeatIssues.length > 0) {
      recommendations.push({
        type: 'behavior_observation',
        priority: 'medium',
        title: '重复行为观察',
        content: '观察到过度重复播放行为，建议评估是否存在强迫性行为倾向。'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'maintain',
        priority: 'low',
        title: '继续当前方案',
        content: '本次播放整体顺利，建议继续观察，根据患者反馈微调。'
      });
    }

    return recommendations;
  }

  exportReportToText(reportId) {
    const report = db.getReport(reportId);
    if (!report) {
      throw new Error(`报告 ${reportId} 不存在`);
    }

    const patient = db.getPatient(report.patientId);
    const playlist = db.getPlaylist(report.playlistId);
    const session = db.playSessions.find(s => s.id === report.sessionId);
    const modificationLogs = db.getModificationLogsByPlaylist(report.playlistId);
    const validationResult = db.getValidationResultByPlaylist(report.playlistId);

    let content = '';
    content += '='.repeat(60) + '\n';
    content += '           音乐疗愈播放计划报告\n';
    content += '='.repeat(60) + '\n\n';
    
    content += '【基本信息】\n';
    content += '-' .repeat(40) + '\n';
    content += `报告编号: ${report.id}\n`;
    content += `生成时间: ${report.generatedAt}\n`;
    content += `患者姓名: ${patient.name}\n`;
    content += `患者编号: ${patient.id}\n`;
    content += `诊断: ${patient.diagnosis}\n`;
    content += `播放计划: ${playlist.name} (${playlist.id})\n`;
    content += `治疗师: ${playlist.therapistId}\n\n`;

    content += '【播放概要】\n';
    content += '-' .repeat(40) + '\n';
    content += `会话编号: ${report.summary.sessionId}\n`;
    content += `会话状态: ${this.getStatusText(report.summary.sessionStatus)}\n`;
    content += `播放时长: ${report.summary.sessionDuration} 分钟\n`;
    content += `曲目数量: ${report.summary.totalTracks} 首\n`;
    content += `情绪记录: ${report.summary.emotionRecordsCount} 条\n\n`;

    content += '【情绪分析】\n';
    content += '-' .repeat(40) + '\n';
    content += `主导情绪: ${report.emotionAnalysis.dominantEmotion}\n`;
    content += `平均情绪强度: ${report.emotionAnalysis.averageIntensity}/10\n`;
    content += `情绪分布:\n`;
    Object.entries(report.emotionAnalysis.emotionDistribution).forEach(([emotion, count]) => {
      content += `  - ${emotion}: ${count} 次\n`;
    });
    content += '\n';

    if (report.issues.length > 0) {
      content += '【发现问题】\n';
      content += '-' .repeat(40) + '\n';
      report.issues.forEach((issue, index) => {
        content += `${index + 1}. [${this.getSeverityText(issue.severity)}] ${issue.trackName}\n`;
        content += `   ${issue.message}\n`;
        content += `   说明: ${issue.explanation}\n`;
        content += `   处理建议: ${issue.actionRequired}\n\n`;
      });
    }

    content += '【建议措施】\n';
    content += '-' .repeat(40) + '\n';
    report.recommendations.forEach((rec, index) => {
      content += `${index + 1}. [${this.getPriorityText(rec.priority)}] ${rec.title}\n`;
      content += `   ${rec.content}\n\n`;
    });

    if (modificationLogs.length > 0) {
      content += '【修改记录】\n';
      content += '-' .repeat(40) + '\n';
      modificationLogs.forEach((log, index) => {
        content += `${index + 1}. ${log.timestamp}\n`;
        content += `   操作人: ${log.operator}\n`;
        content += `   修改字段: ${log.field}\n`;
        content += `   原因: ${log.reason}\n\n`;
      });
    }

    if (validationResult) {
      content += '【校验结果】\n';
      content += '-' .repeat(40) + '\n';
      content += `校验状态: ${validationResult.isValid ? '通过' : '未通过'}\n`;
      content += `警告数量: ${validationResult.warnings.length}\n`;
      content += `错误数量: ${validationResult.errors.length}\n`;
      content += `禁忌匹配: ${validationResult.forbiddenMatches.length} 首\n`;
    }

    content += '\n' + '='.repeat(60) + '\n';
    content += '                  报告结束\n';
    content += '='.repeat(60) + '\n';

    return content;
  }

  getStatusText(status) {
    const statusMap = {
      'completed': '已完成',
      'interrupted': '已中断',
      'playing': '播放中'
    };
    return statusMap[status] || status;
  }

  getSeverityText(severity) {
    const severityMap = {
      'high': '严重',
      'medium': '中等',
      'low': '轻微'
    };
    return severityMap[severity] || severity;
  }

  getPriorityText(priority) {
    const priorityMap = {
      'high': '高优先级',
      'medium': '中优先级',
      'low': '低优先级'
    };
    return priorityMap[priority] || priority;
  }

  downloadReport(reportId, outputPath = null) {
    const content = this.exportReportToText(reportId);
    const report = db.getReport(reportId);
    
    const fileName = `音乐疗愈报告_${report.id}_${new Date().toISOString().slice(0, 10)}.txt`;
    const filePath = outputPath || path.join(process.cwd(), 'reports', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`报告已下载到: ${filePath}`);

    return {
      filePath,
      fileName,
      content
    };
  }

  getTraceabilityInfo(resultId, type = 'report') {
    let report, session, playlist, patient;

    if (type === 'report') {
      report = db.getReport(resultId);
      if (!report) return null;
      session = db.playSessions.find(s => s.id === report.sessionId);
      playlist = db.getPlaylist(report.playlistId);
      patient = db.getPatient(report.patientId);
    } else if (type === 'session') {
      session = db.playSessions.find(s => s.id === resultId);
      if (!session) return null;
      playlist = db.getPlaylist(session.playlistId);
      patient = db.getPatient(playlist.patientId);
      report = db.reports.find(r => r.sessionId === session.id);
    } else if (type === 'playlist') {
      playlist = db.getPlaylist(resultId);
      if (!playlist) return null;
      patient = db.getPatient(playlist.patientId);
      session = db.playSessions.find(s => s.playlistId === playlist.id);
      report = db.reports.find(r => r.playlistId === playlist.id);
    }

    const validationResult = db.getValidationResultByPlaylist(playlist.id);
    const modificationLogs = db.getModificationLogsByPlaylist(playlist.id);
    const forbiddenTracks = db.getForbiddenTracksByPatient(patient.id);
    const sleepScores = db.getSleepScoresByPatient(patient.id);
    const emotionRecords = session ? session.emotionRecords.map(id => 
      db.emotionRecords.find(e => e.id === id)
    ).filter(Boolean) : [];

    return {
      patient,
      playlist,
      session,
      report,
      validationResult,
      modificationLogs,
      forbiddenTracks,
      sleepScores,
      emotionRecords
    };
  }
}

module.exports = new ReportService();
