<template>
  <el-container class="app-container">
    <el-aside width="220px" class="app-aside">
      <div class="logo">
        <el-icon size="28"><Film /></el-icon>
        <span>电影保底发行回款</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="menu"
        router
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409eff"
      >
        <el-menu-item v-for="route in menuRoutes" :key="route.path" :index="route.path">
          <el-icon><component :is="route.meta.icon" /></el-icon>
          <span>{{ route.meta.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <span class="current-page">{{ currentPageTitle }}</span>
        </div>
        <div class="header-right">
          <el-tag type="info" size="small">
            <el-icon><User /></el-icon>
            {{ store.currentUser.name }} | {{ store.currentUser.department }}
          </el-tag>
        </div>
      </el-header>

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

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBusinessStore } from './stores/business'
import type { RouteRecordRaw } from 'vue-router'

const route = useRoute()
const store = useBusinessStore()

const menuRoutes = computed(() => {
  const routes = [
    { path: '/dashboard', meta: { title: '首页仪表盘', icon: 'DataAnalysis' } },
    { path: '/contracts', meta: { title: '影片合同', icon: 'Document' } },
    { path: '/boxoffice', meta: { title: '票房流水', icon: 'TrendCharts' } },
    { path: '/expenses', meta: { title: '宣发费用', icon: 'Money' } },
    { path: '/settlements', meta: { title: '回款分账', icon: 'Calculator' } },
    { path: '/raw-materials', meta: { title: '原始材料', icon: 'FolderOpened' } },
    { path: '/exception-trace', meta: { title: '异常追踪', icon: 'Warning' } },
    { path: '/logs', meta: { title: '操作日志', icon: 'List' } }
  ]
  return routes
})

const activeMenu = computed(() => route.path)
const currentPageTitle = computed(() => route.meta?.title as string || '首页')
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.app-aside {
  background: #001529;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 8px;
}

.menu {
  flex: 1;
  border-right: none;
}

.app-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.current-page {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.app-main {
  padding: 0;
  overflow-y: auto;
  background: #f5f7fa;
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
