<template>
  <div>
    <!-- 绘制正式连线 -->
    <svg class="connections" :width="svgWidth" :height="svgHeight" :style="{ position: 'absolute', top: svgMinY + 'px', left: svgMinX + 'px', pointerEvents: 'none', overflow: 'visible' }">
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
      <!-- 贝塞尔曲线点击区域（粗透明线条） -->
      <path
        v-for="(path, id) in connectionPaths"
        :key="'hitbox-' + id"
        :d="path"
        stroke="transparent"
        stroke-width="20"
        fill="none"
        class="connection-hitbox-path"
        @contextmenu="handleConnectionContextMenu($event, id)"
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
  const offsetX = svgMinX.value
  const offsetY = svgMinY.value
  props.nodes.forEach(node => {
    const height = getNodeHeight(node)
    positions[node.id] = {
      left: { x: node.x - offsetX, y: node.y + height / 2 - offsetY },
      right: { x: node.x + NODE_WIDTH - offsetX, y: node.y + height / 2 - offsetY }
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
  const toX = (props.tempConnection.toX || 0) - svgMinX.value
  const toY = (props.tempConnection.toY || 0) - svgMinY.value
  return buildBezierPath(fromPos.x, fromPos.y, toX, toY)
})

const selectionRect = computed(() => {
  const x = Math.min(props.selectionStart.x, props.selectionEnd.x) - svgMinX.value
  const y = Math.min(props.selectionStart.y, props.selectionEnd.y) - svgMinY.value
  return {
    x,
    y,
    width: Math.abs(props.selectionEnd.x - props.selectionStart.x),
    height: Math.abs(props.selectionEnd.y - props.selectionStart.y)
  }
})

const boundingBox = computed(() => {
  if (props.nodes.length === 0) return { minX: 0, minY: 0, maxX: 4000, maxY: 3000 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  props.nodes.forEach(n => {
    const h = getNodeHeight(n)
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x + NODE_WIDTH > maxX) maxX = n.x + NODE_WIDTH
    if (n.y + h > maxY) maxY = n.y + h
  })
  return { minX, minY, maxX, maxY }
})

const svgMinX = computed(() => boundingBox.value.minX)
const svgMinY = computed(() => boundingBox.value.minY)

const svgWidth = computed(() => {
  return Math.max(boundingBox.value.maxX - boundingBox.value.minX, 1)
})

const svgHeight = computed(() => {
  return Math.max(boundingBox.value.maxY - boundingBox.value.minY, 1)
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

.connection-hitbox-path {
  cursor: pointer;
  pointer-events: stroke;
}
</style>