import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/channels',
    },
    {
      path: '/channels',
      name: 'channels',
      component: () => import('../views/ChannelsView.vue'),
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: () => import('../views/JobsView.vue'),
    },
  ],
})

export default router
