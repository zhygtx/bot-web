<template>
  <div v-if="nodeTrace" class="node-execution-details" :class="[expanded ? 'expanded' : 'collapsed', failed ? 'failed' : 'success']">
    <div class="execution-summary" @click="expanded = !expanded">
      <span class="execution-status" :class="failed ? 'failed' : 'success'">
        {{ failed ? '失败' : '成功' }}
      </span>
      <span class="execution-time">{{ (nodeTrace.endTime - nodeTrace.startTime) || 0 }}ms</span>
      <el-icon class="expand-arrow" :class="{ expanded }"><ArrowRight /></el-icon>
    </div>
    <div v-show="expanded" class="execution-detail">
      <div class="detail-section">
        <div class="section-header" @click="showInput = !showInput">
          <span class="section-title">输入</span>
          <el-icon class="section-arrow" :class="{ expanded: showInput }"><ArrowRight /></el-icon>
        </div>
        <div v-show="showInput" class="section-content">
          <pre class="json-text">{{ formatJson(nodeTrace.input) }}</pre>
        </div>
      </div>
      <div class="detail-section">
        <div class="section-header" @click="showOutput = !showOutput">
          <span class="section-title">输出</span>
          <el-icon class="section-arrow" :class="{ expanded: showOutput }"><ArrowRight /></el-icon>
        </div>
        <div v-show="showOutput" class="section-content">
          <pre class="json-text" :class="{ 'json-text-error': failed }">{{ failed ? nodeTrace.error : formatJson(nodeTrace.output) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  nodeTrace: {
    type: Object,
    default: null
  }
})

const expanded = ref(false)
const showInput = ref(false)
const showOutput = ref(false)

const failed = computed(() => props.nodeTrace?.status === 'FAILED')

const formatJson = (value) => {
  if (value === undefined || value === null) return '无数据'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch (e) {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (e) {
    return String(value)
  }
}
</script>
