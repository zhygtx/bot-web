<script setup>
import { ref, onMounted, onUnmounted, watch, computed, defineAsyncComponent, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElInput, ElIcon, ElDialog, ElButton } from 'element-plus'
import { Warning, ArrowDown, ArrowUp, Close, Position, ZoomIn, CopyDocument, Aim } from '@element-plus/icons-vue'
import request from '../../utils/request'

import WorkflowNodeConfigPanel from '../../components/workflow/WorkflowNodeConfigPanel.vue'
import NodeComponent from '../../components/workflow/NodeComponent.vue'
import ConnectionComponent from '../../components/workflow/ConnectionComponent.vue'
import ContextMenuComponent from '../../components/workflow/ContextMenuComponent.vue'
import PluginListComponent from '../../components/workflow/PluginListComponent.vue'
import ExecutionStatusBar from '../../components/workflow/ExecutionStatusBar.vue'
const NodeExecutionDetails = defineAsyncComponent(() => import('../../components/workflow/NodeExecutionDetails.vue'))
import WorkflowLogView from './WorkflowLogView.vue'

import { useEventHandling } from '../../composables/workflow/useEventHandling'
import { useDataMapping } from '../../composables/workflow/useDataMapping'
import { useWorkflowAPI } from '../../composables/workflow/useWorkflowAPI'

// 初始化API模块
const { loadWorkflowInfo, loadPlugins, loadBotEvents, loadBotActions, saveWorkflow, saveAndTestWorkflow, syncBotInfo } = useWorkflowAPI()

// 初始化事件处理模块
const { canvasRef, isDragging, startX, startY, canvasX, canvasY, handleCanvasMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleNodeMouseDown, handleNodeMouseMove, handleNodeMouseUp, handleNodeMouseLeave, handlePortMouseDown, startDrag, startDragBotEvent, startDragBotAction, endDrag, dropNode } = useEventHandling()

// 初始化数据映射模块
const { processNodeInfo, sortParameters, saveMappingConfig, saveConditionConfig, validateWorkflowNodes } = useDataMapping()

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id

// 工作流信息
const workflowInfo = ref({
  id: '',
  name: '',
  description: '',
  enabled: true
})
// 画布上的节点
const nodes = ref([])
// 当前拖动的元素
const draggingElement = ref(null)
// 拖动的起始位置
const dragStart = ref({ x: 0, y: 0 })
// 提示信息是否显示
const showCanvasPlaceholder = ref(true)

// 监听节点变化，更新提示信息显示状态
watch(
  () => nodes.value.length,
  (newLength) => {
    showCanvasPlaceholder.value = newLength === 0
  },
  { immediate: true }
)
// 画布缩放
const zoom = ref(1)
// 画布内容容器（承载 transform）
const canvasWorldRef = ref(null)
// 加载状态
const loading = ref(false)
// 插件列表（供节点配置面板使用）
const plugins = ref([])
// 可编辑状态
const isNameEditable = ref(false)
// 插件列表是否显示
const showPluginList = ref(true)

// BOT 相关数据
const botEvents = ref([])
const botActions = ref([])
const hasBotQQ = ref(localStorage.getItem('botQQ') !== null)
const isBotOnline = ref(false)

// 连线相关状态
const connections = ref([])
const isDrawing = ref(false)
const startNode = ref(null)
const startPort = ref(null)
const tempConnection = ref(null)

// 节点拖动相关状态
const draggingNode = ref(null)
const nodeDragStart = ref({ x: 0, y: 0 })

// 右键菜单相关状态
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const selectedNodes = ref([])
const contextMenuTarget = ref(null)
const selectedConnection = ref(null)

// 节点配置面板相关状态
const showConfigPanel = ref(false)
const configPanelNode = ref(null)
// 追踪节点是否在 mousedown 之后发生了移动（用于区分点击和拖动）
const nodeMouseMoved = ref(false)

// 测试结果相关状态
const testResult = ref({})
const showTestResult = ref(false)

// 执行日志相关状态
const executionLog = ref(null) // 完整的工作流日志
const showExecutionBar = ref(false) // 是否显示执行状态栏
const showHistoryLog = ref(false) // 是否显示历史日志面板
const nodeHeights = ref({}) // 每个节点的实际高度

// BOT 在线状态轮询定时器
let syncTimer = null

// 刷新节点高度
const refreshNodeHeights = () => {
  const el = canvasRef.value
  if (!el) return
  el.querySelectorAll('.workflow-node').forEach(nodeEl => {
    const nid = nodeEl.getAttribute('data-node-id')
    if (nid) {
      nodeHeights.value[nid] = nodeEl.offsetHeight
    }
  })
}

// 显示执行结果时，等 DOM 更新后刷新节点高度
watch(showExecutionBar, async (show) => {
  if (show) {
    await nextTick()
    await nextTick()
    refreshNodeHeights()
  }
})

const normalizeId = (id) => {
  if (id === null || id === undefined) return ''
  return String(id)
}

const getNodeMethodId = (node) => {
  return node?.methodId ?? node?.method?.id ?? node?.botActionId ?? node?.botEventId
}

const getNodeDisplayName = (node) => {
  if (node?.nodeType === 'botEvent') return node.botEventName
  if (node?.nodeType === 'botAction') return node.botActionName
  return node?.method?.name
}

const normalizeNodeLog = (nodeLog) => ({
  ...nodeLog,
  id: Number(nodeLog.id) || nodeLog.id,
  workflowLogId: Number(nodeLog.workflowLogId) || nodeLog.workflowLogId,
  order: Number(nodeLog.order) || nodeLog.order,
  executionTime: Number(nodeLog.executionTime) || nodeLog.executionTime
})

const findNodeIdForLog = (nodeLog) => {
  const directNodeId = nodeLog.nodeId ?? nodeLog.workflowNodeId ?? nodeLog.nodeInfoId
  if (directNodeId !== undefined && directNodeId !== null) {
    const matchedNode = nodes.value.find(node => normalizeId(node.id) === normalizeId(directNodeId))
    if (matchedNode) return matchedNode.id
  }

  if (nodeLog.methodId !== undefined && nodeLog.methodId !== null) {
    const matchedNode = nodes.value.find(node => normalizeId(getNodeMethodId(node)) === normalizeId(nodeLog.methodId))
    if (matchedNode) return matchedNode.id
  }

  if (nodeLog.methodName) {
    const matchedNode = nodes.value.find(node => getNodeDisplayName(node) === nodeLog.methodName)
    if (matchedNode) return matchedNode.id
  }

  return directNodeId
}

