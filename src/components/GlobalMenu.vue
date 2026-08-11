<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Setting, Menu as IconMenu, ArrowRight, ArrowLeft, CaretRight } from '@element-plus/icons-vue'
import { menuItems } from '../config/menu.js'
import { useThemePreviewStore } from '../stores/themePreview'

const emit = defineEmits(['collapse-change'])

const route = useRoute()
const themePreviewStore = useThemePreviewStore()

const isCollapse = ref(false)
const activeMenu = computed(() => route.path)
const visibleMenuItems = computed(() => (
  themePreviewStore.active
    ? menuItems.filter(item => item.name !== 'themeStudio')
    : menuItems
))

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
      <template v-for="item in visibleMenuItems" :key="item.path">
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
