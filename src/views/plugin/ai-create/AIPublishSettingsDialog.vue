<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  publishForm: { type: Object, required: true },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    class="publish-settings-dialog"
    width="560px"
    title="发布设置"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" class="publish-settings-form">
      <el-form-item label="插件名称">
        <el-input v-model="publishForm.name" placeholder="例如：群关键词回复插件" />
      </el-form-item>
      <el-form-item label="插件描述">
        <el-input v-model="publishForm.description" type="textarea" :rows="3" resize="none" />
      </el-form-item>
      <div class="form-grid-2">
        <el-form-item label="版本号">
          <el-input v-model="publishForm.version" />
        </el-form-item>
        <el-form-item label="可见性">
          <el-switch v-model="publishForm.isPublic" active-text="公开" inactive-text="私有" />
        </el-form-item>
      </div>
      <el-form-item label="更新说明">
        <el-input v-model="publishForm.changelog" type="textarea" :rows="3" resize="none" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button type="primary" :loading="saving" @click="emit('confirm')">修改</el-button>
    </template>
  </el-dialog>
</template>
