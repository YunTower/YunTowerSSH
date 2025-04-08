<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NInput, NIcon, NButton, NAvatar, NTag, NTabs, NTabPane } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { handleError } from '@/utils/errorHandler'
import { Search, Add, Person, LogOutOutline } from '@vicons/ionicons5'
import ServerCard from '@/components/ServerCard.vue'
import ServerStatus from '@/components/ServerStatus.vue'
import { Server, ConnectedServer, ServerWithStatus } from '@/types/server'
import { Group, GroupWithServers } from '@/types/group'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const servers = ref<Server[]>([])
const loading = ref(false)
const searchQuery = ref('')
const activeGroup = ref<number | null>(null)
const connectedServers = ref<ConnectedServer[]>([])
const activeTab = ref<string | null>(null)

// 模拟分组数据
const groups = ref<Group[]>([
  { id: 1, name: 'Akile', servers: [] },
  { id: 2, name: '默认分组', servers: [] }
])

// 根据搜索过滤服务器
const filteredServers = computed(() => {
  if (!searchQuery.value) return servers.value
  
  return servers.value.filter(server => 
    server.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    server.host.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 按分组组织服务器
const groupedServers = computed(() => {
  // 将服务器分配到模拟分组中
  const result = JSON.parse(JSON.stringify(groups.value)) as Group[]
  
  // 将所有服务器放入第一个分组（示例目的）
  if (result.length > 0 && filteredServers.value.length > 0) {
    result[0].servers = filteredServers.value.map(server => ({
      ...server,
      status: 'disconnected' as const
    }))
  }
  
  return result
})

// 未分组的服务器
const ungroupedServers = computed(() => {
  return filteredServers.value.map(server => ({
    ...server,
    status: 'disconnected' as const
  }))
})

const fetchServers = async () => {
  try {
    loading.value = true
    const response = await fetch('/api/servers', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error('获取服务器列表失败')
    }

    servers.value = await response.json()
  } catch (error) {
    handleError(error, '获取服务器列表失败')
  } finally {
    loading.value = false
  }
}

const connectToServer = (serverId: number) => {
  // 查找要连接的服务器
  const server = servers.value.find(s => s.id === serverId)
  if (!server) return
  
  // 检查服务器是否已经连接
  const existingConnection = connectedServers.value.find(s => s.id === serverId)
  if (existingConnection) {
    // 如果已连接，只切换到该标签
    activeTab.value = existingConnection.tabKey
    return
  }
  
  // 添加到已连接服务器列表
  const tabKey = `server-${serverId}-${Date.now()}`
  connectedServers.value.push({
    ...server,
    status: 'connected',
    tabKey
  })
  
  // 激活新标签
  activeTab.value = tabKey
  
  // 实际连接逻辑可以在这里添加
  // 例如：router.push(`/terminal/${serverId}`)
}

const selectGroup = (groupId: number | null) => {
  activeGroup.value = groupId
}

const closeTab = (tabKey: string) => {
  const index = connectedServers.value.findIndex(s => s.tabKey === tabKey)
  if (index !== -1) {
    connectedServers.value.splice(index, 1)
    
    // 如果关闭的是当前活动标签，则切换到其他标签
    if (activeTab.value === tabKey) {
      activeTab.value = connectedServers.value.length > 0 ? 
        connectedServers.value[0].tabKey : null
    }
  }
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  fetchServers()
})
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <!-- 右侧内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden bg-gray-900">
      <!-- 顶部搜索栏 -->
      <div class="bg-gray-800 p-4 shadow flex justify-between w-full">
        <h1 class="text-xl font-bold">Host</h1>
        <div class="flex space-x-2 w-full">
          <n-input
              class="max-w-[220px]"
            v-model:value="searchQuery"
            placeholder="Search host or group"
            clearable
          >
            <template #prefix>
              <n-icon><Search /></n-icon>
            </template>
          </n-input>
          <n-button type="primary" @click="fetchServers" :loading="loading">
            <template #icon>
              <n-icon><Add /></n-icon>
            </template>
            添加服务器
          </n-button>
        </div>
      </div>
      
      <!-- 主内容区 -->
      <div class="flex-1 overflow-auto p-6">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-full">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        
        <!-- 已连接服务器的标签页 -->
        <div v-else-if="connectedServers.length > 0 && activeTab" class="h-full">
          <n-tabs
            type="card"
            v-model:value="activeTab"
            class="h-full flex flex-col"
            closable
            @close="closeTab"
          >
            <n-tab-pane
              v-for="server in connectedServers"
              :key="server.tabKey"
              :name="server.tabKey"
              :tab="server.name"
              class="flex-1"
            >
              <div class="bg-black text-white h-full rounded p-4 font-mono">
                <div class="mb-2 flex justify-between items-center">
                  <div>
                    <span class="text-green-400">Connected to:</span> {{ server.host }}:{{ server.port }} ({{ server.username }})
                  </div>
                  <server-status :status="server.status" />
                </div>
                <div class="border-t border-gray-700 pt-2">
                  <p>Terminal session would be displayed here</p>
                  <!-- 这里可以集成实际的终端组件 -->
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>
        
        <!-- 服务器列表 -->
        <div v-else>
          <!-- 当前选中的分组 -->
          <div v-if="activeGroup !== null">
            <div v-for="group in groupedServers" :key="group.id">
              <div v-if="group.id === activeGroup">
                <div class="flex justify-between items-center mb-6">
                  <h1 class="text-2xl font-bold">{{ group.name }}</h1>
                </div>
                
                <div v-if="group.servers.length === 0" class="text-center py-8 text-gray-500">
                  暂无服务器
                </div>
                
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div
                    v-for="server in group.servers"
                    :key="server.id"
                    class="glass-effect shadow p-4 hover:shadow-lg transition-shadow"
                  >
                    <div class="flex justify-between items-center mb-2">
                      <h3 class="text-lg font-semibold text-gray-200">{{ server.name }}</h3>
                      <span class="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">ssh {{ server.username }}</span>
                    </div>
                    <p class="text-gray-300 mb-2">{{ server.host }}</p>
                    <p class="text-sm text-gray-400 mb-4">端口: {{ server.port }}</p>
                    <button
                      @click="connectToServer(server.id)"
                      class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                      连接
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 未选中分组时显示所有服务器 -->
          <div v-else>
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold">所有服务器</h1>
            </div>
            
            <div v-if="ungroupedServers.length === 0" class="text-center py-8 text-gray-500">
              暂无服务器
            </div>
            
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="server in ungroupedServers"
                :key="server.id"
                class="glass-effect shadow p-4 hover:shadow-lg transition-shadow"
              >
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-lg font-semibold text-gray-200">{{ server.name }}</h3>
                  <span class="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">ssh {{ server.username }}</span>
                </div>
                <p class="text-gray-300 mb-2">{{ server.host }}</p>
                <p class="text-sm text-gray-400 mb-4">端口: {{ server.port }}</p>
                <button
                  @click="connectToServer(server.id)"
                  class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                  连接
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #2d3748;
}

::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>