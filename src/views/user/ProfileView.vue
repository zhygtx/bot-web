<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Cpu, User, SwitchButton } from '@element-plus/icons-vue'
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
    console.error('获取用户信息失败:', error)
  } finally {
    loading.value = false
  }
}

const navigateTo = (path) => {
  router.push(path)
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    router.push('/login')
  } catch {
    // 用户取消
  }
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
      <div class="logout-section">
        <el-button type="danger" :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
      </div>
    </div>
  </div>
</template>

