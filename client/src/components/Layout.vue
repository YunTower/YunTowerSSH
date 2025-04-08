<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import {computed, ref} from 'vue'
import { NIcon, NAvatar } from 'naive-ui'
import { Person, LogOutOutline } from '@vicons/ionicons5'
import { Server, ConnectedServer } from '@/types/server'
import { Group } from '@/types/group'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const searchQuery = ref('')
const servers = ref<Server[]>([])
const connectedServers = ref<ConnectedServer[]>([])
const activeGroup = ref<number | null>(null)

// 模拟分组数据
const groups = ref<Group[]>([
  { id: 1, name: 'Akile', servers: [] },
  { id: 2, name: '默认分组', servers: [] }
])

const selectGroup = (groupId: number | null) => {
  activeGroup.value = groupId
}

// 根据搜索过滤服务器
const filteredServers = computed(() => {
  if (!searchQuery.value) return servers.value

  return servers.value.filter(server =>
      server.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      server.host.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 未分组的服务器
const ungroupedServers = computed(() => {
  return filteredServers.value.map(server => ({
    ...server,
    status: 'disconnected' as const
  }))
})

// 计算当前路由是否需要显示侧边栏
const showSidebar = computed(() => {
  // 登录页面不显示侧边栏
  return route.path !== '/login'
})

function logout() {
  authStore.logout()
  router.push('/login')
}

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
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-900 text-gray-200">
    <div v-if="showSidebar" class="flex flex-1 overflow-hidden">
      <!-- 侧边栏 -->
      <!-- 左侧侧边栏 -->
      <div class="w-64 bg-gray-900 text-white flex flex-col">
        <!-- 用户信息 -->
        <div class="p-4 border-b border-gray-800">
          <div class="flex items-center">
            <n-avatar round size="medium" class="mr-3">
              <n-icon><Person /></n-icon>
            </n-avatar>
            <div class="flex-1 overflow-hidden">
              <div class="font-medium truncate">{{ authStore.user?.username || 'User' }}</div>
              <div class="text-xs text-gray-400">{{ authStore.user?.email || 'No email' }}</div>
            </div>
            <n-button quaternary circle size="small" @click="logout">
              <template #icon>
                <n-icon><LogOutOutline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>

        <!-- 分组列表 -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-4">
            <h2 class="text-lg font-semibold mb-2">Groups</h2>
            <div
                v-for="group in groupedServers"
                :key="group.id"
                class="mb-2 p-2 rounded cursor-pointer hover:bg-gray-800"
                :class="{ 'bg-gray-800': activeGroup === group.id }"
                @click="selectGroup(group.id)"
            >
              <div class="flex items-center">
                <div class="w-8 h-8 bg-gray-700 rounded flex items-center justify-center mr-2">
                  <span class="text-sm">{{ group.name.charAt(0) }}</span>
                </div>
                <div>
                  <div class="font-medium">{{ group.name }}</div>
                  <div class="text-xs text-gray-400">{{ group.servers.length }} Hosts</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 未分组服务器 -->
          <div class="p-4 border-t border-gray-800">
            <h2 class="text-lg font-semibold mb-2">Hosts ({{ ungroupedServers.length }})</h2>
          </div>

          <!-- 当前连接的服务器 -->
          <div class="p-4 border-t border-gray-800">
            <h2 class="text-lg font-semibold mb-2">Connected ({{ connectedServers.length }})</h2>
            <div
                v-for="server in connectedServers"
                :key="server.tabKey"
                class="mb-2 p-2 rounded cursor-pointer hover:bg-gray-800"
                :class="{ 'bg-gray-800': activeTab === server.tabKey }"
                @click="activeTab = server.tabKey"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-green-700 rounded flex items-center justify-center mr-2">
                    <span class="text-sm">{{ server.name.charAt(0) }}</span>
                  </div>
                  <div>
                    <div class="font-medium">{{ server.name }}</div>
                    <div class="text-xs text-gray-400">{{ server.host }}</div>
                  </div>
                </div>
                <n-button quaternary circle size="small" @click.stop="closeTab(server.tabKey)">
                  <template #icon>
                    <n-icon>×</n-icon>
                  </template>
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧内容区 -->
      <div class="flex-1 flex flex-col overflow-hidden bg-gray-900 border-l border-gray-700">
        <!-- 主内容插槽 -->
        <div class="flex-1 overflow-auto custom-scrollbar">
          <slot />
        </div>
      </div>
    </div>
    
    <!-- 无侧边栏布局（用于登录页等） -->
    <main v-else class="flex-1">
      <div class="backdrop-blur-sm bg-gray-900/90 rounded-xl shadow-lg h-full">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 自定义滚动条样式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #2d3748;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>