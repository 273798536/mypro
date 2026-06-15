<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo">
          <el-icon :size="32" color="#fff"><Warning /></el-icon>
          <h1>海水浴场风险播报系统</h1>
        </div>
        <div class="header-info">
          <span class="date">{{ currentDate }}</span>
        </div>
      </div>
    </el-header>
    <el-container>
      <el-aside width="220px" class="app-aside">
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#001529"
          text-color="#fff"
          active-text-color="#409eff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据概览</span>
          </el-menu-item>
          <el-menu-item index="/import">
            <el-icon><Upload /></el-icon>
            <span>数据导入</span>
          </el-menu-item>
          <el-menu-item index="/processing">
            <el-icon><Document /></el-icon>
            <span>处理记录</span>
          </el-menu-item>
          <el-menu-item index="/anomalies">
            <el-icon><Warning /></el-icon>
            <span>异常管理</span>
          </el-menu-item>
          <el-menu-item index="/map">
            <el-icon><Location /></el-icon>
            <span>地图展示</span>
          </el-menu-item>
          <el-menu-item index="/calculator">
            <el-icon><Calculator /></el-icon>
            <span>计算工具</span>
          </el-menu-item>
          <el-menu-item index="/gaps">
            <el-icon><CircleClose /></el-icon>
            <span>数据缺口</span>
          </el-menu-item>
          <el-menu-item index="/review">
            <el-icon><Check /></el-icon>
            <span>复核管理</span>
          </el-menu-item>
          <el-menu-item index="/trace">
            <el-icon><Connection /></el-icon>
            <span>追溯查询</span>
          </el-menu-item>
          <el-menu-item index="/help">
            <el-icon><QuestionFilled /></el-icon>
            <span>使用说明</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'

const route = useRoute()
const currentDate = ref(dayjs().format('YYYY年MM月DD日 HH:mm:ss'))

setInterval(() => {
  currentDate.value = dayjs().format('YYYY年MM月DD日 HH:mm:ss')
}, 1000)

const activeMenu = computed(() => route.path)
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background: linear-gradient(90deg, #001529 0%, #003a70 100%);
  color: #fff;
  padding: 0 24px;
  height: 64px;
  line-height: 64px;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
    }

    .header-info {
      .date {
        font-size: 14px;
        opacity: 0.9;
      }
    }
  }
}

.app-aside {
  background-color: #001529;
  height: calc(100vh - 64px);
  overflow-y: auto;

  :deep(.el-menu) {
    border-right: none;
  }
}

.app-main {
  background-color: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}
</style>