const loadExecutionNodeLogs = async (log) => {
  if (!log?.id) return Array.isArray(log?.nodeLogs) ? log.nodeLogs.map(normalizeNodeLog) : []

  if (Array.isArray(log.nodeLogs) && log.nodeLogs.length > 0) {
    return log.nodeLogs.map(normalizeNodeLog)
  }

  const response = await request({
    url: '/workflowLog/findNodeLogs',
    method: 'get',
    params: {
      workflowLogId: log.id
    }
  })

  if (response.code !== 200) {
    throw new Error(response.message || '加载节点日志失败')
  }

  return (Array.isArray(response.data) ? response.data : []).map(normalizeNodeLog)
}

// 根据执行日志计算节点执行状态映射
const nodeExecutionStatus = computed(() => {
  const statusMap = {}
  if (executionLog.value && executionLog.value.nodeLogs) {
      executionLog.value.nodeLogs.forEach(nodeLog => {
      const nodeId = findNodeIdForLog(nodeLog)
      if (!nodes.value.find(n => normalizeId(n.id) === normalizeId(nodeId))) return
      
      statusMap[nodeId] = {
        success: !nodeLog.isError,
        failed: nodeLog.isError,
        nodeLog: nodeLog
      }
    })
  }
  return statusMap
})

// 隐藏执行日志
const hideExecutionLog = () => {
  executionLog.value = null
  showExecutionBar.value = false
}

// 应用历史日志到画布
const handleHistoryLogToggle = (log) => {
  if (log) {
    executionLog.value = log
    showExecutionBar.value = true
  } else {
    executionLog.value = null
    showExecutionBar.value = false
  }
}

// 大数据文本处理工具函数
const BIG_TEXT_PREFIX = 'BIG_TEXT:'
const bigTextDisplayCache = ref({})

const isBigText = (data) => {
  return data && typeof data === 'string' && data.startsWith(BIG_TEXT_PREFIX)
}

const fetchBigText = async (key, callback) => {
  if (bigTextDisplayCache.value[key]) {
    callback(bigTextDisplayCache.value[key])
    return
  }
  try {
    const response = await request({
      url: '/workflowLog/findBigText',
      method: 'get',
      params: { key }
    })
    if (response.code === 200) {
      bigTextDisplayCache.value[key] = response.data
      callback(response.data)
    }
  } catch (error) {
    console.error('获取大数据失败:', error)
  }
}

// 数据查看弹窗
const showDataModal = ref(false)
const dataModalTitle = ref('')
const dataModalContent = ref('')

const formatJsonForModal = (data) => {
  if (!data) return '无数据'
  try {
    const parsed = JSON.parse(data)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return data
  }
}

