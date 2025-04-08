import { useAuthStore } from '@/stores/auth'

export function setupGuards(router: any) {
  router.beforeEach((to: any, from: any, next: any) => {
    const authStore = useAuthStore()
    const publicPages = ['/login']
    const authRequired = !publicPages.includes(to.path)

    if (authRequired && !authStore.isAuthenticated) {
      return next('/login')
    }

    if (to.path === '/login' && authStore.isAuthenticated) {
      return next('/servers')
    }

    next()
  })
} 