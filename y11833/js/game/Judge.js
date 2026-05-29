class Judge {
  constructor() {
    this.windows = {
      PERFECT: 50,
      GREAT: 100,
      GOOD: 150
    };
    this.judgments = [];
    this.pendingJudgments = [];
  }
  
  judge(note, hitTimeSeconds) {
    const noteTimeMs = note.time * 1000;
    const hitTimeMs = hitTimeSeconds * 1000;
    const timeDiff = hitTimeMs - noteTimeMs;
    const absDiff = Math.abs(timeDiff);
    
    let judgment;
    let errorReason = null;
    let score = 0;
    
    if (absDiff <= this.windows.PERFECT) {
      judgment = 'PERFECT';
      score = 100;
    } else if (absDiff <= this.windows.GREAT) {
      judgment = 'GREAT';
      score = 80;
    } else if (absDiff <= this.windows.GOOD) {
      judgment = 'GOOD';
      score = 50;
    } else {
      judgment = 'MISS';
      errorReason = timeDiff < 0 ? '早按' : '晚按';
      score = 0;
    }
    
    const isPending = this.isPendingCase(note, timeDiff);
    
    const result = {
      note,
      judgment,
      timeDiff,
      errorReason,
      score,
      isPending,
      timestamp: hitTimeSeconds
    };
    
    if (isPending) {
      this.pendingJudgments.push({
        ...result,
        pendingReason: this.getPendingReason(note, timeDiff),
        userConfirmed: null
      });
    }
    
    this.judgments.push(result);
    
    return result;
  }
  
  isPendingCase(note, timeDiff) {
    if (note.type === 'syncopated' && Math.abs(timeDiff) > 80) return true;
    if (note.inSpeedChangeZone) return true;
    if (note.comboCritical) return true;
    return false;
  }
  
  getPendingReason(note, timeDiff) {
    if (note.type === 'syncopated') {
      return Math.abs(timeDiff) > 100 ? '切分音判定待确认 - 偏差较大' : '切分音判定待确认';
    }
    if (note.inSpeedChangeZone) return '速度变化区间判定';
    if (note.comboCritical) return '连击临界判定';
    return '特殊判定待确认';
  }
  
  miss(note) {
    const result = {
      note,
      judgment: 'MISS',
      timeDiff: null,
      errorReason: note.type === 'syncopated' ? '切分音漏拍' : '漏拍',
      score: 0,
      isPending: note.type === 'syncopated',
      timestamp: note.time + 0.5
    };
    
    if (note.type === 'syncopated') {
      this.pendingJudgments.push({
        ...result,
        pendingReason: '切分音漏拍 - 请确认是否为教学重点',
        userConfirmed: null
      });
    }
    
    this.judgments.push(result);
    return result;
  }
  
  confirmJudgment(index, confirmed) {
    if (this.pendingJudgments[index]) {
      this.pendingJudgments[index].userConfirmed = confirmed;
    }
  }
  
  getStatistics() {
    const stats = {
      total: this.judgments.length,
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      totalScore: 0,
      errorReasons: {
        '早按': 0,
        '晚按': 0,
        '漏拍': 0,
        '切分音漏拍': 0
      }
    };
    
    this.judgments.forEach(j => {
      stats[j.judgment.toLowerCase()]++;
      stats.totalScore += j.score;
      if (j.errorReason) {
        stats.errorReasons[j.errorReason] = (stats.errorReasons[j.errorReason] || 0) + 1;
      }
    });
    
    const weighted = stats.perfect * 100 + stats.great * 80 + stats.good * 50;
    const maxPossible = stats.total * 100;
    stats.accuracy = maxPossible > 0 ? (weighted / maxPossible * 100).toFixed(1) : '0.0';
    
    return stats;
  }
  
  getPendingList() {
    return this.pendingJudgments;
  }
  
  reset() {
    this.judgments = [];
    this.pendingJudgments = [];
  }
}
