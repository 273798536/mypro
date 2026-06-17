import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '状态看板' }
  },
  {
    path: '/feedbacks',
    name: 'Feedbacks',
    component: () => import('@/views/FeedbackList.vue'),
    meta: { title: '反馈列表' }
  },
  {
    path: '/feedbacks/:id',
    name: 'FeedbackDetail',
    component: () => import('@/views/FeedbackDetail.vue'),
    meta: { title: '详情与复核' }
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('@/views/ImportExport.vue'),
    meta: { title: '导入导出' }
  },
  {
    path: '/merge',
    name: 'Merge',
    component: () => import('@/views/MergeCenter.vue'),
    meta: { title: '重复归并中心' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach(to => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 慢行桥坡道容量复核管理系统`
  }
})

export default router
