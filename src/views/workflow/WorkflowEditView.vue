<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElButton, ElInput, ElDialog, ElIcon } from 'element-plus'
import { Close, Position, ZoomIn, CopyDocument, Aim } from '@element-plus/icons-vue'
import request from '../../utils/request'

import WorkflowNodeConfigPanel from '../../components/workflow/WorkflowNodeConfigPanel.vue'
import NodeComponent from '../../components/workflow/NodeComponent.vue'
import ConnectionComponent from '../../components/workflow/ConnectionComponent.vue'
import ContextMenuComponent from '../../components/workflow/ContextMenuComponent.vue'
import PluginListComponent from '../../components/workflow/PluginListComponent.vue'
import ExecutionStatusBar from '../../components/workflow/ExecutionStatusBar.vue'
import NodeExecutionDetails from '../../components/workflow/NodeExecutionDetails.vue'
import WorkflowLogView from './WorkflowLogView.vue'

import { useEventHandling } from '../../composables/workflow/useEventHandling'
import { useDataMapping } from '../../composables/workflow/useDataMapping'
import { useWorkflowAPI } from '../../composables/workflow/useWorkflowAPI'
import { validateConnection, isTriggerCallable } from '../../utils/workflow'

const { loadWorkflowInfo, loadBotEvents, loadBotActions, saveWorkflow, saveAndTestWorkflow, syncBotInfo } = useWorkflowAPI()
const { canvasRef, canvasX, canvasY, handleCanvasMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, startDrag, endDrag, dropNode } = useEventHandling()
const { validateWorkflowNodes, saveNodeConfig } = useDataMapping()

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id

const workflowInfo = ref({ id: '', name: '', enabled: true })
const nodes = ref([])
const edges = ref([])
const draggingElement = ref(null)
const zoom = ref(1)
const canvasWorldRef = ref(null)
const showPluginList = ref(true)
const isNameEditable = ref(false)
const currentMode = ref('drag')

const botEvents = ref([])
const botActions = ref([])
const hasBotQQ = ref(localStorage.getItem('botQQ') !== null)
const isBotOnline = ref(false)
let syncTimer = null

const draggingNode = ref(null)
const nodeDragStart = ref({ x: 0, y: 0 })
const nodeMouseMoved = ref(false)

const isDrawing = ref(false)
const startNode = ref(null)
const startPort = ref(null)
const tempConnection = ref(null)

const selectedNodes = ref([])
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })

const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTarget = ref(null)
const selectedConnection = ref(null)

const showConfigPanel = ref(false)
const configPanelNode = ref(null)

const executionLog = ref(null)
const showExecutionBar = ref(false)
const showHistoryLog = ref(false)
const nodeHeights = ref({})

const showDataModal = ref(false)
const dataModalTitle = ref('')
const dataModalContent = ref('')

const isCanvasEmpty = computed(() => nodes.value.length === 0)

const hasTriggerNode = computed(() => nodes.value.some(node => isTriggerCallable(node.callable)))

const nodeExecutionStatus = computed(() => {
  const map = {}
  executionLog.value?.trace?.nodes?.forEach(trace => {
    map[trace.nodeId] = trace
  })
  return map
})

const refreshNodeHeights = () => {
  if (!canvasRef.value) return
  canvasRef.value.querySelectorAll('.workflow-node').forEach(el => {
    const nid = el.getAttribute('data-node-id')
    if (nid) nodeHeights.value[nid] = el.offsetHeight
  })
}

const saveWorkflowName = () => { isNameEditable.value = false }
const toggleNameEdit = () => { isNameEditable.value = true }
const togglePluginList = () => { showPluginList.value = !showPluginList.value }
const switchMode = (mode) => { currentMode.value = mode }

const handleSave = async () => {
  const validation = validateWorkflowNodes(nodes.value)
  if (!validation.valid) {
    ElMessage.error(validation.message)
    return
  }
  const saved = await saveWorkflow(workflowInfo, nodes, edges, router, canvasX, canvasY, zoom)
  if (saved?.id) {
    await loadWorkflowInfo(saved.id, workflowInfo, nodes, edges, canvasX, canvasY, zoom)
    ElMessage.success('保存成功')
  }
}

