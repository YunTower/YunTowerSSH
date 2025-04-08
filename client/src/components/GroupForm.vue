<script setup lang="ts">
import { NForm, NFormItem, NInput, NButton, NSpace } from 'naive-ui'
import { ref } from 'vue'

interface GroupFormData {
  name: string
  description: string
}

const props = defineProps<{
  initialData?: Partial<GroupFormData>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: GroupFormData): void
  (e: 'cancel'): void
}>()

const formData = ref<GroupFormData>({
  name: props.initialData?.name || '',
  description: props.initialData?.description || ''
})

const rules = {
  name: {
    required: true,
    message: '请输入分组名称',
    trigger: 'blur'
  },
  description: {
    required: true,
    message: '请输入分组描述',
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
    <n-form-item label="分组名称" path="name">
      <n-input
        v-model:value="formData.name"
        placeholder="请输入分组名称"
        :disabled="loading"
      />
    </n-form-item>

    <n-form-item label="分组描述" path="description">
      <n-input
        v-model:value="formData.description"
        type="textarea"
        placeholder="请输入分组描述"
        :disabled="loading"
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