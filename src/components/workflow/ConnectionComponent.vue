<template>
  <div>
    <!-- 绘制正式连线 -->
    <svg class="connections" :width="svgWidth" :height="svgHeight" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
        </marker>
      </defs>
      <!-- 实际的连线 -->
      <path 
        v-for="(path, id) in connectionPaths" 
        :key="id"
        :d="path"
        stroke="#409eff"
        stroke-width="2"
        marker-end="url(#arrowhead)"
        class="connection-path"
      />
      <!-- 绘制临时连线 -->
      <path 
        v-if="tempConnectionPath"
        :d="tempConnectionPath"
        stroke="#409eff"
        stroke-width="2"
        stroke-dasharray="5,5"
        class="temp-connection-path"
      />
      <!-- 绘制框选矩形 -->
      <rect 
        v-if="isSelecting"
        :x="selectionRect.x"
        :y="selectionRect.y"
        :width="selectionRect.width"
        :height="selectionRect.height"
        fill="rgba(64, 158, 255, 0.2)"
        stroke="#409eff"
        stroke-width="1"
        stroke-dasharray="2,2"
      />
    </svg>
    
    <!-- 连线的点击区域 -->
    <div 
      v-for="(hitbox, id) in connectionHitboxes" 
      :key="id"
      class="connection-hitbox"
      :style="hitbox"
      @contextmenu="handleConnectionContextMenu($event, id)"
    ></div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'

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

const NODE_WIDTH = 250
const DEFAULT_NODE_HEIGHT = 80
const HITBOX_PADDING = 10

const nodeHeightCache = ref({})
let cacheUpdateTimer = null

const updateNodeHeightCache = () => {
  if (cacheUpdateTimer) return
  cacheUpdateTimer = setTimeout(() => {
    props.nodes.forEach(node => {
      if (!nodeHeightCache.value[node.id] || Date.now() - (nodeHeightCache.value[node.id].time || 0) > 1000) {
        try {
          const nodeElement = document.querySelector(`.workflow-node[data-node-id="${node.id}"]`)
          if (nodeElement) {
            // 使用 offsetHeight（布局尺寸，不受 CSS transform/zoom 影响）
            nodeHeightCache.value[node.id] = {
              height: nodeElement.offsetHeight,
              time: Date.now()
            }
          }
        } catch (e) {
          // ignore
        }
      }
    })
    cacheUpdateTimer = null
  }, 50)
}

const BEZIER_OFFSET = 80

// 生成贝塞尔曲线路径
const buildBezierPath = (fromX, fromY, toX, toY) => {
  const dx = Math.abs(toX - fromX)
  const offset = Math.max(dx * 0.5, BEZIER_OFFSET)
  // 控制点沿水平方向延伸，使曲线平滑弯曲
  const cp1x = fromX + offset
  const cp1y = fromY
  const cp2x = toX - offset
  const cp2y = toY
  return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`
}

const getNodeHeight = (node) => {
  const cached = nodeHeightCache.value[node.id]
  if (cached) {
    return cached.height
  }
  return node.nodeHeight || DEFAULT_NODE_HEIGHT
}

const getPortPosition = (nodeId, port) => {
  const node = props.nodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  
  const nodeHeight = getNodeHeight(node)
  const x = node.x + (port === 'left' ? 0 : NODE_WIDTH)
  const y = node.y + nodeHeight / 2
  
  return { x, y }
}

const portPositions = computed(() => {
  const positions = {}
  props.nodes.forEach(node => {
    const height = getNodeHeight(node)
    positions[node.id] = {
      left: { x: node.x, y: node.y + height / 2 },
      right: { x: node.x + NODE_WIDTH, y: node.y + height / 2 }
    }
  })
  return positions
})

const connectionPaths = computed(() => {
  const paths = {}
  props.connections.forEach(conn => {
    const fromPos = portPositions.value[conn.fromNode]?.[conn.fromPort] || { x: 0, y: 0 }
    const toPos = portPositions.value[conn.toNode]?.[conn.toPort] || { x: 0, y: 0 }
    paths[conn.id] = buildBezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y)
  })
  return paths
})

const tempConnectionPath = computed(() => {
  if (!props.tempConnection) return null
  const fromPos = portPositions.value[props.tempConnection.fromNode]?.[props.tempConnection.fromPort]
  if (!fromPos) return null
  const toX = props.tempConnection.toX || 0
  const toY = props.tempConnection.toY || 0
  return buildBezierPath(fromPos.x, fromPos.y, toX, toY)
})

const connectionHitboxes = computed(() => {
  const hitboxes = {}
  props.connections.forEach(conn => {
    const fromPos = portPositions.value[conn.fromNode]?.[conn.fromPort] || { x: 0, y: 0 }
    const toPos = portPositions.value[conn.toNode]?.[conn.toPort] || { x: 0, y: 0 }
    
    const dx = toPos.x - fromPos.x
    const dy = toPos.y - fromPos.y
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    
    const centerX = (fromPos.x + toPos.x) / 2
    const centerY = (fromPos.y + toPos.y) / 2
    
    hitboxes[conn.id] = {
      position: 'absolute',
      left: centerX - length / 2 + 'px',
      top: centerY - HITBOX_PADDING + 'px',
      width: length + 'px',
      height: HITBOX_PADDING * 2 + 'px',
      transform: `rotate(${angle}deg)`,
      transformOrigin: 'center',
      cursor: 'pointer',
      zIndex: 40
    }
  })
  return hitboxes
})

const selectionRect = computed(() => {
  const x = Math.min(props.selectionStart.x, props.selectionEnd.x)
  const y = Math.min(props.selectionStart.y, props.selectionEnd.y)
  return {
    x,
    y,
    width: Math.abs(props.selectionEnd.x - props.selectionStart.x),
    height: Math.abs(props.selectionEnd.y - props.selectionStart.y)
  }
})

const svgWidth = computed(() => {
  return Math.max(...props.nodes.map(n => n.x + NODE_WIDTH), 4000)
})

const svgHeight = computed(() => {
  return Math.max(...props.nodes.map(n => n.y + getNodeHeight(n)), 3000)
})
// 监听节点变化，更新尺寸缓存
watch(() => props.nodes, () => {
  updateNodeHeightCache()
}, { deep: true })

const handleConnectionContextMenu = (e, connectionId) => {
  e.preventDefault()
  e.stopPropagation()
  const connection = props.connections.find(c => c.id === connectionId)
  if (connection) {
    emit('connectionContextMenu', e, connection)
  }
}

onMounted(() => {
  updateNodeHeightCache()
})

onUnmounted(() => {
  if (cacheUpdateTimer) {
    clearTimeout(cacheUpdateTimer)
  }
})
</script>

<style scoped>
.connections {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 30;
}

.connection-path {
  fill: none;
  transition: none;
}

.temp-connection-path {
  fill: none;
  transition: none;
}

.connection-hitbox {
  position: absolute;
  z-index: 40;
}
</style>