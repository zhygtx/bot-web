<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import request from '../../utils/request'

const router = useRouter()

// 工作流列表
const workflows = ref([])
// 加载状态
const loading = ref(false)
// 分页参数
const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)

// 加载工作流列表
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
      // 检查响应数据格式
      let workflowList = []
      if (Array.isArray(response.data)) {
        // 直接返回数组的情况
        workflowList = response.data
        total.value = response.total || response.data.length
      } else if (response.data) {
        // PageHelper 分页对象的情况
        if (Array.isArray(response.data.list)) {
          workflowList = response.data.list
          total.value = response.data.total || 0
        } else {
          // 可能是直接返回的工作流对象数组
          workflowList = Object.values(response.data).filter(item => typeof item === 'object' && item !== null && item.id)
          total.value = response.data.total || workflowList.length
        }
      }
      
      // 标准化工作流数据，确保数字类型正确
      workflows.value = workflowList.map(workflow => ({
        ...workflow,
        id: workflow.id,
        executeCount: Number(workflow.executeCount) || 0,
        averageExecutionTime: Number(workflow.averageExecutionTime) || 0,
        nodeCount: Number(workflow.nodeCount) || 0,
        averageNodeCount: Number(workflow.averageNodeCount) || 0,
        enabled: Boolean(workflow.enabled)
      }))
    } else {
      ElMessage.error(response.message || '加载工作流失败')
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('加载工作流失败')
  } finally {
    loading.value = false
  }
}

// 格式化时间显示
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

// 分页处理
const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadWorkflows()
}

// 跳转到工作流编辑页
const goToDetail = (workflowId) => {
  router.push(`/workflow/edit/${workflowId}`)
}

// 删除工作流
const deleteWorkflow = async (workflowId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个工作流吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await request({
      url: '/workflow',
      method: 'delete',
      params: {
        id: workflowId
      }
    })
    
    if (response.code === 200) {
      ElMessage.success('删除工作流成功')
      loadWorkflows()
    } else {
      ElMessage.error(response.message || '删除工作流失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除工作流失败')
    }
  }
}

// 切换工作流启用状态
const toggleWorkflowEnabled = async (workflow) => {
  try {
    const response = await request({
      url: '/workflow/editEnabled',
      method: 'put',
      params: {
        id: workflow.id,
        enabled: !workflow.enabled
      }
    })
    
    if (response.code === 200) {
      workflow.enabled = !workflow.enabled
      ElMessage.success('状态修改成功')
    } else {
      ElMessage.error(response.message || '修改失败')
    }
  } catch (error) {
    ElMessage.error('修改失败')
  }
}

// 跳转到新建工作流页面
const goToCreate = () => {
  router.push('/workflow/edit')
}

// 初始化加载
onMounted(() => {
  loadWorkflows()
})
</script>

<template>
  <div class="workflow-view">
    <el-card class="workflow-card">
      <template #header>
        <div class="card-header">
          <h2>工作流管理</h2>
          <div class="card-actions">
            <el-button type="primary" @click="goToCreate">新建工作流</el-button>
          </div>
        </div>
      </template>
      
      <div class="workflow-content">
        <!-- 加载状态 -->
        <div v-loading="loading" element-loading-text="加载中..." style="width: 100%; height: 100%; min-height: 300px;">
          <el-row :gutter="20" :justify="'start'">
            <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6" v-for="workflow in workflows" :key="workflow.id">
              <div class="workflow-item-wrapper">
                <el-tag v-if="!workflow.available" size="small" type="danger" effect="dark" class="unavailable-tag">不可用</el-tag>
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
          
          <!-- 空状态 -->
          <el-empty v-if="workflows.length === 0 && !loading" description="暂无工作流" />
          
          <!-- 分页 -->
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
    </el-card>
  </div>
</template>

<style scoped>
.workflow-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
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

.workflow-content {
  flex: 1;
  padding: 0 20px 20px;
  overflow-y: auto;
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