const handleSaveAndTest = async () => {
  const validation = validateWorkflowNodes(nodes.value)
  if (!validation.valid) {
    ElMessage.error(validation.message)
    return
  }
  const logId = await saveAndTestWorkflow(workflowInfo, nodes, edges, router, canvasX, canvasY, zoom)
  if (!logId) return
  const response = await request({ url: `/workflowLog/${logId}`, method: 'get' })
  if (response.code === 200 && response.data) {
    executionLog.value = response.data
    showExecutionBar.value = true
  }
}

const handleStartDrag = (e, callable, descriptor) => {
  draggingElement.value = startDrag(e, callable, descriptor)
}

const handleEndDrag = () => {
  endDrag()
}

const handleDrop = (e) => {
  const created = dropNode(e, draggingElement.value, nodes.value, zoom)
  if (created) {
    nodes.value.push(created)
  }
  endDrag()
}

const handleCanvasContextMenu = (e) => {
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = 'canvas'
  showContextMenu.value = true
}

const handleNodeContextMenu = (e, node) => {
  e.preventDefault()
  if (!selectedNodes.value.some(n => n.id === node.id)) {
    selectedNodes.value = [node]
  }
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = 'node'
  showContextMenu.value = true
}

const handleConnectionContextMenu = (e, connection) => {
  e.preventDefault()
  selectedConnection.value = connection
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = 'connection'
  showContextMenu.value = true
}

const hideContextMenu = () => {
  showContextMenu.value = false
  contextMenuTarget.value = null
}

const handleNodeMouseDown = (e, node) => {
  e.stopPropagation()
  nodeMouseMoved.value = false
  if (currentMode.value === 'select') {
    if (!e.ctrlKey) {
      selectedNodes.value = [node]
    } else if (!selectedNodes.value.some(n => n.id === node.id)) {
      selectedNodes.value.push(node)
    } else {
      selectedNodes.value = selectedNodes.value.filter(n => n.id !== node.id)
    }
  }
  draggingNode.value = node
  const rect = e.target.closest('.workflow-node').getBoundingClientRect()
  nodeDragStart.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

const handleCanvasMouseDownExtended = (e) => {
  selectedNodes.value = []
  hideContextMenu()
  if (currentMode.value === 'select' && e.button === 0) {
    isSelecting.value = true
    const rect = canvasRef.value.getBoundingClientRect()
    const z = zoom.value
    const x = (e.clientX - rect.left - canvasX.value) / z
    const y = (e.clientY - rect.top - canvasY.value) / z
    selectionStart.value = { x, y }
    selectionEnd.value = { x, y }
  } else {
    handleCanvasMouseDown(e, currentMode.value)
  }
}

const handleMouseMoveExtended = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  const z = zoom.value
  if (isSelecting.value) {
    selectionEnd.value = {
      x: (e.clientX - rect.left - canvasX.value) / z,
      y: (e.clientY - rect.top - canvasY.value) / z
    }
  } else if (draggingNode.value) {
    nodeMouseMoved.value = true
    draggingNode.value.x = (e.clientX - rect.left - canvasX.value - nodeDragStart.value.x) / z
    draggingNode.value.y = (e.clientY - rect.top - canvasY.value - nodeDragStart.value.y) / z
  } else if (isDrawing.value && tempConnection.value) {
    tempConnection.value = {
      ...tempConnection.value,
      toX: (e.clientX - rect.left - canvasX.value) / z,
      toY: (e.clientY - rect.top - canvasY.value) / z
    }
  } else {
    handleMouseMove(e)
  }
}

const handleMouseUpExtended = (e) => {
  if (isSelecting.value) {
    isSelecting.value = false
    const rect = {
      left: Math.min(selectionStart.value.x, selectionEnd.value.x),
      top: Math.min(selectionStart.value.y, selectionEnd.value.y),
      right: Math.max(selectionStart.value.x, selectionEnd.value.x),
      bottom: Math.max(selectionStart.value.y, selectionEnd.value.y)
    }
    selectedNodes.value = nodes.value.filter(node =>
      !(node.x > rect.right || node.x + 250 < rect.left || node.y > rect.bottom || node.y + 100 < rect.top))
  } else if (draggingNode.value) {
    if (e.button === 0 && !nodeMouseMoved.value && currentMode.value === 'select') {
      openNodeConfigPanel(draggingNode.value)
    }
    draggingNode.value = null
  } else if (isDrawing.value) {
    finishConnection(e)
  } else {
    handleMouseUp()
  }
}

