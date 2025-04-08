<script setup lang="ts">
import { NModal, NButton, NSpace } from 'naive-ui'

defineProps<{
  show: boolean
  title: string
  content: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <n-modal
    v-model:show="show"
    :mask-closable="false"
    preset="dialog"
    :title="title"
  >
    <p class="text-gray-600">{{ content }}</p>
    <template #action>
      <n-space justify="end">
        <n-button @click="emit('update:show', false)" :disabled="loading">
          取消
        </n-button>
        <n-button
          type="error"
          @click="emit('confirm')"
          :loading="loading"
        >
          确定
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template> 