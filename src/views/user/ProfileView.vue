<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Cpu, Monitor, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import request from '../../utils/request'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const isMobile = ref(false)

const userInfo = ref({
  id: '',
  account: '',
  name: '',
  email: '',
  QQ: null,
  botQQ: null,
  userRole: '',
  createTime: '',
  updateTime: ''
})

const menuItems = [
  { path: '/bot/info', label: '机器人管理', icon: Cpu },
  { path: '/bot/docker', label: 'Docker管理', icon: Monitor },
  { path: '/user/profile', label: '我的信息', icon: User, active: true }
]

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const getUserInfo = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/user/info',
      method: 'get'
    })
    userInfo.value = response.data
  } catch (error) {
    ElMessage.error(error.message || '获取用户信息失败')
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
  getUserInfo()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="profile-view">
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
      <el-descriptions
        v-loading="loading"
        :column="2"
        border
        class="profile-descriptions"
      >
        <el-descriptions-item label="账号" prop="account">{{ userInfo.account }}</el-descriptions-item>
        <el-descriptions-item label="用户名" prop="name">{{ userInfo.name }}</el-descriptions-item>
        <el-descriptions-item label="邮箱" prop="email">{{ userInfo.email }}</el-descriptions-item>
        <el-descriptions-item label="QQ号" prop="QQ">{{ userInfo.QQ }}</el-descriptions-item>
        <el-descriptions-item label="机器人QQ" prop="botQQ">{{ userInfo.botQQ || '未绑定' }}</el-descriptions-item>
        <el-descriptions-item label="用户角色" prop="userRole">{{ userInfo.userRole || '普通用户' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" prop="createTime">{{ userInfo.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间" prop="updateTime">{{ userInfo.updateTime }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
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

.section-title {
  font-size: 20px;
  margin: 0 0 20px 0;
  color: #303133;
  font-weight: bold;
}

.profile-descriptions {
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
  
  .section-title {
    font-size: 18px;
  }
  
  .profile-descriptions {
    font-size: 13px;
  }
  
  .content-section {
    padding: 16px;
  }
}
</style>
