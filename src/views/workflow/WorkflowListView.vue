<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { User, Clock, Delete } from '@element-plus/icons-vue'
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
      if (Array.isArray(response.data)) {
        // 直接返回数组的情况
        workflows.value = response.data
        total.value = response.total || response.data.length
      } else if (response.data) {
        // PageHelper 分页对象的情况
        if (Array.isArray(response.data.list)) {
          workflows.value = response.data.list
          total.value = response.data.total || 0
        } else {
          // 可能是直接返回的工作流对象数组
          workflows.value = Object.values(response.data).filter(item => typeof item === 'object' && item !== null && item.id)
          total.value = response.data.total || workflows.value.length
        }
      } else {
        workflows.value = []
        total.value = 0
      }
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

// 计算上次更新时间距今的时间
const getTimeAgo = (updateTime) => {
  if (!updateTime) return '未知'
  
  const now = new Date()
  const updateDate = new Date(updateTime)
  const diffTime = Math.abs(now - updateDate)
  
  // 计算秒数
  const diffSeconds = Math.floor(diffTime / 1000)
  // 计算分钟数
  const diffMinutes = Math.floor(diffSeconds / 60)
  // 计算小时数
  const diffHours = Math.floor(diffMinutes / 60)
  // 计算天数
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffHours < 1) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks}周前`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months}个月前`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years}年前`
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
                      <div class="workflow-name-container">
                        <h3 class="workflow-name">{{ workflow.name }}</h3>
                      </div>
                      <div class="delete-icon-container">
                        <el-icon class="delete-icon" @click.stop="deleteWorkflow(workflow.id)">
                          <Delete />
                        </el-icon>
                      </div>
                    </div>
                  <div class="workflow-card-description">
                    {{ workflow.description || '暂无描述' }}
                  </div>
                  <div class="workflow-card-footer">
                    <div class="workflow-card-author">
                      <el-icon class="footer-icon"><User /></el-icon>
                      <span>{{ workflow.authorName || workflow.userId || '未知' }}</span>
                    </div>
                    <div class="workflow-card-time">
                      <el-icon class="footer-icon"><Clock /></el-icon>
                      <span>{{ getTimeAgo(workflow.updateTime) }}</span>
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
  height: 280px; /* 固定高度，确保长宽比一致 */
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 添加阴影效果 */
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  position: relative; /* 添加相对定位，使删除图标容器的绝对定位相对于卡片 */
}

.workflow-item-wrapper:hover .workflow-item-card {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15); /* 增强hover时的阴影效果 */
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
  position: relative;
}

.workflow-item-wrapper {
  position: relative;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.workflow-item-wrapper:hover {
  transform: translateY(-2px);
}

.workflow-name-container {
  position: relative;
  flex: 1;
  margin-right: 40px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-icon-container {
  position: absolute;
  top: -5px;
  right: -5px;
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

.workflow-card-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e6e6e6;
  flex: 1;
  overflow: hidden;
}

.workflow-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
  margin-top: auto;
}

.workflow-card-author,
.workflow-card-time {
  display: flex;
  align-items: center;
}

.footer-icon {
  font-size: 14px;
  margin-right: 4px;
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