const handleMouseLeaveExtended = () => {
  if (isSelecting.value) isSelecting.value = false
  handleMouseLeave()
}

const handlePortMouseDown = (e, node, port) => {
  e.stopPropagation()
  e.preventDefault()
  if (port === 'left') return
  isDrawing.value = true
  startNode.value = node
  startPort.value = port
  const rect = canvasRef.value.getBoundingClientRect()
  const z = zoom.value
  tempConnection.value = {
    fromNode: node.id,
    fromPort: port,
    toX: (e.clientX - rect.left - canvasX.value) / z,
    toY: (e.clientY - rect.top - canvasY.value) / z
  }
}

const finishConnection = (e) => {
  const nodeElement = e.target.closest('.workflow-node')
  if (nodeElement) {
    const nodeId = nodeElement.getAttribute('data-node-id')
    const targetNode = nodes.value.find(n => n.id === nodeId)
    if (targetNode && startNode.value && targetNode.id !== startNode.value.id) {
      const result = validateConnection(startNode.value, targetNode, startPort.value, edges.value)
      if (result.valid) {
        const edgeId = `${startNode.value.id}:${targetNode.id}:${startPort.value}`
        if (!edges.value.some(edge => edge.id === edgeId)) {
          edges.value.push({
            id: edgeId,
            fromNode: startNode.value.id,
            toNode: targetNode.id,
            port: startPort.value
          })
        }
      } else {
        ElMessage.warning(result.message)
      }
    }
  }
  isDrawing.value = false
  startNode.value = null
  startPort.value = null
  tempConnection.value = null
}

const handleWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  const newZoom = Math.max(0.3, Math.min(2, zoom.value + delta))
  if (newZoom === zoom.value) return
  const container = canvasRef.value?.parentElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  const pointX = (mouseX - canvasX.value) / zoom.value
  const pointY = (mouseY - canvasY.value) / zoom.value
  canvasX.value = mouseX - pointX * newZoom
  canvasY.value = mouseY - pointY * newZoom
  zoom.value = newZoom
}

const backgroundPosition = computed(() => `${canvasX.value * zoom.value}px ${canvasY.value * zoom.value}px`)

const openNodeConfigPanel = (node) => {
  configPanelNode.value = node
  showConfigPanel.value = true
  hideContextMenu()
}

const handleSaveConfig = (config) => {
  saveNodeConfig(configPanelNode.value, config.inputs, config.branch, config.config)
  if (!config.branch && configPanelNode.value) {
    edges.value = edges.value.filter(edge =>
      !(edge.fromNode === configPanelNode.value.id && edge.port === 'failure'))
  }
  showConfigPanel.value = false
}

const deleteSelectedNodes = () => {
  const ids = selectedNodes.value.map(node => node.id)
  edges.value = edges.value.filter(edge => !ids.includes(edge.fromNode) && !ids.includes(edge.toNode))
  nodes.value = nodes.value.filter(node => !ids.includes(node.id))
  selectedNodes.value = []
  hideContextMenu()
}

const copySelectedNodes = () => {
  const idMap = {}
  const copies = selectedNodes.value.map(node => {
    const copy = JSON.parse(JSON.stringify(node))
    const newId = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    idMap[node.id] = newId
    copy.id = newId
    copy.x += 20
    copy.y += 20
    return copy
  })
  nodes.value.push(...copies)
  selectedNodes.value = copies
  hideContextMenu()
}

const disconnectSelectedNodes = () => {
  const ids = selectedNodes.value.map(node => node.id)
  edges.value = edges.value.filter(edge => !ids.includes(edge.fromNode) && !ids.includes(edge.toNode))
  hideContextMenu()
}

const deleteSelectedConnection = () => {
  if (selectedConnection.value) {
    edges.value = edges.value.filter(edge => edge.id !== selectedConnection.value.id)
    selectedConnection.value = null
    hideContextMenu()
  }
}

const clearCanvas = () => {
  nodes.value = []
  edges.value = []
  hideContextMenu()
}

