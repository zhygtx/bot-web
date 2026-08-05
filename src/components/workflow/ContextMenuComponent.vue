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

