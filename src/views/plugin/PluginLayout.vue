<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlobalMenu from '../../components/GlobalMenu.vue'

// 获取路由实例
const router = useRouter()
const route = useRoute()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 当前激活的菜单项
const activeMenu = computed(() => {
  return route.name
})

// 处理菜单点击
const handleMenuClick = (path) => {
  router.push(path)
}
</script>

<template>
  <div class="plugin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="'auto'" class="plugin-layout-aside">
      <GlobalMenu />
    </el-aside>
    
    <!-- 主内容区域 -->
    <el-main class="plugin-layout-main">
      <router-view />
    </el-main>
  </div>
</template>

<style scoped>
.plugin-layout {
  display: flex;
  height: 100vh;
  background-color: #f5f7fa;
}

.plugin-layout-aside {
  background-color: #304156;
  color: white;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
  transition: width 0.3s;
  position: relative;
  overflow: hidden;
}

.plugin-layout-main {
  flex: 1;
  padding: 0;
  overflow-y: hidden;
}
</style>