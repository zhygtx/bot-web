<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElLoading, ElPagination, ElSelect, ElOption, ElDatePicker, ElButton, ElIcon } from 'element-plus'
import { Clock, VideoPlay, CircleCheck, CircleClose, ArrowRight, Refresh, Filter } from '@element-plus/icons-vue'
import request from '../../utils/request'

const BIG_TEXT_PREFIX = 'BIG_TEXT:'

// 日志列表
const logs = ref([])
// 加载状态
const loading = ref(false)
// 分页参数
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 筛选条件
const filters = ref({
  workflowName: '',
  dateRange: []
})

// 排序条件
const sortField = ref('')
const sortOrder = ref('desc')

// 当前展开的日志详情
const expandedLogId = ref(null)
const loadingNodeLogIds = ref(new Set())

// 大数据缓存（点击后替换显示，切换日志时清理）
const bigTextDisplayCache = ref({})

const normalizeLog = (log) => ({
  ...log,
  nodeLogs: log.nodeLogs || []
})

const filteredLogs = computed(() => {
  return logs.value.filter((log) => {
    const matchName = !filters.value.workflowName || (log.workflowName || '').includes(filters.value.workflowName)
    const matchDate = !filters.value.dateRange || filters.value.dateRange.length !== 2 || (
      log.startTime >= filters.value.dateRange[0].getTime() &&
      log.startTime <= filters.value.dateRange[1].getTime()
    )

    return matchName && matchDate
  })
})

// 判断是否是大数据引用
const isBigText = (data) => {
  return data && typeof data === 'string' && data.startsWith(BIG_TEXT_PREFIX)
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 尝试格式化JSON数据并添加语法高亮
const formatJsonData = (data) => {
  if (!data) return data
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    // 如果不是JSON，返回原始数据
    return data
  }
}

// 判断是否是JSON数据
const isJsonData = (data) => {
  if (!data) return false
  try {
    JSON.parse(data)
    return true
  } catch (e) {
    return false
  }
}

