<script setup lang="ts">
import { NForm, NFormItem, NInput, NInputNumber, NButton, NSpace } from 'naive-ui'
import { ref } from 'vue'
import { ServerFormData } from '@/types/server'

const props = defineProps<{
  initialData?: Partial<ServerFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: ServerFormData): void
  (e: 'cancel'): void
}>()

const formData = ref<ServerFormData>({
  name: props.initialData?.name || '',
  host: props.initialData?.host || '',
  port: props.initialData?.port || 22,
  username: props.initialData?.username || '',
  password: props.initialData?.password || ''
})

const rules = {
  name: {
    required: true,
    message: '请输入服务器名称',
    trigger: 'blur'
  },
  host: {
    required: true,
    message: '请输入主机地址',
    trigger: 'blur'
  },
  port: {
    required: true,
    message: '请输入端口号',
    trigger: 'blur',
    type: 'number',
    min: 1,
    max: 65535
  },
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

const formRef = ref()

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    emit('submit', formData.value)
  } catch (err) {
    // 表单验证失败
  }
}
</script>

<template>
  <n-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-placement="left"
    label-width="100"
    require-mark-placement="right-hanging"
  >
    <n-form-item label="服务器名称" path="name">
      <n-input
        v-model:value="formData.name"
        placeholder="请输入服务器名称"
        :disabled="loading"
      />
    </n-form-item>

    <n-form-item label="主机地址" path="host">
      <n-input
        v-model:value="formData.host"
        placeholder="请输入主机地址"
        :disabled="loading"
      />
    </n-form-item>

    <n-form-item label="端口" path="port">
      <n-input-number
        v-model:value="formData.port"
        :min="1"
        :max="65535"
        placeholder="请输入端口号"
        :disabled="loading"
      />
    </n-form-item>

    <n-form-item label="用户名" path="username">
      <n-input
        v-model:value="formData.username"
        placeholder="请输入用户名"
        :disabled="loading"
      />
    </n-form-item>

    <n-form-item label="密码" path="password">
      <n-input
        v-model:value="formData.password"
        type="password"
        placeholder="请输入密码"
        :disabled="loading"
        show-password-on="click"
      />
    </n-form-item>

    <div class="flex justify-end mt-4">
      <n-space>
        <n-button @click="emit('cancel')" :disabled="loading">
          取消
        </n-button>
        <n-button
          type="primary"
          @click="handleSubmit"
          :loading="loading"
        >
          确定
        </n-button>
      </n-space>
    </div>
  </n-form>
</template>