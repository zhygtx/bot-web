<template>
  <div>
    <!-- 绘制正式连线 -->
    <svg class="connections" width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
        </marker>
      </defs>
      <!-- 实际的连线 -->
      <path 
        v-for="connection in connections" 
        :key="connection.id"
        :d="getConnectionPath(connection)"
        stroke="#409eff"
        stroke-width="2"
        marker-end="url(#arrowhead)"
      />
      <!-- 绘制临时连线 -->
      <line 
        v-if="tempConnection"
        :x1="getPortPosition(tempConnection.fromNode, 'right').x"
        :y1="getPortPosition(tempConnection.fromNode, 'right').y"
        :x2="tempConnection.toX || 0"
        :y2="tempConnection.toY || 0"
        stroke="#409eff"
        stroke-width="2"
        stroke-dasharray="5,5"
      />
      <!-- 绘制框选矩形 -->
      <rect 
        v-if="isSelecting"
        :x="Math.min(selectionStart.x, selectionEnd.x)"
        :y="Math.min(selectionStart.y, selectionEnd.y)"
        :width="Math.abs(selectionEnd.x - selectionStart.x)"
        :height="Math.abs(selectionEnd.y - selectionStart.y)"
        fill="rgba(64, 158, 255, 0.2)"
        stroke="#409eff"
        stroke-width="1"
        stroke-dasharray="2,2"
      />
    </svg>
    
    <!-- 连线的点击区域 -->
    <div 
      v-for="connection in connections" 
      :key="connection.id"
      class="connection-hitbox"
      :style="getConnectionHitboxStyle(connection)"
      @contextmenu="handleConnectionContextMenu($event, connection)"
    ></div>
  </div>
</template>

<script setup>
const props = defineProps({
  connections: {
    type: Array,
    default: () => []
  },
  tempConnection: {
    type: Object,
    default: null
  },
  isSelecting: {
    type: Boolean,
    default: false
  },
  selectionStart: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  selectionEnd: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  nodes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['connectionContextMenu'])

// 获取链接点位置
const getPortPosition = (nodeId, port) => {
  const node = props.nodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  
  const nodeWidth = 250 // 节点宽度
  let nodeHeight = 80 // 默认高度
  
  // 尝试获取节点的实际高度
  try {
    const nodeElement = document.querySelector(`.workflow-node[data-node-id="${nodeId}"]`)
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect()
      nodeHeight = rect.height
    }
  } catch (error) {
    // 如果获取失败，使用默认高度
  }
  
  const x = node.x + (port === 'left' ? 0 : nodeWidth)
  const y = node.y + nodeHeight / 2
  
  return { x, y }
}

// 获取连线路径
const getConnectionPath = (connection) => {
  const fromPos = getPortPosition(connection.fromNode, connection.fromPort)
  const toPos = getPortPosition(connection.toNode, connection.toPort)
  return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`
}

// 计算连线点击区域的样式
const getConnectionHitboxStyle = (connection) => {
  const fromPos = getPortPosition(connection.fromNode, connection.fromPort)
  const toPos = getPortPosition(connection.toNode, connection.toPort)
  
  // 计算连线的长度和角度
  const dx = toPos.x - fromPos.x
  const dy = toPos.y - fromPos.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  
  // 计算点击区域的中心点
  const centerX = (fromPos.x + toPos.x) / 2
  const centerY = (fromPos.y + toPos.y) / 2
  
  // 返回样式
  return {
    position: 'absolute',
    left: centerX - length / 2 + 'px',
    top: centerY - 10 + 'px', // 上下各留 10px 的点击区域
    width: length + 'px',
    height: '20px', // 点击区域的高度
    transform: `rotate(${angle}deg)`,
    transformOrigin: 'center',
    cursor: 'pointer',
    zIndex: 40 // 确保点击区域在节点下方，但在画布上方
  }
}

// 处理连线右键事件
const handleConnectionContextMenu = (e, connection) => {
  e.preventDefault()
  e.stopPropagation()
  emit('connectionContextMenu', e, connection)
}
</script>

<style scoped>
.connections {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 30;
}

.connection-hitbox {
  position: absolute;
  z-index: 40;
}
</style>