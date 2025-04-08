import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useAuthStore } from './auth'
import { Server, CreateServerData, UpdateServerData } from '@/types/server'

export const useServersStore = defineStore('servers', () => {
  const message = useMessage()
  const authStore = useAuthStore()
  const servers = ref<Server[]>([])
  const loading = ref(false)

  async function fetchServers() {
    try {
      loading.value = true
      const response = await fetch('/api/servers', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch servers')
      }

      servers.value = await response.json()
    } catch (error) {
      message.error('Failed to fetch servers')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createServer(server: Omit<Server, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify(server)
      })

      if (!response.ok) {
        throw new Error('Failed to create server')
      }

      await fetchServers()
      message.success('Server created successfully')
    } catch (error) {
      message.error('Failed to create server')
      throw error
    }
  }

  async function updateServer(id: number, server: Partial<Server>) {
    try {
      const response = await fetch(`/api/servers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify(server)
      })

      if (!response.ok) {
        throw new Error('Failed to update server')
      }

      await fetchServers()
      message.success('Server updated successfully')
    } catch (error) {
      message.error('Failed to update server')
      throw error
    }
  }

  async function deleteServer(id: number) {
    try {
      const response = await fetch(`/api/servers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete server')
      }

      await fetchServers()
      message.success('Server deleted successfully')
    } catch (error) {
      message.error('Failed to delete server')
      throw error
    }
  }

  return {
    servers,
    loading,
    fetchServers,
    createServer,
    updateServer,
    deleteServer
  }
})