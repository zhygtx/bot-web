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
  <div class="user-layout">
    <!-- 侧边栏 -->
    <el-aside :width="'auto'" class="user-layout-aside">
      <GlobalMenu />
    </el-aside>
    
    <!-- 主内容区域 -->
    <el-main class="user-layout-main">
      <router-view />
    </el-main>
  </div>
</template>

<style scoped>
.user-layout {
  display: flex;
  height: 100vh;
  background-color: #f5f7fa;
}

.user-layout-aside {
  background-color: #304156;
  color: white;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
  transition: width 0.3s;
  position: relative;
  overflow: hidden;
}

.aside-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  background-color: #263445;
  border-bottom: 1px solid #404e67;
}

.aside-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.menu-icon {
  font-size: 20px;
  color: white;
}

.user-layout-menu {
  border-right: none;
  background-color: #304156;
}

.user-layout-menu .el-menu-item {
  color: #bfcbd9;
  height: 56px;
  line-height: 56px;
}

.user-layout-menu .el-menu-item:hover {
  background-color: #263445;
  color: #409eff;
}

.user-layout-menu .el-menu-item.is-active {
  background-color: #263445;
  color: #409eff;
  border-right: 3px solid #409eff;
}

.collapse-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #263445;
  color: #bfcbd9;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.collapse-btn:hover {
  background-color: #409eff;
  color: white;
}

.user-layout-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
