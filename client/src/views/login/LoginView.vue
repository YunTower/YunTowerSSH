<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import LoginForm from './components/LoginForm.vue'
import { handleError } from '@/utils/errorHandler'
import { login } from '@/api/auth'

const router = useRouter()
const message = useMessage()

const loading = ref(false)

const handleLogin = async (data: { username: string; password: string }) => {
  try {
    loading.value = true
    const success = await login(data.username, data.password)
    if (success) {
      message.success('登录成功')
      router.push('/')
    }
  } catch (error) {
    handleError(error, '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <LoginForm
        :loading="loading"
        @submit="handleLogin"
      />
    </div>
  </div>
</template>

<style scoped>
.login-page {
  @apply min-h-screen flex items-center justify-center bg-gray-900;
}

.login-container {
  @apply w-full max-w-md;
}

.logo-container {
  @apply flex flex-col items-center;
}

.logo {
  @apply w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-4;
}
</style>