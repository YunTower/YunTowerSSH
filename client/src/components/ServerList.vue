<script setup lang="ts">
import {NGrid, NGridItem, NEmpty, NButton, NIcon} from 'naive-ui'
import {Add} from '@vicons/ionicons5'
import ServerCard from './ServerCard.vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface Server {
  id: number
  name: string
  host: string
  port: number
  username: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
}

defineProps<{
  servers: Server[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: number): void
  (e: 'delete', id: number): void
  (e: 'edit', id: number): void
  (e: 'add'): void
}>()
</script>

<template>
  <div class="server-list">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">服务器列表</h2>
    </div>

    <div v-if="loading" class="flex justify-center items-center min-h-[200px]">
      <LoadingSpinner size="large"/>
    </div>

    <n-grid v-else :cols="3" :x-gap="16" :y-gap="16">
      <n-grid-item v-for="server in servers" :key="server.id">
        <ServerCard
            :server="server"
            @connect="emit('select', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
        />
      </n-grid-item>
    </n-grid>

    <n-empty
        v-if="!loading && servers.length === 0"
        description="暂无服务器"
    />
  </div>
</template>

<style scoped>
.server-list {
  @apply p-4;
}
</style> 