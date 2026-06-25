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

<style scoped>
/* 浮动窗口容器 */
.node-execution-details {
  font-size: 12px;
  width: 250px;
  max-width: 250px;
  box-sizing: border-box;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  border: 2px solid #e6e6e6;
}

.node-execution-details.success {
  border-color: #67c23a;
}

.node-execution-details.failed {
  border-color: #f56c6c;
}

/* 执行摘要条 */
.execution-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s;
  background: #fff;
}

.execution-summary:hover {
  background: #f5f7fa;
}

.execution-status {
  font-weight: 600;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.execution-status.success {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.execution-status.failed {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.execution-time {
  color: #909399;
  flex: 1;
  font-size: 12px;
}

.expand-arrow {
  font-size: 14px;
  color: #c0c4cc;
  transition: transform 0.2s ease;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

/* 展开详情区 */
.execution-detail {
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.detail-section {
  border-bottom: 1px solid #f0f0f0;
}

.detail-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: #f0f2f5;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.section-title.label-error {
  color: #f56c6c;
}

.section-arrow {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s ease;
}

.section-arrow.expanded {
  transform: rotate(90deg);
}

.section-content {
  padding: 0 12px 8px;
}

/* JSON 数据展示区 - 复用工作流日志页面样式 */
.json-viewer {
  background-color: #304156;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.json-viewer:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.json-viewer-scroll {
  max-height: 120px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 12px;
}

.json-viewer pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #e6e6e6;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-viewer .viewer-hint {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  opacity: 0;
  transition: opacity 0.2s;
}

.json-viewer:hover .viewer-hint {
  opacity: 1;
}

.json-viewer-error pre {
  color: #f56c6c;
}

.big-text-placeholder {
  color: #909399 !important;
  font-style: italic;
  text-align: center;
  padding: 10px 0;
  font-size: 13px;
}

/* JSON 语法高亮 - 复用工作流日志页面配色 */
:deep(.json-key) { color: #ffa07a; }
:deep(.json-string) { color: #98fb98; }
:deep(.json-number) { color: #ffa500; }
:deep(.json-boolean) { color: #87ceeb; }
:deep(.json-null) { color: #9370db; }
</style>
