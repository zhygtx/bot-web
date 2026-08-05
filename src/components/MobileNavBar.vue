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
  { path: '/settings', label: '配置', icon: Setting }
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

