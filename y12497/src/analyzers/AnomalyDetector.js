class AnomalyDetector {
  constructor(options = {}) {
    this.options = {
      driftThreshold: options.driftThreshold || 50,
      gapThreshold: options.gapThreshold || 3,
      versionConfidenceThreshold: options.versionConfidenceThreshold || 0.7
    };
    this.anomalies = [];
  }

  detectAll(level, trajectories) {
    this.anomalies = [];

    this.detectVersionMix(trajectories, level);
    this.detectColliderMissing(level);
    this.detectTrajectoryDrift(trajectories);
    this.detectUnmappedCollisions(level, trajectories);
    this.detectVersionReliability(trajectories);

    return this.getSortedAnomalies();
  }

  detectVersionMix(trajectories, level) {
    const versionCounts = new Map();
    const targetVersion = level.version;

    trajectories.forEach(traj => {
      const version = traj.levelVersion;
      versionCounts.set(version, (versionCounts.get(version) || 0) + 1);
    });

    const total = trajectories.length;
    const versions = Array.from(versionCounts.entries());

    if (versions.length > 1) {
      const mainVersion = versions.sort((a, b) => b[1] - a[1])[0][0];
      
      versions.forEach(([version, count]) => {
        if (version !== targetVersion && version !== 'unknown') {
          const percentage = ((count / total) * 100).toFixed(1);
          
          this.anomalies.push({
            type: 'version_mix',
            severity: count > total * 0.1 ? 'high' : 'medium',
            category: '版本',
            title: `版本混用: ${version}`,
            message: this._humanizeVersionMix(version, count, percentage, targetVersion, mainVersion),
            details: {
              mixedVersion: version,
              targetVersion,
              mainVersion,
              count,
              percentage,
              total
            },
            affectedCount: count
          });
        }
      });
    }

    const unknownCount = versionCounts.get('unknown') || 0;
    if (unknownCount > 0) {
      this.anomalies.push({
        type: 'version_unknown',
        severity: 'medium',
        category: '版本',
        title: '未知版本数据',
        message: `有 ${unknownCount} 条轨迹无法确定对应关卡版本`,
        details: { count: unknownCount },
        affectedCount: unknownCount
      });
    }
  }

  detectColliderMissing(level) {
    const missing = level.colliders.filter(c => c.isMissing);
    const unnamed = level.colliders.filter(c => c.name.startsWith('碰撞体_'));

    if (missing.length > 0) {
      this.anomalies.push({
        type: 'collider_missing',
        severity: 'high',
        category: '碰撞体',
        title: '碰撞体位置缺失',
        message: this._humanizeColliderMissing(missing),
        details: {
          colliders: missing.map(c => ({
            id: c.id,
            name: c.name,
            material: c.material
          }))
        },
        affectedCount: missing.length
      });
    }

    if (unnamed.length > 0) {
      this.anomalies.push({
        type: 'collider_unnamed',
        severity: 'low',
        category: '碰撞体',
        title: '碰撞体未命名',
        message: `${unnamed.length} 个碰撞体使用默认名称，不利于定位问题`,
        details: { count: unnamed.length },
        affectedCount: unnamed.length
      });
    }
  }

  detectTrajectoryDrift(trajectories) {
    const driftSummary = {
      totalTrajectories: 0,
      totalDriftPoints: 0,
      examples: []
    };

    trajectories.forEach(traj => {
      if (traj.dataQuality.hasDrift) {
        driftSummary.totalTrajectories++;
        driftSummary.totalDriftPoints += traj.dataQuality.driftCount;
        if (driftSummary.examples.length < 5) {
          driftSummary.examples.push({
            playerId: traj.playerId,
            driftCount: traj.dataQuality.driftCount
          });
        }
      }
    });

    if (driftSummary.totalTrajectories > 0) {
      this.anomalies.push({
        type: 'trajectory_drift',
        severity: driftSummary.totalDriftPoints > 50 ? 'high' : 'medium',
        category: '轨迹',
        title: '轨迹漂移',
        message: this._humanizeTrajectoryDrift(driftSummary, trajectories.length),
        details: driftSummary,
        affectedCount: driftSummary.totalTrajectories
      });
    }
  }

  detectUnmappedCollisions(level, trajectories) {
    const colliderIds = new Set(level.colliders.map(c => c.id));
    const colliderNames = new Set(level.colliders.map(c => c.name));
    const unmapped = new Map();

    trajectories.forEach(traj => {
      traj.collisions.forEach(coll => {
        const id = coll.colliderId;
        const name = coll.colliderName;
        
        if (id !== 'unknown' && !colliderIds.has(id) && !colliderNames.has(name)) {
          const key = id || name;
          if (!unmapped.has(key)) {
            unmapped.set(key, { id, name, material: coll.material, count: 0 });
          }
          unmapped.get(key).count++;
        }
      });
    });

    if (unmapped.size > 0) {
      this.anomalies.push({
        type: 'unmapped_collision',
        severity: 'medium',
        category: '碰撞体',
        title: '碰撞对象未映射',
        message: this._humanizeUnmappedCollisions(unmapped),
        details: { unmapped: Array.from(unmapped.values()) },
        affectedCount: unmapped.size
      });
    }
  }

  detectVersionReliability(trajectories) {
    const inferred = trajectories.filter(t => t.levelVersionSource === 'inferred');
    const fromFilename = trajectories.filter(t => t.levelVersionSource === 'filename');

    if (inferred.length > 0 || fromFilename.length > 0) {
      const total = inferred.length + fromFilename.length;
      const percentage = ((total / trajectories.length) * 100).toFixed(1);
      
      this.anomalies.push({
        type: 'version_unreliable',
        severity: 'low',
        category: '版本',
        title: '版本来源不可靠',
        message: `${total} 条轨迹(${percentage}%)的版本号是推断出来的，可能不准确`,
        details: {
          inferredCount: inferred.length,
          fromFilenameCount: fromFilename.length,
          total,
          percentage
        },
        affectedCount: total
      });
    }
  }

  getAnomaliesByType(type) {
    return this.anomalies.filter(a => a.type === type);
  }

  getAnomaliesByCategory(category) {
    return this.anomalies.filter(a => a.category === category);
  }

  getSortedAnomalies() {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return [...this.anomalies].sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
  }

  _humanizeVersionMix(version, count, percentage, targetVersion, mainVersion) {
    const parts = [`发现 ${count} 条(${percentage}%)数据属于 ${version} 版本`];
    
    if (mainVersion !== version) {
      parts.push(`，而主要版本是 ${mainVersion}`);
    }
    
    if (targetVersion && targetVersion !== version) {
      parts.push(`（预期是 ${targetVersion}）`);
    }
    
    parts.push('。这些数据会污染热图结果，建议：');
    
    if (count < 10) {
      parts.push('数据量较小，可能是测试数据，可以考虑排除');
    } else {
      parts.push('数据量较大，建议确认是否混入旧版本数据，或分别生成热图');
    }
    
    return parts.join('');
  }

  _humanizeColliderMissing(missing) {
    const parts = [`${missing.length} 个碰撞体没有位置数据`];
    
    const byMaterial = {};
    missing.forEach(c => {
      const mat = c.material || 'unknown';
      byMaterial[mat] = (byMaterial[mat] || 0) + 1;
    });
    
    const materialList = Object.entries(byMaterial)
      .map(([mat, count]) => `${mat}(${count}个)`)
      .join('、');
    
    parts.push(`，涉及材料: ${materialList}`);
    
    if (missing.length <= 3) {
      const names = missing.map(c => c.name).join('、');
      parts.push(`。具体对象: ${names}`);
    } else {
      const names = missing.slice(0, 3).map(c => c.name).join('、');
      parts.push(`。前3个: ${names} 等`);
    }
    
    return parts.join('');
  }

  _humanizeTrajectoryDrift(summary, totalTrajectories) {
    const percentage = ((summary.totalTrajectories / totalTrajectories) * 100).toFixed(1);
    const parts = [
      `${summary.totalTrajectories} 条轨迹(${percentage}%)存在漂移`,
      `，共 ${summary.totalDriftPoints} 个漂移点`
    ];
    
    if (summary.totalDriftPoints > 100) {
      parts.push('。漂移严重，可能影响碰撞统计准确性，建议检查采集设备或过滤异常数据');
    } else if (summary.totalDriftPoints > 20) {
      parts.push('。存在一定漂移，建议在生成热图时启用漂移过滤');
    } else {
      parts.push('。漂移较轻，基本不影响分析');
    }
    
    return parts.join('');
  }

  _humanizeUnmappedCollisions(unmapped) {
    const entries = Array.from(unmapped.values());
    const parts = [`${entries.length} 种碰撞对象在关卡模型中找不到对应`];
    
    if (entries.length <= 3) {
      const list = entries.map(e => 
        `${e.name || e.id}(${e.count}次，${e.material})`
      ).join('、');
      parts.push(`: ${list}`);
    } else {
      const list = entries.slice(0, 3).map(e => 
        `${e.name || e.id}(${e.count}次)`
      ).join('、');
      parts.push(`: ${list} 等`);
    }
    
    parts.push('。可能是关卡模型更新后碰撞体重命名，或轨迹数据有误');
    
    return parts.join('');
  }
}

module.exports = AnomalyDetector;