const escapeHtml = (str) => {
  if (!str) return str
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const highlightJson = (jsonStr) => {
  if (!jsonStr) return ''
  try {
    JSON.parse(jsonStr)
    const escapedStr = escapeHtml(jsonStr)
    return escapedStr
      .replace(/(".*?")(:)/g, '<span class="json-key">$1</span>$2')
      .replace(/: ("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>')
  } catch (e) {
    return escapeHtml(jsonStr)
  }
}

const openDataModal = (title, content) => {
  dataModalTitle.value = title
  dataModalContent.value = formatJsonForModal(content) || '无数据'
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
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 模式状态
const currentMode = ref('drag')

// 选择框相关状态
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })

// 计算当前节点的前置节点
const preNodes = computed(() => {
  if (!configPanelNode.value) return []
  return nodes.value.filter(node => configPanelNode.value.preNodeId.includes(node.id))
})

// 检查是否存在 BOT 事件节点
const hasBotEventNode = computed(() => {
  return nodes.value.some(node => node.nodeType === 'botEvent')
})

// 检查画布是否为空（没有节点）
const isCanvasEmpty = computed(() => {
  return nodes.value.length === 0
})

// 生成连线
const generateConnections = () => {
  connections.value = []
  nodes.value.forEach(node => {
    if (node.nextNodeId && node.nextNodeId.length > 0) {
      node.nextNodeId.forEach(nextNodeId => {
        const existingConnection = connections.value.find(conn => 
          conn.fromNode === node.id && conn.toNode === nextNodeId
        )
        if (!existingConnection) {
          connections.value.push({
            id: `conn_${node.id}_${nextNodeId}`,
            fromNode: node.id,
            toNode: nextNodeId,
            fromPort: 'right',
            toPort: 'left'
          })
        }
      })
    }
  })
}

// 保存工作流名称
const saveWorkflowName = () => {
  isNameEditable.value = false
}

// 切换名称编辑状态
const toggleNameEdit = () => {
  isNameEditable.value = true
}

// 切换插件列表显示/隐藏
const togglePluginList = () => {
  showPluginList.value = !showPluginList.value
}

// 跳转到插件详情页
const goToPluginDetail = (pluginId) => {
  // 优先使用 workflowInfo.value.id，其次使用 workflowId，最后生成临时ID
  const currentWorkflowId = workflowInfo.value.id || workflowId
  const workflowCacheId = currentWorkflowId || `temp_${Date.now()}`
  // 保存缓存，包含工作流信息
  const cacheData = {
    nodes: nodes.value,
    connections: connections.value,
    workflowInfo: workflowInfo.value,
    workflowId: currentWorkflowId,
    timestamp: Date.now()
  }
  localStorage.setItem(`workflow_cache_${workflowCacheId}`, JSON.stringify(cacheData))
  // 构建返回路径，包含 fromPluginDetail=true 参数和临时ID
  const returnPath = currentWorkflowId ? `/workflow/edit/${currentWorkflowId}?fromPluginDetail=true&cacheId=${workflowCacheId}` : `/workflow/edit?fromPluginDetail=true&cacheId=${workflowCacheId}`
  // 编码返回路径，确保特殊字符被正确处理
  const encodedReturnPath = encodeURIComponent(returnPath)
  router.push(`/plugin/${pluginId}?fromWorkflowEdit=true&workflowId=${workflowCacheId}&returnUrl=${encodedReturnPath}`)
}

// 处理画布鼠标按下事件（扩展）
const handleCanvasMouseDownExtended = (e) => {
  if (currentMode.value === 'select' && e.button === 0) {
    isSelecting.value = true
    // 计算鼠标相对于画布的位置（需除以缩放系数）
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const z = zoom.value
    const cx = (e.clientX - canvasRect.left - canvasX.value) / z
    const cy = (e.clientY - canvasRect.top - canvasY.value) / z
    selectionStart.value = { x: cx, y: cy }
    selectionEnd.value = { x: cx, y: cy }
  } else {
    handleCanvasMouseDown(e, currentMode.value)
  }
}

// 处理鼠标移动事件（扩展）
const handleMouseMoveExtended = (e) => {
  if (isSelecting.value) {
    // 计算鼠标相对于画布的位置（需除以缩放系数）
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const z = zoom.value
    const cx = (e.clientX - canvasRect.left - canvasX.value) / z
    const cy = (e.clientY - canvasRect.top - canvasY.value) / z
    selectionEnd.value = { x: cx, y: cy }
  } else if (draggingNode.value) {
    // 节点拖动（提升到 document 级别，避免快速移动时脱手）
    nodeMouseMoved.value = true
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const z = zoom.value
    draggingNode.value.x = (e.clientX - canvasRect.left - canvasX.value - nodeDragStart.value.x) / z
    draggingNode.value.y = (e.clientY - canvasRect.top - canvasY.value - nodeDragStart.value.y) / z
  } else if (isDrawing.value) {
    handleMouseMoveForConnection(e)
  } else {
    handleMouseMove(e, isDrawing.value, tempConnection.value)
  }
}

// 处理鼠标释放事件（扩展）
const handleMouseUpExtended = (e) => {
  if (isSelecting.value) {
    isSelecting.value = false
    const rect = {
      left: Math.min(selectionStart.value.x, selectionEnd.value.x),
      top: Math.min(selectionStart.value.y, selectionEnd.value.y),
      right: Math.max(selectionStart.value.x, selectionEnd.value.x),
      bottom: Math.max(selectionStart.value.y, selectionEnd.value.y)
    }
    selectedNodes.value = nodes.value.filter(node => {
      const nodeRect = {
        left: node.x,
        top: node.y,
        right: node.x + 200,
        bottom: node.y + 100
      }
      return !(nodeRect.right < rect.left || 
               nodeRect.left > rect.right || 
               nodeRect.bottom < rect.top || 
               nodeRect.top > rect.bottom)
    })
  } else if (draggingNode.value) {
    // 节点拖动结束（document 级别 mouseup）
    draggingNode.value = null
    document.body.style.cursor = 'default'
  } else if (isDrawing.value) {
    handleMouseUpForConnection(e)
  } else {
    handleMouseUp(e, isDrawing.value, canvasRef.value)
  }
}

// 处理鼠标离开事件（扩展）
const handleMouseLeaveExtended = (e) => {
  if (isSelecting.value) {
    isSelecting.value = false
  } else {
    handleMouseLeave(e, isDrawing.value, canvasRef.value)
  }
}

// 处理节点鼠标按下事件（扩展）
const handleNodeMouseDownExtended = (e, node) => {
  e.stopPropagation() // 阻止事件冒泡，避免触发画布拖动
  
  // 左键点击时重置移动标记
  if (e.button === 0) {
    nodeMouseMoved.value = false
  }
  
  if (currentMode.value === 'select') {
    // 右键点击时不重置选中状态
    if (e.button !== 2) {
      if (!e.ctrlKey) {
        selectedNodes.value = [node]
      } else {
        const index = selectedNodes.value.findIndex(n => n.id === node.id)
        if (index === -1) {
          selectedNodes.value.push(node)
        } else {
          selectedNodes.value.splice(index, 1)
        }
      }
    }
    // 在select模式下也允许拖动节点
    draggingNode.value = node
    const nodeElement = e.target.closest('.workflow-node')
    const rect = nodeElement.getBoundingClientRect()
    nodeDragStart.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  } else {
    // drag模式下使用useEventHandling的处理
    draggingNode.value = node
    const result = handleNodeMouseDown(e, node)
    if (result && result.offset) {
      nodeDragStart.value = result.offset
    }
  }
}

// 处理节点鼠标移动事件（扩展）
const handleNodeMouseMoveExtended = (e, node) => {
  if (draggingNode.value && draggingNode.value.id === node.id) {
    e.preventDefault()
    
    // 标记节点发生了移动
    nodeMouseMoved.value = true
    
    // 计算节点新位置（相对于画布，需除以缩放系数）
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const z = zoom.value
    node.x = (e.clientX - canvasRect.left - canvasX.value - nodeDragStart.value.x) / z
    node.y = (e.clientY - canvasRect.top - canvasY.value - nodeDragStart.value.y) / z
  }
}

// 处理节点鼠标释放事件（扩展）
const handleNodeMouseUpExtended = (e, node) => {
  // 如果是左键单击（没有移动），打开配置面板
  if (e.button === 0 && !nodeMouseMoved.value) {
    openNodeConfigPanel(node)
  }
  draggingNode.value = null
  document.body.style.cursor = 'default'
}

// 处理节点鼠标离开事件（扩展）
// 拖动期间的 mouseleave 不再终止拖动，由 document 级别 mouseup 统一处理
const handleNodeMouseLeaveExtended = (e, node) => {
  // 不在这里清除 draggingNode，避免快速拖动时脱手
  // 拖动结束统一由 document mouseup 处理
}

// 处理端口鼠标按下事件（扩展）
const handlePortMouseDownExtended = (e, node, port) => {
  e.stopPropagation()
  e.preventDefault()
  
  // 只有右侧端口才能引出连线
  if (port !== 'right') {
    return
  }
  
  // 检查节点返回值是否为void，如果是则不允许绘制连线
  // 但是定时任务节点特殊处理，即使返回void也允许绘制连线
  if (node.method && (node.method.returnType === 'void' || node.method.returnType === 'Void') && !(node.nodeType === 'botEvent' && node.eventType === 'scheduledEvent')) {
    return
  }
  
  // 开始绘制连线
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

// 处理鼠标移动事件（用于连线绘制）
const handleMouseMoveForConnection = (e) => {
  if (isDrawing.value && tempConnection.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    const z = zoom.value
    tempConnection.value = {
      ...tempConnection.value,
      toX: (e.clientX - rect.left - canvasX.value) / z,
      toY: (e.clientY - rect.top - canvasY.value) / z
    }
  }
}

// 处理鼠标释放事件（用于连线绘制）
const handleMouseUpForConnection = (e) => {
  if (isDrawing.value) {
    // 检查是否释放到另一个节点的端口上
    const target = e.target
    const nodeElement = target.closest('.workflow-node')
    
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id')
      const portElement = target.closest('.node-dot')
      
      if (nodeId && portElement && nodeId !== startNode.value.id) {
        const targetNode = nodes.value.find(n => n.id === nodeId)
        const targetPort = portElement.classList.contains('node-dot-left') ? 'left' : 'right'
        
        if (targetNode && isValidConnection(startNode.value, targetNode, startPort.value, targetPort)) {
          // 创建连线
          const newConnection = {
            id: `conn_${startNode.value.id}_${targetNode.id}`,
            fromNode: startNode.value.id,
            toNode: targetNode.id,
            fromPort: 'right',
            toPort: 'left'
          }
          
          // 检查是否已存在相同的连线
          const existingConnection = connections.value.find(conn => 
            conn.fromNode === newConnection.fromNode && conn.toNode === newConnection.toNode
          )
          
          if (!existingConnection) {
            connections.value.push(newConnection)
            
            // 更新节点的preNodeId和nextNodeId
            if (!startNode.value.nextNodeId) {
              startNode.value.nextNodeId = []
            }
            startNode.value.nextNodeId.push(targetNode.id)
            
            if (!targetNode.preNodeId) {
              targetNode.preNodeId = []
            }
            targetNode.preNodeId.push(startNode.value.id)
            targetNode.inDegree = (targetNode.inDegree || 0) + 1
          }
        }
      }
    }
    
    // 重置连线绘制状态
    isDrawing.value = false
    startNode.value = null
    startPort.value = null
    tempConnection.value = null
  }
}

// 切换模式
const switchMode = (mode) => {
  currentMode.value = mode
}

// 清理过期缓存（超过1小时的缓存）
const cleanupExpiredCache = () => {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('workflow_cache_')) {
      try {
        const cacheData = JSON.parse(localStorage.getItem(key))
        if (cacheData && cacheData.timestamp && (now - cacheData.timestamp) > oneHour) {
          localStorage.removeItem(key)
        }
      } catch (error) {
        // 如果缓存数据损坏，删除它
        localStorage.removeItem(key)
      }
    }
  }
}

