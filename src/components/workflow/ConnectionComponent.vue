<template>
  <svg
    class="connections"
    :width="svgWidth"
    :height="svgHeight"
    :style="{ position: 'absolute', top: svgMinY + 'px', left: svgMinX + 'px', pointerEvents: 'none', overflow: 'visible' }"
  >
    <defs>
      <marker id="arrowhead-success" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" :fill="successLineColor" />
      </marker>
      <marker id="arrowhead-failure" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" :fill="dangerLineColor" />
      </marker>
    </defs>
    <path
      v-for="path in connectionPaths"
      :key="path.id"
      :d="path.d"
      :stroke="path.port === 'failure' ? dangerLineColor : successLineColor"
      stroke-width="2"
      :marker-end="path.port === 'failure' ? 'url(#arrowhead-failure)' : 'url(#arrowhead-success)'"
      class="connection-path"
    />
    <path
      v-if="tempConnectionPath"
      :d="tempConnectionPath"
      :stroke="successLineColor"
      stroke-width="2"
      stroke-dasharray="5,5"
      class="temp-connection-path"
    />
    <path
      v-for="path in connectionPaths"
      :key="'hitbox-' + path.id"
      :d="path.d"
      stroke="transparent"
      stroke-width="20"
      fill="none"
      class="connection-hitbox-path"
      @contextmenu="handleConnectionContextMenu($event, path.id)"
    />
  </svg>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { getPortPosition, NODE_WIDTH } from '../../utils/workflow'
import { extractCssColor, getThemeToken } from '../../theme/themeRuntime'

const props = defineProps({
  connections: {
    type: Array,
    default: () => []
  },
  tempConnection: {
    type: Object,
    default: null
  },
  nodes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['connectionContextMenu'])

const nodeHeights = ref({})
let refreshTimer = null

const successColor = computed(() => getThemeToken('--app-success', '#67c23a'))
const dangerColor = computed(() => getThemeToken('--app-danger', '#f56c6c'))
const successLineColor = computed(() => extractCssColor(successColor.value, '#67c23a'))
const dangerLineColor = computed(() => extractCssColor(dangerColor.value, '#f56c6c'))

const refreshHeights = () => {
  props.nodes.forEach(node => {
    const el = document.querySelector(`.workflow-node[data-node-id="${node.id}"]`)
    if (el) nodeHeights.value[node.id] = el.offsetHeight
  })
}

const scheduleRefresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshHeights()
  }, 50)
}

const portPosition = (nodeId, port) => {
  const pos = getPortPosition(nodeId, port, props.nodes, nodeHeights.value)
  return { x: pos.x - svgMinX.value, y: pos.y - svgMinY.value }
}

const buildBezierPath = (fromX, fromY, toX, toY) => {
  const dx = Math.abs(toX - fromX)
  const offset = Math.max(dx * 0.5, 80)
  return `M ${fromX} ${fromY} C ${fromX + offset} ${fromY}, ${toX - offset} ${toY}, ${toX} ${toY}`
}

const connectionPaths = computed(() => {
  const paths = []
  props.connections.forEach(conn => {
    const fromPos = portPosition(conn.fromNode, conn.port || 'success')
    const toPos = portPosition(conn.toNode, 'left')
    paths.push({
      id: conn.id || `${conn.fromNode}:${conn.toNode}:${conn.port}`,
      port: conn.port || 'success',
      d: buildBezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y)
    })
  })
  return paths
})

const tempConnectionPath = computed(() => {
  if (!props.tempConnection) return null
  const fromPos = portPosition(props.tempConnection.fromNode, props.tempConnection.fromPort)
  const toX = (props.tempConnection.toX || 0) - svgMinX.value
  const toY = (props.tempConnection.toY || 0) - svgMinY.value
  return buildBezierPath(fromPos.x, fromPos.y, toX, toY)
})

const boundingBox = computed(() => {
  if (props.nodes.length === 0) return { minX: 0, minY: 0, maxX: 4000, maxY: 3000 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  props.nodes.forEach(node => {
    const h = nodeHeights.value[node.id] || 80
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + NODE_WIDTH)
    maxY = Math.max(maxY, node.y + h)
  })
  return { minX, minY, maxX, maxY }
})

const svgMinX = computed(() => boundingBox.value.minX)
const svgMinY = computed(() => boundingBox.value.minY)
const svgWidth = computed(() => Math.max(boundingBox.value.maxX - boundingBox.value.minX, 1))
const svgHeight = computed(() => Math.max(boundingBox.value.maxY - boundingBox.value.minY, 1))

const handleConnectionContextMenu = (e, connectionId) => {
  e.preventDefault()
  e.stopPropagation()
  const connection = props.connections.find(c => (c.id || `${c.fromNode}:${c.toNode}:${c.port}`) === connectionId)
  if (connection) emit('connectionContextMenu', e, connection)
}

watch(() => props.nodes, () => {
  nextTick(scheduleRefresh)
}, { deep: true })

watch(() => props.tempConnection, () => {
  if (props.tempConnection) refreshHeights()
})

onMounted(() => refreshHeights())

onUnmounted(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>
