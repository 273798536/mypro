<template>
  <el-container class="app-container">
    <el-aside width="220px" class="app-aside">
      <div class="logo">
        <el-icon :size="22" color="#fff"><PieChart /></el-icon>
        <span>慢行桥复核</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#1a3c6e"
        text-color="#cfd8e8"
        active-text-color="#ffffff"
        class="app-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>状态看板</span>
        </el-menu-item>
        <el-menu-item index="/feedbacks">
          <el-icon><Document /></el-icon>
          <span>反馈列表</span>
        </el-menu-item>
        <el-menu-item index="/merge">
          <el-icon><Link /></el-icon>
          <span>重复归并中心</span>
        </el-menu-item>
        <el-menu-item index="/import">
          <el-icon><Upload /></el-icon>
          <span>导入 / 导出</span>
        </el-menu-item>
      </el-menu>
      <div class="aside-footer">
        <el-input
          v-model="store.operator"
          size="small"
          placeholder="当前处理人"
          @change="handleOperatorChange"
          style="margin-bottom:8px"
        >
          <template #prefix><el-icon><User /></el-icon></template>
        </el-input>
        <div class="version">v1.0 · 市政设计</div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="breadcrumb">
          <el-icon><Location /></el-icon>
          <span>{{ $route.meta.title || '首页' }}</span>
        </div>
        <div class="header-actions">
          <el-tag type="info" effect="plain">
            <el-icon style="margin-right:4px"><Warning /></el-icon>
            原始数据一律保留痕迹，不可覆盖
          </el-tag>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/store'

const store = useAppStore()

onMounted(async () => {
  await store.loadStatusInfo()
})

const handleOperatorChange = () => {
  store.setOperator(store.operator)
}
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.app-aside {
  background-color: #1a3c6e;
  display: flex;
  flex-direction: column;
  color: #fff;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.app-menu {
  flex: 1;
  border-right: none;
}

.app-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
}

.aside-footer {
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.version {
  font-size: 11px;
  color: #8a9bb8;
  text-align: center;
}

.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 22px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #303133;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-main {
  background-color: #f5f7fa;
  padding: 22px;
  overflow-y: auto;
}
</style>
