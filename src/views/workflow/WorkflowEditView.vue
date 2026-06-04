<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElInput, ElIcon } from 'element-plus'
import { Warning, ArrowDown, ArrowUp, Close, Position, ZoomIn } from '@element-plus/icons-vue'
import request from '../../utils/request'

import WorkflowMappingConfig from '../../components/WorkflowMappingConfig.vue'
import WorkflowConditionConfig from '../../components/WorkflowConditionConfig.vue'
import NodeComponent from '../../components/workflow/NodeComponent.vue'
import ConnectionComponent from '../../components/workflow/ConnectionComponent.vue'
import ContextMenuComponent from '../../components/workflow/ContextMenuComponent.vue'
import PluginListComponent from '../../components/workflow/PluginListComponent.vue'

import { useEventHandling } from '../../composables/workflow/useEventHandling'
import { useDataMapping } from '../../composables/workflow/useDataMapping'
import { useWorkflowAPI } from '../../composables/workflow/useWorkflowAPI'

// 初始化API模块
const { loadWorkflowInfo, loadPlugins, loadPublicPlugins, loadBotEvents, loadBotActions, saveWorkflow, saveAndTestWorkflow, syncBotInfo } = useWorkflowAPI()

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
// 画布大小
const canvasSize = ref({ width: 4000, height: 3000 })
// 加载状态
const loading = ref(false)
// 插件列表
const plugins = ref([])
// 公开插件列表
const publicPlugins = ref([])
// 插件类型（我的插件/公开插件）
const activeTab = ref('my')
// 可编辑状态
const isNameEditable = ref(false)
// 展开的插件卡片
const expandedPlugins = ref(new Set())
// 插件选中版本
const selectedVersions = ref({})
// 公开插件选中版本
const selectedPublicVersions = ref({})
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

// 映射配置弹窗相关状态
const showMappingConfig = ref(false)
const currentNode = ref(null)

// 条件配置弹窗相关状态
const showConditionConfig = ref(false)

// 测试结果相关状态
const testResult = ref({})
const showTestResult = ref(false)

// 模式状态
const currentMode = ref('select')

// 选择框相关状态
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })

// 计算当前节点的前置节点
const preNodes = computed(() => {
  if (!currentNode.value) return []
  return nodes.value.filter(node => currentNode.value.preNodeId.includes(node.id))
})

// 检查节点是否可以设置条件
const canSetCondition = computed(() => {
  if (!currentNode.value) return false
  // 检查节点的返回类型是否是布尔（包括基本类型和包装类）
  return currentNode.value.method &&
         (currentNode.value.method.returnType === 'boolean' || 
          currentNode.value.method.returnType === 'Boolean')
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

// 切换插件卡片展开/收起状态
const togglePluginExpand = (pluginId) => {
  if (expandedPlugins.value.has(pluginId)) {
    expandedPlugins.value.delete(pluginId)
  } else {
    expandedPlugins.value.add(pluginId)
  }
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
    // 计算鼠标相对于画布的位置
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const canvasX = e.clientX - canvasRect.left
    const canvasY = e.clientY - canvasRect.top
    selectionStart.value = { x: canvasX, y: canvasY }
    selectionEnd.value = { x: canvasX, y: canvasY }
  } else {
    handleCanvasMouseDown(e, currentMode.value)
  }
}

// 处理鼠标移动事件（扩展）
const handleMouseMoveExtended = (e) => {
  if (isSelecting.value) {
    // 计算鼠标相对于画布的位置
    const canvasRect = canvasRef.value.getBoundingClientRect()
    const canvasX = e.clientX - canvasRect.left
    const canvasY = e.clientY - canvasRect.top
    selectionEnd.value = { x: canvasX, y: canvasY }
  } else if (isDrawing.value) {
    handleMouseMoveForConnection(e)
  } else {
    handleMouseMove(e, isDrawing.value, tempConnection.value, canvasSize.value)
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
        left: node.x + canvasX.value,
        top: node.y + canvasY.value,
        right: node.x + 200 + canvasX.value,
        bottom: node.y + 100 + canvasY.value
      }
      return !(nodeRect.right < rect.left || 
               nodeRect.left > rect.right || 
               nodeRect.bottom < rect.top || 
               nodeRect.top > rect.bottom)
    })
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
    
    // 计算节点新位置（相对于画布）
    const canvasRect = canvasRef.value.getBoundingClientRect()
    let newX = e.clientX - canvasRect.left - nodeDragStart.value.x
    let newY = e.clientY - canvasRect.top - nodeDragStart.value.y
    
    // 限制节点在画布范围内
    const nodeWidth = 250
    const nodeHeight = 120
    
    newX = Math.max(0, Math.min(canvasSize.value.width - nodeWidth, newX))
    newY = Math.max(0, Math.min(canvasSize.value.height - nodeHeight, newY))
    
    // 更新节点位置
    node.x = newX
    node.y = newY
  }
}

// 处理节点鼠标释放事件（扩展）
const handleNodeMouseUpExtended = (e, node) => {
  draggingNode.value = null
  document.body.style.cursor = 'default'
}

