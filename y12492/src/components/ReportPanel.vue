<template>
  <div class="report-panel" v-if="report">
    <div class="report-header">
      <h2>灯光分析报告</h2>
      <span class="report-time">{{ report.summary.generatedAt }}</span>
    </div>

    <div class="summary-section">
      <h3>📊 摘要概览</h3>
      <div class="summary-cards">
        <div class="summary-card critical" v-if="report.summary.criticalCount > 0">
          <span class="card-count">{{ report.summary.criticalCount }}</span>
          <span class="card-label">严重问题</span>
        </div>
        <div class="summary-card high" v-if="report.summary.highCount > 0">
          <span class="card-count">{{ report.summary.highCount }}</span>
          <span class="card-label">高优先级</span>
        </div>
        <div class="summary-card medium" v-if="report.summary.mediumCount > 0">
          <span class="card-count">{{ report.summary.mediumCount }}</span>
          <span class="card-label">中优先级</span>
        </div>
        <div class="summary-card warning" v-if="report.summary.warningCount > 0">
          <span class="card-count">{{ report.summary.warningCount }}</span>
          <span class="card-label">警告</span>
        </div>
      </div>

      <div class="key-findings" v-if="report.summary.keyFindings.length > 0">
        <h4>⚠️ 关键发现</h4>
        <div class="finding-list">
          <div
            v-for="(finding, idx) in report.summary.keyFindings"
            :key="idx"
            class="finding-item"
            :class="finding.severity"
          >
            <span class="finding-type">{{ finding.type }}</span>
            <span class="finding-message">{{ finding.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="overview-section">
      <h3>🏟️ 舞台概览</h3>
      <div class="overview-grid">
        <div class="overview-item">
          <span class="label">舞台名称</span>
          <span class="value">{{ report.stageOverview.name }}</span>
        </div>
        <div class="overview-item">
          <span class="label">舞台尺寸</span>
          <span class="value">{{ report.stageOverview.dimensions.width }} × {{ report.stageOverview.dimensions.depth }} × {{ report.stageOverview.dimensions.height }}m</span>
        </div>
        <div class="overview-item">
          <span class="label">灯具数量</span>
          <span class="value">{{ report.stageOverview.fixtureCount }}</span>
        </div>
        <div class="overview-item">
          <span class="label">吊点数量</span>
          <span class="value">{{ report.stageOverview.riggingCount }}</span>
        </div>
        <div class="overview-item">
          <span class="label">演员路线</span>
          <span class="value">{{ report.stageOverview.routeCount }}</span>
        </div>
        <div class="overview-item">
          <span class="label">道具数量</span>
          <span class="value">{{ report.stageOverview.propCount }}</span>
        </div>
      </div>
    </div>

    <div class="recommendations-section">
      <h3>💡 改进建议</h3>
      <div class="recommendation-list">
        <div
          v-for="(rec, idx) in report.recommendations"
          :key="idx"
          class="recommendation-item"
          :class="rec.priority"
        >
          <div class="rec-header">
            <span class="rec-category">{{ rec.category }}</span>
            <span class="rec-priority" :class="rec.priority">{{ getPriorityLabel(rec.priority) }}</span>
          </div>
          <h4 class="rec-title">{{ rec.title }}</h4>
          <p class="rec-desc">{{ rec.description }}</p>
          <div class="rec-affected" v-if="rec.affectedItems.length > 0">
            <span>影响项：</span>
            <span class="affected-list">{{ rec.affectedItems.join(', ') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="details-section">
      <h3>📋 详细报告</h3>

      <div class="detail-block">
        <h4>💡 灯具报告</h4>
        <div class="detail-table">
          <div class="table-row header">
            <span>名称</span>
            <span>类型</span>
            <span>位置</span>
            <span>功率</span>
          </div>
          <div
            v-for="fixture in report.lightingReport.fixtures"
            :key="fixture.id"
            class="table-row"
            :class="{ warning: fixture.status === 'warning' }"
          >
            <span>{{ fixture.name }}</span>
            <span>{{ fixture.type }}</span>
            <span>({{ fixture.position.x.toFixed(1) }}, {{ fixture.position.y.toFixed(1) }}, {{ fixture.position.z.toFixed(1) }})</span>
            <span>{{ fixture.power }}W</span>
          </div>
        </div>
        <div class="obstruction-list" v-if="report.lightingReport.obstructions.length > 0">
          <h5>遮挡问题 ({{ report.lightingReport.obstructions.length }})</h5>
          <div
            v-for="obs in report.lightingReport.obstructions"
            :key="obs.id"
            class="obstruction-item"
          >
            {{ obs.message }}
          </div>
        </div>
      </div>

      <div class="detail-block">
        <h4>🏗️ 吊点报告</h4>
        <div class="detail-table">
          <div class="table-row header">
            <span>名称</span>
            <span>高度</span>
            <span>负载</span>
            <span>状态</span>
          </div>
          <div
            v-for="rig in report.riggingReport.points"
            :key="rig.id"
            class="table-row"
            :class="{ warning: rig.status === 'warning' }"
          >
            <span>{{ rig.name }}</span>
            <span>{{ rig.height }}m</span>
            <span>{{ rig.load }}kg</span>
            <span>{{ rig.status === 'warning' ? '⚠️' : '✓' }}</span>
          </div>
        </div>
      </div>

      <div class="detail-block">
        <h4>🚶 路线报告</h4>
        <div class="detail-table">
          <div class="table-row header">
            <span>路线名称</span>
            <span>演员</span>
            <span>路径点数</span>
          </div>
          <div
            v-for="route in report.routeReport.routes"
            :key="route.id"
            class="table-row"
          >
            <span>{{ route.name }}</span>
            <span>{{ route.actor }}</span>
            <span>{{ route.waypointCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  report: Object
})

function getPriorityLabel(priority) {
  const labels = {
    critical: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return labels[priority] || priority
}
</script>

<style scoped>
.report-panel {
  width: 400px;
  height: 100%;
  background: #f5f5f5;
  border-left: 1px solid #ddd;
  overflow-y: auto;
  color: #333;
}

.report-panel::-webkit-scrollbar {
  width: 8px;
}

.report-panel::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.report-panel::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.report-header {
  padding: 20px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.report-header h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
}

.report-time {
  font-size: 12px;
  color: #888;
}

.summary-section,
.overview-section,
.recommendations-section,
.details-section {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.summary-section h3,
.overview-section h3,
.recommendations-section h3,
.details-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.summary-cards {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 70px;
  padding: 12px 8px;
  border-radius: 8px;
  text-align: center;
}

.summary-card.critical { background: #ffebee; }
.summary-card.high { background: #fff3e0; }
.summary-card.medium { background: #fff8e1; }
.summary-card.warning { background: #fffde7; }

.summary-card .card-count {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.summary-card.critical .card-count { color: #c62828; }
.summary-card.high .card-count { color: #e65100; }
.summary-card.medium .card-count { color: #f57f17; }
.summary-card.warning .card-count { color: #f9a825; }

.summary-card .card-label {
  font-size: 10px;
  color: #666;
}

.key-findings h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.finding-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.finding-item {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.finding-item.critical { background: #ffebee; }
.finding-item.high { background: #fff3e0; }
.finding-item.medium { background: #fff8e1; }
.finding-item.warning { background: #fffde7; }

.finding-type {
  font-weight: 600;
  white-space: nowrap;
}

.finding-message {
  color: #444;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.overview-item .label {
  font-size: 10px;
  color: #888;
}

.overview-item .value {
  font-size: 13px;
  font-weight: 500;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid;
}

.recommendation-item.critical {
  background: #ffebee;
  border-left-color: #c62828;
}

.recommendation-item.high {
  background: #fff3e0;
  border-left-color: #e65100;
}

.recommendation-item.medium {
  background: #fff8e1;
  border-left-color: #f57f17;
}

.recommendation-item.low {
  background: #e8f5e9;
  border-left-color: #2e7d32;
}

.rec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.rec-category {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
}

.rec-priority {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.rec-priority.critical { background: #c62828; color: #fff; }
.rec-priority.high { background: #e65100; color: #fff; }
.rec-priority.medium { background: #f57f17; color: #fff; }
.rec-priority.low { background: #2e7d32; color: #fff; }

.rec-title {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: 600;
}

.rec-desc {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #555;
  line-height: 1.4;
}

.rec-affected {
  font-size: 11px;
  color: #666;
}

.affected-list {
  font-family: monospace;
  color: #888;
}

.detail-block {
  margin-bottom: 20px;
}

.detail-block h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.detail-block h5 {
  margin: 12px 0 6px 0;
  font-size: 12px;
  font-weight: 600;
  color: #c62828;
}

.detail-table {
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 0.6fr 1fr 0.5fr;
  padding: 8px 10px;
  font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
}

.table-row.header {
  background: #f5f5f5;
  font-weight: 600;
  color: #666;
}

.table-row.warning {
  background: #fff8e1;
}

.table-row:last-child {
  border-bottom: none;
}

.obstruction-list {
  margin-top: 8px;
}

.obstruction-item {
  padding: 6px 10px;
  background: #ffebee;
  border-radius: 4px;
  font-size: 11px;
  color: #c62828;
  margin-bottom: 4px;
}
</style>