// HTML转义函数
const escapeHtml = (str) => {
  if (!str) return str
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// 高亮JSON语法
const highlightJson = (jsonStr) => {
  if (!jsonStr) return ''
  try {
    // 尝试解析验证是否是有效的JSON
    JSON.parse(jsonStr)
    
    // 先转义HTML特殊字符，防止HTML内容被渲染
    const escapedStr = escapeHtml(jsonStr)
    
    return escapedStr
      .replace(/(".*?")(:)/g, '<span class="json-key">$1</span>$2')
      .replace(/: ("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
  } catch (e) {
    // 不是有效JSON，返回转义后的字符串
    return escapeHtml(jsonStr)
  }
}

// 弹窗相关
const showModal = ref(false)
const modalTitle = ref('')
const modalContent = ref('')

const openModal = (title, content) => {
  modalTitle.value = title
  modalContent.value = formatJsonData(content) || '无数据'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  modalTitle.value = ''
  modalContent.value = ''
}

// 复制弹窗内容
const copyModalContent = async () => {
  try {
    await navigator.clipboard.writeText(modalContent.value)
    ElMessage.success('复制成功')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 获取大数据内容（带缓存）
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
    } else {
      ElMessage.error(response.message || '获取大数据失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('获取大数据失败')
  }
}

// 加载日志列表
const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      userId: localStorage.getItem('userId') || '',
      workflowName: filters.value.workflowName,
      startTime: filters.value.dateRange.length === 2 ? filters.value.dateRange[0].getTime() : null,
      endTime: filters.value.dateRange.length === 2 ? filters.value.dateRange[1].getTime() : null,
      sortField: sortField.value,
      sortOrder: sortOrder.value
    }
    
    const response = await request({
      url: '/workflowLog/findWorkflowLogs',
      method: 'get',
      params
    })
    
    if (response.code === 200) {
      if (response.data && response.data.list) {
        logs.value = response.data.list.map(normalizeLog)
        total.value = response.data.total || 0
      } else if (Array.isArray(response.data)) {
        logs.value = response.data.map(normalizeLog)
        total.value = response.data.length
      }
    } else {
      ElMessage.error(response.message || '加载日志失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

const loadNodeLogs = async (log) => {
  if (!log?.id || log.nodeLogsLoaded) return

  loadingNodeLogIds.value.add(log.id)
  try {
    const response = await request({
      url: '/workflowLog/findNodeLogs',
      method: 'get',
      params: {
        workflowLogId: log.id
      }
    })

    if (response.code === 200) {
      log.nodeLogs = Array.isArray(response.data) ? response.data : []
      log.nodeLogsLoaded = true
    } else {
      ElMessage.error(response.message || '加载节点日志失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('加载节点日志失败')
  } finally {
    loadingNodeLogIds.value.delete(log.id)
  }
}

// 分页处理
const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadLogs()
}

// 切换日志详情展开状态
const toggleLogDetail = async (log) => {
  if (expandedLogId.value === log.id) {
    expandedLogId.value = null
  } else {
    // 切换日志时清理大数据缓存，防止数据溢出
    bigTextDisplayCache.value = {}
    expandedLogId.value = log.id
    await loadNodeLogs(log)
  }
}

// 刷新日志列表
const refreshLogs = () => {
  // 收起所有展开的日志
  expandedLogId.value = null
  // 清空大数据缓存
  bigTextDisplayCache.value = {}
  // 重置页码
  pageNum.value = 1
  // 重新加载日志
  loadLogs()
}

// 重置筛选条件
const resetFilters = () => {
  filters.value = {
    workflowName: '',
    dateRange: []
  }
  sortField.value = ''
  sortOrder.value = 'desc'
  pageNum.value = 1
  loadLogs()
}



// 初始化加载
onMounted(() => {
  loadLogs()
})
</script>

<template>
  <div class="workflow-log-view">
    <el-card class="log-card">
      <template #header>
        <div class="card-header">
          <h2>工作流日志</h2>
          <div class="card-actions">
            <el-button type="primary" icon="Refresh" @click="refreshLogs">
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 筛选区域 -->
      <div class="filter-section">
        <div class="filter-item">
          <el-icon class="filter-icon"><Filter /></el-icon>
          <el-input 
            v-model="filters.workflowName" 
            placeholder="工作流名称"
            class="filter-input"
            @keyup.enter="loadLogs"
          />
        </div>
        <div class="filter-item">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="filter-date"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">排序:</span>
          <el-select v-model="sortField" placeholder="选择排序字段" class="filter-select">
            <el-option label="执行节点数" value="actualNodeCount" />
            <el-option label="执行耗时" value="executionTime" />
          </el-select>
          <el-select v-model="sortOrder" placeholder="排序方式" class="filter-select">
            <el-option label="升序" value="asc" />
            <el-option label="降序" value="desc" />
          </el-select>
        </div>
        <div class="filter-item">
          <el-button @click="resetFilters" type="default">重置</el-button>
          <el-button @click="loadLogs" type="primary">查询</el-button>
        </div>
      </div>
      
      <!-- 日志列表 -->
      <div class="log-content">
        <div v-loading="loading" element-loading-text="加载中..." class="log-list">
          <div 
            v-for="log in filteredLogs" 
            :key="log.id" 
            class="log-item"
          >
            <!-- 日志头部 -->
            <div 
              class="log-header"
              @click="toggleLogDetail(log)"
            >
              <div class="log-header-left">
                <div class="log-info">
                  <div class="workflow-name">{{ log.workflowName || '未知工作流' }}</div>
                  <div class="log-time">
                    <el-icon class="time-icon"><Clock /></el-icon>
                    {{ formatTime(log.startTime) }}
                  </div>
                </div>
              </div>
              <div class="log-header-right">
                <div class="log-stats">
                  <span class="stat-item">
                    <span class="stat-label">执行节点:</span>
                    <span class="stat-value">{{ log.actualNodeCount || 0 }}/{{ log.expectedNodeCount || 0 }}</span>
                  </span>
                  <span class="stat-item">
                    <span class="stat-label">耗时:</span>
                    <span class="stat-value">{{ log.executionTime }}ms</span>
                  </span>
                </div>
                <el-icon class="expand-icon">
                  <ArrowRight :class="{ expanded: expandedLogId === log.id }" />
                </el-icon>
              </div>
            </div>
            
            <!-- 日志详情 -->
            <div v-show="expandedLogId === log.id" class="log-detail">
              <div class="detail-section">
                <h4>执行摘要</h4>
                <div class="summary-context">
                  <div class="summary-label">初始上下文</div>
                  <div 
                    class="json-viewer" 
                    @click="isBigText(log.initialContext) ? fetchBigText(log.initialContext, (data) => openModal('初始上下文', data)) : openModal('初始上下文', formatJsonData(log.initialContext) || '无')"
                  >
                    <template v-if="isBigText(log.initialContext)">
                      <template v-if="bigTextDisplayCache[log.initialContext]">
                        <pre v-html="highlightJson(formatJsonData(bigTextDisplayCache[log.initialContext]))"></pre>
                      </template>
                      <template v-else>
                        <pre class="big-text-placeholder">数据过大，请点击查看</pre>
                      </template>
                    </template>
                    <template v-else>
                      <pre v-html="highlightJson(formatJsonData(log.initialContext)) || '无'"></pre>
                    </template>
                    <div class="viewer-hint">点击查看完整数据</div>
                  </div>
                </div>
              </div>
              
              <div class="detail-section" v-if="log.nodeLogs && log.nodeLogs.length > 0">
                <h4>节点执行日志</h4>
                <div class="node-timeline">
                  <div 
                    v-for="(nodeLog, index) in log.nodeLogs" 
                    :key="nodeLog.id"
                    class="node-log-item"
                  >
                    <div class="timeline-line">
                      <div class="timeline-dot" :class="{ 
                        success: !nodeLog.error, 
                        failed: nodeLog.error 
                      }"></div>
                      <div v-if="index < log.nodeLogs.length - 1" class="timeline-connector"></div>
                    </div>
                    <div class="timeline-content">
                      <div class="node-header">
                        <span class="node-order">{{ index + 1 }}</span>
                        <span class="node-name">{{ nodeLog.methodName || '未知方法' }}</span>
                        <span class="node-time">{{ nodeLog.executionTime }}ms</span>
                      </div>
                      <div class="node-description" v-if="nodeLog.methodDescription">
                        {{ nodeLog.methodDescription }}
                      </div>
                      <div class="node-details">
                        <div class="detail-row" v-if="nodeLog.input">
                          <span class="detail-label">输入:</span>
                          <div 
                            class="json-viewer"
                            @click="isBigText(nodeLog.input) ? fetchBigText(nodeLog.input, (data) => openModal('输入 - ' + (nodeLog.methodName || '未知方法'), data)) : openModal('输入 - ' + (nodeLog.methodName || '未知方法'), formatJsonData(nodeLog.input))"
                          >
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
                            <div class="viewer-hint">点击查看完整数据</div>
                          </div>
                        </div>
                        <div class="detail-row" v-if="nodeLog.output">
                          <span class="detail-label">输出:</span>
                          <div 
                            class="json-viewer"
                            @click="isBigText(nodeLog.output) ? fetchBigText(nodeLog.output, (data) => openModal('输出 - ' + (nodeLog.methodName || '未知方法'), data)) : openModal('输出 - ' + (nodeLog.methodName || '未知方法'), formatJsonData(nodeLog.output))"
                          >
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
                            <div class="viewer-hint">点击查看完整数据</div>
                          </div>
                        </div>
                        <div class="detail-row error" v-if="nodeLog.error">
                          <span class="detail-label">错误:</span>
                          <pre class="detail-value error-text">{{ nodeLog.error }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="detail-section" v-else>
                <h4>节点执行日志</h4>
                <el-empty
                  :description="loadingNodeLogIds.has(log.id) ? '节点日志加载中...' : '暂无节点执行日志'"
                  :image-size="80"
                />
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <el-empty v-if="filteredLogs.length === 0 && !loading" description="暂无日志记录" />
        </div>
        
        <!-- 分页 -->
        <div class="pagination" v-if="total > 0">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            layout="prev, pager, next, ->, total, jumper"
            :total="total"
            @size-change="loadLogs"
            @current-change="handlePageChange"
          />
        </div>
      </div>
      
      <!-- JSON查看弹窗 -->
      <el-dialog 
        v-model="showModal" 
        width="80%" 
        :close-on-click-modal="true"
        @close="closeModal"
      >
        <template #header>
          <div class="modal-header">
            <span>{{ modalTitle }}</span>
            <el-button 
              type="text" 
              icon="CopyDocument" 
              @click="copyModalContent"
              class="copy-btn"
            >
              复制
            </el-button>
          </div>
        </template>
        <div class="modal-json-viewer">
          <pre v-html="highlightJson(modalContent)"></pre>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<style scoped>
.workflow-log-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.log-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 20px;
}

.card-header h2 {
  font-size: 24px;
  margin: 0;
  color: #303133;
  font-weight: bold;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background-color: #fafafa;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-icon {
  color: #909399;
}

.filter-input {
  width: 200px;
}

.filter-select {
  width: 150px;
}

.filter-date {
  width: 300px;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.log-list {
  width: 100%;
}

.log-item {
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.log-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
}

.log-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-size: 20px;
}

.status-icon.success {
  color: #67c23a;
}

.status-icon.failed {
  color: #f56c6c;
}

.status-icon.running {
  color: #e6a23c;
}

.log-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.workflow-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.log-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
}

.time-icon {
  font-size: 12px;
}

.log-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.log-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.stat-label {
  color: #909399;
}

.stat-value {
  font-weight: bold;
  color: #409eff;
}

.status-tag {
  font-size: 12px;
}

.expand-icon {
  font-size: 16px;
  color: #c0c4cc;
  transition: transform 0.3s ease;
}

.expand-icon .expanded {
  transform: rotate(90deg);
}

.log-detail {
  padding: 0 20px 20px;
  border-top: 1px dashed #e6e6e6;
  background-color: #fafafa;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
}

.summary-context {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

.summary-context .summary-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  display: block;
}

.json-viewer {
  background-color: #304156;
  padding: 12px;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.json-viewer:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.json-viewer pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
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
}

/* JSON语法高亮 */
:deep(.json-key) {
  color: #ffa07a;
}

:deep(.json-string) {
  color: #98fb98;
}

:deep(.json-number) {
  color: #ffa500;
}

:deep(.json-boolean) {
  color: #87ceeb;
}

:deep(.json-null) {
  color: #9370db;
}

/* 大数据占位符样式 */
.big-text-placeholder {
  color: #909399 !important;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
  font-size: 16px;
  font-weight: 500;
}

/* 弹窗头部样式 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.copy-btn {
  color: #409eff;
  font-size: 14px;
  padding: 4px 12px;
}

.copy-btn:hover {
  color: #66b1ff;
  background-color: rgba(64, 158, 255, 0.1);
}

/* 弹窗样式 */
.modal-json-viewer {
  background-color: #304156;
  padding: 16px;
  border-radius: 8px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-json-viewer pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #e6e6e6;
  white-space: pre-wrap;
  word-break: break-all;
}

.node-timeline {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

.node-log-item {
  display: flex;
  gap: 12px;
  position: relative;
}

.timeline-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #c0c4cc;
}

.timeline-dot.success {
  background-color: #67c23a;
}

.timeline-dot.failed {
  background-color: #f56c6c;
}

.timeline-connector {
  flex: 1;
  width: 2px;
  background-color: #e6e6e6;
  margin-top: 8px;
}

.timeline-content {
  flex: 1;
  padding-bottom: 20px;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.node-order {
  width: 24px;
  height: 24px;
  background-color: #409eff;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.node-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.node-time {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
}

.node-description {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.node-details {
  margin-top: 8px;
  background-color: #fafafa;
  border-radius: 4px;
  padding: 8px 12px;
}

.detail-row {
  margin-bottom: 8px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 4px;
}

.detail-value.error-text {
  font-size: 12px;
  color: #f56c6c;
  background-color: #304156;
  padding: 8px;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.pagination {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

/* 自定义分页样式 */
:deep(.el-pagination .el-pager li.active) {
  background-color: #409eff;
  color: white;
}

:deep(.el-pagination .el-pager li:hover:not(.disabled)) {
  color: #409eff;
}
</style>