// 清除工作流缓存
const clearWorkflowCache = () => {
  // 清除所有工作流缓存，防止内存泄漏
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('workflow_') || key.startsWith('workflow_cache_'))) {
      localStorage.removeItem(key)
    }
  }
}

// 处理保存工作流
const handleSaveWorkflow = async () => {
  // 检查工作流名称
  if (!workflowInfo.value || !workflowInfo.value.name) {
    ElMessage.error('请输入工作流名称')
    return
  }
  
  // 验证所有节点的参数是否都有数据映射或默认值
  const validationResult = validateWorkflowNodes(nodes.value)
  if (!validationResult.valid) {
    ElMessage.error(validationResult.message)
    return
  }
  
  try {
    // 保存工作流
    await saveWorkflow(workflowInfo.value, nodes.value, validateWorkflowNodes, router, workflowId, clearWorkflowCache, generateConnections, loadWorkflowInfo, connections, botEvents, botActions, processNodeInfo, canvasX, canvasY, zoom)
  } catch (error) {
    console.error('保存工作流失败:', error)
  }
}

// 处理保存并测试工作流
const handleSaveAndTest = async () => {
  // 如果正在查看日志，先隐藏日志，避免节点日志位置异常
  if (showExecutionBar.value) {
    hideExecutionLog()
  }

  // 检查工作流名称
  if (!workflowInfo.value || !workflowInfo.value.name) {
    ElMessage.error('请输入工作流名称')
    return
  }
  
  // 检查是否存在 BOT 事件节点
  if (hasBotEventNode.value) {
    ElMessage.warning('存在 BOT 事件节点，无法使用保存并测试功能')
    return
  }
  
  // 验证所有节点的参数是否都有数据映射或默认值
  const validationResult = validateWorkflowNodes(nodes.value)
  if (!validationResult.valid) {
    ElMessage.error(validationResult.message)
    return
  }
  
  // 检查是否有 BOT 动作节点
  const hasBotActionNode = nodes.value.some(node => node.nodeType === 'botAction')
  
  // 检查 BOT 是否在线
  let isBotOnline = true
  try {
    const botStatusResponse = await request({
      url: '/bot',
      method: 'get'
    })
    isBotOnline = botStatusResponse.code === 200 && botStatusResponse.data?.online === true
  } catch (error) {
    // 如果检查失败，默认认为 BOT 不在线
    isBotOnline = false
  }
  
  // 检查是否需要测试
  if (hasBotActionNode && !isBotOnline) {
    // BOT 不在线且有 BOT 动作节点，只保存不测试
    ElMessage.warning('您的BOT并未在线无法使用BOT动作节点进行测试，工作流已保存')
    return
  }
  
  try {
    // 先保存并测试工作流
    const logId = await saveAndTestWorkflow(workflowInfo, nodes, validateWorkflowNodes, router, workflowId, clearWorkflowCache, processNodeInfo, botEvents, botActions, generateConnections, loadWorkflowInfo, connections, canvasX, canvasY, zoom)
    
    if (!logId) return
    
    // 根据返回的日志ID查询完整日志
    const logResponse = await request({
      url: `/workflowLog/${logId}`,
      method: 'get'
    })
    
    if (logResponse.code === 200 && logResponse.data) {
      const nodeLogs = await loadExecutionNodeLogs(logResponse.data)
      executionLog.value = {
        ...logResponse.data,
        nodeLogs,
        nodeLogsLoaded: true
      }
      showExecutionBar.value = true
    }
  } catch (error) {
    console.error('测试工作流失败:', error)
  }
}

