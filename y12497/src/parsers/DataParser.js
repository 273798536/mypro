const LevelModel = require('../models/LevelModel');
const PlayerTrajectory = require('../models/PlayerTrajectory');

class DataParser {
  constructor() {
    this.versionAliases = new Map();
    this.warnings = [];
  }

  registerVersionAlias(officialName, aliases) {
    this.versionAliases.set(officialName, new Set(aliases));
  }

  normalizeVersion(versionStr) {
    if (!versionStr || versionStr === 'unknown') return 'unknown';
    
    const cleanVersion = versionStr.toLowerCase().trim();
    
    for (const [official, aliases] of this.versionAliases) {
      if (cleanVersion === official.toLowerCase() || aliases.has(cleanVersion)) {
        return official;
      }
    }
    
    return versionStr;
  }

  parseLevelData(rawData, sourceInfo = {}) {
    this.warnings = [];
    
    const enhancedData = {
      ...rawData,
      sourceFile: sourceInfo.filename || rawData.sourceFile,
      versionAlias: this._extractVersionAliases(rawData)
    };

    const level = new LevelModel(enhancedData);
    
    const validationIssues = level.validate();
    validationIssues.forEach(issue => {
      this.warnings.push({
        type: 'level_validation',
        severity: issue.severity,
        message: `[${level.name}] ${issue.message}`,
        details: issue.details
      });
    });

    return {
      level,
      warnings: [...this.warnings]
    };
  }

  parseTrajectoryData(rawData, sourceInfo = {}) {
    this.warnings = [];
    
    const enhancedData = {
      ...rawData,
      sourceFile: sourceInfo.filename || rawData.sourceFile
    };

    const trajectory = new PlayerTrajectory(enhancedData);
    
    trajectory.levelVersion = this.normalizeVersion(trajectory.levelVersion);
    
    if (trajectory.dataQuality.completeness < 80) {
      this.warnings.push({
        type: 'trajectory_quality',
        severity: 'high',
        message: `轨迹数据完整度仅为 ${trajectory.dataQuality.completeness}%`,
        playerId: trajectory.playerId
      });
    }

    if (trajectory.dataQuality.hasDrift) {
      this.warnings.push({
        type: 'trajectory_drift',
        severity: 'medium',
        message: `检测到 ${trajectory.dataQuality.driftCount} 处轨迹漂移`,
        playerId: trajectory.playerId
      });
    }

    if (trajectory.levelVersionSource === 'inferred') {
      this.warnings.push({
        type: 'version_inferred',
        severity: 'low',
        message: `关卡版本是从文件名推断的: ${trajectory.levelVersion}`,
        playerId: trajectory.playerId
      });
    }

    return {
      trajectory,
      warnings: [...this.warnings]
    };
  }

  parseBatchTrajectories(rawArray, sourceInfo = {}) {
    const results = {
      trajectories: [],
      warnings: [],
      versionDistribution: new Map()
    };

    rawArray.forEach((raw, index) => {
      try {
        const { trajectory, warnings } = this.parseTrajectoryData(raw, sourceInfo);
        results.trajectories.push(trajectory);
        results.warnings.push(...warnings);
        
        const version = trajectory.levelVersion;
        results.versionDistribution.set(
          version,
          (results.versionDistribution.get(version) || 0) + 1
        );
      } catch (e) {
        results.warnings.push({
          type: 'parse_error',
          severity: 'high',
          message: `解析第 ${index} 条轨迹失败: ${e.message}`
        });
      }
    });

    return results;
  }

  _extractVersionAliases(rawData) {
    const aliases = new Set();
    
    if (rawData.oldNames) {
      rawData.oldNames.forEach(n => aliases.add(n.toLowerCase()));
    }
    
    if (rawData.notes) {
      const noteMatches = rawData.notes.match(/原名[：:]\s*([^\s,，]+)/g);
      if (noteMatches) {
        noteMatches.forEach(match => {
          const name = match.replace(/原名[：:]\s*/, '').toLowerCase();
          aliases.add(name);
        });
      }
    }

    return Array.from(aliases);
  }

  getWarnings() {
    return [...this.warnings];
  }
}

module.exports = DataParser;
