export class ParameterController {
  constructor(options = {}) {
    this.angleOfAttack = options.angleOfAttack ?? 0;
    this.windSpeed = options.windSpeed ?? 30;
    this.samplingDensity = options.samplingDensity ?? 50;
    
    this.angleLimits = {
      min: -15,
      max: 15,
      safeMin: -8,
      safeMax: 8
    };
    
    this.samplingLimits = {
      min: 10,
      max: 200,
      recommendedMax: 80
    };
    
    this.windLimits = {
      min: 0,
      max: 100
    };
    
    this.windVersion = '基础版本';
    this.windVersionHistory = [];
    
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  setAngleOfAttack(angle, { source = 'manual' } = {}) {
    const clamped = Math.max(this.angleLimits.min, Math.min(this.angleLimits.max, angle));
    const oldValue = this.angleOfAttack;
    this.angleOfAttack = clamped;
    
    const checkResult = this.checkAngleLimits(clamped);
    
    this.emit('angleChange', {
      oldValue,
      newValue: clamped,
      source,
      ...checkResult
    });
    
    return checkResult;
  }

  setWindSpeed(speed, { source = 'manual', isSupplement = false } = {}) {
    const clamped = Math.max(this.windLimits.min, Math.min(this.windLimits.max, speed));
    const oldValue = this.windSpeed;
    this.windSpeed = clamped;
    
    if (isSupplement && source !== 'initial') {
      this.windVersion = `补充版本 v${this.windVersionHistory.length + 1}`;
      this.windVersionHistory.push({
        version: this.windVersion,
        value: clamped,
        timestamp: Date.now(),
        source
      });
    }
    
    this.emit('windChange', {
      oldValue,
      newValue: clamped,
      source,
      isSupplement,
      version: this.windVersion
    });
    
    return { inRange: true };
  }

  setSamplingDensity(density, { source = 'manual' } = {}) {
    const clamped = Math.max(this.samplingLimits.min, Math.min(this.samplingLimits.max, density));
    const oldValue = this.samplingDensity;
    this.samplingDensity = clamped;
    
    const checkResult = this.checkSamplingLimits(clamped);
    
    this.emit('samplingChange', {
      oldValue,
      newValue: clamped,
      source,
      ...checkResult
    });
    
    return checkResult;
  }

  checkAngleLimits(angle) {
    if (angle < this.angleLimits.safeMin || angle > this.angleLimits.safeMax) {
      if (angle < this.angleLimits.min || angle > this.angleLimits.max) {
        return {
          inRange: false,
          level: 'error',
          message: `迎角 ${angle.toFixed(1)}° 超出硬限制范围 [${this.angleLimits.min}°, ${this.angleLimits.max}°]`,
          exceededBy: angle < this.angleLimits.min 
            ? this.angleLimits.min - angle 
            : angle - this.angleLimits.max,
          suggestion: `建议调整至安全范围 [${this.angleLimits.safeMin}°, ${this.angleLimits.safeMax}°]`
        };
      }
      return {
        inRange: true,
        level: 'warning',
        message: `迎角 ${angle.toFixed(1)}° 接近安全边界`,
        proximity: angle < this.angleLimits.safeMin
          ? (this.angleLimits.safeMin - angle) / (this.angleLimits.safeMin - this.angleLimits.min)
          : (angle - this.angleLimits.safeMax) / (this.angleLimits.max - this.angleLimits.safeMax),
        suggestion: `建议保持在 [${this.angleLimits.safeMin}°, ${this.angleLimits.safeMax}°] 范围内`
      };
    }
    return {
      inRange: true,
      level: 'normal',
      message: `迎角 ${angle.toFixed(1)}° 在安全范围内`
    };
  }

  checkSamplingLimits(density) {
    if (density > this.samplingLimits.recommendedMax) {
      const densityRatio = density / this.samplingLimits.recommendedMax;
      if (densityRatio > 1.5) {
        return {
          inRange: false,
          level: 'error',
          message: `采样密度 ${density} 严重过高`,
          ratio: densityRatio,
          estimatedPoints: Math.ceil(density / 8) * 8,
          suggestion: `建议降低至 ${this.samplingLimits.recommendedMax} 以下，过密采样会导致计算负担指数级增加`,
          affectedAreas: ['前驻点区', '车顶峰值区', '后分离区']
        };
      }
      return {
        inRange: true,
        level: 'warning',
        message: `采样密度 ${density} 偏高`,
        ratio: densityRatio,
        estimatedPoints: Math.ceil(density / 8) * 8,
        suggestion: `超过推荐上限 ${this.samplingLimits.recommendedMax}，注意观察计算性能`
      };
    }
    return {
      inRange: true,
      level: 'normal',
      message: `采样密度 ${density} 在合理范围内`
    };
  }

  locateAngleViolation(angle) {
    const check = this.checkAngleLimits(angle);
    if (check.level === 'normal') return null;
    
    return {
      type: 'angle',
      value: angle,
      limit: angle > this.angleLimits.safeMax ? '上限' : '下限',
      boundary: angle > this.angleLimits.safeMax ? this.angleLimits.safeMax : this.angleLimits.safeMin,
      hardLimit: angle > this.angleLimits.safeMax ? this.angleLimits.max : this.angleLimits.min,
      delta: angle > this.angleLimits.safeMax 
        ? angle - this.angleLimits.safeMax 
        : this.angleLimits.safeMax - angle,
      relatedParameters: ['风速', '采样密度'],
      affectedZones: angle > 0 ? ['车头下压力区', '车顶气流分离区'] : ['车底气流区', '车尾涡流区'],
      suggestedFromWind: this.getWindSuggestion(angle)
    };
  }

  locateSamplingViolation(density) {
    const check = this.checkSamplingLimits(density);
    if (check.level === 'normal') return null;
    
    return {
      type: 'sampling',
      value: density,
      recommendedMax: this.samplingLimits.recommendedMax,
      excess: density - this.samplingLimits.recommendedMax,
      percentage: ((density / this.samplingLimits.recommendedMax - 1) * 100).toFixed(0),
      denseAreas: [
        { name: '前驻点区', reason: '压力梯度大，需要精细捕捉' },
        { name: '车顶峰值区', reason: '边界层转捩区，流态复杂' },
        { name: '后分离区', reason: '涡流脱落区，非定常效应强' }
      ],
      locateOnModel: true,
      performanceImpact: this.estimatePerformanceImpact(density)
    };
  }

  getWindSuggestion(angle) {
    const angleMag = Math.abs(angle);
    if (angleMag > 12) {
      return {
        recommendedWind: '< 20 m/s',
        reason: '大迎角下降低风速可推迟气流分离'
      };
    } else if (angleMag > 8) {
      return {
        recommendedWind: '< 40 m/s',
        reason: '接近失速迎角，建议控制风速'
      };
    }
    return null;
  }

  estimatePerformanceImpact(density) {
    const base = 50;
    const factor = Math.pow(density / base, 1.5);
    return {
      computeTimeIncrease: ((factor - 1) * 100).toFixed(0) + '%',
      memoryIncrease: ((density / base) * 100).toFixed(0) + '%',
      recommendation: factor > 3 ? '强烈建议降低采样密度' : factor > 2 ? '建议降低采样密度' : '注意监控性能'
    };
  }

  snapshot() {
    return {
      angleOfAttack: this.angleOfAttack,
      windSpeed: this.windSpeed,
      samplingDensity: this.samplingDensity,
      windVersion: this.windVersion,
      timestamp: Date.now(),
      coefficients: null
    };
  }

  restore(snapshot) {
    this.setAngleOfAttack(snapshot.angleOfAttack, { source: 'restore' });
    this.setWindSpeed(snapshot.windSpeed, { source: 'restore' });
    this.setSamplingDensity(snapshot.samplingDensity, { source: 'restore' });
    this.windVersion = snapshot.windVersion;
  }

  reset() {
    const baseSnapshot = this.snapshot();
    this.setAngleOfAttack(0, { source: 'reset' });
    this.setWindSpeed(30, { source: 'reset' });
    this.setSamplingDensity(50, { source: 'reset' });
    this.windVersion = '基础版本';
    this.windVersionHistory = [];
    return baseSnapshot;
  }

  compare(snapshot1, snapshot2) {
    const diff = {};
    
    if (snapshot1.angleOfAttack !== snapshot2.angleOfAttack) {
      diff.angleOfAttack = {
        old: snapshot1.angleOfAttack,
        new: snapshot2.angleOfAttack,
        delta: snapshot2.angleOfAttack - snapshot1.angleOfAttack,
        percentage: ((snapshot2.angleOfAttack - snapshot1.angleOfAttack) / (Math.abs(snapshot1.angleOfAttack) || 1) * 100).toFixed(1) + '%'
      };
    }
    
    if (snapshot1.windSpeed !== snapshot2.windSpeed) {
      diff.windSpeed = {
        old: snapshot1.windSpeed,
        new: snapshot2.windSpeed,
        delta: snapshot2.windSpeed - snapshot1.windSpeed,
        percentage: ((snapshot2.windSpeed - snapshot1.windSpeed) / (snapshot1.windSpeed || 1) * 100).toFixed(1) + '%',
        version1: snapshot1.windVersion,
        version2: snapshot2.windVersion
      };
    }
    
    if (snapshot1.samplingDensity !== snapshot2.samplingDensity) {
      diff.samplingDensity = {
        old: snapshot1.samplingDensity,
        new: snapshot2.samplingDensity,
        delta: snapshot2.samplingDensity - snapshot1.samplingDensity,
        percentage: ((snapshot2.samplingDensity - snapshot1.samplingDensity) / snapshot1.samplingDensity * 100).toFixed(1) + '%'
      };
    }
    
    return {
      hasChanges: Object.keys(diff).length > 0,
      changes: diff
    };
  }
}