// 检查连线是否有效
const isValidConnection = (fromNode, toNode, fromPort, toPort) => {
  if (fromNode.id === toNode.id) {
    ElMessage.warning('节点不能链接自身')
    return false
  }
  if (fromPort !== 'right' || toPort !== 'left') {
    ElMessage.warning('只能从右侧端口连接到左侧端口')
    return false
  }
  if (wouldCreateCycle(fromNode.id, toNode.id)) {
    ElMessage.warning('连线会创建环，无法连接')
    return false
  }
  return true
}

// 检查是否会创建环
const wouldCreateCycle = (fromNodeId, toNodeId) => {
  const visited = new Set()
  const stack = [toNodeId]
  while (stack.length > 0) {
    const currentNodeId = stack.pop()
    if (currentNodeId === fromNodeId) {
      return true
    }
    if (visited.has(currentNodeId)) {
      continue
    }
    visited.add(currentNodeId)
    for (const conn of connections.value) {
      if (conn.fromNode === currentNodeId) {
        stack.push(conn.toNode)
      }
    }
  }
  return false
}

// 隐藏右键菜单
const hideContextMenu = () => {
  showContextMenu.value = false
  contextMenuTarget.value = null
}

// 点击画布空白区域时关闭配置面板和右键菜单
const handleWorkflowClick = () => {
  hideContextMenu()
  showConfigPanel.value = false
}

// 删除选中的节点
const deleteSelectedNodes = () => {
  if (selectedNodes.value.length > 0) {
    const selectedNodeIds = selectedNodes.value.map(node => node.id)
    connections.value = connections.value.filter(conn => {
      return !selectedNodeIds.includes(conn.fromNode) && !selectedNodeIds.includes(conn.toNode)
    })
    nodes.value.forEach(node => {
      if (node.preNodeId) {
        node.preNodeId = node.preNodeId.filter(nodeId => !selectedNodeIds.includes(nodeId))
      }
      if (node.nextNodeId) {
        node.nextNodeId = node.nextNodeId.filter(nodeId => !selectedNodeIds.includes(nodeId))
      }
      if (node.dataMaps) {
        node.dataMaps = node.dataMaps.filter(map => {
          return !selectedNodeIds.includes(map.sourceNodeId)
        })
      }
    })
    nodes.value = nodes.value.filter(node => !selectedNodeIds.includes(node.id))
    hideContextMenu()
  }
}

