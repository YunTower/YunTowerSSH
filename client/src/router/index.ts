import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/servers',
    name: 'servers',
    component: () => import('@/views/server/ServerView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/terminal/:serverId',
    name: 'terminal',
    component: () => import('@/views/terminal/TerminalView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((record: RouteRecordRaw) => record.meta?.requiresAuth)

  if (requiresAuth) {
    const isAuthenticated = await authStore.checkAuth()
    if (!isAuthenticated) {
      next('/login')
      return
    }
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/servers')
    return
  }

  next()
})

export default router