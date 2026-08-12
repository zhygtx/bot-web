<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, VideoPlay, CircleCheck, CircleClose, ArrowRight, ArrowUp, Refresh, Filter, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'
import AppPagination from '../../components/common/AppPagination.vue'
import HighlightCode from '../../components/common/HighlightCode.vue'

const props = defineProps({
  workflowId: { type: String, default: '' }
})

const emit = defineEmits(['logToggle'])

const logs = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isMobile = ref(false)

const filters = ref({
  workflowName: '',
  keyword: '',
  dateRange: [],
  status: ''
})

const sortField = ref('')
const sortOrder = ref('desc')

const expandedLogId = ref(null)
const loadingNodeLogIds = ref(new Set())

const paginationLayout = computed(() => {
  return isMobile.value ? 'prev, pager, next' : 'prev, pager, next, ->, total, jumper'
})

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const normalizeLog = (log) => ({
  ...log,
  id: Number(log.id) || log.id,
  startTime: Number(log.startTime) || log.startTime,
  durationMs: Number(log.durationMs) || 0,
  executionTime: Number(log.durationMs) || 0,
  isError: log.status === 'FAILED',
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
  if (typeof data !== 'string') {
    try {
      return JSON.stringify(data, null, 2)
    } catch (e) {
      return String(data)
    }
  }
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return data
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

const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      userId: localStorage.getItem('userId') || '',
      workflowId: props.workflowId || undefined,
      workflowName: filters.value.workflowName,
      keyword: filters.value.keyword.trim(),
      startTime: filters.value.dateRange?.length === 2 ? filters.value.dateRange[0].getTime() : null,
      endTime: filters.value.dateRange?.length === 2 ? filters.value.dateRange[1].getTime() : null,
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
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

const loadNodeLogs = async (log) => {
  if (!log?.id || log.nodeLogsLoaded) return
  loadingNodeLogIds.value.add(log.id)
  try {
    const response = await request({
      url: `/workflowLog/${log.id}`,
      method: 'get'
    })
    const rawTrace = response.data?.trace
    const trace = typeof rawTrace === 'string' ? parseTraceJson(rawTrace) : rawTrace
    const nodeList = Array.isArray(trace?.nodes) ? trace.nodes : Array.isArray(response.data?.nodeLogs) ? response.data.nodeLogs : []
    if (response.code === 200) {
      if (trace) log.trace = trace
      log.nodeLogs = nodeList.map((node, index) => ({
        id: index + 1,
        nodeId: node.nodeId,
        order: index + 1,
        methodName: node.name || node.callable || '未知方法',
        isError: node.status === 'FAILED',
        executionTime: Math.max(0, (Number(node.endTime) || 0) - (Number(node.startTime) || 0)),
        input: node.input,
        output: node.status === 'FAILED' ? node.error : node.output
      }))
      log.nodeLogsLoaded = true
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loadingNodeLogIds.value.delete(log.id)
  }
}

const parseTraceJson = (value) => {
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadLogs()
}

const toggleLogDetail = async (log) => {
  if (expandedLogId.value === log.id) {
    expandedLogId.value = null
    emit('logToggle', null)
  } else {
    expandedLogId.value = log.id
    await loadNodeLogs(log)
    emit('logToggle', log)
  }
}

const refreshLogs = () => {
  expandedLogId.value = null
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
    keyword: '',
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
      <div class="filter-item search-item">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索消息内容 / QQ号"
          clearable
          class="filter-input"
          @keyup.enter="loadLogs"
          @clear="loadLogs"
        >
          <template #prefix>
            <el-icon class="filter-icon"><Search /></el-icon>
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
          <el-option label="成功" value="SUCCESS" />
          <el-option label="失败" value="FAILED" />
        </el-select>
        <div class="mobile-status-buttons">
          <span
            class="status-btn"
            :class="{ active: filters.status === '' }"
            @click="filters.status = ''; loadLogs()"
          >全部</span>
          <span
            class="status-btn success"
            :class="{ active: filters.status === 'SUCCESS' }"
            @click="filters.status = 'SUCCESS'; loadLogs()"
          >成功</span>
          <span
            class="status-btn failed"
            :class="{ active: filters.status === 'FAILED' }"
            @click="filters.status = 'FAILED'; loadLogs()"
          >失败</span>
        </div>
      </div>
      <div class="filter-item button-item">
        <el-button @click="resetFilters" type="default">重置</el-button>
        <el-button type="primary" :icon="Refresh" @click="refreshLogs">刷新</el-button>
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
            <el-icon v-if="sortField === 'actualNodeCount'" :class="{ desc: sortOrder === 'desc' }">
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
            <el-icon v-if="sortField === 'executionTime'" :class="{ desc: sortOrder === 'desc' }">
              <ArrowUp />
            </el-icon>
          </span>
        </div>
      </div>
    </div>

    <div class="log-content">
      <div v-loading="loading" element-loading-text="加载中..." class="log-list">
        <div v-for="log in filteredLogs" :key="log.id" class="log-item">
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
                <div class="summary-label">触发键</div>
                <div class="summary-value">{{ log.triggerKey || '无' }}</div>
              </div>
              <div class="summary-context error-log" v-if="log.errorMessage">
                <div class="summary-label error-label">错误日志</div>
                <HighlightCode
                  :content="log.errorMessage"
                  plain
                  class="error-text"
                  @click="openModal('错误日志', log.errorMessage)"
                />
              </div>
            </div>

            <div class="detail-section" v-if="log.nodeLogs && log.nodeLogs.length > 0">
              <h4>节点执行日志</h4>
              <div class="node-timeline">
                <div v-for="(nodeLog, index) in log.nodeLogs" :key="nodeLog.id" class="node-log-item">
                  <div class="timeline-line">
                    <div class="timeline-dot" :class="{ success: !nodeLog.isError, failed: nodeLog.isError }"></div>
                    <div v-if="index < log.nodeLogs.length - 1" class="timeline-connector"></div>
                  </div>
                  <div class="timeline-content">
                    <div class="node-header">
                      <span class="node-order">{{ nodeLog.order }}</span>
                      <span class="node-name">{{ nodeLog.methodName }}</span>
                      <span class="node-time">{{ nodeLog.executionTime }}ms</span>
                    </div>
                    <div class="node-details">
                      <div class="detail-row" v-if="nodeLog.input !== null && nodeLog.input !== undefined">
                        <span class="detail-label">输入:</span>
                        <HighlightCode
                          :content="formatJsonData(nodeLog.input)"
                          @click="openModal('输入 - ' + (nodeLog.methodName || '未知方法'), nodeLog.input)"
                        />
                      </div>
                      <div class="detail-row" :class="{ 'detail-row-error': nodeLog.isError }">
                        <span class="detail-label" :class="{ 'label-error': nodeLog.isError }">
                          {{ nodeLog.isError ? '错误:' : '输出:' }}
                        </span>
                        <HighlightCode
                          :content="formatJsonData(nodeLog.output)"
                          :plain="nodeLog.isError"
                          :class="{ 'error-text': nodeLog.isError }"
                          @click="openModal((nodeLog.isError ? '错误 - ' : '输出 - ') + (nodeLog.methodName || '未知方法'), nodeLog.output)"
                        />
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

    <AppPagination
      v-model:current-page="pageNum"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      :layout="paginationLayout"
      :total="total"
      @size-change="loadLogs"
      @current-change="handlePageChange"
    />

    <el-dialog
      v-model="showModal"
      width="80%"
      :close-on-click-modal="true"
      @close="closeModal"
    >
      <template #header>
        <div class="modal-header">
          <span>{{ modalTitle }}</span>
          <el-button link :icon="VideoPlay" @click="copyModalContent" class="copy-btn">复制</el-button>
        </div>
      </template>
      <div class="modal-json-viewer">
        <HighlightCode :content="modalContent" />
      </div>
    </el-dialog>
  </div>
</template>
