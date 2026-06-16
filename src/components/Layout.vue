<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import GlobalMenu from './GlobalMenu.vue'
import MobileNavBar from './MobileNavBar.vue'

const route = useRoute()
const sidebarCollapsed = ref(false)
const sidebarWidth = computed(() => sidebarCollapsed.value ? '64px' : '200px')
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const showSidebar = computed(() => {
  if (isMobile.value) return false
  
  const noSidebarRoutes = ['/', '/login', '/register', '/forgot-password']
  const currentPath = route.path
  
  if (currentPath.startsWith('/workflow/edit')) {
    return false
  }
  
  if (currentPath.match(/^\/plugin\/[^/]+$/) && 
      currentPath !== '/plugin/list' && 
      currentPath !== '/plugin/create') {
    return false
  }
  
  return !noSidebarRoutes.includes(currentPath)
})

const isFullscreen = computed(() => {
  return !showSidebar.value
})

const showMobileNav = computed(() => {
  if (!isMobile.value) return false
  
  const noNavRoutes = ['/login', '/register', '/forgot-password']
  return !noNavRoutes.includes(route.path)
})

const contentPaddingBottom = computed(() => {
  return showMobileNav.value ? '76px' : '20px'
})
</script>

<template>
  <el-container class="layout-container" :class="{ 'fullscreen': isFullscreen, 'mobile': isMobile }">
    <el-aside v-if="showSidebar" :width="sidebarWidth" class="layout-aside" :class="{ 'is-collapsed': sidebarCollapsed }">
      <el-scrollbar class="sidebar-scrollbar">
        <GlobalMenu @collapse-change="sidebarCollapsed = $event" />
      </el-scrollbar>
    </el-aside>
    
    <el-container class="layout-main-container">
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
      
      <el-header v-if="isMobile && !showSidebar" class="layout-header-mobile">
        <div class="header-content-mobile">
          <span class="header-title-mobile">{{ $route.meta.title || '系统管理' }}</span>
        </div>
      </el-header>
      
      <el-main class="layout-content" :style="{ paddingBottom: contentPaddingBottom }">
        <router-view />
      </el-main>
    </el-container>
    
    <MobileNavBar v-if="showMobileNav" />
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

.layout-container.mobile .layout-main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.layout-header-mobile {
  position: relative;
  background-color: #2563eb;
  color: #ffffff;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-content-mobile {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
}

.header-title-mobile {
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
  overflow-x: hidden;
  min-height: 0;
}

@media (max-width: 767px) {
  .layout-content {
    padding: 16px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    height: 0;
    flex: 1;
  }
}
</style>