const fs = require('fs');
const path = require('path');

class ReportExporter {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './reports',
      includeRawData: options.includeRawData !== false
    };
  }

  exportHeatmapReport(level, heatmap, anomalies, trajectories, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `heatmap_report_${level.name}_${level.version}_${timestamp}`;
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        levelName: level.name,
        levelVersion: level.version,
        sourceFile: level.sourceFile,
        totalTrajectories: trajectories.length,
        totalCollisions: heatmap.stats.totalCollisions,
        uniquePlayers: heatmap.stats.uniquePlayers
      },
      dataQuality: this._assessDataQuality(trajectories, anomalies),
      anomalies: this._formatAnomaliesForReport(anomalies),
      hotspots: this._getTopHotspots(heatmap, level, 10),
      colliderHeat: this._formatColliderHeat(heatmap, level),
      versionInfo: this._getVersionInfo(trajectories, level),
      recommendations: this._generateRecommendations(anomalies, heatmap)
    };

    if (this.options.includeRawData) {
      report.raw = {
        levelSummary: {
          colliderCount: level.colliders.length,
          materials: Array.from(level.materials.keys())
        },
        trajectoryStats: {
          withDrift: trajectories.filter(t => t.dataQuality.hasDrift).length,
          avgCompleteness: trajectories.reduce((sum, t) => sum + t.dataQuality.completeness, 0) / trajectories.length
        }
      };
    }

    return this._writeReport(filename, report, options);
  }

  exportComparisonReport(comparison, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comparison_report_${timestamp}`;

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        schemes: comparison.schemes,
        type: 'scheme_comparison'
      },
      overview: this._formatComparisonOverview(comparison),
      hotspotsComparison: comparison.hotspots,
      anomaliesComparison: comparison.anomalies,
      versionMixAnalysis: comparison.versionMix.map(v => v.explanation),
      conclusion: comparison.recommendation
    };

    return this._writeReport(filename, report, options);
  }

  exportObjectDetail(colliderId, objectInfo, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = objectInfo.collider.name.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    const filename = `object_${safeName}_${timestamp}`;

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        objectId: colliderId,
        objectName: objectInfo.collider.name
      },
      objectDetails: {
        basic: {
          name: objectInfo.collider.name,
          type: objectInfo.collider.type,
          material: objectInfo.collider.material,
          materialType: objectInfo.collider.materialInfo.type,
          position: objectInfo.collider.position,
          size: objectInfo.collider.size,
          notes: objectInfo.collider.notes
        },
        heatmap: objectInfo.heatmap,
        levelSource: objectInfo.levelSource
      },
      analysis: this._analyzeObject(objectInfo)
    };

    return this._writeReport(filename, report, options);
  }

  _assessDataQuality(trajectories, anomalies) {
    const issues = [];
    let score = 100;

    const versionMix = anomalies.filter(a => a.type === 'version_mix');
    const drift = anomalies.filter(a => a.type === 'trajectory_drift');
    const colliderMissing = anomalies.filter(a => a.type === 'collider_missing');

    if (versionMix.length > 0) {
      score -= 30;
      issues.push('版本混用 - 严重影响数据可比性');
    }

    if (drift.length > 0 && drift[0].severity === 'high') {
      score -= 15;
      issues.push('轨迹漂移严重 - 可能影响位置精度');
    }

    if (colliderMissing.length > 0) {
      score -= 20;
      issues.push('碰撞体数据缺失 - 部分对象无法统计');
    }

    const avgCompleteness = trajectories.reduce((sum, t) => 
      sum + t.dataQuality.completeness, 0) / trajectories.length;
    
    if (avgCompleteness < 90) {
      score -= 10;
      issues.push(`数据完整度偏低 (${avgCompleteness.toFixed(1)}%)`);
    }

    return {
      score: Math.max(0, score),
      rating: score >= 80 ? '良好' : score >= 60 ? '一般' : '较差',
      issues,
      details: {
        avgCompleteness: avgCompleteness.toFixed(1),
        hasVersionMix: versionMix.length > 0,
        hasSevereDrift: drift.some(d => d.severity === 'high'),
        missingColliders: colliderMissing.length > 0
      }
    };
  }

  _formatAnomaliesForReport(anomalies) {
    const grouped = {};
    
    anomalies.forEach(a => {
      if (!grouped[a.category]) {
        grouped[a.category] = [];
      }
      grouped[a.category].push({
        type: a.type,
        title: a.title,
        severity: a.severity,
        message: a.message,
        affectedCount: a.affectedCount
      });
    });

    return grouped;
  }

  _getTopHotspots(heatmap, level, limit) {
    return heatmap.colliderHeat
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, limit)
      .map(h => {
        const collider = level.getColliderById(h.colliderId);
        return {
          rank: h.rank,
          name: collider?.name || h.colliderId,
          collisionCount: h.collisionCount,
          intensity: h.intensity,
          intensityLevel: this._getIntensityLevel(h.intensity),
          material: collider?.material || 'unknown'
        };
      });
  }

  _formatColliderHeat(heatmap, level) {
    return heatmap.colliderHeat
      .sort((a, b) => b.intensity - a.intensity)
      .map(h => {
        const collider = level.getColliderById(h.colliderId);
        return {
          id: h.colliderId,
          name: collider?.name || h.colliderId,
          collisionCount: h.collisionCount,
          intensity: h.intensity,
          rank: h.rank,
          percentile: h.percentile,
          material: collider?.material || 'unknown',
          versions: h.versions
        };
      });
  }

  _getVersionInfo(trajectories, level) {
    const versionCounts = new Map();
    const versionSources = { explicit: 0, filename: 0, inferred: 0 };

    trajectories.forEach(t => {
      versionCounts.set(t.levelVersion, (versionCounts.get(t.levelVersion) || 0) + 1);
      versionSources[t.levelVersionSource]++;
    });

    return {
      targetVersion: level.version,
      distribution: Array.from(versionCounts.entries()).map(([v, c]) => ({
        version: v,
        count: c,
        percentage: ((c / trajectories.length) * 100).toFixed(1)
      })),
      sourceReliability: {
        explicit: `${versionSources.explicit}条 (${((versionSources.explicit/trajectories.length)*100).toFixed(1)}%)`,
        fromFilename: `${versionSources.filename}条 (${((versionSources.filename/trajectories.length)*100).toFixed(1)}%)`,
        inferred: `${versionSources.inferred}条 (${((versionSources.inferred/trajectories.length)*100).toFixed(1)}%)`
      }
    };
  }

  _generateRecommendations(anomalies, heatmap) {
    const recs = [];

    const highAnomalies = anomalies.filter(a => a.severity === 'high');
    const mediumAnomalies = anomalies.filter(a => a.severity === 'medium');

    if (highAnomalies.length > 0) {
      recs.push({
        priority: '紧急',
        title: '处理高优先级异常',
        items: highAnomalies.map(a => a.message)
      });
    }

    if (mediumAnomalies.length > 0) {
      recs.push({
        priority: '建议',
        title: '关注中等异常',
        items: mediumAnomalies.map(a => a.message)
      });
    }

    const hotspots = heatmap.colliderHeat
      .filter(h => h.intensity >= 0.8)
      .slice(0, 3);
    
    if (hotspots.length > 0) {
      recs.push({
        priority: '设计参考',
        title: '高碰撞区域',
        items: hotspots.map(h => `碰撞排名第${h.rank}的对象碰撞次数异常高，建议检查是否存在设计问题`)
      });
    }

    return recs;
  }

  _formatComparisonOverview(comparison) {
    return comparison.overview.map(o => ({
      metric: o.metric,
      values: comparison.schemes.map((name, i) => ({
        scheme: name,
        value: o.values[i].value,
        isBest: o.values[i].isBest,
        isWorst: o.values[i].isWorst
      }))
    }));
  }

  _analyzeObject(objectInfo) {
    const analysis = [];
    const heat = objectInfo.heatmap;

    if (heat.intensity >= 0.8) {
      analysis.push('该对象碰撞频率极高，可能是设计瓶颈或玩家卡点');
    } else if (heat.intensity >= 0.6) {
      analysis.push('该对象碰撞频率较高，属于玩家主要交互区域');
    } else if (heat.intensity <= 0.1) {
      analysis.push('该对象几乎没有碰撞，可能利用率较低');
    }

    if (objectInfo.collider.notes) {
      analysis.push(`设计备注: ${objectInfo.collider.notes}`);
    }

    return analysis;
  }

  _getIntensityLevel(intensity) {
    if (intensity >= 0.8) return '极高';
    if (intensity >= 0.6) return '高';
    if (intensity >= 0.4) return '中';
    if (intensity >= 0.2) return '低';
    return '极低';
  }

  _writeReport(filename, report, options) {
    const format = options.format || 'json';
    const outputDir = options.outputDir || this.options.outputDir;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filepath = path.join(outputDir, `${filename}.${format}`);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    } else if (format === 'text') {
      fs.writeFileSync(filepath, this._formatAsText(report));
    }

    return {
      filepath,
      filename: `${filename}.${format}`,
      format
    };
  }

  _formatAsText(report) {
    const lines = [];
    this._formatObjectAsText(report, lines, 0);
    return lines.join('\n');
  }

  _formatObjectAsText(obj, lines, depth) {
    const indent = '  '.repeat(depth);
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`${indent}${key}:`);
        this._formatObjectAsText(value, lines, depth + 1);
      } else if (Array.isArray(value)) {
        lines.push(`${indent}${key}:`);
        value.forEach((item, i) => {
          if (typeof item === 'object') {
            lines.push(`${indent}  [${i}]:`);
            this._formatObjectAsText(item, lines, depth + 2);
          } else {
            lines.push(`${indent}  [${i}]: ${item}`);
          }
        });
      } else {
        lines.push(`${indent}${key}: ${value}`);
      }
    }
  }
}

module.exports = ReportExporter;
