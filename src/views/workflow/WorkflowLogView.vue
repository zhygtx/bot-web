<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage, ElLoading, ElPagination, ElSelect, ElOption, ElDatePicker, ElButton, ElIcon } from 'element-plus'
import { Clock, VideoPlay, CircleCheck, CircleClose, ArrowRight, ArrowUp, Refresh, Filter } from '@element-plus/icons-vue'
import request from '../../utils/request'

const BIG_TEXT_PREFIX = 'BIG_TEXT:'

const logs = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isMobile = ref(false)

const filters = ref({
  workflowName: '',
  dateRange: [],
  status: ''
})

const sortField = ref('')
const sortOrder = ref('desc')

const expandedLogId = ref(null)
const loadingNodeLogIds = ref(new Set())

const bigTextDisplayCache = ref({})

const paginationLayout = computed(() => {
  return isMobile.value ? 'prev, pager, next' : 'prev, pager, next, ->, total, jumper'
})

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const normalizeLog = (log) => ({
  ...log,
  id: Number(log.id) || log.id,
  nodeLogs: log.nodeLogs || [],
  nodeLogsLoaded: false
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

const isBigText = (data) => {
  return data && typeof data === 'string' && data.startsWith(BIG_TEXT_PREFIX)
}

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

const formatJsonData = (data) => {
  if (!data) return data
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return data
  }
}

const isJsonData = (data) => {
  if (!data) return false
  try {
    JSON.parse(data)
    return true
  } catch (e) {
    return false
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

const copyModalContent = async () => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(modalContent.value)
    } else {
      // 降级方案：HTTP 环境下使用 execCommand
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
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
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
    } else {
      ElMessage.error(response.message || '获取大数据失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('获取大数据失败')
  }
}

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
      sortOrder: sortOrder.value,
      status: filters.value.status
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
      log.nodeLogs = (Array.isArray(response.data) ? response.data : []).map(nodeLog => ({
        ...nodeLog,
        id: Number(nodeLog.id) || nodeLog.id,
        workflowLogId: Number(nodeLog.workflowLogId) || nodeLog.workflowLogId,
        order: Number(nodeLog.order) || nodeLog.order,
        executionTime: Number(nodeLog.executionTime) || nodeLog.executionTime
      }))
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

const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadLogs()
}

const toggleLogDetail = async (log) => {
  if (expandedLogId.value === log.id) {
    expandedLogId.value = null
  } else {
    bigTextDisplayCache.value = {}
    expandedLogId.value = log.id
    await loadNodeLogs(log)
  }
}

const refreshLogs = () => {
  expandedLogId.value = null
  bigTextDisplayCache.value = {}
  pageNum.value = 1
  loadLogs()
}

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  pageNum.value = 1
  loadLogs()
}

