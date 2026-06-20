<template>
  <div 
    class="workflow-node"
    :class="[
      { 'node-selected': isSelected },
      executionStatus ? (executionStatus.failed ? 'node-failed' : 'node-success') : ''
    ]"
    :data-node-id="node.id"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    @mousedown.stop="handleNodeMouseDown"
    @mousemove="handleNodeMouseMove"
    @mouseup="handleNodeMouseUp"
    @mouseleave="handleNodeMouseLeave"
    @click.stop
    @contextmenu="handleNodeContextMenu"
    @dblclick="handleNodeDblClick"
  >
    <div class="node-body">
      <div 
        v-if="node.method && node.method.parameters && node.method.parameters.length > 0"
        class="node-dot node-dot-left"
        :class="{ 'node-dot-filled': isPortConnected(node.id, 'left') }"
        @mousedown="handlePortMouseDown($event, node, 'left')"
      ></div>
      <div class="node-content-inner">
        <div class="node-header">
          <span class="node-method-name">{{ getNodeName(node) }}</span>
        </div>
        <div v-if="node.method && node.method.description" class="node-description">
          {{ node.method.description }}
        </div>
        <div class="node-params">
          <span v-for="(param, index) in sortedParameters" :key="index" class="node-param">
            {{ param.type }} {{ param.name }}
          </span>
        </div>
        <div class="node-return">
          <span class="return-label">返回值:</span>
          <span class="return-type">{{ node.method ? node.method.returnType : 'void' }}</span>
        </div>
      </div>
      <div 
        v-if="node.method && (node.method.returnType && node.method.returnType !== 'void' || node.nodeType === 'botEvent' && node.eventType === 'scheduledEvent')"
        class="node-dot node-dot-right"
        :class="{ 'node-dot-filled': isPortConnected(node.id, 'right') }"
        @mousedown="handlePortMouseDown($event, node, 'right')"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  executionStatus: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'nodeMouseDown',
  'nodeMouseMove',
  'nodeMouseUp',
  'nodeMouseLeave',
  'nodeContextMenu',
  'nodeDblClick',
  'portMouseDown'
])

// 计算属性：排序后的参数
const sortedParameters = computed(() => {
  if (!props.node.method || !props.node.method.parameters) return []
  return [...props.node.method.parameters].sort((a, b) => {
    // 首先按照 order 字段排序
    const orderDiff = (a.order || 0) - (b.order || 0)
    if (orderDiff !== 0) {
      return orderDiff
    }
    // 如果 order 相同，按照参数名排序
    return a.name.localeCompare(b.name)
  })
})

// 获取节点名称
const getNodeName = (node) => {
  if (node.nodeType === 'botEvent') {
    return node.botEventName || 'BOT 事件'
  } else if (node.nodeType === 'botAction') {
    return node.botActionName || 'BOT 动作'
  } else {
    return node.method ? node.method.name : '未知方法'
  }
}

// 检查链接点是否已连接
const isPortConnected = (nodeId, port) => {
  // 这里需要从父组件传入，暂时留空
  return false
}

// 节点鼠标按下事件
const handleNodeMouseDown = (e) => {
  e.stopPropagation() // 阻止事件冒泡，避免触发画布拖动
  emit('nodeMouseDown', e, props.node)
}

// 节点鼠标移动事件
const handleNodeMouseMove = (e) => {
  emit('nodeMouseMove', e, props.node)
}

// 节点鼠标释放事件
const handleNodeMouseUp = (e) => {
  emit('nodeMouseUp', e, props.node)
}

// 节点鼠标离开事件
const handleNodeMouseLeave = (e) => {
  emit('nodeMouseLeave', e, props.node)
}

// 节点右键菜单事件
const handleNodeContextMenu = (e) => {
  e.preventDefault()
  e.stopPropagation()
  emit('nodeContextMenu', e, props.node)
}

// 节点双击事件
const handleNodeDblClick = () => {
  emit('nodeDblClick', props.node)
}

// 链接点鼠标按下事件
const handlePortMouseDown = (e, node, port) => {
  e.stopPropagation()
  emit('portMouseDown', e, node, port)
}
</script>

<style scoped>
/* 工作流节点样式 */
.workflow-node {
  position: absolute;
  min-width: 250px;
  width: 250px;
  z-index: 50;
  transition: none; /* 移除过渡效果，确保节点拖动时完全跟随鼠标 */
  cursor: grab;
}

.workflow-node:active {
  cursor: grabbing;
}

.workflow-node:hover:not(:active) {
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
/* 卡牌悬浮时圆点放大 + 右侧实心 */
.workflow-node:hover .node-dot {
  transform: scale(1.3);
}
.workflow-node:hover .node-dot-left {
  transform: translateY(-50%) scale(1.3);
}
.workflow-node:hover .node-dot-right {
  transform: translateY(-50%) scale(1.3);
  background-color: #409eff;
}

.node-body {
  background-color: white;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 80px;
  position: relative;
}

.node-content-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #409eff;
  border-radius: 50%;
  background-color: white;
  flex-shrink: 0;
  cursor: crosshair;
  transition: all 0.3s ease;
  z-index: 1;
}

.node-dot-left {
  left: -7px;
  top: 50%;
  transform: translateY(-50%);
}

.node-dot-right {
  right: -7px;
  top: 50%;
  transform: translateY(-50%);
}

.node-dot-filled {
  background-color: #409eff;
}

.node-header {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

.node-method-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.node-description {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-bottom: 4px;
  line-height: 1.3;
  max-height: 2.6em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.node-params {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  font-family: 'Courier New', monospace;
}

.node-param {
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e6e6e6;
}

.node-return {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.return-label {
  font-size: 11px;
  color: #909399;
}

.return-type {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
}

.node-selected :deep(.node-body) {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3) !important;
}

/* 执行状态边框 */
.node-success :deep(.node-body) {
  border-color: #67c23a !important;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.3) !important;
}

.node-failed :deep(.node-body) {
  border-color: #f56c6c !important;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.3) !important;
}

/* 已选 + 执行状态 不覆盖 */
.node-success.node-selected :deep(.node-body) {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3) !important;
}

.node-failed.node-selected :deep(.node-body) {
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3) !important;
}
</style>