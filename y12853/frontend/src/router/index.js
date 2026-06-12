import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '数据概览' } },
  { path: '/tide-window', component: () => import('@/views/TideWindowList.vue'), meta: { title: '潮窗结果列表' } },
  { path: '/tide-window/:id', component: () => import('@/views/TideWindowDetail.vue'), meta: { title: '潮窗详情与复核' } },
  { path: '/trajectory', component: () => import('@/views/TrajectoryCleaning.vue'), meta: { title: '轨迹清洗（日常入口）' } },
  { path: '/formulas', component: () => import('@/views/FormulaLibrary.vue'), meta: { title: '计算公式库' } },
  { path: '/import', component: () => import('@/views/DataImport.vue'), meta: { title: '导入/补录' } },
  { path: '/example', component: () => import('@/views/ExampleData.vue'), meta: { title: '示例数据' } },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
