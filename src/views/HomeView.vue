<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { User, ArrowDown, Setting } from '@element-plus/icons-vue'

// 获取路由实例
const router = useRouter()

// 获取用户状态管理
const userStore = useUserStore()

// 退出登录
const handleLogout = async () => {
  try {
    // 调用退出登录接口
    // await request({
    //   url: '/user/logout',
    //   method: 'post',
    //   params: {
    //     userId: userStore.userId
    //   }
    // })
    
    // 清除用户信息
    userStore.logout()
    
    // 显示成功消息
    ElMessage.success('退出登录成功')
    
    // 跳转到登录页
    router.push('/login')
  } catch (error) {
    // 显示错误消息
    ElMessage.error(error.message || '退出登录失败')
  }
}
</script>

<template>
  <div class="home-container">
    <!-- 顶部导航栏 -->
    <el-header class="home-header">
      <div class="header-left">
        <h1>QQbot匹配回复规则系统</h1>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-info">
            <el-icon class="user-icon"><User /></el-icon>
            {{ userStore.name }}
            <el-icon class="arrow-down"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/user/profile')">个人中心</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    
    <!-- 主体内容 -->
    <el-main class="home-main">
      <el-card class="welcome-card">
        <template #header>
          <div class="card-header">
            <span>欢迎使用</span>
          </div>
        </template>
        <div class="welcome-content">
          <h2>您好，{{ userStore.name }}！</h2>
          <p>欢迎使用QQbot系统，您可以在这里管理您的机器人和用户信息。</p>
          <el-divider></el-divider>
          <div class="function-cards">
            <el-card class="function-card">
              <template #header>
                <div class="function-card-header">
                  <el-icon><Setting /></el-icon>
                  <span>机器人管理</span>
                </div>
              </template>
              <div class="function-card-content">
                <p>管理机器人的基本信息和Docker相关操作。</p>
                <el-button type="primary" size="small" @click="router.push('/bot/info')">管理机器人</el-button>
              </div>
            </el-card>
            
            <el-card class="function-card">
              <template #header>
                <div class="function-card-header">
                  <el-icon><User /></el-icon>
                  <span>用户管理</span>
                </div>
              </template>
              <div class="function-card-content">
                <p>管理用户信息，包括修改密码、邮箱等。</p>
                <el-button type="primary" size="small" @click="router.push('/user/profile')">管理用户</el-button>
              </div>
            </el-card>
          </div>
        </div>
      </el-card>
    </el-main>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #409eff;
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  font-size: 20px;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-icon {
  margin-right: 8px;
}

.arrow-down {
  margin-left: 4px;
}

.home-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f5f7fa;
}

.welcome-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-content {
  text-align: center;
  padding: 40px 0;
}

.welcome-content h2 {
  font-size: 28px;
  margin-bottom: 20px;
  color: #303133;
}

.welcome-content p {
  font-size: 16px;
  color: #606266;
  margin-bottom: 40px;
}

.function-cards {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.function-card {
  width: 300px;
  min-height: 200px;
}

.function-card-header {
  display: flex;
  align-items: center;
}

.function-card-header .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.function-card-content {
  padding: 20px 0;
}

.function-card-content p {
  margin-bottom: 20px;
  color: #606266;
}
</style>
