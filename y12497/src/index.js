const LevelModel = require('./models/LevelModel');
const PlayerTrajectory = require('./models/PlayerTrajectory');
const DataParser = require('./parsers/DataParser');
const AnomalyDetector = require('./analyzers/AnomalyDetector');
const HeatmapGenerator = require('./heatmap/HeatmapGenerator');
const SchemeComparator = require('./analyzers/SchemeComparator');
const ReportExporter = require('./exporters/ReportExporter');

class CollisionHeatmapSystem {
  constructor(options = {}) {
    this.parser = new DataParser();
    this.detector = new AnomalyDetector(options.anomalyOptions);
    this.heatmap = new HeatmapGenerator(options.heatmapOptions);
    this.comparator = new SchemeComparator();
    this.exporter = new ReportExporter(options.exportOptions);
    
    this.level = null;
    this.trajectories = [];
    this.anomalies = [];
    this.heatmapResult = null;
  }

  registerVersionAlias(officialName, aliases) {
    this.parser.registerVersionAlias(officialName, aliases);
  }

  loadLevel(rawLevelData, sourceInfo = {}) {
    const result = this.parser.parseLevelData(rawLevelData, sourceInfo);
    this.level = result.level;
    return result;
  }

  loadTrajectories(rawTrajectories, sourceInfo = {}) {
    const result = this.parser.parseBatchTrajectories(rawTrajectories, sourceInfo);
    this.trajectories = result.trajectories;
    return result;
  }

  analyze() {
    if (!this.level) {
      throw new Error('请先加载关卡数据');
    }
    if (this.trajectories.length === 0) {
      throw new Error('请先加载轨迹数据');
    }

    this.anomalies = this.detector.detectAll(this.level, this.trajectories);
    
    this.heatmapResult = this.heatmap.generate(this.level, this.trajectories);

    return {
      anomalies: this.anomalies,
      heatmap: this.heatmapResult,
      warnings: this.parser.getWarnings()
    };
  }

  getObjectInfo(colliderIdOrName) {
    if (!this.level || !this.heatmapResult) {
      throw new Error('请先执行分析');
    }
    return this.heatmap.getObjectInfo(colliderIdOrName, this.level);
  }

  compareObjects(colliderIds) {
    if (!this.level || !this.heatmapResult) {
      throw new Error('请先执行分析');
    }
    return this.heatmap.compareObjects(colliderIds, this.level);
  }

  findHotspots(threshold = 0.7, limit = 10) {
    return this.heatmap.findHotspots(threshold, limit);
  }

  addSchemeForComparison(schemeName) {
    if (!this.level || !this.heatmapResult) {
      throw new Error('请先执行分析');
    }
    this.comparator.addScheme(schemeName, this.heatmapResult, this.level, this.anomalies);
  }

  compareSchemes(schemeNames = null) {
    return this.comparator.compare(schemeNames);
  }

  exportReport(options = {}) {
    if (!this.level || !this.heatmapResult) {
      throw new Error('请先执行分析');
    }
    return this.exporter.exportHeatmapReport(
      this.level,
      this.heatmapResult,
      this.anomalies,
      this.trajectories,
      options
    );
  }

  exportObjectReport(colliderIdOrName, options = {}) {
    const objectInfo = this.getObjectInfo(colliderIdOrName);
    if (!objectInfo) {
      throw new Error('找不到该对象');
    }
    const collider = this.level.getColliderById(colliderIdOrName) || 
                     this.level.getColliderByName(colliderIdOrName);
    return this.exporter.exportObjectDetail(collider.id, objectInfo, options);
  }

  exportComparisonReport(comparison, options = {}) {
    return this.exporter.exportComparisonReport(comparison, options);
  }

  getVersionDistribution() {
    const dist = new Map();
    this.trajectories.forEach(t => {
      dist.set(t.levelVersion, (dist.get(t.levelVersion) || 0) + 1);
    });
    return Array.from(dist.entries()).map(([v, c]) => ({
      version: v,
      count: c,
      percentage: ((c / this.trajectories.length) * 100).toFixed(1)
    }));
  }

  getDataQualitySummary() {
    const withDrift = this.trajectories.filter(t => t.dataQuality.hasDrift).length;
    const avgCompleteness = this.trajectories.reduce((sum, t) => 
      sum + t.dataQuality.completeness, 0) / this.trajectories.length;
    
    return {
      totalTrajectories: this.trajectories.length,
      withDrift,
      driftPercentage: ((withDrift / this.trajectories.length) * 100).toFixed(1),
      avgCompleteness: avgCompleteness.toFixed(1),
      anomalies: {
        high: this.anomalies.filter(a => a.severity === 'high').length,
        medium: this.anomalies.filter(a => a.severity === 'medium').length,
        low: this.anomalies.filter(a => a.severity === 'low').length
      }
    };
  }
}

module.exports = {
  CollisionHeatmapSystem,
  LevelModel,
  PlayerTrajectory,
  DataParser,
  AnomalyDetector,
  HeatmapGenerator,
  SchemeComparator,
  ReportExporter
};
