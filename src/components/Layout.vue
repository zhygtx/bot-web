<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import GlobalMenu from './GlobalMenu.vue'
import GlobalThemeEditor from './GlobalThemeEditor.vue'
import MobileNavBar from './MobileNavBar.vue'
import ThemeToggle from './ThemeToggle.vue'

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
      currentPath !== '/plugin/create' &&
      currentPath !== '/plugin/ai-list' &&
      currentPath !== '/plugin/ai-create') {
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
  if (showMobileNav.value) return '76px'
  if (isFullscreen.value) return '0'
  return '20px'
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
            <ThemeToggle />
            <slot name="header-actions"></slot>
          </div>
        </div>
      </el-header>
      
      <el-header v-if="isMobile && !showSidebar" class="layout-header-mobile">
        <div class="header-content-mobile">
          <span class="header-title-mobile">{{ $route.meta.title || '系统管理' }}</span>
          <div class="header-actions-mobile">
            <ThemeToggle />
          </div>
        </div>
      </el-header>
      
      <el-main class="layout-content" :style="{ paddingBottom: contentPaddingBottom }">
        <router-view />
      </el-main>
    </el-container>
    
    <MobileNavBar v-if="showMobileNav" />
    <GlobalThemeEditor />
  </el-container>
</template>
