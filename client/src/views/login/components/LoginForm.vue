<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NForm, NFormItem, NInput, NButton } from 'naive-ui'

const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: { username: string; password: string }): void
}>()

const formRef = ref<any>(null)

const formData = reactive({
  username: '',
  password: ''
})

const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur'
  }
}

const handleSubmit = () => {
  formRef.value?.validate((errors: any) => {
    if (!errors) {
      emit('submit', {
        username: formData.username,
        password: formData.password
      })
    }
  })
}
</script>

<template>
  <div class="login-form">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white">YunTower SSH</h1>
      <p class="text-gray-400 mt-2">安全高效的SSH管理工具</p>
    </div>
    
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      class="bg-gray-800 p-6 rounded-lg shadow-lg"
    >
      <n-form-item path="username" label="用户名">
        <n-input
          v-model:value="formData.username"
          placeholder="请输入用户名"
          :disabled="loading"
        />
      </n-form-item>
      
      <n-form-item path="password" label="密码">
        <n-input
          v-model:value="formData.password"
          type="password"
          placeholder="请输入密码"
          :disabled="loading"
          @keyup.enter="handleSubmit"
        />
      </n-form-item>
      
      <div class="mt-6">
        <n-button
          type="primary"
          block
          @click="handleSubmit"
          :loading="loading"
        >
          登录
        </n-button>
      </div>
    </n-form>
  </div>
</template>

<style scoped>
.login-form :deep(.n-form-item-label) {
  color: #e2e8f0;
}
</style>