const resetFilters = () => {
  filters.value = {
    workflowName: '',
    dateRange: [],
    status: ''
  }
  sortField.value = ''
  sortOrder.value = 'desc'
  pageNum.value = 1
  loadLogs()
}

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  loadLogs()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<template>
  <div class="workflow-log-view">
    <div class="filter-section">
      <div class="filter-item search-item">
        <el-input 
          v-model="filters.workflowName" 
          placeholder="工作流名称"
          class="filter-input"
          @keyup.enter="loadLogs"
        >
          <template #prefix>
            <el-icon class="filter-icon"><Filter /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="filter-item date-item">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="filter-date"
            popper-class="workflow-log-date-popper"
          />
        </div>
        <div class="filter-item status-item">
          <el-select v-model="filters.status" placeholder="执行状态" class="filter-select" @change="loadLogs">
            <el-option label="全部" value="" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
          <div class="mobile-status-buttons">
            <span 
              class="status-btn" 
              :class="{ active: filters.status === '' }"
              @click="filters.status = ''; loadLogs()"
            >
              全部
            </span>
            <span 
              class="status-btn success" 
              :class="{ active: filters.status === 'success' }"
              @click="filters.status = 'success'; loadLogs()"
            >
              成功
            </span>
            <span 
              class="status-btn failed" 
              :class="{ active: filters.status === 'failed' }"
              @click="filters.status = 'failed'; loadLogs()"
            >
              失败
            </span>
          </div>
        </div>
      <div class="filter-item button-item">
        <el-button @click="resetFilters" type="default">重置</el-button>
        <el-button type="primary" icon="Refresh" @click="refreshLogs">刷新</el-button>
        <el-button @click="loadLogs" type="primary">查询</el-button>
      </div>
      <div class="filter-item sort-item">
        <span class="filter-label">排序:</span>
        <div class="sort-selects">
          <el-select v-model="sortField" placeholder="选择排序字段" class="filter-select" @change="loadLogs">
            <el-option label="执行节点数" value="actualNodeCount" />
            <el-option label="执行耗时" value="executionTime" />
          </el-select>
          <el-select v-model="sortOrder" placeholder="排序方式" class="filter-select" @change="loadLogs">
            <el-option label="升序" value="asc" />
            <el-option label="降序" value="desc" />
          </el-select>
        </div>
        <div class="sort-buttons mobile-sort-buttons">
          <span 
            class="sort-text" 
            :class="{ active: sortField === 'actualNodeCount' }"
            @click="toggleSort('actualNodeCount')"
          >
            执行节点数
            <el-icon v-if="sortField === 'actualNodeCount'" :class="{ 'desc': sortOrder === 'desc' }">
              <ArrowUp />
            </el-icon>
          </span>
          <span class="sort-divider">|</span>
          <span 
            class="sort-text" 
            :class="{ active: sortField === 'executionTime' }"
            @click="toggleSort('executionTime')"
          >
            执行耗时
            <el-icon v-if="sortField === 'executionTime'" :class="{ 'desc': sortOrder === 'desc' }">
              <ArrowUp />
            </el-icon>
          </span>
        </div>
      </div>
    </div>
    
    <div class="log-content">
      <div v-loading="loading" element-loading-text="加载中..." class="log-list">
        <div 
          v-for="log in filteredLogs" 
          :key="log.id" 
          class="log-item"
        >
          <div 
            class="log-header"
            :class="{ 'log-header-failed': log.isError }"
            @click="toggleLogDetail(log)"
          >
            <div class="log-header-left">
                <div class="status-icon" :class="{ failed: log.isError }">
                  <CircleClose v-if="log.isError" />
                  <CircleCheck v-else />
                </div>
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
              <div class="summary-context error-log" v-if="log.errorLog">
                <div class="summary-label error-label">错误日志</div>
                <div 
                  class="json-viewer" 
                  @click="isBigText(log.errorLog) ? fetchBigText(log.errorLog, (data) => openModal('错误日志', data)) : openModal('错误日志', log.errorLog || '无')"
                >
                  <template v-if="isBigText(log.errorLog)">
                    <template v-if="bigTextDisplayCache[log.errorLog]">
                      <pre class="error-text" v-html="highlightJson(formatJsonData(bigTextDisplayCache[log.errorLog])) || bigTextDisplayCache[log.errorLog]"></pre>
                    </template>
                    <template v-else>
                      <pre class="big-text-placeholder">数据过大，请点击查看</pre>
                    </template>
                  </template>
                  <template v-else>
                    <pre class="error-text">{{ log.errorLog }}</pre>
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
                      success: !nodeLog.isError, 
                      failed: nodeLog.isError 
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
                      <div class="detail-row" :class="{ 'detail-row-error': nodeLog.isError }" v-if="nodeLog.output">
                        <span class="detail-label" :class="{ 'label-error': nodeLog.isError }">输出:</span>
                        <div 
                          class="json-viewer"
                          :class="{ 'json-viewer-error': nodeLog.isError }"
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
        
        <el-empty v-if="filteredLogs.length === 0 && !loading" description="暂无日志记录" />
      </div>
    </div>

    <div class="pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :layout="paginationLayout"
        :total="total"
        @size-change="loadLogs"
        @current-change="handlePageChange"
      />
    </div>
    
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
  </div>
</template>

<style scoped>
.workflow-log-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 20px 0;
}

.header-left h2 {
  font-size: 20px;
  margin: 0;
  color: #303133;
  font-weight: bold;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background-color: #ffffff;
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
  width: 300px;
}

.filter-select {
  width: 150px;
}

