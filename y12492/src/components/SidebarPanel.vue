<template>
  <div class="sidebar-panel">
    <div class="panel-section">
      <h3>项目信息</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">舞台名称</span>
          <span class="value">{{ stageConfig.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">版本</span>
          <span class="value version">{{ stageConfig.version }}</span>
        </div>
        <div class="info-item">
          <span class="label">最后修改</span>
          <span class="value">{{ stageConfig.lastModified }}</span>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <h3>舞台尺寸</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">宽度</span>
          <span class="value">{{ stageConfig.dimensions.width }}m</span>
        </div>
        <div class="info-item">
          <span class="label">深度</span>
          <span class="value">{{ stageConfig.dimensions.depth }}m</span>
        </div>
        <div class="info-item">
          <span class="label">高度</span>
          <span class="value">{{ stageConfig.dimensions.height }}m</span>
        </div>
        <div class="info-item">
          <span class="label">高度上限</span>
          <span class="value warning">{{ stageConfig.boundaryWarnings.maxHeight }}m</span>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <h3>设备统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-icon">💡</span>
          <span class="stat-value">{{ lightingFixtures.length }}</span>
          <span class="stat-label">灯具</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🏗️</span>
          <span class="stat-value">{{ riggingPoints.length }}</span>
          <span class="stat-label">吊点</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🚶</span>
          <span class="stat-value">{{ actorRoutes.length }}</span>
          <span class="stat-label">路线</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📦</span>
          <span class="stat-value">{{ stageProps.length }}</span>
          <span class="stat-label">道具</span>
        </div>
      </div>
    </div>

    <div class="panel-section issues-section">
      <div class="section-header">
        <h3>异常检测</h3>
        <span class="issue-badge" :class="severityClass">{{ issues.length }}</span>
      </div>

      <div class="severity-stats">
        <div class="severity-item critical">
          <span class="dot"></span>
          <span>严重</span>
          <span class="count">{{ criticalCount }}</span>
        </div>
        <div class="severity-item high">
          <span class="dot"></span>
          <span>高</span>
          <span class="count">{{ highCount }}</span>
        </div>
        <div class="severity-item medium">
          <span class="dot"></span>
          <span>中</span>
          <span class="count">{{ mediumCount }}</span>
        </div>
        <div class="severity-item warning">
          <span class="dot"></span>
          <span>警告</span>
          <span class="count">{{ warningCount }}</span>
        </div>
      </div>

      <div class="issues-list">
        <div
          v-for="issue in issues"
          :key="issue.id"
          class="issue-item"
          :class="[issue.severity, { selected: selectedIssue?.id === issue.id }]"
          @click="$emit('select-issue', issue)"
        >
          <div class="issue-header">
            <span class="issue-type">{{ issue.title }}</span>
            <span class="issue-severity" :class="issue.severity">{{ getSeverityLabel(issue.severity) }}</span>
          </div>
          <p class="issue-message">{{ issue.message }}</p>
          <div class="issue-meta">
            <span class="issue-ref">ID: {{ issue.source }}</span>
            <span v-if="issue.location" class="issue-location">
              ({{ issue.location.x.toFixed(1) }}, {{ issue.location.y.toFixed(1) }}, {{ issue.location.z.toFixed(1) }})
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stageConfig: Object,
  lightingFixtures: Array,
  riggingPoints: Array,
  actorRoutes: Array,
  stageProps: Array,
  issues: Array,
  selectedIssue: Object
})

defineEmits(['select-issue'])

const criticalCount = computed(() => props.issues.filter(i => i.severity === 'critical').length)
const highCount = computed(() => props.issues.filter(i => i.severity === 'high').length)
const mediumCount = computed(() => props.issues.filter(i => i.severity === 'medium').length)
const warningCount = computed(() => props.issues.filter(i => i.severity === 'warning').length)

const severityClass = computed(() => {
  if (criticalCount.value > 0) return 'critical'
  if (highCount.value > 0) return 'high'
  if (mediumCount.value > 0) return 'medium'
  return 'normal'
})

function getSeverityLabel(severity) {
  const labels = {
    critical: '严重',
    high: '高',
    medium: '中',
    warning: '警告',
    low: '低'
  }
  return labels[severity] || severity
}
</script>

<style scoped>
.sidebar-panel {
  width: 320px;
  height: 100%;
  background: #1e1e2e;
  border-left: 1px solid #333;
  overflow-y: auto;
  color: #e0e0e0;
}

.sidebar-panel::-webkit-scrollbar {
  width: 6px;
}

.sidebar-panel::-webkit-scrollbar-track {
  background: #1e1e2e;
}

.sidebar-panel::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid #333;
}

.panel-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 12px;
  color: #888;
}

.info-item .value {
  font-size: 13px;
  font-weight: 500;
}

.info-item .value.version {
  color: #4ecdc4;
}

.info-item .value.warning {
  color: #ffaa00;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #2a2a3e;
  border-radius: 8px;
}

.stat-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 11px;
  color: #888;
}

.issue-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  background: #444;
}

.issue-badge.critical {
  background: #ff4444;
  color: #fff;
}

.issue-badge.high {
  background: #ff6600;
  color: #fff;
}

.issue-badge.medium {
  background: #ffaa00;
  color: #333;
}

.issue-badge.normal {
  background: #44aa44;
  color: #fff;
}

.severity-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.severity-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #2a2a3e;
  border-radius: 4px;
  font-size: 11px;
}

.severity-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.severity-item.critical .dot { background: #ff4444; }
.severity-item.high .dot { background: #ff6600; }
.severity-item.medium .dot { background: #ffaa00; }
.severity-item.warning .dot { background: #ffff00; }

.severity-item .count {
  font-weight: 600;
  margin-left: 4px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-item {
  padding: 10px 12px;
  background: #2a2a3e;
  border-radius: 6px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.issue-item:hover {
  background: #33334a;
}

.issue-item.selected {
  background: #33334a;
  border-left-color: #4ecdc4;
}

.issue-item.critical { border-left-color: #ff4444; }
.issue-item.high { border-left-color: #ff6600; }
.issue-item.medium { border-left-color: #ffaa00; }
.issue-item.warning { border-left-color: #ffff00; }

.issue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.issue-type {
  font-size: 12px;
  font-weight: 600;
}

.issue-severity {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.issue-severity.critical { background: #ff4444; color: #fff; }
.issue-severity.high { background: #ff6600; color: #fff; }
.issue-severity.medium { background: #ffaa00; color: #333; }
.issue-severity.warning { background: #ffff00; color: #333; }
.issue-severity.low { background: #44aa44; color: #fff; }

.issue-message {
  margin: 0 0 6px 0;
  font-size: 12px;
  color: #ccc;
  line-height: 1.4;
}

.issue-meta {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: #666;
}
</style>
