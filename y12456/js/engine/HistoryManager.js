class HistoryManager {
  constructor() {
    this.storageKey = 'drum_tower_defense_history';
    this.maxRecords = 100;
    this.records = this.loadRecords();
  }

  loadRecords() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  }

  saveRecords() {
    try {
      if (this.records.length > this.maxRecords) {
        this.records = this.records.slice(-this.maxRecords);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  addGameRecord(summary) {
    const record = {
      id: `record_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...summary,
    };
    
    this.records.push(record);
    this.saveRecords();
    
    return record;
  }

  getRecords(filters = {}) {
    let records = [...this.records];
    
    if (filters.levelId) {
      records = records.filter(r => r.levelId === filters.levelId);
    }
    if (filters.status) {
      records = records.filter(r => r.status === filters.status);
    }
    if (filters.minScore) {
      records = records.filter(r => r.finalScore >= filters.minScore);
    }
    if (filters.startDate) {
      records = records.filter(r => new Date(r.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      records = records.filter(r => new Date(r.createdAt) <= new Date(filters.endDate));
    }
    
    return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getRecordById(id) {
    return this.records.find(r => r.id === id);
  }

  getLevelStats(levelId) {
    const records = this.getRecords({ levelId });
    
    if (records.length === 0) {
      return null;
    }
    
    const scores = records.map(r => r.finalScore);
    const accuracies = records.map(r => r.stats.accuracy);
    
    return {
      levelId,
      playCount: records.length,
      winCount: records.filter(r => r.status === 'won').length,
      bestScore: Math.max(...scores),
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestAccuracy: Math.max(...accuracies),
      avgAccuracy: Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length),
      bestGrade: records.reduce((best, r) => {
        const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'F'];
        return gradeOrder.indexOf(r.grade) < gradeOrder.indexOf(best) ? r.grade : best;
      }, 'F'),
      totalPlayTime: records.reduce((sum, r) => sum + r.duration, 0),
    };
  }

  getSpeedDriftHistory(levelId = null) {
    const records = levelId ? this.getRecords({ levelId }) : this.records;
    
    return records.map(r => ({
      recordId: r.id,
      levelId: r.levelId,
      levelName: r.levelName,
      createdAt: r.createdAt,
      targetBpm: r.stats.targetBpm || 0,
      driftCount: r.stats.speedDriftCount,
      driftEvents: r.speedDriftEvents,
      bpmHistory: r.bpmHistory,
    }));
  }

  exportRecords(format = 'json', filters = {}) {
    const records = this.getRecords(filters);
    
    switch (format) {
      case 'json':
        return JSON.stringify(records, null, 2);
      case 'csv':
        return this.exportToCSV(records);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  exportToCSV(records) {
    const headers = [
      '日期',
      '关卡ID',
      '关卡名称',
      '关卡版本',
      '数据源',
      '最终得分',
      '评级',
      '状态',
      '准确率',
      '重音准确率',
      '切分准确率',
      '完美数',
      '良好数',
      '漏拍数',
      '抢拍数',
      '拖拍数',
      '速度漂移次数',
      '总错误数',
      '游戏时长(秒)',
      '波次完成数',
      '剩余生命',
      '建造塔数',
      '总击杀',
    ];
    
    const rows = records.map(r => [
      new Date(r.createdAt).toLocaleString('zh-CN'),
      r.levelId,
      r.levelName,
      r.levelVersion,
      r.levelSource,
      r.finalScore,
      r.grade,
      r.status === 'won' ? '胜利' : '失败',
      r.stats.accuracy,
      r.stats.accentAccuracy,
      r.stats.syncopationAccuracy,
      r.stats.perfectCount,
      r.stats.goodCount,
      r.stats.missCount,
      r.stats.earlyCount,
      r.stats.lateCount,
      r.stats.speedDriftCount,
      r.stats.totalErrors,
      Math.round(r.duration / 1000),
      r.stats.wavesCompleted,
      r.stats.livesRemaining,
      r.stats.towersBuilt,
      r.stats.totalKills,
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  exportScoreCard(recordId) {
    const record = this.getRecordById(recordId);
    if (!record) return null;
    
    return {
      header: {
        title: '鼓点塔防排练室 - 评分表',
        recordId: record.id,
        date: new Date(record.createdAt).toLocaleString('zh-CN'),
      },
      levelInfo: {
        id: record.levelId,
        name: record.levelName,
        version: record.levelVersion,
        source: record.levelSource,
        targetBpm: record.level.targetBpm,
        difficulty: record.level.difficulty,
      },
      gameInfo: {
        engineVersion: record.gameVersion,
        dataSource: record.dataSource,
        duration: Math.round(record.duration / 1000) + '秒',
        status: record.status === 'won' ? '通关' : '失败',
      },
      overallScore: {
        score: record.finalScore,
        grade: record.grade,
        accuracy: record.stats.accuracy + '%',
      },
      rhythmPerformance: this.calculateRhythmPerformance(record),
      errorAnalysis: this.calculateErrorAnalysis(record),
      speedAnalysis: this.calculateSpeedAnalysis(record),
      scoreBreakdown: record.scoreBreakdown,
      objectives: record.objectives,
      towerPerformance: record.towerPerformance,
      recommendations: this.generateRecommendations(record),
    };
  }

  calculateRhythmPerformance(record) {
    const stats = record.stats;
    const total = stats.perfectCount + stats.goodCount + stats.missCount + stats.earlyCount + stats.lateCount;
    
    return {
      totalBeats: total,
      perfect: {
        count: stats.perfectCount,
        percentage: total > 0 ? Math.round((stats.perfectCount / total) * 100) : 0,
        score: stats.perfectCount * CONFIG.SCORE_PERFECT,
      },
      good: {
        count: stats.goodCount,
        percentage: total > 0 ? Math.round((stats.goodCount / total) * 100) : 0,
        score: stats.goodCount * CONFIG.SCORE_GOOD,
      },
      early: {
        count: stats.earlyCount,
        percentage: total > 0 ? Math.round((stats.earlyCount / total) * 100) : 0,
        penalty: stats.earlyCount * Math.floor(CONFIG.SCORE_GOOD * RHYTHM_ERROR_TYPES.EARLY.penalty),
      },
      late: {
        count: stats.lateCount,
        percentage: total > 0 ? Math.round((stats.lateCount / total) * 100) : 0,
        penalty: stats.lateCount * Math.floor(CONFIG.SCORE_GOOD * RHYTHM_ERROR_TYPES.LATE.penalty),
      },
      miss: {
        count: stats.missCount,
        percentage: total > 0 ? Math.round((stats.missCount / total) * 100) : 0,
        penalty: stats.missCount * CONFIG.SCORE_MISS,
      },
      accentAccuracy: stats.accentAccuracy + '%',
      syncopationAccuracy: stats.syncopationAccuracy + '%',
    };
  }

  calculateErrorAnalysis(record) {
    const errors = record.errorLogs;
    const grouped = {};
    
    errors.forEach(err => {
      if (!grouped[err.type]) {
        grouped[err.type] = {
          type: err.type,
          name: err.name,
          description: err.description,
          color: err.color,
          count: 0,
          times: [],
          details: [],
        };
      }
      grouped[err.type].count++;
      grouped[err.type].times.push(err.time);
      grouped[err.type].details.push(err.details);
    });
    
    return Object.values(grouped).map(g => ({
      ...g,
      firstOccurrence: Math.min(...g.times),
      lastOccurrence: Math.max(...g.times),
    })).sort((a, b) => b.count - a.count);
  }

  calculateSpeedAnalysis(record) {
    const driftEvents = record.speedDriftEvents;
    const bpmHistory = record.bpmHistory || [];
    
    let avgBpm = 0;
    let maxBpm = 0;
    let minBpm = Infinity;
    
    bpmHistory.forEach(h => {
      avgBpm += h.bpm;
      maxBpm = Math.max(maxBpm, h.bpm);
      minBpm = Math.min(minBpm, h.bpm);
    });
    
    if (bpmHistory.length > 0) {
      avgBpm = avgBpm / bpmHistory.length;
    }
    
    return {
      targetBpm: record.level.targetBpm,
      averageBpm: avgBpm.toFixed(1),
      maxBpm: maxBpm.toFixed(1),
      minBpm: minBpm.toFixed(1),
      driftCount: driftEvents.length,
      driftEvents: driftEvents.map(d => ({
        time: Math.round(d.time / 1000) + 's',
        driftAmount: d.driftAmount.toFixed(1),
        severity: d.severity,
      })),
      stability: driftEvents.length === 0 ? '优秀' : 
                 driftEvents.length <= 2 ? '良好' : 
                 driftEvents.length <= 5 ? '一般' : '较差',
    };
  }

  generateRecommendations(record) {
    const recommendations = [];
    const stats = record.stats;
    
    if (stats.earlyCount > stats.lateCount && stats.earlyCount > 3) {
      recommendations.push({
        type: 'timing',
        priority: 'high',
        title: '抢拍问题',
        description: `你有 ${stats.earlyCount} 次抢拍，建议使用节拍器放慢速度练习，注意等待节拍到来再击打。`,
      });
    }
    
    if (stats.lateCount > stats.earlyCount && stats.lateCount > 3) {
      recommendations.push({
        type: 'timing',
        priority: 'high',
        title: '拖拍问题',
        description: `你有 ${stats.lateCount} 次拖拍，建议加强身体律动，提前预判节拍位置。`,
      });
    }
    
    if (stats.accentAccuracy < 80) {
      recommendations.push({
        type: 'accent',
        priority: 'high',
        title: '重音不足',
        description: `重音准确率只有 ${stats.accentAccuracy}%，需要特别注意强拍的力度区分。`,
      });
    }
    
    if (stats.syncopationAccuracy < 80) {
      recommendations.push({
        type: 'syncopation',
        priority: 'medium',
        title: '切分节奏',
        description: `切分准确率为 ${stats.syncopationAccuracy}%，建议单独练习切分节奏，强调弱拍的位置感。`,
      });
    }
    
    if (stats.speedDriftCount > 3) {
      recommendations.push({
        type: 'speed',
        priority: 'high',
        title: '速度漂移',
        description: `出现了 ${stats.speedDriftCount} 次速度漂移，需要用脚打拍或使用节拍器保持稳定速度。`,
      });
    }
    
    if (stats.missCount > 5) {
      recommendations.push({
        type: 'miss',
        priority: 'medium',
        title: '漏拍较多',
        description: `漏拍 ${stats.missCount} 次，建议先放慢速度，确保每个节拍都能准确击打。`,
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'excellent',
        priority: 'low',
        title: '表现优秀',
        description: '你的节奏稳定性和准确性都很好，可以尝试提高难度或速度。',
      });
    }
    
    return recommendations;
  }

  clearRecords() {
    this.records = [];
    this.saveRecords();
  }

  deleteRecord(id) {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx > -1) {
      this.records.splice(idx, 1);
      this.saveRecords();
      return true;
    }
    return false;
  }
}

const historyManager = new HistoryManager();
