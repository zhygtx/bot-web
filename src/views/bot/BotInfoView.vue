<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Delete, Plus, Cpu, Monitor, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import request from '../../utils/request'

const router = useRouter()

const isMobile = ref(false)
const loading = ref(false)

const botInfo = ref({
  id: '',
  name: '',
  botQQ: null,
  userId: '',
  online: false,
  isOnline: false
})

const dialogVisible = ref(false)
const dialogTitle = ref('编辑机器人信息')

const botInfoForm = reactive({
  name: '',
  botQQ: null
})

const rules = {
  name: [
    { required: true, message: '请输入机器人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '机器人名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  botQQ: [
    { required: true, message: '请输入机器人QQ', trigger: 'blur' },
    { pattern: /^[0-9]+$/, message: '机器人QQ必须是数字', trigger: 'blur' }
  ]
}

const botInfoFormRef = ref(null)

const menuItems = [
  { path: '/bot/info', label: '机器人管理', icon: Cpu, active: true },
  { path: '/bot/docker', label: 'Docker管理', icon: Monitor },
  { path: '/user/profile', label: '我的信息', icon: User }
]

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const getBotInfo = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/bot/info',
      method: 'get'
    })
    const data = response.data || {}
    botInfo.value = {
      ...data,
      isOnline: data.online || data.isOnline || false,
      online: data.online || data.isOnline || false
    }
  } catch (error) {
    console.error('获取机器人信息失败:', error)
    botInfo.value = {}
  } finally {
    loading.value = false
  }
}

const openBotDialog = () => {
  if (botInfo.value.id) {
    dialogTitle.value = '编辑机器人信息'
    botInfoForm.name = botInfo.value.name
    botInfoForm.botQQ = botInfo.value.botQQ
  } else {
    dialogTitle.value = '添加机器人信息'
    botInfoForm.name = ''
    botInfoForm.botQQ = null
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!botInfoFormRef.value) return
  
  const valid = await botInfoFormRef.value.validate()
  if (!valid) {
    return
  }
  
  try {
    let url = ''
    if (botInfo.value.id) {
      url = '/bot/update'
    } else {
      url = '/bot/insert'
    }
    
    await request({
      url: url,
      method: 'get',
      params: {
        name: botInfoForm.name,
        botQQ: botInfoForm.botQQ
      }
    })
    
    ElMessage.success(botInfo.value.id ? '更新机器人信息成功' : '添加机器人信息成功')
    dialogVisible.value = false
    getBotInfo()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

const deleteBot = async () => {
  try {
    await request({
      url: '/bot/delete',
      method: 'get'
    })
    
    localStorage.removeItem('botQQ')
    ElMessage.success('删除机器人信息成功')
    getBotInfo()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

const navigateTo = (path) => {
  router.push(path)
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  getBotInfo()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="bot-info-view">
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
            v-if="botInfo.id"
            type="primary"
            @click="openBotDialog"
            :icon="Edit"
          >
            编辑信息
          </el-button>
          <el-button
            v-else
            type="primary"
            @click="openBotDialog"
            :icon="Plus"
          >
            添加机器人
          </el-button>
          <el-button
            v-if="botInfo.id"
            type="danger"
            @click="deleteBot"
            :icon="Delete"
          >
            删除机器人
          </el-button>
        </div>
      </div>
      
      <el-descriptions
        v-loading="loading"
        :column="2"
        border
        class="bot-info-descriptions"
      >
        <template v-if="botInfo.id">
          <el-descriptions-item label="机器人ID" prop="id">{{ botInfo.id }}</el-descriptions-item>
          <el-descriptions-item label="机器人名称" prop="name">{{ botInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="机器人QQ" prop="botQQ">{{ botInfo.botQQ }}</el-descriptions-item>
          <el-descriptions-item label="机器人状态" prop="isOnline">
            <el-tag :type="botInfo.isOnline ? 'success' : 'danger'">
              {{ botInfo.isOnline ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属用户ID" prop="userId" :span="2">{{ botInfo.userId }}</el-descriptions-item>
        </template>
        <template v-else>
          <el-descriptions-item label="提示" :span="2">
            <el-empty description="暂无机器人信息，请点击添加机器人按钮进行添加"></el-empty>
          </el-descriptions-item>
        </template>
      </el-descriptions>
      
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="500px"
      >
        <el-form
          ref="botInfoFormRef"
          :model="botInfoForm"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="机器人名称" prop="name">
            <el-input v-model="botInfoForm.name" placeholder="请输入机器人名称"></el-input>
          </el-form-item>
          <el-form-item label="机器人QQ" prop="botQQ">
            <el-input v-model="botInfoForm.botQQ" placeholder="请输入机器人QQ"></el-input>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitForm">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.bot-info-view {
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

.bot-info-descriptions {
  margin-top: 0;
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
  
  .bot-info-descriptions {
    font-size: 13px;
  }
  
  .content-section {
    padding: 16px;
  }
  
  .header-actions {
    gap: 8px;
  }
}
</style>