// 复制选中的节点
const copySelectedNodes = () => {
  if (selectedNodes.value.length > 0) {
    const copiedNodes = selectedNodes.value.map(node => {
      const newNode = JSON.parse(JSON.stringify(node))
      newNode.id = `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      newNode.x += 20
      newNode.y += 20
      return newNode
    })
    nodes.value = [...nodes.value, ...copiedNodes]
    hideContextMenu()
  }
}

// 删除选中的连线
const deleteSelectedConnection = () => {
  if (selectedConnection.value) {
    const connection = selectedConnection.value
    const fromNode = nodes.value.find(n => n.id === connection.fromNode)
    const toNode = nodes.value.find(n => n.id === connection.toNode)
    if (fromNode && fromNode.nextNodeId) {
      fromNode.nextNodeId = fromNode.nextNodeId.filter(nodeId => nodeId !== connection.toNode)
    }
    if (toNode && toNode.preNodeId) {
      toNode.preNodeId = toNode.preNodeId.filter(nodeId => nodeId !== connection.fromNode)
      toNode.inDegree = Math.max(0, (toNode.inDegree || 0) - 1)
      if (toNode.dataMaps) {
        toNode.dataMaps = toNode.dataMaps.filter(map => map.sourceNodeId !== connection.fromNode)
      }
    }
    connections.value = connections.value.filter(conn => conn.id !== connection.id)
    hideContextMenu()
  }
}

// 解除选中节点的所有连线
const disconnectSelectedNodes = () => {
  if (selectedNodes.value.length > 0) {
    const selectedNodeIds = selectedNodes.value.map(node => node.id)
    const connectionsToDelete = connections.value.filter(conn => {
      return selectedNodeIds.includes(conn.fromNode) || selectedNodeIds.includes(conn.toNode)
    })
    connectionsToDelete.forEach(connection => {
      const fromNode = nodes.value.find(n => n.id === connection.fromNode)
      const toNode = nodes.value.find(n => n.id === connection.toNode)
      if (fromNode && fromNode.nextNodeId) {
        fromNode.nextNodeId = fromNode.nextNodeId.filter(nodeId => nodeId !== connection.toNode)
      }
      if (toNode && toNode.preNodeId) {
        toNode.preNodeId = toNode.preNodeId.filter(nodeId => nodeId !== connection.fromNode)
        toNode.inDegree = Math.max(0, (toNode.inDegree || 0) - 1)
        if (toNode.dataMaps) {
          toNode.dataMaps = toNode.dataMaps.filter(map => map.sourceNodeId !== connection.fromNode)
        }
      }
    })
    connections.value = connections.value.filter(conn => {
      return !selectedNodeIds.includes(conn.fromNode) && !selectedNodeIds.includes(conn.toNode)
    })
    hideContextMenu()
  }
}

// 打开节点配置面板
const openNodeConfigPanel = (node) => {
  // 如果面板已打开且是同一个节点，不做处理
  if (showConfigPanel.value && configPanelNode.value?.id === node.id) return

  // 先关闭当前面板（以便播放关闭动画），再打开新面板
  if (showConfigPanel.value) {
    showConfigPanel.value = false
    setTimeout(() => {
      configPanelNode.value = null
      processNodeInfo(node, botEvents.value, botActions.value)
      configPanelNode.value = node
      showConfigPanel.value = true
    }, 150)
  } else {
    processNodeInfo(node, botEvents.value, botActions.value)
    configPanelNode.value = node
    showConfigPanel.value = true
  }
  hideContextMenu()
}

// 处理配置面板保存映射
const handleSaveMapping = (config) => {
  saveMappingConfig(config, configPanelNode.value, nodes.value, workflowId)
}

// 处理配置面板保存条件
const handleSaveCondition = (condition) => {
  saveConditionConfig(condition, configPanelNode.value, nodes.value, workflowId)
}

// 处理画布右键菜单
const handleCanvasContextMenu = (e) => {
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = 'canvas'
  showContextMenu.value = true
}

// 处理节点右键菜单
const handleNodeContextMenu = (e, node) => {
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = 'node'
  
  // 保持其他节点的选中状态
  if (!selectedNodes.value.some(n => n.id === node.id)) {
    selectedNodes.value.push(node)
  }
  
  showContextMenu.value = true
}

// 处理连线右键菜单
const handleConnectionContextMenu = (e, connection) => {
  e.preventDefault()
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
  contextMenuTarget.value = 'connection'
  selectedConnection.value = connection
  showContextMenu.value = true
}

// 清空画布
const clearCanvas = () => {
  nodes.value = []
  connections.value = []
  showContextMenu.value = false
}

// 处理拖动开始
const handleStartDrag = (e, method, methodClass, plugin, version) => {
  draggingElement.value = startDrag(e, method, methodClass, plugin, version)
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  document.body.style.cursor = 'grabbing'
}

// 处理 BOT 事件拖动开始
const handleStartDragBotEvent = (e, event) => {
  draggingElement.value = startDragBotEvent(e, event)
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  document.body.style.cursor = 'grabbing'
}

// 处理 BOT 动作拖动开始
const handleStartDragBotAction = (e, action) => {
  draggingElement.value = startDragBotAction(e, action)
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  document.body.style.cursor = 'grabbing'
}

// 处理拖动结束
const handleEndDrag = () => {
  draggingElement.value = endDrag()
  document.body.style.cursor = 'default'
}

// 处理节点放置
const handleDropNode = (e) => {
  draggingElement.value = dropNode(e, draggingElement.value, canvasRef, nodes.value, showCanvasPlaceholder, zoom)
  handleEndDrag()
}

// 画布滚轮缩放
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

  // 保持鼠标指向的画布坐标不变
  const canvasPointX = (mouseX - canvasX.value) / zoom.value
  const canvasPointY = (mouseY - canvasY.value) / zoom.value
  canvasX.value = mouseX - canvasPointX * newZoom
  canvasY.value = mouseY - canvasPointY * newZoom
  zoom.value = newZoom
}

// 画布背景偏移（跟随平移/缩放，模拟无限点阵）
const backgroundPosition = computed(() => {
  return `${canvasX.value * zoom.value}px ${canvasY.value * zoom.value}px`
})

// 定位到初始节点（或画布原点）
const handleLocateInitialNode = () => {
  const container = canvasRef.value?.parentElement
  if (!container) return
  
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  // 找到初始节点：优先 BOT 事件节点，其次是入度为0的节点，最后是第一个节点
  let targetNode = null
  const botEventNode = nodes.value.find(n => n.nodeType === 'botEvent')
  const zeroInDegreeNode = nodes.value.find(n => (n.inDegree || 0) === 0)
  const firstNode = nodes.value[0]
  targetNode = botEventNode || zeroInDegreeNode || firstNode
  
  // 目标画布坐标：让节点居中显示
  const targetCanvasX = targetNode
    ? containerWidth / 2 - targetNode.x - 125  // 125 = NODE_WIDTH/2
    : containerWidth / 2
  const targetCanvasY = targetNode
    ? containerHeight / 2 - targetNode.y - 60   // 60 = 大约节点高度的一半
    : containerHeight / 2
  
  const worldEl = canvasWorldRef.value
  if (!worldEl) return
  
  // 动画：直接定位放大到默认倍率
  worldEl.style.transition = 'transform 0.45s ease-in-out'
  zoom.value = 1.0
  canvasX.value = targetCanvasX
  canvasY.value = targetCanvasY
  
  setTimeout(() => {
    worldEl.style.transition = 'none'
  }, 450)
}

// 将画布居中到原点 (0, 0)
const centerCanvasToOrigin = () => {
  const container = canvasRef.value?.parentElement
  if (!container) return
  canvasX.value = container.clientWidth / 2
  canvasY.value = container.clientHeight / 2
}
const handlePopState = () => {
  loadPlugins(plugins)
}

// 初始化加载
onMounted(async () => {
  // 首先检查是否从插件详情页返回
  let fromPluginDetail = false
  let reloadPlugins = false
  let cacheId = null
  if (window.location.hash) {
    const hash = window.location.hash.substring(1)
    const hashParts = hash.split('?')
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1])
      fromPluginDetail = hashParams.get('fromPluginDetail') === 'true'
      reloadPlugins = hashParams.get('reloadPlugins') === 'true'
      cacheId = hashParams.get('cacheId')
    }
  } else {
    const urlParams = new URLSearchParams(window.location.search)
    fromPluginDetail = urlParams.get('fromPluginDetail') === 'true'
    reloadPlugins = urlParams.get('reloadPlugins') === 'true'
    cacheId = urlParams.get('cacheId')
  }
  
  // 清理过期缓存
  cleanupExpiredCache()
  
  const botQQ = localStorage.getItem('botQQ')
  hasBotQQ.value = botQQ !== null
  
  // 加载插件（供节点配置面板使用）
  loadPlugins(plugins)
  
  // 同步机器人信息（同时获取在线状态、加载事件/动作）
  await syncBotInfo(hasBotQQ, botEvents, botActions, loadBotEvents, loadBotActions, isBotOnline)
  
  // 启动 BOT 在线状态轮询（有 BOT QQ 时才启动）
  if (hasBotQQ.value) {
    syncTimer = setInterval(() => {
      syncBotInfo(hasBotQQ, botEvents, botActions, loadBotEvents, loadBotActions, isBotOnline)
    }, 5000)
  }
  
  // 如果从插件详情页返回，先读取缓存内容
  if (fromPluginDetail && cacheId) {
    const savedCache = localStorage.getItem(`workflow_cache_${cacheId}`)
    if (savedCache) {
      const cacheData = JSON.parse(savedCache)
      if (cacheData.nodes) {
        nodes.value = cacheData.nodes
        nodes.value.forEach(node => processNodeInfo(node, botEvents.value, botActions.value))
      }
      if (cacheData.connections) {
        connections.value = cacheData.connections
      }
      if (cacheData.workflowInfo) {
        workflowInfo.value = cacheData.workflowInfo
      }
      // 读取完缓存后清理缓存
      localStorage.removeItem(`workflow_cache_${cacheId}`)
    } else {
      // 如果没有缓存，再加载工作流信息
      await loadWorkflowInfo(workflowId, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections, canvasX, canvasY, zoom)
    }
    
    // 清理URL参数
    if (window.location.hash) {
      const hash = window.location.hash.substring(1)
      const hashParts = hash.split('?')
      if (hashParts.length > 1) {
        window.location.hash = hashParts[0]
      }
    } else {
      const url = new URL(window.location.href)
      url.searchParams.delete('fromPluginDetail')
      url.searchParams.delete('reloadPlugins')
      url.searchParams.delete('cacheId')
      window.history.replaceState({}, '', url.toString())
    }
  } else {
    // 如果不是从插件详情页返回，加载工作流信息
    await loadWorkflowInfo(workflowId, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections, canvasX, canvasY, zoom)
  }
  
  // 新建工作流时，将画布居中到原点
  if (!workflowId) {
    await nextTick()
    centerCanvasToOrigin()
  }
  
  generateConnections()
  document.addEventListener('mousemove', handleMouseMoveExtended)
  document.addEventListener('mouseup', handleMouseUpExtended)
  document.addEventListener('mouseleave', handleMouseLeaveExtended)
  window.addEventListener('popstate', handlePopState)
  // 手动绑定 wheel 事件（passive: false 避免浏览器警告）
  if (canvasRef.value) {
    canvasRef.value.addEventListener('wheel', handleWheel, { passive: false })
  }
})

// 清理事件监听器
onUnmounted(() => {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  document.removeEventListener('mousemove', handleMouseMoveExtended)
  document.removeEventListener('mouseup', handleMouseUpExtended)
  document.removeEventListener('mouseleave', handleMouseLeaveExtended)
  window.removeEventListener('popstate', handlePopState)
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('wheel', handleWheel)
  }
  // 离开页面时不清理缓存，因为我们已经在读取完缓存后就清理了
  // 只清理过期缓存
  cleanupExpiredCache()
})
</script>

<template>
  <div class="workflow-edit-view" @click="handleWorkflowClick">
    <!-- 顶部浮动区域：工具栏 + 执行状态栏 -->
    <div class="workflow-top-wrapper">
      <div class="workflow-header">
        <div class="header-left">
          <el-button class="exit-button" @click="() => { clearWorkflowCache(); router.push('/workflow/list'); }" circle>
            <el-icon><Close /></el-icon>
          </el-button>
          <div class="workflow-name-container">
            <el-input
              v-if="isNameEditable"
              v-model="workflowInfo.name"
              placeholder="请输入工作流名称"
              @blur="saveWorkflowName"
              @keyup.enter="saveWorkflowName"
              class="workflow-name-input"
              autofocus
            />
            <h2 v-else @dblclick="toggleNameEdit" class="workflow-name">{{ workflowInfo.name || '新建工作流' }}</h2>
          </div>
        </div>
        <div class="header-center">
          <el-button-group>
            <el-button 
              :type="currentMode === 'drag' ? 'primary' : ''"
              @click="switchMode('drag')"
              title="拖动模式"
            >
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-button 
              :type="currentMode === 'select' ? 'primary' : ''"
              @click="switchMode('select')"
              title="选取模式"
            >
              <el-icon><Position /></el-icon>
            </el-button>
          </el-button-group>
        </div>
        <div class="header-right">
          <el-button 
            :type="workflowInfo.enabled ? 'success' : 'danger'" 
            @click="workflowInfo.enabled = !workflowInfo.enabled"
            class="enabled-toggle-btn"
          >
            {{ workflowInfo.enabled ? '启用中' : '已禁用' }}
          </el-button>
          <el-button type="primary" @click="handleSaveAndTest" :disabled="hasBotEventNode || isCanvasEmpty" :title="isCanvasEmpty ? '画布上没有节点，无法保存并测试' : (hasBotEventNode ? '存在 BOT 事件节点，无法使用保存并测试功能' : '保存并测试')">保存并测试</el-button>
          <el-button type="success" @click="handleSaveWorkflow" :disabled="isCanvasEmpty" :title="isCanvasEmpty ? '画布上没有节点，无法保存' : '保存'">保存</el-button>
          <el-button v-if="workflowId || workflowInfo.id" type="warning" @click="showHistoryLog = !showHistoryLog">查看历史日志</el-button>
        </div>
      </div>
      
      <!-- 执行状态栏 -->
      <ExecutionStatusBar
        v-if="showExecutionBar"
        :execution-log="executionLog"
        :is-big-text="isBigText"
        :big-text-display-cache="bigTextDisplayCache"
        :fetch-big-text="fetchBigText"
        @open-modal="openDataModal"
        @hide="hideExecutionLog"
      />
    </div>
    
    <!-- 主内容区域 -->
    <div class="workflow-main-content">
      <!-- 左侧插件列表（悬浮窗） -->
      <PluginListComponent
        :bot-events="botEvents"
        :bot-actions="botActions"
        :has-bot-qq="hasBotQQ"
        :is-bot-online="isBotOnline"
        :show-plugin-list="showPluginList"
        @toggle-plugin-list="togglePluginList"
        @go-to-plugin-detail="goToPluginDetail"
        @start-drag="handleStartDrag"
        @start-drag-bot-event="handleStartDragBotEvent"
        @start-drag-bot-action="handleStartDragBotAction"
        @end-drag="handleEndDrag"
      />
      
      <!-- 右侧画布 -->
      <div class="canvas-container">
        <div 
          class="canvas" 
          ref="canvasRef"
          :style="{ backgroundPosition: backgroundPosition }"
          @mousedown="handleCanvasMouseDownExtended"
          @mousemove="handleMouseMoveExtended"
          @mouseup="handleMouseUpExtended"
          @mouseleave="handleMouseLeaveExtended"
          @drop="handleDropNode"
          @dragover.prevent
          @contextmenu="handleCanvasContextMenu"
        >
          <div 
            class="canvas-world" 
            ref="canvasWorldRef"
            :style="{ transform: `translate(${canvasX}px, ${canvasY}px) scale(${zoom})`, transformOrigin: '0 0' }"
          >
            <!-- 连线组件 -->
            <ConnectionComponent
              :connections="connections"
              :temp-connection="tempConnection"
              :is-selecting="isSelecting"
              :selection-start="selectionStart"
              :selection-end="selectionEnd"
              :nodes="nodes"
              @connection-context-menu="handleConnectionContextMenu"
            />
            
            <!-- 节点组件 -->
            <template v-for="node in nodes" :key="node.id">
              <NodeComponent
                :node="node"
                :is-selected="selectedNodes.some(n => n.id === node.id)"
                :execution-status="nodeExecutionStatus[node.id] || null"
                @node-mouse-down="handleNodeMouseDownExtended"
                @node-mouse-move="handleNodeMouseMoveExtended"
                @node-mouse-up="handleNodeMouseUpExtended"
                @node-mouse-leave="handleNodeMouseLeaveExtended"
                @node-context-menu="handleNodeContextMenu"
                @node-dbl-click="openNodeConfigPanel"
                @port-mouse-down="handlePortMouseDownExtended"
              />
              <div
                v-if="showExecutionBar && nodeExecutionStatus[node.id]"
                class="node-execution-wrapper"
                :style="{ left: node.x + 'px', top: (node.y + (nodeHeights[node.id] || 80) + 5) + 'px' }"
                @wheel.stop
              >
                <NodeExecutionDetails
                  :node-log="nodeExecutionStatus[node.id].nodeLog"
                  @open-modal="openDataModal"
                />
              </div>
            </template>
          </div>
        </div>
        <div v-if="showCanvasPlaceholder" class="canvas-placeholder">
          <h3>工作流画布</h3>
          <p>拖拽左侧插件到此处创建工作流节点</p>
        </div>
        
        <!-- 右键菜单组件 -->
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
        
        <!-- 定位按钮（右下角） -->
        <el-button 
          class="locate-btn" 
          circle 
          @click="handleLocateInitialNode" 
          title="定位到初始节点"
        >
          <el-icon :size="20"><Aim /></el-icon>
        </el-button>
      </div>
    </div>
    
    <!-- 节点配置面板（右侧滑入） -->
    <WorkflowNodeConfigPanel
      :visible="showConfigPanel"
      :node="configPanelNode"
      :pre-nodes="preNodes"
      :all-nodes="nodes"
      :plugins="plugins"
      @update:visible="showConfigPanel = $event"
      @save-mapping="handleSaveMapping"
      @save-condition="handleSaveCondition"
    />
    
    <!-- 测试结果弹窗 -->
    <el-dialog
      v-model="showTestResult"
      title="工作流测试结果"
      width="800px"
    >
      <div class="test-result-container">
        <pre class="test-result-content">{{ JSON.stringify(testResult, null, 2) }}</pre>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTestResult = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 数据查看弹窗 -->
    <el-dialog 
      v-model="showDataModal" 
      width="80%" 
      :close-on-click-modal="true"
      @close="closeDataModal"
    >
      <template #header>
        <div class="modal-header">
          <span>{{ dataModalTitle }}</span>
          <el-button link :icon="CopyDocument" @click="copyModalContent" class="copy-btn">复制</el-button>
        </div>
      </template>
      <div class="modal-json-viewer">
        <pre v-html="highlightJson(dataModalContent)"></pre>
      </div>
    </el-dialog>
    
    <!-- 历史日志面板 -->
    <Transition name="history-slide">
      <div v-if="showHistoryLog" class="history-log-backdrop" @click="showHistoryLog = false">
        <div class="history-log-float" @click.stop>
        <div class="history-log-header">
          <h3>历史执行日志</h3>
          <el-button :icon="Close" circle size="small" @click="showHistoryLog = false" />
        </div>
        <div class="history-log-body">
          <WorkflowLogView
            :workflow-id="workflowId || workflowInfo.id"
            @log-toggle="handleHistoryLogToggle"
          />
        </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import '../../styles/workflow.css';

/* 数据查看弹窗样式 - 与工作流日志页面一致 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.copy-btn {
  color: #409eff;
  font-size: 14px;
  padding: 4px 12px;
}

.copy-btn:hover {
  color: #66b1ff;
  background-color: rgba(64, 158, 255, 0.1);
}

.modal-json-viewer {
  background-color: #304156;
  padding: 16px;
  border-radius: 8px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-json-viewer pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #e6e6e6;
  white-space: pre-wrap;
  word-break: break-all;
}

/* JSON 语法高亮 - 与工作流日志页面一致 */
:deep(.json-key) { color: #ffa07a; }
:deep(.json-string) { color: #98fb98; }
:deep(.json-number) { color: #ffa500; }
:deep(.json-boolean) { color: #87ceeb; }
:deep(.json-null) { color: #9370db; }

/* 历史日志浮动面板 */
.history-log-backdrop {
  position: absolute;
  inset: 0;
  z-index: 299;
}

.history-log-float {
  position: absolute;
  right: 20px;
  top: 90px;
  width: 600px;
  height: calc(100% - 110px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 300;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e6e6e6;
  flex-shrink: 0;
}

.history-log-header h3 { margin: 0; font-size: 16px; color: #303133; }

.history-log-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* 滑入/滑出动画 */
.history-slide-enter-active,
.history-slide-leave-active {
  transition: opacity 0.3s ease;
}

.history-slide-enter-active .history-log-float,
.history-slide-leave-active .history-log-float {
  transition: transform 0.3s ease;
}

.history-slide-enter-from,
.history-slide-leave-to {
  opacity: 0;
}

.history-slide-enter-from .history-log-float,
.history-slide-leave-to .history-log-float {
  transform: translateX(100%);
}

/* 定位按钮（右下角） */
.locate-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 250;
  width: 44px;
  height: 44px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.locate-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
</style>
