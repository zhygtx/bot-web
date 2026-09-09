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
          <HighlightCode
            v-if="!isBigTextRef(nodeTrace.input)"
            :content="formatJson(nodeTrace.input)"
            @click="openModal('输入', nodeTrace.input)"
          />
          <span
            v-else
            class="big-text-placeholder"
            @click="loadBigText(nodeTrace.input, '输入')"
          >
            内容较大，点击查看完整内容
          </span>
        </div>
      </div>
      <div class="detail-section">
        <div class="section-header" @click="showOutput = !showOutput">
          <span class="section-title" :class="{ 'label-error': failed }">输出</span>
          <el-icon class="section-arrow" :class="{ expanded: showOutput }"><ArrowRight /></el-icon>
        </div>
        <div v-show="showOutput" class="section-content">
          <HighlightCode
            v-if="!isBigTextRef(failed ? nodeTrace.error : nodeTrace.output)"
            :content="failed ? nodeTrace.error : formatJson(nodeTrace.output)"
            :plain="failed"
            :class="{ 'error-text': failed }"
            @click="openModal(failed ? '错误' : '输出', failed ? nodeTrace.error : nodeTrace.output)"
          />
          <span
            v-else
            class="big-text-placeholder"
            @click="loadBigText(failed ? nodeTrace.error : nodeTrace.output, failed ? '错误' : '输出')"
          >
            内容较大，点击查看完整内容
          </span>
        </div>
      </div>
    </div>

    <DataViewModal
      v-model="showModal"
      :title="modalTitle"
      :content="modalContent"
      :plain="modalPlain"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import HighlightCode from '../common/HighlightCode.vue'
import DataViewModal from '../common/DataViewModal.vue'
import { isBigTextRef, fetchBigText } from '../../composables/workflow/useBigText'

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

// 大数据内容懒加载：先取回完整内容再打开弹窗
const loadBigText = async (value, title) => {
  const content = await fetchBigText(value)
  openModal(title, content)
}
</script>
