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

<style scoped>
.execution-status-bar {
  padding: 8px 16px;
  border-bottom: 1px solid #e6e6e6;
  font-size: 13px;
  animation: slideDown 0.3s ease;
}

.bar-success {
  background: rgba(103, 194, 58, 0.12);
}

.bar-failed {
  background: rgba(245, 108, 108, 0.12);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.bar-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  white-space: nowrap;
}

.bar-status.success { color: #67c23a; }
.bar-status.failed { color: #f56c6c; }

.bar-divider {
  color: #dcdfe6;
}

.bar-time { color: #606266; white-space: nowrap; }
.bar-time strong { color: #409eff; }
.bar-nodes { color: #606266; white-space: nowrap; }

.bar-context-label {
  color: #909399;
  white-space: nowrap;
}

.bar-context-preview {
  color: #409eff;
  cursor: pointer;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 3px;
  transition: all 0.2s;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.bar-context-preview:hover {
  background: rgba(64, 158, 255, 0.08);
}

.bar-error-label {
  color: #f56c6c;
  white-space: nowrap;
}

.bar-error-preview {
  color: #f56c6c;
  cursor: pointer;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 3px;
  transition: all 0.2s;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.bar-error-preview:hover {
  background: rgba(245, 108, 108, 0.08);
}

.bar-right {
  flex-shrink: 0;
}
</style>
