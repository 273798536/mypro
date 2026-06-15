import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '数据概览' }
  },
  {
    path: '/records',
    name: 'Records',
    component: () => import('@/views/Records.vue'),
    meta: { title: '记录清单' }
  },
  {
    path: '/abnormal',
    name: 'Abnormal',
    component: () => import('@/views/Abnormal.vue'),
    meta: { title: '异常处理' }
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('@/views/Export.vue'),
    meta: { title: '数据导出' }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('@/views/Upload.vue'),
    meta: { title: '材料入口' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 社区充电公示清单系统` : '社区充电公示清单系统'
  next()
})

export default router
