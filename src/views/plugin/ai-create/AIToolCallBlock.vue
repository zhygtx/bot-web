<script setup>
import { computed } from 'vue'
import { CircleCheck, Loading, WarningFilled } from '@element-plus/icons-vue'

const props = defineProps({
  toolCall: { type: Object, default: null }
})

const status = computed(() => props.toolCall?.status || 'RUNNING')
const isRunning = computed(() => status.value === 'RUNNING')
const isError = computed(() => status.value === 'ERROR')
const title = computed(() => props.toolCall?.displayName || '工具调用')
const subtitle = computed(() => {
  const previews = props.toolCall?.argumentsPreview || []
  const first = previews.find(item => item.preview)
  return first ? `${first.label || first.name}：${first.preview}` : props.toolCall?.description || ''
})
const resultText = computed(() => {
  const preview = props.toolCall?.resultPreview
  if (!preview) return ''
  return preview.preview || preview.type || ''
})
</script>

<template>
  <div class="tool-call-block" :class="{ running: isRunning, error: isError }">
    <div class="tool-call-main">
      <span class="tool-status-dot">
        <el-icon v-if="isRunning" class="is-loading"><Loading /></el-icon>
        <el-icon v-else-if="isError"><WarningFilled /></el-icon>
        <el-icon v-else><CircleCheck /></el-icon>
      </span>
      <div class="tool-call-text">
        <strong>{{ title }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </div>
      <span class="tool-call-state">
        {{ isRunning ? '执行中' : isError ? '失败' : '完成' }}
        <template v-if="toolCall?.durationMs"> · {{ toolCall.durationMs }}ms</template>
      </span>
    </div>
    <el-collapse v-if="toolCall" class="tool-detail-collapse">
      <el-collapse-item title="参数与结果" name="detail">
        <div v-if="toolCall.argumentsPreview?.length" class="tool-detail-grid">
          <template v-for="item in toolCall.argumentsPreview" :key="item.name">
            <span>{{ item.label || item.name }}</span>
            <code>{{ item.preview }}</code>
          </template>
        </div>
        <div v-if="resultText || toolCall.errorMessage" class="tool-result-line">
          {{ toolCall.errorMessage || resultText }}
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