// 处理节点鼠标离开事件（扩展）
const handleNodeMouseLeaveExtended = (e, node) => {
  draggingNode.value = null
  document.body.style.cursor = 'default'
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
  tempConnection.value = {
    fromNode: node.id,
    fromPort: port,
    toX: e.clientX - rect.left,
    toY: e.clientY - rect.top
  }
}

// 处理鼠标移动事件（用于连线绘制）
const handleMouseMoveForConnection = (e) => {
  if (isDrawing.value && tempConnection.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    tempConnection.value = {
      ...tempConnection.value,
      toX: e.clientX - rect.left,
      toY: e.clientY - rect.top
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
    await saveWorkflow(workflowInfo.value, nodes.value, validateWorkflowNodes, router, workflowId, clearWorkflowCache, generateConnections, loadWorkflowInfo, connections, botEvents, botActions, processNodeInfo)
  } catch (error) {
    ElMessage.error('保存工作流失败')
  }
}

// 处理保存并测试工作流
const handleSaveAndTest = async () => {
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
      url: '/bot/info',
      method: 'get'
    })
    isBotOnline = botStatusResponse.code === 200 && botStatusResponse.data?.online === true
  } catch (error) {
    // 如果检查失败，默认认为 BOT 不在线
    isBotOnline = false
  }
  
  try {
    // 先保存工作流
    const saveResponse = await saveWorkflow(workflowInfo.value, nodes.value, validateWorkflowNodes, router, workflowId, clearWorkflowCache, generateConnections, loadWorkflowInfo, connections, botEvents, botActions, processNodeInfo)
    
    // 获取工作流ID，优先使用保存后返回的ID
    const currentWorkflowId = saveResponse?.id || workflowInfo.value.id || workflowId
    
    if (!currentWorkflowId) {
      ElMessage.error('工作流保存失败，无法进行测试')
      return
    }
    
    // 检查是否需要测试
    if (hasBotActionNode && !isBotOnline) {
      // BOT 不在线且有 BOT 动作节点，只保存不测试
      ElMessage.warning('您的BOT并未在线无法使用BOT动作节点进行测试，工作流已保存')
      return
    }
    
    // 然后调用测试接口
    const testResponse = await request({
      url: '/workflow/test',
      method: 'post',
      params: {
        workflowId: currentWorkflowId
      }
    })
    
    if (testResponse.code === 200) {
      ElMessage.success('测试工作流成功')
      // 直接设置测试结果和弹窗状态
      testResult.value = testResponse.data
      showTestResult.value = true
    } else {
      ElMessage.error(testResponse.message || '测试工作流失败')
    }
  } catch (error) {
    ElMessage.error('测试工作流失败')
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

// 打开映射配置弹窗
const openMappingConfig = (node) => {
  processNodeInfo(node, botEvents.value, botActions.value)
  currentNode.value = node
  showMappingConfig.value = true
  hideContextMenu()
}

// 打开条件配置弹窗
const openConditionConfig = (node) => {
  currentNode.value = node
  showConditionConfig.value = true
  hideContextMenu()
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
  
  currentNode.value = node
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

// 处理activeTab更新
const updateActiveTab = (value) => {
  activeTab.value = value
}

// 处理节点放置
const handleDropNode = (e) => {
  draggingElement.value = dropNode(e, draggingElement.value, canvasRef, nodes.value, showCanvasPlaceholder)
  handleEndDrag()
}

// 处理浏览器历史变化的函数
const handlePopState = () => {
  loadPlugins(plugins, selectedVersions)
  loadPublicPlugins(publicPlugins, selectedPublicVersions)
}

// 获取BOT在线状态
const fetchBotOnlineStatus = async () => {
  if (hasBotQQ.value) {
    try {
      const botStatusResponse = await request({
        url: '/bot/info',
        method: 'get'
      })
      isBotOnline.value = botStatusResponse.code === 200 && botStatusResponse.data?.online === true
    } catch (error) {
      // 如果检查失败，默认认为 BOT 不在线
      isBotOnline.value = false
    }
  } else {
    isBotOnline.value = false
  }
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
  if (botQQ) {
    await Promise.all([
      loadBotEvents(botEvents),
      loadBotActions(botActions)
    ])
  }
  
  // 加载插件
  loadPlugins(plugins, selectedVersions)
  
  // 加载公开插件
  loadPublicPlugins(publicPlugins, selectedPublicVersions)
  
  // 同步机器人信息
  await syncBotInfo(hasBotQQ, botEvents, botActions, loadBotEvents, loadBotActions)
  
  // 获取BOT在线状态
  await fetchBotOnlineStatus()
  
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
      await loadWorkflowInfo(workflowId, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections)
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
    await loadWorkflowInfo(workflowId, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections)
  }
  
  if (reloadPlugins) {
    loadPlugins(plugins, selectedVersions)
    loadPublicPlugins(publicPlugins, selectedPublicVersions)
  }
  
  generateConnections()
  document.addEventListener('mousemove', handleMouseMoveExtended)
  document.addEventListener('mouseup', handleMouseUpExtended)
  document.addEventListener('mouseleave', handleMouseLeaveExtended)
  window.addEventListener('popstate', handlePopState)
})

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMoveExtended)
  document.removeEventListener('mouseup', handleMouseUpExtended)
  document.removeEventListener('mouseleave', handleMouseLeaveExtended)
  window.removeEventListener('popstate', handlePopState)
  // 离开页面时不清理缓存，因为我们已经在读取完缓存后就清理了
  // 只清理过期缓存
  cleanupExpiredCache()
})
</script>

