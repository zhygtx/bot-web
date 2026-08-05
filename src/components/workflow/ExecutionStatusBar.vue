<template>
  <div v-if="executionLog" class="execution-status-bar" :class="executionLog.isError ? 'bar-failed' : 'bar-success'">
    <div class="bar-content">
      <div class="bar-left">
        <span class="bar-status" :class="executionLog.isError ? 'failed' : 'success'">
          <el-icon><CircleCheck v-if="!executionLog.isError" /><CircleClose v-else /></el-icon>
          {{ executionLog.isError ? '执行失败' : '执行成功' }}
        </span>
        <span class="bar-divider">|</span>
        <span class="bar-time">
          总耗时: <strong>{{ executionLog.executionTime }}ms</strong>
        </span>
        <span v-if="executionLog.actualNodeCount" class="bar-divider">|</span>
        <span v-if="executionLog.actualNodeCount" class="bar-nodes">
          节点: {{ executionLog.actualNodeCount }}/{{ executionLog.expectedNodeCount }}
        </span>
        <template v-if="executionLog.initialContext">
          <span class="bar-divider">|</span>
          <span class="bar-context-label">初始上下文:</span>
          <div class="bar-context-preview" @click="handleViewData('初始上下文', executionLog.initialContext)">
            {{ formatPreview(executionLog.initialContext) }}
          </div>
        </template>
        <template v-if="executionLog.errorLog">
          <span class="bar-divider">|</span>
          <span class="bar-error-label">错误:</span>
          <div class="bar-error-preview" @click="handleViewData('错误日志', executionLog.errorLog)">
            {{ formatPreview(executionLog.errorLog) }}
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
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'

const props = defineProps({
  executionLog: {
    type: Object,
    default: null
  },
  isBigText: {
    type: Function,
    required: true
  },
  bigTextDisplayCache: {
    type: Object,
    default: () => ({})
  },
  fetchBigText: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['openModal', 'hide'])

const formatPreview = (data) => {
  if (!data) return '无'
  if (props.isBigText(data)) {
    return '数据过大，点击查看'
  }
  const maxLen = 80
  const text = typeof data === 'string' ? data : JSON.stringify(data)
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

const handleViewData = (title, data) => {
  if (!data) return
  if (props.isBigText(data)) {
    props.fetchBigText(data, (fullData) => {
      emit('openModal', title, fullData)
    })
  } else {
    const formatted = data
    try {
      JSON.parse(data)
      emit('openModal', title, JSON.stringify(JSON.parse(data), null, 2))
    } catch (e) {
      emit('openModal', title, data)
    }
  }
}
</script>

