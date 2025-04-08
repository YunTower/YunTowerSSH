<script setup lang="ts">
import { NModal } from 'naive-ui'
import GroupForm from './GroupForm.vue'

interface GroupFormData {
  name: string
  description: string
}

const props = defineProps<{
  show: boolean
  title: string
  initialData?: Partial<GroupFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'submit', data: GroupFormData): void
}>()
</script>

<template>
  <n-modal
    v-model:show="show"
    :mask-closable="false"
    preset="card"
    style="width: 500px"
    :title="title"
  >
    <GroupForm
      :initial-data="initialData"
      :loading="loading"
      @submit="emit('submit', $event)"
      @cancel="emit('update:show', false)"
    />
  </n-modal>
</template> 