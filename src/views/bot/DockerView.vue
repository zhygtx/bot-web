<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Cpu, Monitor, User } from '@element-plus/icons-vue'
import request from '../../utils/request'

const router = useRouter()

const isMobile = ref(false)
const loading = ref(false)
const createLoading = ref(false)
const currentBotQQ = ref(null)

const containerInfo = ref({
  containerId: '',
  name: '',
  port: null,
  token: '',
  createTime: '',
  updateTime: ''
})

const currentHost = ref('localhost')

onMounted(() => {
  if (typeof window !== 'undefined') {
    currentHost.value = window.location.hostname || 'localhost'
  }
})

const dialogVisible = ref(false)

const dockerForm = reactive({
  napcatToken: ''
})

const rules = {
  napcatToken: [
    { required: true, message: '请输入napcat token', trigger: 'blur' },
    { min: 10, message: 'token长度不能少于10个字符', trigger: 'blur' }
  ]
}

const dockerFormRef = ref(null)

const menuItems = [
  { path: '/bot/info', label: '机器人管理', icon: Cpu },
  { path: '/bot/docker', label: 'Docker管理', icon: Monitor, active: true },
  { path: '/user/profile', label: '我的信息', icon: User }
]

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const createContainer = async () => {
  if (!dockerFormRef.value) return
  
  const valid = await dockerFormRef.value.validate()
  if (!valid) {
    return
  }
  
  try {
    createLoading.value = true
    
    const response = await request({
      url: '/docker',
      method: 'post',
      params: {
        napcatToken: dockerForm.napcatToken,
        botQQ: currentBotQQ.value
      }
    })
    
    containerInfo.value.port = response.data
    containerInfo.value.token = dockerForm.napcatToken
    containerInfo.value.createTime = new Date().toLocaleString()
    containerInfo.value.updateTime = new Date().toLocaleString()
    
    dialogVisible.value = false
    dockerForm.napcatToken = ''
    await getContainerInfo()
  } catch (error) {
    console.error('创建容器失败:', error)
  } finally {
    createLoading.value = false
  }
}

const deleteContainer = async () => {
  try {
    await ElMessageBox.confirm('确定要删除该容器吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    loading.value = true
    
    await request({
      url: '/docker',
      method: 'delete',
      params: { botQQ: currentBotQQ.value },
      timeout: 30000
    })
    
    containerInfo.value = {
      containerId: '',
      name: '',
      port: null,
      token: '',
      createTime: '',
      updateTime: ''
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除容器失败:', error)
    }
  } finally {
    await getContainerInfo()
    loading.value = false
  }
}

const openCreateDialog = async () => {
  try {
    const response = await request({
      url: '/bot',
      method: 'get'
    })
    
    if (!response.data || !response.data.id) {
      ElMessage.warning('请先注册机器人')
      router.push('/bot/info')
      return
    }
    
    currentBotQQ.value = response.data.botQQ
    dialogVisible.value = true
  } catch (error) {
    ElMessage.warning('请先注册机器人')
    router.push('/bot/info')
  }
}

const getContainerInfo = async () => {
  try {
    loading.value = true
    
    const response = await request({
      url: '/docker',
      method: 'get'
    })
    
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
  } finally {
    loading.value = false
  }
}

const navigateTo = (path) => {
  router.push(path)
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  getContainerInfo()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="docker-view">
    <div v-if="isMobile" class="profile-menu">
      <div
        v-for="item in menuItems"
        :key="item.path"
        class="menu-item"
        :class="{ active: item.active }"
        @click="navigateTo(item.path)"
      >
        <el-icon class="menu-icon">
          <component :is="item.icon" />
        </el-icon>
        <span class="menu-label">{{ item.label }}</span>
      </div>
    </div>
    
    <div class="content-section">
      <div class="section-header">
        <div class="header-actions">
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
    </div>
  </div>
</template>

<style scoped>
.docker-view {
  width: 100%;
}

.profile-menu {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.profile-menu::-webkit-scrollbar {
  display: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  border: 1px solid #e4e7ed;
}

.menu-item:hover {
  background-color: #f5f7fa;
  border-color: #c0c4cc;
}

.menu-item.active {
  background-color: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
}

.menu-icon {
  font-size: 18px;
}

.menu-label {
  font-size: 14px;
  font-weight: 500;
}

.content-section {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 20px;
  margin: 0;
  color: #303133;
  font-weight: bold;
}

.header-actions {
  display: flex;
  gap: 10px;
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

@media (max-width: 767px) {
  .profile-menu {
    gap: 8px;
  }
  
  .menu-item {
    padding: 10px 16px;
  }
  
  .menu-label {
    font-size: 13px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .content-section {
    padding: 16px;
  }
  
  .header-actions {
    gap: 8px;
  }
}
</style>
