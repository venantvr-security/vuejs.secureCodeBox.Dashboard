import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue')
    },
    {
      path: '/pods',
      name: 'pods',
      component: () => import('@/views/Pods.vue')
    },
    {
      path: '/pods/:name',
      name: 'pod-detail',
      component: () => import('@/views/PodDetail.vue')
    },
    {
      path: '/scans',
      name: 'scans',
      component: () => import('@/views/Scans.vue')
    },
    {
      path: '/scans/:name',
      name: 'scan-detail',
      component: () => import('@/views/ScanDetail.vue')
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('@/views/Events.vue')
    },
    {
      path: '/terminal',
      name: 'terminal',
      component: () => import('@/views/Terminal.vue')
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/Onboarding.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue')
    }
  ]
})

export default router
