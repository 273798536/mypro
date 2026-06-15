<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-left">
        <el-icon :size="28" color="#409EFF"><Lightning /></el-icon>
        <span class="system-title">社区充电公示清单系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        router
        class="nav-menu"
        background-color="transparent"
        text-color="#606266"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据概览</span>
        </el-menu-item>
        <el-menu-item index="/upload">
          <el-icon><UploadFilled /></el-icon>
          <span>材料入口</span>
        </el-menu-item>
        <el-menu-item index="/records">
          <el-icon><List /></el-icon>
          <span>记录清单</span>
        </el-menu-item>
        <el-menu-item index="/abnormal">
          <el-icon><Warning /></el-icon>
          <span>异常处理</span>
        </el-menu-item>
        <el-menu-item index="/export">
          <el-icon><Download /></el-icon>
          <span>数据导出</span>
        </el-menu-item>
      </el-menu>
    </el-header>
    <el-container>
      <el-aside width="0" />
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 32px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  height: 70px !important;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
}

.nav-menu {
  border-bottom: none;
  height: 70px;
  line-height: 70px;
}

.nav-menu :deep(.el-menu-item) {
  height: 70px;
  line-height: 70px;
  font-size: 15px;
  padding: 0 24px;
}

.nav-menu :deep(.el-menu-item i) {
  margin-right: 6px;
}

.app-main {
  padding: 24px;
  background-color: #f5f7fa;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
