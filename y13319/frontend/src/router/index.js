import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '总览看板' } },
  { path: '/corrections', component: () => import('../views/Corrections.vue'), meta: { title: '人工修正' } },
  { path: '/anomalies', component: () => import('../views/Anomalies.vue'), meta: { title: '异常队列' } },
  { path: '/sample-track', component: () => import('../views/SampleTrack.vue'), meta: { title: '样本追踪' } },
  { path: '/version-compare', component: () => import('../views/VersionCompare.vue'), meta: { title: '版本对比' } },
  { path: '/review', component: () => import('../views/Review.vue'), meta: { title: '评审溯源' } },
  { path: '/history', component: () => import('../views/History.vue'), meta: { title: '历史变更' } },
  { path: '/field-mapping', component: () => import('../views/FieldMapping.vue'), meta: { title: '字段映射' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
