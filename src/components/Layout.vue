<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import GlobalMenu from './GlobalMenu.vue'

const route = useRoute()
const sidebarCollapsed = ref(false)
const sidebarWidth = computed(() => sidebarCollapsed.value ? '64px' : '200px')

// 判断是否需要显示侧边栏
const showSidebar = computed(() => {
  const noSidebarRoutes = ['/', '/home', '/login', '/register', '/forgot-password']
  const currentPath = route.path
  
  // 工作流编辑/新建页面
  if (currentPath.startsWith('/workflow/edit')) {
    return false
  }
  
  // 插件详情页面（/plugin/:id）- 排除列表页 /plugin/list 和创建页 /plugin/create
  if (currentPath.match(/^\/plugin\/[^/]+$/) && 
      currentPath !== '/plugin/list' && 
      currentPath !== '/plugin/create') {
    return false
  }
  
  return !noSidebarRoutes.includes(currentPath)
})

// 判断是否是全屏页面
const isFullscreen = computed(() => {
  return !showSidebar.value
})
</script>

<template>
  <el-container class="layout-container" :class="{ 'fullscreen': isFullscreen }">
    <!-- 侧边栏 -->
    <el-aside v-if="showSidebar" :width="sidebarWidth" class="layout-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <el-scrollbar class="sidebar-scrollbar">
        <GlobalMenu @collapse-change="sidebarCollapsed = $event" />
      </el-scrollbar>
    </el-aside>
    
    <!-- 主内容区域 -->
    <el-container class="layout-main-container">
      <!-- 顶部导航栏（仅在有侧边栏时显示） -->
      <el-header v-if="showSidebar" class="layout-header">
        <div class="header-content">
          <div class="header-title">
            <span>{{ $route.meta.title || '系统管理' }}</span>
          </div>
          <div class="header-actions">
            <slot name="header-actions"></slot>
          </div>
        </div>
      </el-header>
      
      <!-- 主内容区 -->
      <el-main class="layout-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-container.fullscreen {
  display: flex;
}

.layout-container.fullscreen .layout-main-container {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.layout-container.fullscreen .layout-content {
  padding: 0;
  overflow: hidden;
}

.layout-aside {
  background-color: #304156;
  color: #bfcbd9;
  border-right: 1px solid #404e67;
  transition: width 0.3s ease;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-scrollbar {
  height: 100%;
}

.layout-main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  min-height: 0;
}

.layout-header {
  position: relative;
  background-color: #ffffff;
  color: #303133;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.layout-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  min-height: 0;
}
</style>
