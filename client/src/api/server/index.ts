import { useAuthStore } from '@/stores/auth'
import { handleError } from '@/utils/errorHandler'
import { Server } from '@/types/server'

export const fetchServers = async (): Promise<Server[]> => {
  try {
    const authStore = useAuthStore()
    const response = await fetch('/api/servers', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('获取服务器列表失败')
    }

    return await response.json()
  } catch (error) {
    handleError(error, '获取服务器列表失败')
    return []
  }
}

export const connectToServer = async (serverId: number): Promise<boolean> => {
  try {
    const authStore = useAuthStore()
    const response = await fetch(`/api/servers/${serverId}/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('连接服务器失败')
    }

    return true
  } catch (error) {
    handleError(error, '连接服务器失败')
    return false
  }
}