<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import request from '../../utils/request'

const router = useRouter()

const workflows = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)

const loadWorkflows = async () => {
  loading.value = true
  try {
    const response = await request({
      url: '/workflow/findAll',
      method: 'get',
      params: {
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    })
    console.log('Response:', response)
    if (response.code === 200) {
      let workflowList = []
      if (Array.isArray(response.data)) {
        workflowList = response.data
        total.value = response.total || response.data.length
      } else if (response.data) {
        if (Array.isArray(response.data.list)) {
          workflowList = response.data.list
          total.value = response.data.total || 0
        } else {
          workflowList = Object.values(response.data).filter(item => typeof item === 'object' && item !== null && item.id)
          total.value = response.data.total || workflowList.length
        }
      }
      
      workflows.value = workflowList.map(workflow => ({
        ...workflow,
        id: workflow.id,
        executeCount: Number(workflow.executeCount) || 0,
        averageExecutionTime: Number(workflow.averageExecutionTime) || 0,
        nodeCount: Number(workflow.nodeCount) || 0,
        averageNodeCount: Number(workflow.averageNodeCount) || 0,
        enabled: Boolean(workflow.enabled)
      }))
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

const formatTime = (ms) => {
  if (!ms || ms === 0) return '0ms'
  
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m${seconds}s`
  }
}

const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadWorkflows()
}

const goToDetail = (workflowId) => {
  router.push(`/workflow/edit/${workflowId}`)
}

const deleteWorkflow = async (workflowId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个工作流吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: '/workflow',
      method: 'delete',
      params: {
        id: workflowId
      }
    })
    
    // 请求成功（code === 200）—— 成功提示由后端返回的 message 控制
    loadWorkflows()
  } catch (error) {
    // 用户取消（ElMessageBox 抛出 'cancel'），静默处理
    // 其他错误已由 request.js 响应拦截器统一提示
  }
}

const toggleWorkflowEnabled = async (workflow) => {
  try {
    await request({
      url: '/workflow/editEnabled',
      method: 'put',
      params: {
        id: workflow.id,
        enabled: !workflow.enabled
      }
    })
    
    // 请求成功 —— 成功提示由后端返回的 message 控制
    workflow.enabled = !workflow.enabled
  } catch (error) {
    // 错误已由 request.js 响应拦截器统一提示
  }
}

const goToCreate = () => {
  router.push('/workflow/edit')
}

onMounted(() => {
  loadWorkflows()
})
</script>

<template>
  <div class="workflow-view">
    <div class="content-header">
      <div class="header-right">
        <el-button type="primary" @click="goToCreate">新建工作流</el-button>
      </div>
    </div>
    
    <div class="workflow-content">
      <div v-loading="loading" element-loading-text="加载中..." class="content-wrapper">
        <el-row :gutter="20" :justify="'start'">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6" v-for="workflow in workflows" :key="workflow.id">
            <div class="workflow-item-wrapper">
              <el-tooltip v-if="!workflow.available && workflow.disableReason" :content="workflow.disableReason" placement="top">
                <el-tag size="small" type="danger" effect="dark" class="unavailable-tag">不可用</el-tag>
              </el-tooltip>
              <el-tag v-else-if="!workflow.available" size="small" type="danger" effect="dark" class="unavailable-tag">不可用</el-tag>
              <el-card class="workflow-item-card" @click="goToDetail(workflow.id)">
                <div class="workflow-card-content">
                  <div class="workflow-card-header">
                    <h3 class="workflow-name">{{ workflow.name }}</h3>
                    <div class="workflow-status">
                      <el-button 
                        :type="workflow.enabled ? 'success' : 'danger'" 
                        size="small"
                        @click.stop="toggleWorkflowEnabled(workflow)"
                        class="enabled-btn"
                      >
                        {{ workflow.enabled ? '已启用' : '已禁用' }}
                      </el-button>
                    </div>
                  </div>
                  <div class="delete-icon-container">
                    <el-icon class="delete-icon" @click.stop="deleteWorkflow(workflow.id)">
                      <Delete />
                    </el-icon>
                  </div>
                  
                  <div class="workflow-stats">
                    <div class="stat-item">
                      <span class="stat-label">执行次数</span>
                      <span class="stat-value">{{ workflow.executeCount || 0 }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">平均耗时</span>
                      <span class="stat-value">{{ formatTime(workflow.averageExecutionTime) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">节点数</span>
                      <span class="stat-value">{{ workflow.nodeCount || 0 }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">平均执行节点</span>
                      <span class="stat-value">{{ workflow.averageNodeCount || 0 }}</span>
                    </div>
                  </div>
                </div>
              </el-card>
            </div>
          </el-col>
        </el-row>
        
        <el-empty v-if="workflows.length === 0 && !loading" description="暂无工作流" />
        
        <div class="pagination" v-if="total > 0">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :page-sizes="[6, 12, 24]"
            layout="prev, pager, next"
            :total="total"
            @size-change="loadWorkflows"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-view {
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

.workflow-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.content-wrapper {
  width: 100%;
  min-height: 300px;
}

.workflow-item-card {
  height: 280px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.workflow-item-wrapper:hover .workflow-item-card {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.workflow-card-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workflow-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.workflow-item-wrapper {
  position: relative;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.workflow-item-wrapper:hover {
  transform: translateY(-2px);
}

.unavailable-tag {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: bold;
  padding: 3px 16px;
  border-radius: 12px;
  background-color: #f56c6c;
  color: white;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 10;
  user-select: none;
  pointer-events: none;
}

.workflow-name {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  flex: 1;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-status {
  flex-shrink: 0;
}

.enabled-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
}

.delete-icon-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.delete-icon {
  font-size: 28px;
  color: #f56c6c;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  padding: 6px;
  box-shadow: 0 0px 0px rgba(0, 0, 0, 0.15);
}

.workflow-item-card:hover .delete-icon {
  opacity: 1;
}

.delete-icon:hover {
  color: #f56c6c;
  transform: scale(1.15);
  background-color: rgba(245, 108, 108, 0.15);
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.2);
}

.workflow-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  background-color: #f5f7fa;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background-color: #e6ebf5;
  transform: translateY(-2px);
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
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
  .workflow-view {
    overflow-x: hidden;
  }

  .workflow-content {
    overflow-x: hidden;
  }

  .content-wrapper :deep(.el-row) {
    margin-left: 0;
    margin-right: 0;
  }

  .content-wrapper :deep(.el-col) {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .workflow-item-wrapper {
    margin-bottom: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .delete-icon {
    opacity: 1;
  }

  .pagination {
    flex-shrink: 0;
    margin-top: 8px;
    padding: 6px 0 0;
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
}</style>
