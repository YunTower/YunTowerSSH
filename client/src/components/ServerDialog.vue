<script setup lang="ts">
import { NModal, NCard } from 'naive-ui'
import ServerForm from './ServerForm.vue'
import { ServerFormData } from '@/types/server'

const props = defineProps<{
  show: boolean
  title: string
  initialData?: Partial<ServerFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit', data: ServerFormData): void
}>()
</script>

<template>
  <n-modal
    v-model:show="show"
    :mask-closable="false"
    preset="card"
    style="width: 600px"
    :title="title"
  >
    <ServerForm
      :initial-data="initialData"
      :loading="loading"
      @submit="emit('submit', $event)"
      @cancel="emit('update:show', false)"
    />
  </n-modal>
</template>