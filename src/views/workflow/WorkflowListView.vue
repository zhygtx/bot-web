<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import request from '../../utils/request'
import AppPagination from '../../components/common/AppPagination.vue'

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
        
        <AppPagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :page-sizes="[6, 12, 24]"
          :total="total"
          @size-change="loadWorkflows"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>