const handleHistoryLogToggle = (log) => {
  if (log) {
    executionLog.value = log
    showExecutionBar.value = true
  } else {
    executionLog.value = null
    showExecutionBar.value = false
  }
}

const handleLocateInitialNode = () => {
  const container = canvasRef.value?.parentElement
  if (!container) return
  const targetNode = nodes.value.find(node => isTriggerCallable(node.callable)) || nodes.value[0]
  canvasX.value = targetNode
    ? container.clientWidth / 2 - targetNode.x - 125
    : container.clientWidth / 2
  canvasY.value = targetNode
    ? container.clientHeight / 2 - targetNode.y - 60
    : container.clientHeight / 2
  zoom.value = 1
}

const openDataModal = (title, content) => {
  dataModalTitle.value = title
  dataModalContent.value = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  showDataModal.value = true
}

const closeDataModal = () => {
  showDataModal.value = false
  dataModalTitle.value = ''
  dataModalContent.value = ''
}

const copyModalContent = async () => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(dataModalContent.value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = dataModalContent.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

watch(showExecutionBar, async (show) => {
  if (show) {
    await nextTick()
    await nextTick()
    refreshNodeHeights()
  }
})

onMounted(async () => {
  loadBotEvents(botEvents)
  loadBotActions(botActions)
  await syncBotInfo(hasBotQQ, isBotOnline)
  if (hasBotQQ.value) {
    syncTimer = setInterval(() => syncBotInfo(hasBotQQ, isBotOnline), 5000)
  }
  await loadWorkflowInfo(workflowId, workflowInfo, nodes, edges, canvasX, canvasY, zoom)
  document.addEventListener('mousemove', handleMouseMoveExtended)
  document.addEventListener('mouseup', handleMouseUpExtended)
  document.addEventListener('mouseleave', handleMouseLeaveExtended)
  if (canvasRef.value) {
    canvasRef.value.addEventListener('wheel', handleWheel, { passive: false })
  }
})

onUnmounted(() => {
  if (syncTimer) clearInterval(syncTimer)
  document.removeEventListener('mousemove', handleMouseMoveExtended)
  document.removeEventListener('mouseup', handleMouseUpExtended)
  document.removeEventListener('mouseleave', handleMouseLeaveExtended)
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('wheel', handleWheel)
  }
})
</script>

