<script setup lang="ts">
import { NTag } from 'naive-ui'
import { ServerStatus as ServerStatusType } from '@/types/server'

defineProps<{
  status: ServerStatusType
}>()

const statusMap = {
  connected: {
    type: 'success',
    text: '已连接'
  },
  disconnected: {
    type: 'default',
    text: '未连接'
  },
  connecting: {
    type: 'warning',
    text: '连接中'
  },
  error: {
    type: 'error',
    text: '连接错误'
  }
}
</script>

<template>
  <n-tag :type="statusMap[status].type">
    {{ statusMap[status].text }}
  </n-tag>
</template>