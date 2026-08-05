<template>
  <div v-if="nodeLog" class="node-execution-details" :class="[expanded ? 'expanded' : 'collapsed', nodeLog.isError ? 'failed' : 'success']">
    <!-- 节点执行摘要条 -->
    <div class="execution-summary" @click="expanded = !expanded">
      <span class="execution-status" :class="nodeLog.isError ? 'failed' : 'success'">
        {{ nodeLog.isError ? '失败' : '成功' }}
      </span>
      <span class="execution-time">{{ nodeLog.executionTime }}ms</span>
      <el-icon class="expand-arrow" :class="{ expanded: expanded }">
        <ArrowRight />
      </el-icon>
    </div>
    
    <!-- 展开的执行详情 -->
    <div v-show="expanded" class="execution-detail">
      <!-- 输入 -->
      <div class="detail-section">
        <div class="section-header" @click="showInput = !showInput">
          <span class="section-title">输入</span>
          <el-icon class="section-arrow" :class="{ expanded: showInput }">
            <ArrowRight />
          </el-icon>
        </div>
        <div v-show="showInput" class="section-content">
          <div class="json-viewer" @click="handleViewData('输入 - ' + (nodeLog.methodName || '未知方法'), nodeLog.input)">
            <div class="json-viewer-scroll">
              <template v-if="isBigText(nodeLog.input)">
                <template v-if="bigTextDisplayCache[nodeLog.input]">
                  <pre v-html="highlightJson(formatJsonData(bigTextDisplayCache[nodeLog.input]))"></pre>
                </template>
                <template v-else>
                  <pre class="big-text-placeholder">数据过大，请点击查看</pre>
                </template>
              </template>
              <template v-else>
                <pre v-html="highlightJson(formatJsonData(nodeLog.input))"></pre>
              </template>
            </div>
            <div class="viewer-hint">点击查看完整数据</div>
          </div>
        </div>
      </div>
      
      <!-- 输出 -->
      <div class="detail-section">
        <div class="section-header" @click="showOutput = !showOutput">
          <span class="section-title" :class="{ 'label-error': nodeLog.isError }">输出</span>
          <el-icon class="section-arrow" :class="{ expanded: showOutput }">
            <ArrowRight />
          </el-icon>
        </div>
        <div v-show="showOutput" class="section-content">
          <div 
            class="json-viewer"
            :class="{ 'json-viewer-error': nodeLog.isError }"
            @click="handleViewData('输出 - ' + (nodeLog.methodName || '未知方法'), nodeLog.output)"
          >
            <div class="json-viewer-scroll">
              <template v-if="isBigText(nodeLog.output)">
                <template v-if="bigTextDisplayCache[nodeLog.output]">
                  <pre v-html="highlightJson(formatJsonData(bigTextDisplayCache[nodeLog.output]))"></pre>
                </template>
                <template v-else>
                  <pre class="big-text-placeholder">数据过大，请点击查看</pre>
                </template>
              </template>
              <template v-else>
                <pre v-html="highlightJson(formatJsonData(nodeLog.output))"></pre>
              </template>
            </div>
            <div class="viewer-hint">点击查看完整数据</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import request from '../../utils/request'

const props = defineProps({
  nodeLog: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['openModal'])

const expanded = ref(false)
const showInput = ref(false)
const showOutput = ref(false)

const BIG_TEXT_PREFIX = 'BIG_TEXT:'
const bigTextDisplayCache = ref({})

const isBigText = (data) => {
  return data && typeof data === 'string' && data.startsWith(BIG_TEXT_PREFIX)
}

const formatJsonData = (data) => {
  if (!data) return data
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return data
  }
}

const escapeHtml = (str) => {
  if (!str) return str
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const highlightJson = (jsonStr) => {
  if (!jsonStr) return ''
  try {
    JSON.parse(jsonStr)
    const escapedStr = escapeHtml(jsonStr)
    return escapedStr
      .replace(/(".*?")(:)/g, '<span class="json-key">$1</span>$2')
      .replace(/: ("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
  } catch (e) {
    return escapeHtml(jsonStr)
  }
}

const fetchBigText = async (key, callback) => {
  if (bigTextDisplayCache.value[key]) {
    callback(bigTextDisplayCache.value[key])
    return
  }
  try {
    const response = await request({
      url: '/workflowLog/findBigText',
      method: 'get',
      params: { key }
    })
    if (response.code === 200) {
      bigTextDisplayCache.value[key] = response.data
      callback(response.data)
    }
  } catch (error) {
    console.error('获取大数据失败:', error)
  }
}

const handleViewData = (title, data) => {
  if (!data) return
  if (isBigText(data)) {
    fetchBigText(data, (fullData) => {
      emit('openModal', title, fullData)
    })
  } else {
    emit('openModal', title, formatJsonData(data))
  }
}
</script>

