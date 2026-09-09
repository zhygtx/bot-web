<template>
  <el-dialog
    :model-value="modelValue"
    width="80%"
    append-to-body
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <template #header>
      <div class="data-view-modal-header">
        <span class="data-view-modal-title">{{ title }}</span>
        <el-button link :icon="CopyDocument" @click="copyContent" class="data-view-modal-copy">复制</el-button>
      </div>
    </template>
    <div class="data-view-modal-body">
      <HighlightCode :content="content" :plain="plain" />
    </div>
  </el-dialog>
</template>

<script setup>
import { CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import HighlightCode from './HighlightCode.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  content: {
    type: [String, Object, Array, Number, Boolean],
    default: ''
  },
  plain: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'close'])

const copyContent = async () => {
  const text = typeof props.content === 'string'
    ? props.content
    : JSON.stringify(props.content ?? '')
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('复制成功')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}
</script>

<style>
.data-view-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.data-view-modal-copy {
  color: var(--app-primary);
  font-size: 14px;
  padding: 4px 12px;
}
.data-view-modal-copy:hover {
  color: var(--app-primary-hover);
  background-color: var(--app-primary-soft);
}
.data-view-modal-body {
  border: 1px solid var(--app-border);
  padding: 0;
  border-radius: var(--app-radius-card);
  max-height: 60vh;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.data-view-modal-body::-webkit-scrollbar {
  display: none;
}
.data-view-modal-body pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
