<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import request from '../../utils/request'

// 容器信息
const containerInfo = ref({
  containerId: '',
  name: '',
  port: null,
  token: '',
  createTime: '',
  updateTime: ''
})

// 获取当前主机名，处理window对象可能不存在的情况
const currentHost = ref('localhost')

// 在组件挂载后获取主机名，确保window对象已经存在
onMounted(() => {
  if (typeof window !== 'undefined') {
    currentHost.value = window.location.hostname || 'localhost'
  }
})

// 加载状态
const loading = ref(false)
const createLoading = ref(false)

// 对话框状态
const dialogVisible = ref(false)

// 表单数据
const dockerForm = reactive({
  napcatToken: ''
})

// 表单验证规则
const rules = {
  napcatToken: [
    { required: true, message: '请输入napcat token', trigger: 'blur' },
    { min: 10, message: 'token长度不能少于10个字符', trigger: 'blur' }
  ]
}

// 表单引用
const dockerFormRef = ref(null)

// 创建容器
const createContainer = async () => {
  if (!dockerFormRef.value) return
  
  const valid = await dockerFormRef.value.validate()
  if (!valid) {
    return
  }
  
  try {
    createLoading.value = true
    
    const response = await request({
      url: '/docker/create',
      method: 'get',
      params: {
        napcatToken: dockerForm.napcatToken
      }
    })
    
    // 保存容器信息
    containerInfo.value.port = response.data
    containerInfo.value.token = dockerForm.napcatToken
    containerInfo.value.createTime = new Date().toLocaleString()
    containerInfo.value.updateTime = new Date().toLocaleString()
    
    ElMessage.success(`容器创建成功，端口号：${response.data}`)
    dialogVisible.value = false
    // 清空表单
    dockerForm.napcatToken = ''
    // 更新容器信息
    await getContainerInfo()
  } catch (error) {
    ElMessage.error(error.message || '创建容器失败')
  } finally {
    createLoading.value = false
  }
}

// 删除容器
const deleteContainer = async () => {
  try {
    await ElMessageBox.confirm('确定要删除该容器吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: '/docker/delete',
      method: 'get'
    })
    
    // 更新容器信息
    await getContainerInfo()
    
    ElMessage.success('删除容器成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除容器失败')
    }
  }
}

// 打开创建对话框
const openCreateDialog = () => {
  dialogVisible.value = true
}

// 获取容器信息
const getContainerInfo = async () => {
  try {
    loading.value = true
    
    const response = await request({
      url: '/docker/info',
      method: 'get'
    })
    
    // 更新容器信息
    if (response.data) {
      containerInfo.value = {
        containerId: response.data.containerId || '',
        name: response.data.name || '',
        port: response.data.port || null,
        token: response.data.token || '',
        createTime: response.data.createTime || '',
        updateTime: response.data.updateTime || ''
      }
    }
  } catch (error) {
    console.error('获取容器信息失败:', error)
    // 只在明确错误时显示错误消息，避免干扰用户体验
    if (error.response && error.response.status !== 404) {
      ElMessage.error('获取容器信息失败')
    }
  } finally {
    loading.value = false
  }
}

// 页面加载时获取容器信息
onMounted(() => {
  getContainerInfo()
})
</script>

<template>
  <div class="docker-view">
    <el-card class="docker-card">
      <template #header>
        <div class="card-header">
          <h2>Docker管理</h2>
          <div class="card-actions">
            <el-button
              v-if="!containerInfo.port"
              type="primary"
              @click="openCreateDialog"
              :icon="Plus"
            >
              创建容器
            </el-button>
            <el-button
              v-if="containerInfo.port"
              type="danger"
              @click="deleteContainer"
              :icon="Delete"
            >
              删除容器
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 容器信息展示 -->
      <el-descriptions
        v-loading="loading"
        :column="2"
        border
        class="container-descriptions"
      >
        <template v-if="containerInfo.port">
          <el-descriptions-item label="容器ID" prop="containerId">{{ containerInfo.containerId || '未获取' }}</el-descriptions-item>
          <el-descriptions-item label="容器名称" prop="name">{{ containerInfo.name || '未获取' }}</el-descriptions-item>
          <el-descriptions-item label="访问端口" prop="port">
            <div>
              <span style="color: #409eff; font-weight: bold;">{{ containerInfo.port }}</span>
              <a 
                :href="`http://${currentHost}:${containerInfo.port}`" 
                target="_blank" 
                class="visit-btn"
              >
                访问Napcat UI
              </a>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="Napcat Token" prop="token">{{ containerInfo.token || '未获取' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" prop="createTime">{{ containerInfo.createTime }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" prop="updateTime">{{ containerInfo.updateTime }}</el-descriptions-item>
        </template>
        <template v-else>
          <el-descriptions-item label="提示" :span="2">
            <el-empty description="暂无容器信息，请点击创建容器按钮进行创建"></el-empty>
          </el-descriptions-item>
        </template>
      </el-descriptions>
      
      <!-- 容器创建对话框 -->
      <el-dialog
        v-model="dialogVisible"
        title="创建容器"
        width="500px"
      >
        <el-form
          ref="dockerFormRef"
          :model="dockerForm"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="Napcat Token" prop="napcatToken">
            <el-input
              v-model="dockerForm.napcatToken"
              placeholder="请输入napcat token"
              type="text"
              show-password
            ></el-input>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="createContainer" :loading="createLoading">
              确定
            </el-button>
          </span>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<style scoped>
.docker-view {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  font-size: 20px;
  margin: 0;
  color: #303133;
}

.search-form {
  margin-bottom: 20px;
  padding: 10px 0;
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.visit-btn {
  display: inline-block;
  margin-left: 10px;
  padding: 4px 12px;
  background-color: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  text-decoration: none;
  font-size: 12px;
  border: 1px solid #d9ecff;
  transition: all 0.3s;
}

.visit-btn:hover {
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
}
</style>
