import { useAuthStore } from '@/stores/auth'
import { handleError } from '@/utils/errorHandler'

export const login = async (username: string, password: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      throw new Error('登录失败')
    }

    const data = await response.json()
    const authStore = useAuthStore()
    authStore.setToken(data.token)
    authStore.setUser(data.user)
    
    return true
  } catch (error) {
    handleError(error, '登录失败')
    return false
  }
}

export const logout = async (): Promise<void> => {
  try {
    const authStore = useAuthStore()
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    authStore.logout()
  } catch (error) {
    handleError(error, '登出失败')
  }
}