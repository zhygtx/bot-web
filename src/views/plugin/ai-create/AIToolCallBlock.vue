<script setup>
import { computed } from 'vue'
import { Loading, Tools, CircleCheck, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  part: { type: Object, default: null }
})

const title = computed(() => props.part?.name || '工具调用')
const status = computed(() => props.part?.status || 'RUNNING')
const icon = computed(() => {
  switch (status.value) {
    case 'SUCCESS': return CircleCheck
    case 'ERROR': return Warning
    default: return Loading
  }
})
</script>

<template>
  <div class="tool-call-bar" :class="status.toLowerCase()">
    <span class="tool-bar-icon">
      <el-icon><component :is="icon" /></el-icon>
    </span>
    <span class="tool-bar-label">{{ title }}</span>
  </div>
</template>