<template>
  <div class="workflow-edit-view" @click="hideContextMenu">
    <!-- 顶部导航栏 -->
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
            :type="currentMode === 'select' ? 'primary' : ''"
            @click="switchMode('select')"
            title="选取模式"
          >
            <el-icon><Position /></el-icon>
          </el-button>
          <el-button 
            :type="currentMode === 'drag' ? 'primary' : ''"
            @click="switchMode('drag')"
            title="拖动模式"
          >
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-button-group>
        <el-button 
          :type="workflowInfo.enabled ? 'success' : 'danger'" 
          @click="workflowInfo.enabled = !workflowInfo.enabled"
          class="enabled-toggle-btn"
        >
          {{ workflowInfo.enabled ? '启用中' : '已禁用' }}
        </el-button>
      </div>
      <div class="header-right">
        <el-button @click="() => { clearWorkflowCache(); router.push('/workflow/list'); }">取消</el-button>
        <el-button type="primary" @click="handleSaveAndTest" :disabled="hasBotEventNode || isCanvasEmpty" :title="isCanvasEmpty ? '画布上没有节点，无法保存并测试' : (hasBotEventNode ? '存在 BOT 事件节点，无法使用保存并测试功能' : '保存并测试')">保存并测试</el-button>
        <el-button type="success" @click="handleSaveWorkflow" :disabled="isCanvasEmpty" :title="isCanvasEmpty ? '画布上没有节点，无法保存' : '保存'">保存</el-button>
      </div>
    </div>
    
    <!-- 主内容区域 -->
    <div class="workflow-main-content">
      <!-- 左侧插件列表（悬浮窗） -->
      <PluginListComponent
        :key="hasBotQQ"
        :plugins="plugins"
        :public-plugins="publicPlugins"
        :bot-events="botEvents"
        :bot-actions="botActions"
        :has-bot-qq="hasBotQQ"
        :is-bot-online="isBotOnline"
        :show-plugin-list="showPluginList"
        :model-value="activeTab"
        :selected-versions="selectedVersions"
        :selected-public-versions="selectedPublicVersions"
        @update:model-value="updateActiveTab"
        @update:selected-versions="(val) => selectedVersions = val"
        @update:selected-public-versions="(val) => selectedPublicVersions = val"
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
          @mousedown="handleCanvasMouseDownExtended"
          @mousemove="handleMouseMoveExtended"
          @mouseup="handleMouseUpExtended"
          @mouseleave="handleMouseLeaveExtended"
          @drop="handleDropNode"
          @dragover.prevent
          @contextmenu="handleCanvasContextMenu"
          :style="{ transform: `translate(${canvasX}px, ${canvasY}px)` }"
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
          <NodeComponent
            v-for="node in nodes"
            :key="node.id"
            :node="node"
            :is-selected="selectedNodes.some(n => n.id === node.id)"
            @node-mouse-down="handleNodeMouseDownExtended"
            @node-mouse-move="handleNodeMouseMoveExtended"
            @node-mouse-up="handleNodeMouseUpExtended"
            @node-mouse-leave="handleNodeMouseLeaveExtended"
            @node-context-menu="handleNodeContextMenu"
            @node-dbl-click="openMappingConfig"
            @port-mouse-down="handlePortMouseDownExtended"
          />
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
          :can-set-condition="canSetCondition"
          @open-mapping-config="openMappingConfig"
          @open-condition-config="openConditionConfig"
          @delete-selected-nodes="deleteSelectedNodes"
          @copy-selected-nodes="copySelectedNodes"
          @disconnect-selected-nodes="disconnectSelectedNodes"
          @clear-canvas="clearCanvas"
          @delete-selected-connection="deleteSelectedConnection"
        />
      </div>
    </div>
    
    <!-- 数据映射与默认值配置弹窗 -->
    <WorkflowMappingConfig
      :visible="showMappingConfig"
      :node="currentNode"
      :pre-nodes="preNodes"
      :plugins="plugins"
      @update:visible="showMappingConfig = $event"
      @save="(config) => saveMappingConfig(config, currentNode, nodes.value, workflowId)"
    />
    
    <!-- 条件配置弹窗 -->
    <WorkflowConditionConfig
      :visible="showConditionConfig"
      :node="currentNode"
      @update:visible="showConditionConfig = $event"
      @save="(condition) => saveConditionConfig(condition, currentNode, nodes.value, workflowId)"
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
  </div>
</template>

<style scoped>
@import '../../styles/workflow.css';
</style>