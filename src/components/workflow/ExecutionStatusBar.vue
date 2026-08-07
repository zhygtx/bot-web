<template>
  <div v-if="execution" class="execution-status-bar" :class="failed ? 'bar-failed' : 'bar-success'">
    <div class="bar-content">
      <div class="bar-left">
        <span class="bar-status" :class="failed ? 'failed' : 'success'">
          <el-icon><CircleCheck v-if="!failed" /><CircleClose v-else /></el-icon>
          {{ failed ? '执行失败' : '执行成功' }}
        </span>
        <span class="bar-divider">|</span>
        <span class="bar-time">总耗时: <strong>{{ execution.durationMs || 0 }}ms</strong></span>
        <span class="bar-divider">|</span>
        <span class="bar-nodes">节点: {{ execution.actualNodeCount || 0 }}/{{ execution.expectedNodeCount || 0 }}</span>
        <template v-if="execution.errorMessage">
          <span class="bar-divider">|</span>
          <span class="bar-error-label">错误:</span>
          <div class="bar-error-preview" @click="emit('openModal', '错误日志', execution.errorMessage)">
            {{ formatPreview(execution.errorMessage) }}
          </div>
        </template>
      </div>
      <div class="bar-right">
        <el-button size="small" text @click="emit('hide')">隐藏日志显示</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'

const props = defineProps({
  execution: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['openModal', 'hide'])

const failed = computed(() => props.execution?.status === 'FAILED')

const formatPreview = (text) => {
  if (!text) return '无'
  return text.length > 80 ? text.substring(0, 80) + '...' : text
}
</script>
