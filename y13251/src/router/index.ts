import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/review'
    },
    {
      path: '/review',
      name: 'Review',
      component: () => import('@/views/ReviewPage.vue'),
      meta: { title: '夜市外摆容量复核' }
    },
    {
      path: '/queue',
      name: 'Queue',
      component: () => import('@/views/AbnormalQueue.vue'),
      meta: { title: '异常队列' }
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('@/views/HistoryPage.vue'),
      meta: { title: '历史记录复盘' }
    }
  ]
})

export default router
