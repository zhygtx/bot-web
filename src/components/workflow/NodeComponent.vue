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

