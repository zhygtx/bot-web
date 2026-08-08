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
          <HighlightCode :content="formatJson(nodeTrace.input)" @click="openModal('输入', nodeTrace.input)" />
        </div>
      </div>
      <div class="detail-section">
        <div class="section-header" @click="showOutput = !showOutput">
          <span class="section-title" :class="{ 'label-error': failed }">输出</span>
          <el-icon class="section-arrow" :class="{ expanded: showOutput }"><ArrowRight /></el-icon>
        </div>
        <div v-show="showOutput" class="section-content">
          <HighlightCode
            :content="failed ? nodeTrace.error : formatJson(nodeTrace.output)"
            :plain="failed"
            :class="{ 'error-text': failed }"
            @click="openModal(failed ? '错误' : '输出', failed ? nodeTrace.error : nodeTrace.output)"
          />
        </div>
      </div>
    </div>

    <el-dialog v-model="showModal" width="80%" @close="closeModal">
      <template #header>
        <div class="modal-header">
          <span>{{ modalTitle }}</span>
          <el-button link :icon="CopyDocument" @click="copyModalContent" class="copy-btn">复制</el-button>
        </div>
      </template>
      <div class="modal-json-viewer">
        <HighlightCode :content="modalContent" :plain="modalPlain" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowRight, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import HighlightCode from '../common/HighlightCode.vue'

const props = defineProps({
  nodeTrace: {
    type: Object,
    default: null
  }
})

const expanded = ref(false)
const showInput = ref(false)
const showOutput = ref(false)

const showModal = ref(false)
const modalTitle = ref('')
const modalContent = ref('')
const modalPlain = ref(false)

const failed = computed(() => props.nodeTrace?.status === 'FAILED')

// 输入输出可能是对象或 JSON 字符串，统一转成可读文本
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

const openModal = (title, content) => {
  modalTitle.value = title
  modalPlain.value = failed.value && title === '错误'
  modalContent.value = formatJson(content)
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  modalTitle.value = ''
  modalContent.value = ''
  modalPlain.value = false
}

const copyModalContent = async () => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(modalContent.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = modalContent.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}
</script>
