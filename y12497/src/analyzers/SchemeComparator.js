class SchemeComparator {
  constructor() {
    this.schemes = new Map();
  }

  addScheme(name, heatmapResult, level, anomalies) {
    this.schemes.set(name, {
      heatmap: heatmapResult,
      level,
      anomalies,
      summary: this._summarizeScheme(heatmapResult, level, anomalies)
    });
  }

  compare(schemeNames = null) {
    const names = schemeNames || Array.from(this.schemes.keys());
    const results = names.map(name => this.schemes.get(name)).filter(Boolean);

    if (results.length < 2) {
      return { error: '至少需要两个方案才能比较' };
    }

    return {
      schemes: names,
      overview: this._compareOverview(results),
      hotspots: this._compareHotspots(results),
      anomalies: this._compareAnomalies(results),
      versionMix: this._compareVersionMix(results),
      recommendation: this._generateRecommendation(results, names)
    };
  }

  _summarizeScheme(heatmap, level, anomalies) {
    return {
      levelName: level.name,
      levelVersion: level.version,
      colliderCount: level.colliders.length,
      totalCollisions: heatmap.stats.totalCollisions,
      uniquePlayers: heatmap.stats.uniquePlayers,
      avgCollisionsPerPlayer: heatmap.stats.avgCollisionsPerPlayer,
      anomalyCount: anomalies.length,
      highSeverityAnomalies: anomalies.filter(a => a.severity === 'high').length
    };
  }

  _compareOverview(schemes) {
    const metrics = [
      { key: 'colliderCount', label: '碰撞体数量', higherIsBetter: null },
      { key: 'totalCollisions', label: '总碰撞次数', higherIsBetter: null },
      { key: 'uniquePlayers', label: '玩家数量', higherIsBetter: true },
      { key: 'avgCollisionsPerPlayer', label: '人均碰撞次数', higherIsBetter: null },
      { key: 'anomalyCount', label: '异常总数', higherIsBetter: false },
      { key: 'highSeverityAnomalies', label: '严重异常', higherIsBetter: false }
    ];

    return metrics.map(metric => {
      const values = schemes.map(s => s.summary[metric.key]);
      const max = Math.max(...values);
      const min = Math.min(...values);

      return {
        metric: metric.label,
        values: values.map(v => ({
          value: v,
          isBest: metric.higherIsBetter === true ? v === max : 
                  metric.higherIsBetter === false ? v === min : false,
          isWorst: metric.higherIsBetter === true ? v === min : 
                   metric.higherIsBetter === false ? v === max : false
        }))
      };
    });
  }

  _compareHotspots(schemes) {
    const allHotspots = new Set();
    
    schemes.forEach(scheme => {
      scheme.heatmap.colliderHeat
        .filter(c => c.intensity >= 0.5)
        .forEach(c => allHotspots.add(c.colliderId));
    });

    return Array.from(allHotspots).map(colliderId => {
      return {
        colliderId,
        schemes: schemes.map(scheme => {
          const heat = scheme.heatmap.colliderHeat.find(c => c.colliderId === colliderId);
          const collider = scheme.level.getColliderById(colliderId);
          return {
            name: collider?.name || colliderId,
            collisionCount: heat?.collisionCount || 0,
            intensity: heat?.intensity || 0,
            rank: heat?.rank || 'N/A'
          };
        })
      };
    }).sort((a, b) => {
      const maxA = Math.max(...a.schemes.map(s => s.intensity));
      const maxB = Math.max(...b.schemes.map(s => s.intensity));
      return maxB - maxA;
    }).slice(0, 15);
  }

  _compareAnomalies(schemes) {
    const anomalyTypes = new Set();
    schemes.forEach(s => s.anomalies.forEach(a => anomalyTypes.add(a.type)));

    return Array.from(anomalyTypes).map(type => {
      return {
        type,
        category: schemes[0].anomalies.find(a => a.type === type)?.category || '其他',
        title: schemes[0].anomalies.find(a => a.type === type)?.title || type,
        schemes: schemes.map(scheme => {
          const anomalies = scheme.anomalies.filter(a => a.type === type);
          return {
            count: anomalies.length,
            totalAffected: anomalies.reduce((sum, a) => sum + (a.affectedCount || 0), 0),
            maxSeverity: anomalies.length > 0 
              ? anomalies.reduce((max, a) => 
                  this._severityToNum(a.severity) > this._severityToNum(max) ? a.severity : max, 
                  anomalies[0].severity)
              : null
          };
        })
      };
    });
  }

  _compareVersionMix(schemes) {
    return schemes.map(scheme => {
      const versionMix = scheme.anomalies.filter(a => a.type === 'version_mix');
      const versionUnknown = scheme.anomalies.find(a => a.type === 'version_unknown');
      
      return {
        hasVersionMix: versionMix.length > 0,
        details: versionMix.map(v => ({
          version: v.details.mixedVersion,
          count: v.details.count,
          percentage: v.details.percentage
        })),
        unknownCount: versionUnknown?.details?.count || 0,
        explanation: this._explainVersionMix(versionMix, scheme)
      };
    });
  }

  _explainVersionMix(versionMixes, scheme) {
    if (versionMixes.length === 0) {
      return '该方案数据版本一致，没有发现版本混用问题。';
    }

    const parts = ['⚠️ 该方案存在版本混用问题：'];
    
    versionMixes.forEach(vm => {
      parts.push(`\n  • ${vm.details.percentage}%的数据(${vm.details.count}条)属于 ${vm.details.mixedVersion} 版本`);
      parts.push(`（预期是 ${vm.details.targetVersion || scheme.summary.levelVersion}）`);
    });

    const totalMixed = versionMixes.reduce((sum, v) => sum + v.details.count, 0);
    if (totalMixed > scheme.summary.totalCollisions * 0.1) {
      parts.push('\n\n❗️混用数据量较大，热图结果可能失真。');
      parts.push('建议：分离各版本数据分别生成热图，或确认数据来源。');
    } else {
      parts.push('\n\n💡 混用数据量较小，影响有限。');
      parts.push('建议：如确认是测试数据，可在分析时排除。');
    }

    return parts.join('');
  }

  _generateRecommendation(schemes, names) {
    const scores = schemes.map(scheme => {
      let score = 100;
      
      const highAnomalies = scheme.anomalies.filter(a => a.severity === 'high').length;
      const mediumAnomalies = scheme.anomalies.filter(a => a.severity === 'medium').length;
      
      score -= highAnomalies * 15;
      score -= mediumAnomalies * 5;
      
      const versionMix = scheme.anomalies.filter(a => a.type === 'version_mix');
      if (versionMix.length > 0) {
        score -= 20;
      }
      
      return Math.max(0, score);
    });

    const bestIndex = scores.indexOf(Math.max(...scores));
    const bestName = names[bestIndex];
    const bestScheme = schemes[bestIndex];

    const recommendations = [
      `综合评分最高的方案是：${bestName}（${scores[bestIndex]}分）`
    ];

    if (bestScheme.anomalies.filter(a => a.severity === 'high').length === 0) {
      recommendations.push(`\n✓ ${bestName} 没有严重异常，数据质量较好`);
    } else {
      recommendations.push(`\n⚠️ ${bestName} 仍存在一些问题需要注意`);
    }

    recommendations.push('\n\n各方案评分：');
    names.forEach((name, i) => {
      recommendations.push(`\n  ${name}: ${scores[i]}分`);
    });

    return recommendations.join('');
  }

  _severityToNum(severity) {
    const map = { high: 3, medium: 2, low: 1 };
    return map[severity] || 0;
  }
}

module.exports = SchemeComparator;