<template>
  <div class="workflow-edit-view">
    <div class="workflow-top-wrapper">
      <div class="workflow-header">
        <div class="header-left">
          <el-button circle @click="router.push('/workflow/list')">
            <el-icon><Close /></el-icon>
          </el-button>
          <div class="workflow-name-container">
            <el-input v-if="isNameEditable" v-model="workflowInfo.name" placeholder="请输入工作流名称"
                      @blur="saveWorkflowName" @keyup.enter="saveWorkflowName" class="workflow-name-input" autofocus />
            <h2 v-else @dblclick="toggleNameEdit" class="workflow-name">{{ workflowInfo.name || '新建工作流' }}</h2>
          </div>
        </div>
        <div class="header-center">
          <el-button-group>
            <el-button :type="currentMode === 'drag' ? 'primary' : ''" @click="switchMode('drag')" title="拖动模式">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-button :type="currentMode === 'select' ? 'primary' : ''" @click="switchMode('select')" title="选取模式">
              <el-icon><Position /></el-icon>
            </el-button>
          </el-button-group>
        </div>
        <div class="header-right">
          <el-button :type="workflowInfo.enabled ? 'success' : 'danger'" @click="workflowInfo.enabled = !workflowInfo.enabled">
            {{ workflowInfo.enabled ? '启用中' : '已禁用' }}
          </el-button>
          <el-button type="primary" @click="handleSaveAndTest" :disabled="isCanvasEmpty">保存并测试</el-button>
          <el-button type="success" @click="handleSave" :disabled="isCanvasEmpty">保存</el-button>
          <el-button v-if="workflowId || workflowInfo.id" type="warning" @click="showHistoryLog = !showHistoryLog">历史日志</el-button>
        </div>
      </div>
      <ExecutionStatusBar
        v-if="showExecutionBar"
        :execution="executionLog"
        @open-modal="openDataModal"
        @hide="showExecutionBar = false; executionLog = null"
      />
    </div>

    <div class="workflow-main-content">
      <PluginListComponent
        :bot-events="botEvents"
        :bot-actions="botActions"
        :has-bot-qq="hasBotQQ"
        :is-bot-online="isBotOnline"
        :show-plugin-list="showPluginList"
        @toggle-plugin-list="togglePluginList"
        @start-drag="handleStartDrag"
        @end-drag="handleEndDrag"
      />

      <div class="canvas-container">
        <div
          class="canvas"
          ref="canvasRef"
          :style="{ backgroundPosition }"
          @mousedown="handleCanvasMouseDownExtended"
          @mousemove="handleMouseMoveExtended"
          @mouseup="handleMouseUpExtended"
          @mouseleave="handleMouseLeaveExtended"
          @drop="handleDrop"
          @dragover.prevent
          @contextmenu="handleCanvasContextMenu"
        >
          <div
            class="canvas-world"
            ref="canvasWorldRef"
            :style="{ transform: `translate(${canvasX}px, ${canvasY}px) scale(${zoom})`, transformOrigin: '0 0' }"
          >
            <ConnectionComponent
              :connections="edges"
              :temp-connection="tempConnection"
              :nodes="nodes"
              @connection-context-menu="handleConnectionContextMenu"
            />
            <template v-for="node in nodes" :key="node.id">
              <NodeComponent
                :node="node"
                :is-selected="selectedNodes.some(n => n.id === node.id)"
                :connections="edges"
                :execution-status="nodeExecutionStatus[node.id] || null"
                @node-mouse-down="handleNodeMouseDown"
                @node-context-menu="handleNodeContextMenu"
                @node-dbl-click="openNodeConfigPanel"
                @port-mouse-down="handlePortMouseDown"
              />
              <div
                v-if="showExecutionBar && nodeExecutionStatus[node.id]"
                class="node-execution-wrapper"
                :style="{ left: node.x + 'px', top: (node.y + (nodeHeights[node.id] || 80) + 5) + 'px' }"
              >
                <NodeExecutionDetails :node-trace="nodeExecutionStatus[node.id]" />
              </div>
            </template>
          </div>
        </div>

        <div v-if="nodes.length === 0" class="canvas-placeholder">
          <h3>工作流画布</h3>
          <p>拖拽左侧节点到此处创建 DAG</p>
        </div>

        <ContextMenuComponent
          :show-context-menu="showContextMenu"
          :position="contextMenuPosition"
          :target="contextMenuTarget"
          :selected-nodes="selectedNodes"
          :selected-connection="selectedConnection"
          @delete-selected-nodes="deleteSelectedNodes"
          @copy-selected-nodes="copySelectedNodes"
          @disconnect-selected-nodes="disconnectSelectedNodes"
          @clear-canvas="clearCanvas"
          @delete-selected-connection="deleteSelectedConnection"
        />

        <el-button class="locate-btn" circle @click="handleLocateInitialNode" title="定位到初始节点">
          <el-icon :size="20"><Aim /></el-icon>
        </el-button>
      </div>
    </div>

    <WorkflowNodeConfigPanel
      :visible="showConfigPanel"
      :node="configPanelNode"
      :all-nodes="nodes"
      :all-edges="edges"
      @update:visible="showConfigPanel = $event"
      @save-config="handleSaveConfig"
    />

    <el-dialog v-model="showDataModal" width="80%" @close="closeDataModal">
      <template #header>
        <div class="modal-header">
          <span>{{ dataModalTitle }}</span>
          <el-button link :icon="CopyDocument" @click="copyModalContent">复制</el-button>
        </div>
      </template>
      <div class="modal-json-viewer">
        <pre>{{ dataModalContent }}</pre>
      </div>
    </el-dialog>

    <Transition name="history-slide">
      <div v-if="showHistoryLog" class="history-log-backdrop" @click="showHistoryLog = false">
        <div class="history-log-float" @click.stop>
          <div class="history-log-header">
            <h3>历史执行日志</h3>
            <el-button :icon="Close" circle size="small" @click="showHistoryLog = false" />
          </div>
          <div class="history-log-body">
            <WorkflowLogView :workflow-id="workflowId || workflowInfo.id" @log-toggle="handleHistoryLogToggle" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