.sort-selects {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-sort-buttons {
  display: none;
}

.filter-date {
  width: 300px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-status-buttons {
  display: none;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fff;
  color: #606266;
}

.status-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.status-btn.active {
  background-color: #409eff;
  border-color: #409eff;
  color: #fff;
}

.status-btn.success.active {
  background-color: #67c23a;
  border-color: #67c23a;
}

.status-btn.failed.active {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

.log-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 8px;
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

.log-header-failed {
  border-left: 4px solid #F56C6C;
}

.log-header-failed .workflow-name {
  color: #F56C6C;
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
  margin-bottom: 12px;
}

.summary-context:last-child {
  margin-bottom: 0;
}

.summary-context .summary-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  display: block;
}

.summary-context.error-log {
  border: 1px solid #fef0f0;
  background: #fefafa;
}

.summary-context.error-log .summary-label.error-label {
  color: #f56c6c;
  font-weight: 500;
}

.json-viewer pre.error-text {
  color: #f56c6c;
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

.big-text-placeholder {
  color: #909399 !important;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
  font-size: 16px;
  font-weight: 500;
}

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

.detail-label.label-error {
  color: #f56c6c;
  font-weight: 500;
}

.json-viewer-error {
  border: 1px solid rgba(245, 108, 108, 0.3);
  box-shadow: 0 0 8px rgba(245, 108, 108, 0.1);
}

.json-viewer-error pre {
  color: #F56C6C !important;
}

.pagination {
  flex-shrink: 0;
  margin-top: 16px;
  padding: 12px 0 4px;
  display: flex;
  justify-content: center;
  background: #f5f7fa;
}

:deep(.el-pagination .el-pager li.active) {
  background-color: #409eff;
  color: white;
}

:deep(.el-pagination .el-pager li:hover:not(.disabled)) {
  color: #409eff;
}

@media (max-width: 767px) {
  .workflow-log-view {
    background: linear-gradient(180deg, #f6f9ff 0%, #eef3fb 100%);
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    display: block;
  }

  .filter-section {
    align-items: center;
    gap: 8px 10px;
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid rgba(37, 99, 235, 0.08);
    border-radius: 0 0 12px 12px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  }
  
  .filter-item {
    width: auto;
    gap: 6px;
  }
  
  .filter-item:not(.button-item):not(.sort-item) {
    padding-bottom: 0;
    border-bottom: 0;
  }
  
  .search-item {
    display: block;
    flex: 1 1 calc(50% - 5px);
    min-width: 0;
  }

  .date-item {
    flex: 1 1 calc(50% - 5px);
    min-width: 0;
  }
  
  .filter-input {
    width: 100%;
    font-size: 14px;
  }

  .filter-icon {
    font-size: 15px;
    color: #9aa4b2;
  }

  :deep(.filter-input .el-input__wrapper),
  :deep(.filter-date.el-input__wrapper) {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
    border-radius: 6px;
    box-shadow: 0 0 0 1px #d8dee8 inset;
  }

  :deep(.filter-input .el-input__wrapper.is-focus),
  :deep(.filter-date.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #3b82f6 inset, 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
  
  .filter-date {
    width: 100%;
    min-width: 0;
    font-size: 14px;
  }

  .status-item {
    flex: 1 1 100%;
    order: 3;
    padding-top: 8px;
    border-top: 1px solid #eef2f7;
  }

  .status-item .filter-select {
    display: none;
  }

  .mobile-status-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .status-btn {
    flex: 1;
    max-width: 100px;
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid #e1e7f0;
    background: #f8fbff;
  }

  .status-btn.active {
    color: #fff;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  }

  .status-btn.success.active {
    background: linear-gradient(135deg, #67c23a 0%, #5eb83a 100%);
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
  }

  .status-btn.failed.active {
    background: linear-gradient(135deg, #f56c6c 0%, #f15555 100%);
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.2);
  }

  :deep(.filter-date .el-range__icon) {
    display: none;
  }

  :deep(.filter-date .el-range-input) {
    min-width: 0;
    font-size: 12px;
  }

  :deep(.filter-date .el-range-separator) {
    flex: 0 0 22px;
    color: #303133;
    font-size: 12px;
  }
  
  .sort-selects {
    display: none;
  }
  
  .filter-label {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    flex-shrink: 0;
    margin-bottom: 0;
  }
  
  .button-item {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    flex: 1 1 58%;
    min-width: 190px;
    gap: 6px;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  
  .button-item .el-button,
  .button-item .el-button:first-child,
  .button-item .el-button:last-child {
    width: 100%;
    max-width: none;
    margin: 0;
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
  }
  
  .button-item .el-button--primary {
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
  }
  
  .sort-item {
    flex: 1 1 38%;
    min-width: 150px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 0;
    border-top: 0;
    margin-top: 0;
  }
  
  .mobile-sort-buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex: 1;
  }
  
  .sort-text {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 30px;
    padding: 0 8px;
    border: 1px solid #e1e7f0;
    border-radius: 6px;
    background: #f8fbff;
    font-size: 12px;
    color: #303133;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  
  .sort-text:hover {
    color: #409eff;
  }
  
  .sort-text.active {
    border-color: rgba(64, 158, 255, 0.28);
    background: rgba(64, 158, 255, 0.08);
    color: #409eff;
  }
  
  .sort-text .el-icon {
    font-size: 12px;
    transition: transform 0.2s ease;
  }
  
  .sort-text .el-icon.desc {
    transform: rotate(180deg);
  }
  
  .sort-divider {
    display: none;
  }

  .log-content {
    padding: 0 0 6px;
  }

  .log-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .log-item {
    margin-bottom: 0;
    border: 1px solid #e7ecf3;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  .log-item:hover {
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  .log-header {
    align-items: stretch;
    padding: 16px 18px;
    gap: 12px;
  }

  .log-header-left {
    min-width: 0;
    flex: 1;
  }

  .workflow-name {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    line-height: 22px;
  }

  .log-time {
    color: #7b8794;
    font-size: 12px;
    white-space: nowrap;
  }

  .log-header-right {
    flex: 0 0 auto;
    gap: 10px;
  }

  .log-stats {
    align-items: center;
    gap: 8px;
  }

  .stat-item {
    gap: 3px;
    white-space: nowrap;
  }

  .stat-label {
    color: #8a94a3;
  }

  .stat-value {
    color: #1683ff;
  }

  .expand-icon {
    align-self: center;
    color: #c8d0dc;
  }

  .log-detail {
    padding: 0 16px 16px;
  }

  .summary-context,
  .node-timeline {
    border: 1px solid #eef2f7;
    border-radius: 8px;
  }

  .pagination {
    margin-top: 8px;
    padding: 6px 0 20px;
    overflow-x: hidden;
    justify-content: center;
    background: transparent;
  }

  :deep(.pagination .el-pagination) {
    flex-wrap: nowrap;
    justify-content: center;
    min-width: 0;
    width: auto;
  }
}

@media (max-width: 380px) {
  .button-item {
    gap: 8px;
  }

  .button-item .el-button,
  .button-item .el-button:first-child,
  .button-item .el-button:last-child {
    padding: 0 10px;
  }

  .log-header {
    flex-wrap: wrap;
    align-items: center;
  }

  .workflow-name {
    max-width: 100%;
  }

  .log-header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<style>
@media (max-width: 767px) {
  .workflow-log-date-popper {
    left: 8px !important;
    right: 8px !important;
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    overflow: hidden;
  }

  .workflow-log-date-popper .el-picker-panel__body-wrapper,
  .workflow-log-date-popper .el-picker-panel__body,
  .workflow-log-date-popper .el-date-range-picker__content {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box;
  }

  .workflow-log-date-popper .el-picker-panel__body {
    display: flex;
    flex-direction: column;
  }

  .workflow-log-date-popper .el-date-range-picker {
    width: 100% !important;
    min-width: 0 !important;
  }

  .workflow-log-date-popper .el-date-range-picker__content {
    float: none;
    padding: 10px 12px;
  }

  .workflow-log-date-popper .el-date-range-picker__content.is-left {
    border-right: 0;
    border-bottom: 1px solid #ebeef5;
  }

  .workflow-log-date-popper .el-date-table {
    width: 100%;
  }

  .workflow-log-date-popper .el-date-table th,
  .workflow-log-date-popper .el-date-table td {
    width: 14.285%;
    min-width: 0;
    height: 28px;
    padding: 1px;
  }

  .workflow-log-date-popper .el-date-table-cell {
    height: 26px;
    padding: 0;
  }

  .workflow-log-date-popper .el-date-table-cell__text {
    width: 24px;
    height: 24px;
    line-height: 24px;
  }

  .workflow-log-date-popper .el-date-range-picker__header {
    height: 30px;
  }

  .workflow-log-date-popper .el-date-range-picker__header div {
    font-size: 14px;
  }
}
</style>
