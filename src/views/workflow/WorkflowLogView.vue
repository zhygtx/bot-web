<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElLoading, ElPagination, ElSelect, ElOption, ElDatePicker, ElButton, ElIcon } from 'element-plus'
import { Clock, VideoPlay, CircleCheck, CircleClose, ArrowRight, Refresh, Filter } from '@element-plus/icons-vue'
import request from '../../utils/request'

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

// 当前展开的日志详情
const expandedLogId = ref(null)
const loadingNodeLogIds = ref(new Set())

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
      endTime: filters.value.dateRange.length === 2 ? filters.value.dateRange[1].getTime() : null
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
    expandedLogId.value = log.id
    await loadNodeLogs(log)
  }
}

// 刷新日志列表
const refreshLogs = () => {
  pageNum.value = 1
  loadLogs()
}

// 重置筛选条件
const resetFilters = () => {
  filters.value = {
    workflowName: '',
    dateRange: []
  }
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
                <div class="summary-grid">
                  <div class="summary-item">
                    <span class="summary-label">工作流ID</span>
                    <span class="summary-value">{{ log.workflowId }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">用户ID</span>
                    <span class="summary-value">{{ log.userId }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">开始时间</span>
                    <span class="summary-value">{{ formatTime(log.startTime) }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">初始上下文</span>
                    <span class="summary-value">{{ log.initialContext || '无' }}</span>
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
                          <pre class="detail-value">{{ nodeLog.input }}</pre>
                        </div>
                        <div class="detail-row" v-if="nodeLog.output">
                          <span class="detail-label">输出:</span>
                          <pre class="detail-value">{{ nodeLog.output }}</pre>
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 12px;
  color: #909399;
}

.summary-value {
  font-size: 12px;
  color: #303133;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.detail-value {
  font-size: 12px;
  color: #606266;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-value.error-text {
  color: #f56c6c;
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
