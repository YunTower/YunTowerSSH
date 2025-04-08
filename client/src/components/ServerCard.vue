<script setup lang="ts">
import { NCard, NSpace, NButton, NIcon } from 'naive-ui'
import { Terminal, Trash, Edit } from '@vicons/ionicons5'
import ServerStatus from './ServerStatus.vue'
import { ServerWithStatus } from '@/types/server'

defineProps<{
  server: ServerWithStatus
}>()

const emit = defineEmits<{
  (e: 'connect', id: number): void
  (e: 'edit', id: number): void
  (e: 'delete', id: number): void
}>()
</script>

<template>
  <n-card class="server-card glass-effect">
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-200">{{ server.name }}</h3>
        <ServerStatus :status="server.status" />
      </div>
    </template>
    <div class="space-y-2">
      <p class="text-gray-300">
        <span class="font-medium">主机:</span> {{ server.host }}
      </p>
      <p class="text-gray-300">
        <span class="font-medium">端口:</span> {{ server.port }}
      </p>
      <p class="text-gray-300">
        <span class="font-medium">用户名:</span> {{ server.username }}
      </p>
    </div>
    <template #footer>
      <n-space justify="end">
        <n-button
          type="primary"
          :disabled="server.status === 'connecting'"
          @click="emit('connect', server.id)"
        >
          <template #icon>
            <n-icon><Terminal /></n-icon>
          </template>
          连接
        </n-button>
        <n-button
          type="info"
          @click="emit('edit', server.id)"
        >
          <template #icon>
            <n-icon><Edit /></n-icon>
          </template>
          编辑
        </n-button>
        <n-button
          type="error"
          @click="emit('delete', server.id)"
        >
          <template #icon>
            <n-icon><Trash /></n-icon>
          </template>
          删除
        </n-button>
      </n-space>
    </template>
  </n-card>
</template>

<style scoped>
.server-card {
  @apply transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px];
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(75, 85, 99, 0.2);
}

.server-card :deep(.n-card__content),
.server-card :deep(.n-card__footer),
.server-card :deep(.n-card__header) {
  background-color: transparent;
}

.server-card :deep(.n-button) {
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.server-card :deep(.n-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>