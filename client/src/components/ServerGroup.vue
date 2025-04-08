<script setup lang="ts">
import { NCard, NButton, NIcon, NCollapse, NCollapseItem } from 'naive-ui'
import { ChevronDown, ChevronUp, Add } from '@vicons/ionicons5'
import ServerCard from './ServerCard.vue'

interface Server {
  id: number
  name: string
  host: string
  port: number
  username: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
}

interface Group {
  id: number
  name: string
  servers: Server[]
}

defineProps<{
  groups: Group[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', serverId: number): void
  (e: 'delete', serverId: number): void
  (e: 'edit', serverId: number): void
  (e: 'add', groupId: number): void
}>()
</script>

<template>
  <div class="server-groups">
    <n-collapse>
      <n-collapse-item
        v-for="group in groups"
        :key="group.id"
        :title="group.name"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServerCard
            v-for="server in group.servers"
            :key="server.id"
            :server="server"
            @connect="emit('select', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
        </div>
      </n-collapse-item>
    </n-collapse>
  </div>
</template>

<style scoped>
.server-groups {
  @apply p-4;
}
</style> 