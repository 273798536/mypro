import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import ReviewPanel from '@/pages/ReviewPanel.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: ReviewPanel }
  ]
})

createApp(App).use(router).mount('#app')
