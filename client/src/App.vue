<script setup lang="ts">
import { RouterView } from 'vue-router'
import Layout from '@/components/Layout.vue'
import { darkTheme, NConfigProvider, NMessageProvider } from 'naive-ui'
</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <Layout>
        <RouterView />
      </Layout>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #111827;
  color: #e5e7eb;
}

#app {
  height: 100%;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 添加全局圆角和模糊效果样式 */
.rounded-card {
  @apply rounded-xl bg-gray-800/70 backdrop-blur-sm shadow-lg;
}

.glass-effect {
  @apply backdrop-blur-md bg-gray-800/40 rounded-xl border border-gray-700/30;
}

/* 覆盖Naive UI的一些样式，使其更好地融入暗色主题 */
:deep(.n-button) {
  border-radius: 0.5rem;
}

:deep(.n-card) {
  border-radius: 0.75rem;
  background-color: rgba(31, 41, 55, 0.7);
  backdrop-filter: blur(8px);
}

:deep(.n-input) {
  border-radius: 0.5rem;
}
</style>