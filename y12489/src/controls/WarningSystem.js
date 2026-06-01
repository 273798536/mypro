export class WarningSystem {
  constructor() {
    this.warnings = [];
    this.listeners = {};
    this.nextId = 1;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  add(warning) {
    const existingIndex = this.warnings.findIndex(w => 
      w.type === warning.type && w.source === warning.source
    );

    if (existingIndex > -1) {
      const existing = this.warnings[existingIndex];
      if (existing.level === warning.level && existing.message === warning.message) {
        return existing.id;
      }
      this.warnings.splice(existingIndex, 1);
    }

    const warningWithId = {
      id: this.nextId++,
      timestamp: Date.now(),
      ...warning
    };

    this.warnings.push(warningWithId);
    this.sortWarnings();
    this.emit('warningAdded', warningWithId);
    this.emit('warningsChanged', this.warnings);
    
    return warningWithId.id;
  }

  remove(id) {
    const index = this.warnings.findIndex(w => w.id === id);
    if (index > -1) {
      const removed = this.warnings.splice(index, 1)[0];
      this.emit('warningRemoved', removed);
      this.emit('warningsChanged', this.warnings);
      return true;
    }
    return false;
  }

  removeByType(type) {
    const removed = [];
    this.warnings = this.warnings.filter(w => {
      if (w.type === type) {
        removed.push(w);
        return false;
      }
      return true;
    });
    if (removed.length > 0) {
      this.emit('warningsChanged', this.warnings);
    }
    return removed;
  }

  clear() {
    const oldWarnings = [...this.warnings];
    this.warnings = [];
    this.emit('warningsCleared', oldWarnings);
    this.emit('warningsChanged', this.warnings);
  }

  sortWarnings() {
    const levelOrder = { error: 0, warning: 1, info: 2 };
    this.warnings.sort((a, b) => {
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return b.timestamp - a.timestamp;
    });
  }

  processAngleCheck(checkResult, locationInfo) {
    if (checkResult.level === 'normal') {
      this.removeByType('angle');
      return null;
    }

    return this.add({
      type: 'angle',
      level: checkResult.level,
      title: checkResult.level === 'error' ? '迎角越界' : '迎角接近边界',
      message: checkResult.message,
      suggestion: checkResult.suggestion,
      location: locationInfo,
      source: 'parameter:angle',
      actionable: true,
      actionLabel: checkResult.level === 'error' ? '紧急修正' : '查看详情'
    });
  }

  processSamplingCheck(checkResult, locationInfo) {
    if (checkResult.level === 'normal') {
      this.removeByType('sampling');
      return null;
    }

    return this.add({
      type: 'sampling',
      level: checkResult.level,
      title: checkResult.level === 'error' ? '采样过密警告' : '采样密度偏高',
      message: checkResult.message,
      suggestion: checkResult.suggestion,
      location: locationInfo,
      source: 'parameter:sampling',
      actionable: true,
      actionLabel: checkResult.level === 'error' ? '拦截并修正' : '定位问题区域'
    });
  }

  processWindVersion(isSupplement, version) {
    if (isSupplement) {
      return this.add({
        type: 'wind',
        level: 'info',
        title: '风速补充版本',
        message: `已记录风速参数为 ${version}，与原有结果保存在同一对比空间内`,
        suggestion: '可在版本对比面板查看不同风速下的结果差异',
        source: 'parameter:wind',
        actionable: false
      });
    }
    this.removeByType('wind');
    return null;
  }

  getStatusSummary() {
    const errors = this.warnings.filter(w => w.level === 'error').length;
    const warnings = this.warnings.filter(w => w.level === 'warning').length;
    const infos = this.warnings.filter(w => w.level === 'info').length;

    let overall = 'normal';
    if (errors > 0) overall = 'error';
    else if (warnings > 0) overall = 'warning';

    return {
      overall,
      counts: { error: errors, warning: warnings, info: infos },
      total: this.warnings.length
    };
  }

  getByLevel(level) {
    return this.warnings.filter(w => w.level === level);
  }

  getByType(type) {
    return this.warnings.filter(w => w.type === type);
  }

  blockIfCritical(parameterType, value) {
    const warnings = this.getByType(parameterType);
    const critical = warnings.find(w => w.level === 'error');
    
    if (critical) {
      return {
        blocked: true,
        reason: critical.message,
        suggestion: critical.suggestion,
        currentValue: value,
        safeValue: this.getSafeValue(parameterType, value)
      };
    }
    
    return { blocked: false };
  }

  getSafeValue(parameterType, currentValue) {
    switch (parameterType) {
      case 'angle':
        return Math.max(-8, Math.min(8, currentValue));
      case 'sampling':
        return Math.min(80, currentValue);
      default:
        return currentValue;
    }
  }

  exportWarnings() {
    return {
      exportedAt: new Date().toISOString(),
      count: this.warnings.length,
      summary: this.getStatusSummary(),
      warnings: this.warnings.map(w => ({
        ...w,
        formattedTime: new Date(w.timestamp).toLocaleString('zh-CN')
      }))
    };
  }
}
