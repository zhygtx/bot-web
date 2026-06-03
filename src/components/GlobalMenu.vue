<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Setting, Menu as IconMenu, ArrowRight, ArrowLeft, CaretRight } from '@element-plus/icons-vue'
import { menuItems } from '../config/menu.js'

const emit = defineEmits(['collapse-change'])

const route = useRoute()

const isCollapse = ref(false)
const activeMenu = computed(() => route.path)

const hasChildren = (item) => item.children && item.children.length > 0

const getIcon = (item) => {
  return item.icon || Setting
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
  emit('collapse-change', isCollapse.value)
}
</script>

<template>
  <div class="global-menu-wrapper">
    <div class="menu-header">
      <h3 v-if="!isCollapse" class="menu-title">机器人管理系统</h3>
      <el-icon class="menu-icon"><IconMenu /></el-icon>
    </div>
    
    <el-menu
      :collapse="isCollapse"
      :default-active="activeMenu"
      class="global-menu"
      router
      mode="vertical"
    >
      <template v-for="item in menuItems" :key="item.path">
        <el-sub-menu v-if="hasChildren(item)" :index="item.path">
          <template #title>
            <el-icon class="menu-item-icon"><component :is="getIcon(item)" /></el-icon>
            <span>{{ item.label }}</span>
            <el-icon class="submenu-arrow"><CaretRight /></el-icon>
          </template>
          <el-menu-item
            v-for="child in item.children"
            :key="child.path"
            :index="child.path"
          >
            <el-icon v-if="child.icon" class="submenu-item-icon"><component :is="child.icon" /></el-icon>
            <span class="submenu-item-text">{{ child.label }}</span>
          </el-menu-item>
        </el-sub-menu>
        
        <el-menu-item v-else :index="item.path">
          <el-icon class="menu-item-icon"><component :is="getIcon(item)" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </template>
    </el-menu>
    
    <div class="collapse-btn" @click="toggleCollapse">
      <el-icon><ArrowRight v-if="isCollapse" /><ArrowLeft v-else /></el-icon>
    </div>
  </div>
</template>

<style scoped>
.global-menu-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e3a5f;
  overflow: hidden;
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  background: linear-gradient(135deg, #4a90d9 0%, #2563eb 50%, #1d4ed8 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  position: relative;
}

.menu-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
}

.menu-title {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: white;
  letter-spacing: 1.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.menu-icon {
  font-size: 20px;
  color: white;
}

.global-menu {
  border-right: none;
  background-color: transparent;
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.global-menu::-webkit-scrollbar {
  width: 6px;
}

.global-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.global-menu::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.global-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

:deep(.global-menu .el-menu-item) {
  color: #a5b4c4;
  height: 44px;
  line-height: 44px;
  font-size: 13px;
  margin: 4px 8px;
  border-radius: 6px;
  transition: all 0.25s ease;
  padding-left: 20px !important;
  border: 1px solid transparent;
}

:deep(.global-menu.el-menu--collapse) {
  width: 64px;
}

:deep(.global-menu.el-menu--collapse .el-menu-item),
:deep(.global-menu.el-menu--collapse .el-sub-menu__title) {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px 8px;
  padding-left: 0 !important;
  padding-right: 0 !important;
  position: relative;
  width: calc(100% - 16px);
}

:deep(.global-menu.el-menu--collapse .el-menu-item > span),
:deep(.global-menu.el-menu--collapse .el-sub-menu__title > span:not(.el-icon)) {
  display: none !important;
}

:deep(.global-menu.el-menu--collapse .el-menu-item > .menu-item-icon),
:deep(.global-menu.el-menu--collapse .el-sub-menu__title > .menu-item-icon) {
  display: inline-flex;
  position: absolute;
  left: 50%;
  top: 50%;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin: 0 !important;
  padding: 0;
  flex: none;
  transform: translate(-50%, -50%);
}

:deep(.global-menu.el-menu--collapse .el-menu-item > .menu-item-icon svg),
:deep(.global-menu.el-menu--collapse .el-sub-menu__title > .menu-item-icon svg) {
  display: block;
  width: 18px;
  height: 18px;
  margin: 0 auto;
}

:deep(.global-menu.el-menu--collapse .submenu-arrow) {
  display: none;
}

:deep(.global-menu .el-menu-item:hover) {
  background: rgba(74, 144, 217, 0.15);
  color: #cfe2ff;
  border-color: rgba(74, 144, 217, 0.2);
}

:deep(.global-menu .el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(191, 219, 254, 0.2) 0%, rgba(147, 197, 253, 0.15) 100%);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
}

:deep(.global-menu .el-sub-menu) {
  background-color: transparent;
}

:deep(.global-menu .el-sub-menu .el-sub-menu__icon-arrow) {
  display: none;
}

:deep(.global-menu .el-sub-menu__title) {
  color: #a5b4c4;
  height: 44px;
  line-height: 44px;
  font-size: 13px;
  margin: 4px 8px;
  border-radius: 6px;
  transition: all 0.25s ease;
  padding-left: 20px !important;
  padding-right: 32px !important;
  border: 1px solid transparent;
  position: relative;
}

:deep(.global-menu .el-sub-menu__title:hover) {
  background: rgba(74, 144, 217, 0.15);
  color: #cfe2ff;
  border-color: rgba(74, 144, 217, 0.2);
}

:deep(.global-menu .el-sub-menu.is-active > .el-sub-menu__title),
:deep(.global-menu .el-sub-menu.is-opened > .el-sub-menu__title) {
  background: rgba(59, 130, 246, 0.1);
  color: #a5b4c4;
  border-color: rgba(59, 130, 246, 0.3);
}

:deep(.global-menu .el-sub-menu.is-active > .el-sub-menu__title .el-sub-menu__icon-arrow),
:deep(.global-menu .el-sub-menu.is-opened > .el-sub-menu__title .el-sub-menu__icon-arrow) {
  display: none;
}

.submenu-arrow {
  position: absolute;
  right: 16px;
  font-size: 12px;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

:deep(.global-menu .el-sub-menu.is-opened) .submenu-arrow {
  transform: rotate(90deg);
}

:deep(.global-menu .el-menu-item-group) {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin: 4px 8px;
  overflow: hidden;
}

:deep(.global-menu .el-menu-item-group__title) {
  padding: 8px 20px;
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 4px;
}

:deep(.global-menu .el-sub-menu .el-menu) {
  background: transparent;
}

:deep(.global-menu .el-sub-menu .el-menu-item) {
  justify-content: center;
  padding-left: 20px !important;
  padding-right: 20px !important;
  margin: 4px 8px;
  height: 40px;
  line-height: 40px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: #94a3b8;
  text-align: center;
}

:deep(.global-menu .el-sub-menu .el-menu-item:hover) {
  background: rgba(74, 144, 217, 0.15);
  color: #cbd5e1;
}

:deep(.global-menu .el-sub-menu .el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(191, 219, 254, 0.2) 0%, rgba(147, 197, 253, 0.15) 100%);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.4);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
}

.submenu-item-text {
  font-size: 13px;
}

.submenu-item-icon {
  margin-right: 8px;
  font-size: 14px;
}

.collapse-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.15);
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.collapse-btn:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-color: #3b82f6;
  transform: translateX(-50%) scale(1.1);
}
</style>
