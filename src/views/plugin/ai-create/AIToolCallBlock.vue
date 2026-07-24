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
</script>

<template>
  <div class="tool-call-bar" :class="{ running: isRunning, error: isError }">
    <span class="tool-bar-icon">
      <el-icon v-if="isRunning" class="is-loading"><Loading /></el-icon>
      <el-icon v-else-if="isError"><WarningFilled /></el-icon>
      <el-icon v-else><CircleCheck /></el-icon>
    </span>
    <span class="tool-bar-label">{{ title }}</span>
    <span class="tool-bar-state">
      {{ isRunning ? '执行中' : isError ? '失败' : '完成' }}
      <template v-if="toolCall?.durationMs"> · {{ toolCall.durationMs }}ms</template>
    </span>
  </div>
</template>
