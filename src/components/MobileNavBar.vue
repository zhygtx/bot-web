<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Connection, Clock, Operation, User, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/workflow/list', label: '工作流', icon: Connection },
  { path: '/workflow/log', label: '执行日志', icon: Clock },
  { path: '/plugin/list', label: '插件管理', icon: Operation },
  { path: '/bot/settings', label: '配置', icon: Setting }
]

const activePath = computed(() => route.path)

const isActive = (path) => {
  if (path === '/workflow/list') {
    return route.path.startsWith('/workflow') && route.path !== '/workflow/log'
  }
  return activePath.value === path
}

const navigate = (path) => {
  router.push(path)
}
</script>

<template>
  <nav class="mobile-nav-bar">
    <div
      v-for="item in navItems"
      :key="item.path"
      class="nav-item"
      :class="{ active: isActive(item.path) }"
      @click="navigate(item.path)"
    >
      <el-icon class="nav-icon">
        <component :is="item.icon" />
      </el-icon>
      <span class="nav-label">{{ item.label }}</span>
    </div>
  </nav>
</template>

<style scoped>
.mobile-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  transition: all 0.2s ease;
  color: #909399;
}

.nav-item.active {
  color: #2563eb;
}

.nav-icon {
  font-size: 22px;
  margin-bottom: 4px;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-label {
  font-size: 12px;
}
</style>