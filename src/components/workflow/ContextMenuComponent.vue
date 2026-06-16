<template>
  <div 
    v-if="showContextMenu" 
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div v-if="target === 'node'" class="context-menu-items">
      <!-- 单个节点时显示所有选项 -->
      <template v-if="selectedNodes.length === 1">
        <div class="context-menu-item" @click="handleCopySelectedNodes">复制</div>
      </template>
      <!-- 多个节点时只显示批量操作选项 -->
      <div class="context-menu-item" @click="handleDeleteSelectedNodes">删除</div>
      <div class="context-menu-item" @click="handleDisconnectSelectedNodes">解除连线</div>
    </div>
    <div v-else-if="target === 'canvas'" class="context-menu-items">
      <div class="context-menu-item" @click="handleClearCanvas">清空画布</div>
    </div>
    <div v-else-if="target === 'connection'" class="context-menu-items">
      <div class="context-menu-item" @click="handleDeleteSelectedConnection">删除连线</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showContextMenu: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  target: {
    type: String,
    default: '' // 'node', 'canvas', 'connection'
  },
  selectedNodes: {
    type: Array,
    default: () => []
  },
  selectedConnection: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'deleteSelectedNodes',
  'copySelectedNodes',
  'disconnectSelectedNodes',
  'clearCanvas',
  'deleteSelectedConnection'
])

// 处理删除选中的节点
const handleDeleteSelectedNodes = () => {
  emit('deleteSelectedNodes')
}

// 处理复制选中的节点
const handleCopySelectedNodes = () => {
  emit('copySelectedNodes')
}

// 处理解除选中节点的连线
const handleDisconnectSelectedNodes = () => {
  emit('disconnectSelectedNodes')
}

// 处理清空画布
const handleClearCanvas = () => {
  emit('clearCanvas')
}

// 处理删除选中的连线
const handleDeleteSelectedConnection = () => {
  emit('deleteSelectedConnection')
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
  overflow: hidden;
}

.context-menu-items {
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.context-menu-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.context-menu-item:active {
  background-color: #ecf5ff;
}
</style>