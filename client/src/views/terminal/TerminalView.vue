<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { handleError } from '@/utils/errorHandler'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const serverId = ref(Number(route.params.serverId))
const terminal = ref<HTMLElement | null>(null)
const connected = ref(false)
const loading = ref(false)

const connect = async () => {
  try {
    loading.value = true
    const response = await fetch(`/api/servers/${serverId.value}/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('连接服务器失败')
    }

    const ws = new WebSocket(`ws://localhost:3000/terminal/${serverId.value}`)
    
    ws.onopen = () => {
      connected.value = true
      message.success('已连接到服务器')
    }

    ws.onmessage = (event) => {
      if (terminal.value) {
        terminal.value.innerHTML += event.data
        terminal.value.scrollTop = terminal.value.scrollHeight
      }
    }

    ws.onerror = (error) => {
      handleError(error, 'WebSocket连接错误')
      connected.value = false
    }

    ws.onclose = () => {
      connected.value = false
      message.warning('连接已断开')
    }

    // 处理终端输入
    if (terminal.value) {
      terminal.value.addEventListener('keydown', (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.key)
        }
      })
    }
  } catch (error) {
    handleError(error, '连接服务器失败')
  } finally {
    loading.value = false
  }
}

const disconnect = () => {
  if (terminal.value) {
    terminal.value.innerHTML = ''
  }
  connected.value = false
  router.push('/servers')
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">终端</h1>
      <button
        @click="disconnect"
        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        断开连接
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <div
      v-else
      ref="terminal"
      class="bg-black text-green-400 font-mono p-4 rounded-lg h-[600px] overflow-y-auto"
      tabindex="0"
    ></div>
  </div>
</template>

<style scoped>
.terminal-page {
  @apply h-screen p-4 bg-black;
}
</style>