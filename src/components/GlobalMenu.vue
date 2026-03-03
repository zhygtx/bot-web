<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, User, Setting, Menu as IconMenu, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { menuItems } from '../config/menu.js'

// 获取路由实例
const router = useRouter()
const route = useRoute()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 当前激活的菜单项
const activeMenu = computed(() => {
  return route.path
})


</script>

<template>
  <div class="global-menu">
    <!-- 菜单标题 -->
    <div class="menu-header">
      <h3 v-if="!isCollapse" class="menu-title">机器人管理系统</h3>
      <el-icon class="menu-icon"><IconMenu /></el-icon>
    </div>
    
    <!-- 菜单内容 -->
    <el-menu
      :collapse="isCollapse"
      :default-active="activeMenu"
      class="el-menu-vertical-demo global-menu-content"
      router
    >
      <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon v-if="item.name === 'home'" class="menu-item-icon"><Document /></el-icon>
          <el-icon v-else-if="item.name === 'role' || item.name === 'userProfile'" class="menu-item-icon"><User /></el-icon>
          <el-icon v-else class="menu-item-icon"><Setting /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
    </el-menu>
    
    <!-- 折叠按钮 -->
    <div class="collapse-btn" @click="isCollapse = !isCollapse">
      <el-icon><ArrowRight v-if="isCollapse" /><ArrowLeft v-else /></el-icon>
    </div>
  </div>
</template>

<style scoped>
.global-menu {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #304156;
  color: white;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  overflow: hidden;
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  background-color: #263445;
  border-bottom: 1px solid #404e67;
}

.menu-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.menu-icon {
  font-size: 20px;
  color: white;
}

.global-menu-content {
  border-right: none;
  background-color: #304156;
  flex: 1;
  overflow-y: auto;
}

.global-menu-content .el-menu-item {
  color: #bfcbd9;
  height: 56px;
  line-height: 56px;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.menu-item-icon {
  font-size: 18px;
  vertical-align: middle;
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.el-menu--collapse .menu-item-icon {
  margin-right: 0;
}

.global-menu-content .el-menu-item:hover {
  background-color: #263445;
  color: #409eff;
}

.global-menu-content .el-menu-item.is-active {
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
</style>