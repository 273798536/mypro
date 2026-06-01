<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <h1>🎭 舞台灯光遮挡沙盘</h1>
        <span class="subtitle">巡演A站 - 空间关系分析</span>
      </div>
      <div class="header-right">
        <div class="view-toggle">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-btn', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="viewer-container">
        <StageViewer
          :stage-config="stageConfig"
          :lighting-fixtures="lightingFixtures"
          :rigging-points="riggingPoints"
          :actor-routes="actorRoutes"
          :stage-props="stageProps"
          :issues="issues"
          :selected-issue="selectedIssue"
        />
      </div>

      <SidebarPanel
        v-if="activeTab === 'analysis'"
        :stage-config="stageConfig"
        :lighting-fixtures="lightingFixtures"
        :rigging-points="riggingPoints"
        :actor-routes="actorRoutes"
        :stage-props="stageProps"
        :issues="issues"
        :selected-issue="selectedIssue"
        @select-issue="selectIssue"
      />

      <ReportPanel
        v-if="activeTab === 'report'"
        :report="report"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import StageViewer from './components/StageViewer.vue'
import SidebarPanel from './components/SidebarPanel.vue'
import ReportPanel from './components/ReportPanel.vue'
import {
  stageConfig,
  lightingFixtures,
  riggingPoints,
  actorRoutes,
  stageProps
} from './data/stageData.js'
import { detectAllCollisions } from './utils/collisionDetector.js'
import { generateReport } from './utils/reportGenerator.js'

const tabs = [
  { id: 'analysis', label: '🔍 分析视图' },
  { id: 'report', label: '📋 详细报告' }
]

const activeTab = ref('analysis')
const selectedIssue = ref(null)

const issues = computed(() => {
  return detectAllCollisions({
    lightingFixtures,
    riggingPoints,
    actorRoutes,
    stageProps,
    stageConfig
  })
})

const report = computed(() => {
  return generateReport({
    stageConfig,
    lightingFixtures,
    riggingPoints,
    actorRoutes,
    stageProps,
    issues: issues.value
  })
})

function selectIssue(issue) {
  if (selectedIssue.value?.id === issue.id) {
    selectedIssue.value = null
  } else {
    selectedIssue.value = issue
  }
}
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #12121e;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #1a1a2e;
  border-bottom: 1px solid #333;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.subtitle {
  font-size: 12px;
  color: #888;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: #2a2a3e;
  padding: 4px;
  border-radius: 6px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #888;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #ccc;
}

.tab-btn.active {
  background: #4ecdc4;
  color: #1a1a2e;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.viewer-container {
  flex: 1;
  position: relative;
}
</style>
