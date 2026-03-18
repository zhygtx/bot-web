<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElInput } from 'element-plus'
import { Warning, ArrowDown, ArrowUp, Close, Position, ZoomIn } from '@element-plus/icons-vue'
import request from '../../utils/request'
import WorkflowMappingConfig from '../../components/WorkflowMappingConfig.vue'
import WorkflowConditionConfig from '../../components/WorkflowConditionConfig.vue'

const route = useRoute()
const router = useRouter()
const workflowId = route.params.id
// 判断是新增还是修改模式
const isEditMode = computed(() => !!workflowId)

// 工作流信息
const workflowInfo = ref({
  id: '',
  name: '',
  description: ''
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
const canvasSize = ref({ width: 4000, height: 3000 }) // 缩小画布大小
// 加载状态
const loading = ref(false)
// 插件列表
const plugins = ref([])
// 插件类型（我的插件/公开插件）
const activeTab = ref('my')
// 可编辑状态
const isNameEditable = ref(false)
// 展开的插件卡片
const expandedPlugins = ref(new Set())
// 插件选中版本
const selectedVersions = ref({})
// 插件列表是否显示
const showPluginList = ref(true)
// 当前拖动的节点
const draggingNode = ref(null)
// 节点拖动的起始位置
const nodeDragStart = ref({ x: 0, y: 0 })

// 连线相关状态
const connections = ref([]) // 存储所有连线
const isDrawing = ref(false) // 是否正在绘制连线
const startNode = ref(null) // 起始节点
const startPort = ref(null) // 起始端口（left 或 right）
const tempConnection = ref(null) // 临时连线

// 右键菜单相关状态
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const selectedNodes = ref([]) // 选中的节点
const contextMenuTarget = ref(null) // 右键菜单的目标（node, canvas 或 connection）
const selectedConnection = ref(null) // 选中的连线

// 映射配置弹窗相关状态
const showMappingConfig = ref(false)
const currentNode = ref(null)

// 条件配置弹窗相关状态
const showConditionConfig = ref(false)

// 计算当前节点的前置节点
const preNodes = computed(() => {
  if (!currentNode.value) return []
  
  const nodeId = currentNode.value.id
  return connections.value
    .filter(conn => conn.toNode === nodeId)
    .map(conn => {
      const fromNode = nodes.value.find(n => n.id === conn.fromNode)
      return fromNode
    })
    .filter(Boolean)
})

// 计算当前节点是否可以设置条件
const canSetCondition = computed(() => {
  if (!currentNode.value || !currentNode.value.method) return false
  
  const returnType = currentNode.value.method.returnType
  if (!returnType || returnType === 'void') return false
  
  // 只有返回值为布尔类型的节点才能设置条件
  const booleanTypes = ['Boolean', 'boolean']
  return booleanTypes.includes(returnType)
})

// 模式相关状态
const currentMode = ref('select') // 当前模式：select（选取）或 drag（拖动）

// 框选相关状态
const isSelecting = ref(false) // 是否正在框选
const selectionStart = ref({ x: 0, y: 0 }) // 框选起始位置
const selectionEnd = ref({ x: 0, y: 0 }) // 框选结束位置

// 加载工作流信息
const loadWorkflowInfo = async () => {
  if (workflowId) {
    loading.value = true
    try {
      const response = await request({
        url: `/workflow/${workflowId}`,
        method: 'get'
      })
      console.log('Workflow Detail Response:', response)
      if (response.code === 200) {
        workflowInfo.value = response.data || {}
        // 加载节点信息
        if (workflowInfo.value.nodes) {
          nodes.value = workflowInfo.value.nodes
          // 为每个节点添加 method 属性，指向 methodInfo
          nodes.value.forEach(node => {
            node.method = node.methodInfo
            // 确保 preNodeId 和 nextNodeId 是数组
            if (!node.preNodeId) node.preNodeId = []
            if (!node.nextNodeId) node.nextNodeId = []
            // 确保 dataMaps 是数组
            if (!node.dataMaps) node.dataMaps = []
          })
          // 生成连线
          generateConnections()
        }
      } else {
        ElMessage.error(response.message || '加载工作流信息失败')
      }
    } catch (error) {
      console.error('Error:', error)
      ElMessage.error('加载工作流信息失败')
    } finally {
      loading.value = false
    }
  }
}

// 根据节点的 preNodeId 和 nextNodeId 生成连线
const generateConnections = () => {
  connections.value = []
  nodes.value.forEach(node => {
    if (node.nextNodeId && node.nextNodeId.length > 0) {
      node.nextNodeId.forEach(nextNodeId => {
        // 检查是否已经存在这条连线
        const existingConnection = connections.value.find(conn => 
          conn.fromNode === node.id && conn.toNode === nextNodeId
        )
        if (!existingConnection) {
          const newConnection = {
            id: Date.now() + Math.random(),
            fromNode: node.id,
            fromPort: 'right',
            toNode: nextNodeId,
            toPort: 'left'
          }
          connections.value.push(newConnection)
        }
      })
    }
  })
  console.log('Generated connections:', connections.value)
}

// 加载插件列表
const loadPlugins = async () => {
  try {
    const response = await request({
      url: '/plugin/findByAuthorId',
      method: 'get',
      params: {
        pageNum: 1,
        pageSize: 100
      }
    })
    if (response.code === 200) {
      plugins.value = response.data.list || []
      // 初始化插件版本选择
      plugins.value.forEach(plugin => {
        if (plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0) {
          // 找到第一个有效的版本
          const validVersion = plugin.pluginVersionList.find(v => v && v.id && v.version)
          if (validVersion) {
            selectedVersions.value[plugin.id] = validVersion.id
          }
        }
      })
    } else {
      ElMessage.error(response.message || '加载插件失败')
    }
  } catch (error) {
    ElMessage.error('加载插件失败')
  }
}

// 保存工作流
const saveWorkflow = async () => {
  if (!workflowInfo.value.name) {
    ElMessage.error('请输入工作流名称')
    return
  }
  
  // 验证所有节点的参数是否都有数据映射或默认值
  const validationResult = validateWorkflowNodes()
  if (!validationResult.valid) {
    ElMessage.error(validationResult.message)
    return
  }
  
  // 获取当前用户信息
  const userId = localStorage.getItem('userId')
  const name = localStorage.getItem('name')
  
  // 构建完整的工作流信息
  const workflowData = {
    // 确保工作流自身信息完整填充
    id: workflowInfo.value.id || '',
    userId: workflowInfo.value.userId || userId || '',
    authorName: workflowInfo.value.authorName || name || '',
    name: workflowInfo.value.name || '',
    description: workflowInfo.value.description || '',
    createTime: workflowInfo.value.createTime || null,
    updateTime: workflowInfo.value.updateTime || null,
    nodes: nodes.value.map(node => {
      // 构建节点数据
      return {
        id: node.id ? node.id.toString() : '',
        x: node.x || 0,
        y: node.y || 0,
        workflowId: workflowInfo.value.id || workflowId || '',
        pluginId: node.pluginId || '',
        pluginVersionId: node.pluginVersionId || '',
        methodClassId: node.methodClassId || '',
        methodId: node.methodId || '',
        inDegree: node.inDegree || 0,
        dataMaps: node.dataMaps || [],
        preNodeId: node.preNodeId || [],
        nextNodeId: node.nextNodeId || [],
        nodeDefaults: node.nodeDefaults || [],
        condition: node.condition || null,
        pluginInfo: node.pluginInfo || null,
        pluginVersion: node.pluginVersion || null,
        methodClassInfo: node.methodClassInfo || null,
        methodInfo: node.methodInfo || node.method || null
      }
    })
  }
  
  console.log('保存工作流数据:', workflowData)
  
  loading.value = true
  try {
    const response = await request({
      url: '/workflow',
      method: isEditMode.value ? 'put' : 'post',
      data: workflowData
    })
    
    if (response.code === 200) {
      ElMessage.success(isEditMode.value ? '更新工作流成功' : '创建工作流成功')
      router.push('/workflow/list')
    } else {
      ElMessage.error(response.message || (isEditMode.value ? '更新工作流失败' : '创建工作流失败'))
    }
  } catch (error) {
    ElMessage.error(isEditMode.value ? '更新工作流失败' : '创建工作流失败')
  } finally {
    loading.value = false
  }
}

// 验证工作流节点参数
const validateWorkflowNodes = () => {
  for (const node of nodes.value) {
    // 检查节点是否有方法和参数
    if (node.method && node.method.parameters && node.method.parameters.length > 0) {
      // 获取节点的数据映射和默认值
      const dataMaps = node.dataMaps || []
      const nodeDefaults = node.nodeDefaults || []
      
      // 检查每个参数是否有数据映射或默认值
      for (const param of node.method.parameters) {
        const paramIndex = node.method.parameters.indexOf(param)
        
        // 检查是否有数据映射
        const hasDataMap = dataMaps.some(map => map.paramIndex === paramIndex)
        
        // 检查是否有默认值
        const hasDefaultValue = nodeDefaults.some(defaultVal => defaultVal.paramIndex === paramIndex)
        
        // 如果既没有数据映射也没有默认值，返回错误
        if (!hasDataMap && !hasDefaultValue) {
          return {
            valid: false,
            message: `节点 ${node.method.name} 的参数 ${param.name} 未设置数据映射或默认值`
          }
        }
      }
    }
  }
  
  return {
    valid: true,
    message: ''
  }
}

// 切换工作流名称编辑状态
const toggleNameEdit = () => {
  isNameEditable.value = !isNameEditable.value
}

// 保存工作流名称
const saveWorkflowName = () => {
  isNameEditable.value = false
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
  // 保存当前画布内容到 localStorage
  localStorage.setItem(`workflow_${workflowId}_nodes`, JSON.stringify(nodes.value))
  localStorage.setItem(`workflow_${workflowId}_connections`, JSON.stringify(connections.value))
  
  // 从工作流配置页面跳转的插件详情页不允许编辑
  // 添加returnUrl参数，以便从插件详情页返回时回到工作流编辑页面
  const returnUrl = encodeURIComponent(window.location.href + (window.location.search ? '&' : '?') + 'fromPluginDetail=true&reloadPlugins=true')
  router.push(`/plugin/detail/${pluginId}?readOnly=true&returnUrl=${returnUrl}`)
}

// 切换插件列表显示/隐藏
const togglePluginList = () => {
  showPluginList.value = !showPluginList.value
}

// 画布拖拽功能
const canvasRef = ref(null)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const canvasX = ref(0)
const canvasY = ref(0)

// 画布鼠标按下事件
const handleCanvasMouseDown = (e) => {
  if (currentMode.value === 'drag' || (currentMode.value === 'select' && e.button === 1)) { // 1 是鼠标中键
    isDragging.value = true
    // 记录鼠标相对于画布的初始位置
    startX.value = e.clientX
    startY.value = e.clientY
    // 记录画布当前位置
    const initialCanvasX = canvasX.value
    const initialCanvasY = canvasY.value
    // 保存初始状态
    startX.value = e.clientX - initialCanvasX
    startY.value = e.clientY - initialCanvasY
    canvasRef.value.style.cursor = 'grabbing'
  } else if (currentMode.value === 'select' && e.button === 0) { // 0 是鼠标左键
    // 开始框选
    isSelecting.value = true
    const rect = canvasRef.value.getBoundingClientRect()
    selectionStart.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    selectionEnd.value = { ...selectionStart.value }
  }
}

// 鼠标移动事件
const handleMouseMove = (e) => {
  if (isDrawing.value) {
    // 处理连线绘制
    const rect = canvasRef.value.getBoundingClientRect()
    tempConnection.value = {
      ...tempConnection.value,
      toX: e.clientX - rect.left,
      toY: e.clientY - rect.top
    }
  } else if (isDragging.value) {
    // 处理画布拖动
    e.preventDefault()
    
    // 直接计算新的画布位置，确保完全跟随鼠标
    let newX = e.clientX - startX.value
    let newY = e.clientY - startY.value
    
    // 获取容器尺寸
    const containerRect = document.querySelector('.canvas-container').getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height
    
    // 计算最大拖拽范围（考虑画布移动的方向）
    // 向左拖动（画布向右移动）：canvasX 最大为 containerWidth/2
    const maxRightDrag = containerWidth / 2
    // 向右拖动（画布向左移动）：canvasX 最小为 -(canvasSize.value.width - containerWidth/2)
    const maxLeftDrag = -(canvasSize.value.width - containerWidth / 2)
    // 向上拖动（画布向下移动）：canvasY 最大为 containerHeight/2
    const maxDownDrag = containerHeight / 2
    // 向下拖动（画布向上移动）：canvasY 最小为 -(canvasSize.value.height - containerHeight/2)
    const maxUpDrag = -(canvasSize.value.height - containerHeight / 2)
    
    // 限制拖拽范围
    newX = Math.max(maxLeftDrag, Math.min(maxRightDrag, newX))
    newY = Math.max(maxUpDrag, Math.min(maxDownDrag, newY))
    
    // 更新画布位置
    canvasX.value = newX
    canvasY.value = newY
  } else if (isSelecting.value) {
    // 处理框选
    const rect = canvasRef.value.getBoundingClientRect()
    selectionEnd.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
}

// 鼠标释放事件
const handleMouseUp = (e) => {
  if (isDrawing.value) {
    // 处理连线绘制完成
    isDrawing.value = false
    document.body.style.cursor = 'default'
    
    // 检查是否点击到了另一个节点的链接点
    const targetElement = e.target.closest('.node-dot')
    if (targetElement) {
      const targetNodeElement = targetElement.closest('.workflow-node')
      const targetNodeId = targetNodeElement.dataset.nodeId
      const targetNode = nodes.value.find(n => n.id === targetNodeId)
      const targetPort = targetElement.classList.contains('node-dot-left') ? 'left' : 'right'
      
      // 验证连线规则
  if (validateConnection(startNode.value, startPort.value, targetNode, targetPort)) {
    // 创建新连线
    const newConnection = {
      id: Date.now(),
      fromNode: startNode.value.id,
      fromPort: startPort.value,
      toNode: targetNode.id,
      toPort: targetPort
    }
    connections.value.push(newConnection)
    
    // 更新节点的前置和后置节点ID
    // 更新目标节点的前置节点ID
    if (!targetNode.preNodeId) {
      targetNode.preNodeId = []
    }
    if (!targetNode.preNodeId.includes(startNode.value.id)) {
      targetNode.preNodeId.push(startNode.value.id)
    }
    
    // 更新起始节点的后置节点ID
    if (!startNode.value.nextNodeId) {
      startNode.value.nextNodeId = []
    }
    if (!startNode.value.nextNodeId.includes(targetNode.id)) {
      startNode.value.nextNodeId.push(targetNode.id)
    }
    
    // 更新节点的入度
    targetNode.inDegree = (targetNode.inDegree || 0) + 1
  }
    }
    
    // 重置临时连线
    tempConnection.value = null
    startNode.value = null
    startPort.value = null
  } else if (isSelecting.value) {
    // 处理框选结束
    isSelecting.value = false
    
    // 计算框选区域
    const x1 = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const y1 = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const x2 = Math.max(selectionStart.value.x, selectionEnd.value.x)
    const y2 = Math.max(selectionStart.value.y, selectionEnd.value.y)
    
    // 选择框选区域内的节点
    selectedNodes.value = nodes.value.filter(node => {
      // 节点的位置和尺寸
      const nodeX = node.x
      const nodeY = node.y
      const nodeWidth = 250 // 节点宽度
      const nodeHeight = 80 // 节点高度
      
      // 检查节点是否在框选区域内
      return nodeX >= x1 && nodeX + nodeWidth <= x2 && nodeY >= y1 && nodeY + nodeHeight <= y2
    })
  } else {
    // 处理画布拖动结束
    isDragging.value = false
    canvasRef.value.style.cursor = 'grab'
  }
}

// 鼠标离开事件
const handleMouseLeave = (e) => {
  if (isDrawing.value) {
    // 处理连线绘制取消
    isDrawing.value = false
    document.body.style.cursor = 'default'
    tempConnection.value = null
    startNode.value = null
    startPort.value = null
  } else if (isSelecting.value) {
    // 处理框选取消
    isSelecting.value = false
  } else {
    // 处理画布拖动结束
    isDragging.value = false
    canvasRef.value.style.cursor = 'grab'
  }
}

// 节点鼠标按下事件
const handleNodeMouseDown = (e, node) => {
  e.stopPropagation() // 阻止事件冒泡，避免触发画布拖动
  draggingNode.value = node
  // 记录鼠标相对于节点的偏移量
  const rect = e.target.closest('.workflow-node').getBoundingClientRect()
  nodeDragStart.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  e.target.style.cursor = 'grabbing'
}

// 节点鼠标移动事件
const handleNodeMouseMove = (e) => {
  if (!draggingNode.value) return
  e.preventDefault()
  
  // 直接使用鼠标位置减去偏移量，确保节点完全跟随鼠标
  let newX = e.clientX - nodeDragStart.value.x - canvasX.value
  let newY = e.clientY - nodeDragStart.value.y - canvasY.value
  
  // 限制节点在画布范围内
  const nodeWidth = 250 // 节点的实际宽度
  
  // 尝试获取节点的实际高度
  let nodeHeight = 120 // 默认高度
  try {
    // 查找当前拖动的节点元素
    const nodeElement = document.querySelector(`.workflow-node[data-node-id="${draggingNode.value.id}"]`)
    if (nodeElement) {
      // 获取节点的实际高度
      const rect = nodeElement.getBoundingClientRect()
      nodeHeight = rect.height
    }
  } catch (error) {
    // 如果获取失败，使用默认高度
  }
  
  // 确保节点不超出画布左边界
  newX = Math.max(0, newX)
  // 确保节点不超出画布右边界
  newX = Math.min(canvasSize.value.width - nodeWidth, newX)
  // 确保节点不超出画布上边界
  newY = Math.max(0, newY)
  // 确保节点不超出画布下边界
  newY = Math.min(canvasSize.value.height - nodeHeight, newY)
  
  // 更新节点位置
  draggingNode.value.x = newX
  draggingNode.value.y = newY
}

// 节点鼠标释放事件
const handleNodeMouseUp = () => {
  draggingNode.value = null
  document.body.style.cursor = 'default'
}

// 节点鼠标离开事件
const handleNodeMouseLeave = () => {
  draggingNode.value = null
  document.body.style.cursor = 'default'
}

// 链接点鼠标按下事件
const handlePortMouseDown = (e, node, port) => {
  e.stopPropagation()
  isDrawing.value = true
  startNode.value = node
  startPort.value = port
  document.body.style.cursor = 'crosshair'
  
  // 记录鼠标起始位置
  const rect = canvasRef.value.getBoundingClientRect()
  tempConnection.value = {
    fromNode: node.id,
    fromPort: port,
    toX: e.clientX - rect.left,
    toY: e.clientY - rect.top
  }
}

// 鼠标移动事件（绘制临时连线）
const handleMouseMoveForConnection = (e) => {
  if (!isDrawing.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  tempConnection.value = {
    ...tempConnection.value,
    toX: e.clientX - rect.left,
    toY: e.clientY - rect.top
  }
}

// 鼠标释放事件（完成连线）
const handleMouseUpForConnection = (e) => {
  if (!isDrawing.value) return
  
  isDrawing.value = false
  document.body.style.cursor = 'default'
  
  // 检查是否点击到了另一个节点的链接点
  const targetElement = e.target.closest('.node-dot')
  if (targetElement) {
    const targetNodeElement = targetElement.closest('.workflow-node')
    const targetNodeId = targetNodeElement.dataset.nodeId
    const targetNode = nodes.value.find(n => n.id === targetNodeId)
    const targetPort = targetElement.classList.contains('node-dot-left') ? 'left' : 'right'
    
    // 验证连线规则
    if (validateConnection(startNode.value, startPort.value, targetNode, targetPort)) {
      // 创建新连线
      const newConnection = {
        id: Date.now(),
        fromNode: startNode.value.id,
        fromPort: startPort.value,
        toNode: targetNode.id,
        toPort: targetPort
      }
      connections.value.push(newConnection)
    }
  }
  
  // 重置临时连线
  tempConnection.value = null
  startNode.value = null
  startPort.value = null
}

// 验证连线规则
const validateConnection = (fromNode, fromPort, toNode, toPort) => {
  // 参数检查
  if (!fromNode || !toNode) {
    return false
  }
  
  // 1. 节点不能链接自身
  if (fromNode.id === toNode.id) {
    ElMessage.warning('节点不能链接自身')
    return false
  }
  
  // 2. 左侧只能作为入位置，右侧只能作为出位置
  if (fromPort !== 'right' || toPort !== 'left') {
    ElMessage.warning('只能从右侧端口连接到左侧端口')
    return false
  }
  
  // 3. 检查是否存在环
  if (wouldCreateCycle(fromNode.id, toNode.id)) {
    ElMessage.warning('连线会创建环，无法连接')
    return false
  }
  
  return true
}

// 检查是否会创建环
const wouldCreateCycle = (fromNodeId, toNodeId) => {
  // 简单的环检测：检查是否存在从 toNode 到 fromNode 的路径
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
    
    // 查找所有从 currentNode 出发的连线
    for (const conn of connections.value) {
      if (conn.fromNode === currentNodeId) {
        stack.push(conn.toNode)
      }
    }
  }
  
  return false
}

// 获取链接点位置
const getPortPosition = (nodeId, port) => {
  const node = nodes.value.find(n => n.id === nodeId)
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
  
  const portSize = 12 // 链接点大小
  
  const x = node.x + (port === 'left' ? 0 : nodeWidth)
  const y = node.y + nodeHeight / 2
  
  return { x, y }
}

// 检查链接点是否已连接
const isPortConnected = (nodeId, port) => {
  if (port === 'left') {
    return connections.value.some(conn => conn.toNode === nodeId && conn.toPort === 'left')
  } else {
    return connections.value.some(conn => conn.fromNode === nodeId && conn.fromPort === 'right')
  }
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

// 显示右键菜单
const showContextMenuHandler = (e, target, data = null) => {
  e.preventDefault()
  e.stopPropagation()
  
  // 设置右键菜单位置
  contextMenuPosition.value = {
    x: e.clientX,
    y: e.clientY
  }
  
  // 设置目标
  contextMenuTarget.value = target
  
  // 处理不同类型的目标
  if (target === 'node' && data) {
    // 检查点击的节点是否已经在选中列表中
    const isNodeSelected = selectedNodes.value.some(node => node.id === data.id)
    // 如果节点已经被选中且当前有多个选中节点，保持当前选择
    if (!isNodeSelected || selectedNodes.value.length === 0) {
      selectedNodes.value = [data]
    }
  } else if (target === 'connection' && data) {
    selectedConnection.value = data
  }
  
  // 显示右键菜单
  showContextMenu.value = true
}

// 隐藏右键菜单
const hideContextMenu = () => {
  showContextMenu.value = false
  contextMenuTarget.value = null
}

// 删除选中的节点
const deleteSelectedNodes = () => {
  if (selectedNodes.value.length > 0) {
    // 获取所有选中节点的 ID
    const selectedNodeIds = selectedNodes.value.map(node => node.id)
    
    // 删除相关的连线
    connections.value = connections.value.filter(conn => {
      return !selectedNodeIds.includes(conn.fromNode) && !selectedNodeIds.includes(conn.toNode)
    })
    
    // 删除节点
    nodes.value = nodes.value.filter(node => !selectedNodeIds.includes(node.id))
    
    // 隐藏右键菜单
    hideContextMenu()
  }
}

// 复制选中的节点
const copySelectedNodes = () => {
  if (selectedNodes.value.length > 0) {
    // 复制节点（简单实现，实际项目中可能需要更复杂的逻辑）
    selectedNodes.value.forEach((node, index) => {
      const copiedNode = {
        ...node,
        id: (Date.now() + index).toString(), // 生成新的 ID，确保唯一性
        x: node.x + 20, // 偏移位置
        y: node.y + 20,
        dataMaps: [], // 复制的节点映射为空
        nodeDefaults: [], // 复制的节点默认值为空
        condition: null, // 复制的节点条件为空
        preNodeId: [], // 复制的节点前置节点为空
        nextNodeId: [] // 复制的节点后置节点为空
      }
      nodes.value.push(copiedNode)
    })
    
    // 隐藏右键菜单
    hideContextMenu()
  }
}

// 清空画布
const clearCanvas = () => {
  nodes.value = []
  connections.value = []
  selectedNodes.value = []
  hideContextMenu()
}

// 切换模式
const switchMode = (mode) => {
  currentMode.value = mode
}

// 处理画布右键事件
const handleCanvasContextMenu = (e) => {
  showContextMenuHandler(e, 'canvas')
}

// 处理节点右键事件
const handleNodeContextMenu = (e, node) => {
  showContextMenuHandler(e, 'node', node)
}

// 处理连线右键事件
const handleConnectionContextMenu = (e, connection) => {
  showContextMenuHandler(e, 'connection', connection)
}

// 删除选中的连线
const deleteSelectedConnection = () => {
  if (selectedConnection.value) {
    const connection = selectedConnection.value
    
    // 更新节点的前置和后置节点ID
    const fromNode = nodes.value.find(n => n.id === connection.fromNode)
    const toNode = nodes.value.find(n => n.id === connection.toNode)
    
    if (fromNode && fromNode.nextNodeId) {
      fromNode.nextNodeId = fromNode.nextNodeId.filter(nodeId => nodeId !== connection.toNode)
    }
    
    if (toNode && toNode.preNodeId) {
      toNode.preNodeId = toNode.preNodeId.filter(nodeId => nodeId !== connection.fromNode)
      // 更新节点的入度
      toNode.inDegree = Math.max(0, (toNode.inDegree || 0) - 1)
    }
    
    // 删除连线
    connections.value = connections.value.filter(conn => conn.id !== connection.id)
    hideContextMenu()
  }
}

// 解除选中节点的所有连线
const disconnectSelectedNodes = () => {
  if (selectedNodes.value.length > 0) {
    const selectedNodeIds = selectedNodes.value.map(node => node.id)
    
    // 找出所有需要删除的连线
    const connectionsToDelete = connections.value.filter(conn => {
      return selectedNodeIds.includes(conn.fromNode) || selectedNodeIds.includes(conn.toNode)
    })
    
    // 更新相关节点的前置和后置节点ID
    connectionsToDelete.forEach(connection => {
      const fromNode = nodes.value.find(n => n.id === connection.fromNode)
      const toNode = nodes.value.find(n => n.id === connection.toNode)
      
      if (fromNode && fromNode.nextNodeId) {
        fromNode.nextNodeId = fromNode.nextNodeId.filter(nodeId => nodeId !== connection.toNode)
      }
      
      if (toNode && toNode.preNodeId) {
        toNode.preNodeId = toNode.preNodeId.filter(nodeId => nodeId !== connection.fromNode)
        // 更新节点的入度
        toNode.inDegree = Math.max(0, (toNode.inDegree || 0) - 1)
      }
    })
    
    // 删除连线
    connections.value = connections.value.filter(conn => {
      return !selectedNodeIds.includes(conn.fromNode) && !selectedNodeIds.includes(conn.toNode)
    })
    
    hideContextMenu()
  }
}

// 打开映射配置弹窗
const openMappingConfig = (node) => {
  console.log('openMappingConfig called with node:', node)
  console.log('Before setting showMappingConfig:', showMappingConfig.value)
  currentNode.value = node
  showMappingConfig.value = true
  console.log('After setting showMappingConfig:', showMappingConfig.value)
  console.log('currentNode:', currentNode.value)
  hideContextMenu()
}

// 打开条件配置弹窗
const openConditionConfig = (node) => {
  console.log('openConditionConfig called with node:', node)
  currentNode.value = node
  showConditionConfig.value = true
  hideContextMenu()
}

// 保存映射配置
const saveMappingConfig = (config) => {
  if (currentNode.value) {
    // 更新 currentNode
    currentNode.value.dataMaps = config.dataMaps
    currentNode.value.nodeDefaults = config.nodeDefaults
    
    // 同时更新 nodes.value 中对应的节点
    const nodeIndex = nodes.value.findIndex(n => n.id === currentNode.value.id)
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].dataMaps = config.dataMaps
      nodes.value[nodeIndex].nodeDefaults = config.nodeDefaults
      console.log('Updated node in nodes array:', nodes.value[nodeIndex])
    }
    
    // 保存到本地存储
    localStorage.setItem(`workflow_${workflowId}_nodes`, JSON.stringify(nodes.value))
    console.log('Saved nodes to localStorage:', nodes.value)
  }
}

// 保存条件配置
const saveConditionConfig = (condition) => {
  if (currentNode.value) {
    // 更新 currentNode
    currentNode.value.condition = condition
    
    // 同时更新 nodes.value 中对应的节点
    const nodeIndex = nodes.value.findIndex(n => n.id === currentNode.value.id)
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].condition = condition
      console.log('Updated node in nodes array:', nodes.value[nodeIndex])
    }
    
    // 保存到本地存储
    localStorage.setItem(`workflow_${workflowId}_nodes`, JSON.stringify(nodes.value))
    console.log('Saved nodes to localStorage:', nodes.value)
  }
}

// 开始拖动方法
const startDrag = (e, method, methodClass, plugin, version) => {
  draggingElement.value = {
    method,
    methodClass,
    plugin,
    version,
    type: 'method'
  }
  dragStart.value = {
    x: e.clientX,
    y: e.clientY
  }
  document.body.style.cursor = 'grabbing'
  e.dataTransfer.effectAllowed = 'copy'
}

// 拖动结束
const endDrag = () => {
  draggingElement.value = null
  document.body.style.cursor = 'default'
}

// 画布上放置节点
const dropNode = (e) => {
  e.preventDefault()
  if (draggingElement.value && draggingElement.value.type === 'method') {
    // 计算节点在画布上的位置（相对于画布的偏移）
    const rect = canvasRef.value.getBoundingClientRect()
    // 直接使用鼠标相对于画布的位置，不需要减去 canvasX 和 canvasY
    // 因为节点是相对于画布定位的，而画布已经有了 transform
    const nodeX = e.clientX - rect.left
    const nodeY = e.clientY - rect.top
    
    // 创建新节点
    const newNode = {
      id: Date.now().toString(),
      x: nodeX,
      y: nodeY,
      workflowId: workflowInfo.value.id || workflowId,
      pluginId: draggingElement.value.plugin?.id || '',
      pluginVersionId: draggingElement.value.version?.id || '',
      methodClassId: draggingElement.value.methodClass?.id || '',
      methodId: draggingElement.value.method?.id || '',
      inDegree: 0,
      dataMaps: [],
      preNodeId: [],
      nextNodeId: [],
      nodeDefaults: [],
      condition: null,
      pluginInfo: draggingElement.value.plugin || null,
      pluginVersion: draggingElement.value.version || null,
      methodClassInfo: draggingElement.value.methodClass || null,
      methodInfo: draggingElement.value.method || null,
      method: draggingElement.value.method,
      methodClass: draggingElement.value.methodClass,
      plugin: draggingElement.value.plugin
    }
    
    // 添加到节点列表
    nodes.value.push(newNode)
    
    // 隐藏提示信息
    showCanvasPlaceholder.value = false
  }
  endDrag()
}

// 画布拖动结束时更新节点位置
const handleCanvasDragEnd = () => {
  // 这里不需要特殊处理，因为节点位置是相对于画布的
  // 当画布移动时，节点会自动跟随
}

// 处理浏览器历史变化的函数
const handlePopState = () => {
  loadPlugins()
}

// 初始化加载
onMounted(() => {
  loadWorkflowInfo()
  loadPlugins()
  
  // 检查是否是从插件详情页返回的
  let fromPluginDetail = false
  let reloadPlugins = false
  
  // 解析 URL 参数，处理 hash 模式
  if (window.location.hash) {
    const hash = window.location.hash.substring(1) // 移除 #
    const hashParts = hash.split('?')
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1])
      fromPluginDetail = hashParams.get('fromPluginDetail') === 'true'
      reloadPlugins = hashParams.get('reloadPlugins') === 'true'
    }
  } else {
    // 非 hash 模式
    const urlParams = new URLSearchParams(window.location.search)
    fromPluginDetail = urlParams.get('fromPluginDetail') === 'true'
    reloadPlugins = urlParams.get('reloadPlugins') === 'true'
  }
  
  if (fromPluginDetail) {
    // 从插件详情页返回，恢复画布内容
    const savedNodes = localStorage.getItem(`workflow_${workflowId}_nodes`)
    const savedConnections = localStorage.getItem(`workflow_${workflowId}_connections`)
    
    if (savedNodes) {
      nodes.value = JSON.parse(savedNodes)
    }
    
    if (savedConnections) {
      connections.value = JSON.parse(savedConnections)
    }
    
    // 清除 URL 中的 fromPluginDetail 和 reloadPlugins 参数
    if (window.location.hash) {
      const hash = window.location.hash.substring(1) // 移除 #
      const hashParts = hash.split('?')
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1])
        hashParams.delete('fromPluginDetail')
        hashParams.delete('reloadPlugins')
        const newHash = hashParts[0] + (hashParams.toString() ? '?' + hashParams.toString() : '')
        window.history.replaceState({}, '', '#' + newHash)
      }
    } else {
      // 非 hash 模式
      const urlParams = new URLSearchParams(window.location.search)
      urlParams.delete('fromPluginDetail')
      urlParams.delete('reloadPlugins')
      window.history.replaceState({}, '', window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : ''))
    }
  } else {
    // 不是从插件详情页返回，清除缓存
    localStorage.removeItem(`workflow_${workflowId}_nodes`)
    localStorage.removeItem(`workflow_${workflowId}_connections`)
    // 重置节点和连线
    nodes.value = []
    connections.value = []
  }
  
  // 检查是否需要重新加载插件列表
  if (reloadPlugins) {
    // 重新加载插件列表
    loadPlugins()
  }
  
  // 添加全局鼠标事件监听器
  document.addEventListener('mousemove', handleNodeMouseMove)
  document.addEventListener('mouseup', handleNodeMouseUp)
  document.addEventListener('mouseleave', handleNodeMouseLeave)
  
  // 监听浏览器历史变化，确保从插件详情页返回时重新加载插件列表
  window.addEventListener('popstate', handlePopState)
})

// 清理事件监听器
onUnmounted(() => {
  // 保存画布内容到 localStorage，以便从插件详情页返回时恢复
  localStorage.setItem(`workflow_${workflowId}_nodes`, JSON.stringify(nodes.value))
  localStorage.setItem(`workflow_${workflowId}_connections`, JSON.stringify(connections.value))
  
  document.removeEventListener('mousemove', handleNodeMouseMove)
  document.removeEventListener('mouseup', handleNodeMouseUp)
  document.removeEventListener('mouseleave', handleNodeMouseLeave)
  
  // 清理 popstate 事件监听器
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <div class="workflow-edit-view" @click="hideContextMenu">
    <!-- 顶部导航栏 -->
    <div class="workflow-header">
      <div class="header-left">
        <el-button class="exit-button" @click="router.push('/workflow/list')" circle>
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
      </div>
      <div class="header-right">
        <el-button @click="router.push('/workflow/list')">取消</el-button>
        <el-button type="primary" @click="saveWorkflow">保存</el-button>
      </div>
    </div>
    
    <!-- 主内容区域 -->
    <div class="workflow-main-content">
      <!-- 左侧插件列表（悬浮窗） -->
      <div class="plugin-list-float" :class="{ 'plugin-list-collapsed': !showPluginList }">
        <div class="plugin-list-header">
          <h3 v-if="showPluginList">插件列表</h3>
          <el-button @click="togglePluginList" circle size="small">
            <el-icon v-if="showPluginList"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
          </el-button>
        </div>
        <el-tabs v-model="activeTab" class="plugin-tabs" :tab-position="'top'">
          <el-tab-pane label="我的插件" name="my">
            <div class="plugin-list">
              <el-card 
                v-for="plugin in plugins" 
                :key="plugin.id" 
                class="plugin-item-card"
              >
                <div class="plugin-card-content">
                    <div class="plugin-card-header">
                      <h3 class="plugin-name">{{ plugin.name }}</h3>
                      <div class="plugin-version-selector" v-if="plugin.pluginVersionList && plugin.pluginVersionList.length > 0">
                        <el-select v-model="selectedVersions[plugin.id]" size="small" class="version-select">
                          <el-option 
                            v-for="ver in plugin.pluginVersionList" 
                            :key="ver.id" 
                            :label="ver.version" 
                            :value="ver.id"
                          />
                        </el-select>
                      </div>
                      <el-icon @click="goToPluginDetail(plugin.id)" title="查看插件详情" class="info-icon">
                        <Warning />
                      </el-icon>
                    </div>
                    <div class="plugin-card-description">
                      {{ plugin.description }}
                    </div>
                    <div class="plugin-card-footer" v-if="!expandedPlugins.has(plugin.id)">
                      <el-icon @click="togglePluginExpand(plugin.id)" class="expand-icon">
                        <ArrowDown />
                      </el-icon>
                    </div>
                    <div class="plugin-card-methods" v-if="expandedPlugins.has(plugin.id)">
                      <h4>方法类</h4>
                      <div v-if="plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0 && selectedVersions[plugin.id]">
                        <!-- 直接找到选中的版本 -->
                        <div v-if="true">
                          <!-- 找到选中的版本对象 -->
                          <div v-if="true">
                            <!-- 使用计算属性的方式找到选中的版本 -->
                            <div v-if="true">
                              <!-- 检查是否有选中的版本 -->
                              <div v-if="selectedVersions[plugin.id]">
                                <!-- 找到选中的版本 -->
                                <div v-if="true">
                                  <!-- 遍历所有版本，找到选中的那个 -->
                                  <div v-for="versionItem in plugin.pluginVersionList" :key="versionItem?.id">
                                    <!-- 只显示选中的版本 -->
                                    <div v-if="versionItem && versionItem.id && versionItem.id === selectedVersions[plugin.id]">
                                      <!-- 检查是否有方法类 -->
                                      <div v-if="versionItem.methodClassInfoList && versionItem.methodClassInfoList.length > 0">
                                        <!-- 显示方法类 -->
                                        <div v-for="methodClass in versionItem.methodClassInfoList" :key="methodClass.id" class="method-class-card">
                                          <div class="method-class-header">
                                            <h5 class="method-class-name">{{ methodClass.simpleClassName }}</h5>
                                            <span class="method-class-description">{{ methodClass.description || '无描述' }}</span>
                                          </div>
                                          <div class="methods-list">
                                            <!-- 显示方法 -->
                                            <div v-for="method in methodClass.methods" :key="method.id" class="method-item">
                                              <span 
                                                class="method-signature"
                                                draggable="true"
                                                @dragstart="startDrag($event, method, methodClass, plugin, versionItem)"
                                                @dragend="endDrag"
                                              >
                                                {{ method.returnType }} {{ method.name }}(
                                                  <template v-if="method.parameters && method.parameters.length > 0">
                                                    <span v-for="(param, index) in method.parameters" :key="param.id">
                                                      {{ param.type }} {{ param.name }}{{ index < method.parameters.length - 1 ? ', ' : '' }}
                                                    </span>
                                                  </template>
                                                )
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div v-else class="no-methods">
                                        该版本暂无方法类
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else class="no-methods">
                        暂无版本或未选择版本
                      </div>
                      <div class="plugin-card-footer">
                        <el-icon @click="togglePluginExpand(plugin.id)" class="expand-icon">
                          <ArrowUp />
                        </el-icon>
                      </div>
                    </div>
                  </div>
              </el-card>
            </div>
          </el-tab-pane>
          <el-tab-pane label="公开插件" name="public">
            <div class="plugin-list">
              <!-- 公开插件列表 -->
              <el-empty description="暂无公开插件" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <!-- 右侧画布 -->
      <div class="canvas-container">
        <div 
          class="canvas" 
          ref="canvasRef"
          @mousedown="handleCanvasMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseLeave"
          @drop="dropNode"
          @dragover.prevent
          @contextmenu="handleCanvasContextMenu"
          :style="{ transform: `translate(${canvasX}px, ${canvasY}px)` }"
        >
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
              :d="`M ${getPortPosition(connection.fromNode, connection.fromPort).x} ${getPortPosition(connection.fromNode, connection.fromPort).y} L ${getPortPosition(connection.toNode, connection.toPort).x} ${getPortPosition(connection.toNode, connection.toPort).y}`"
              stroke="#409eff"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
            <!-- 绘制临时连线 -->
            <line 
              v-if="tempConnection"
              :x1="getPortPosition(tempConnection.fromNode, tempConnection.fromPort).x"
              :y1="getPortPosition(tempConnection.fromNode, tempConnection.fromPort).y"
              :x2="tempConnection.toX"
              :y2="tempConnection.toY"
              stroke="#409eff"
              stroke-width="2"
              stroke-dasharray="5,5"
              marker-end="url(#arrowhead)"
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
          
          <!-- 画布上的节点 -->
          <div 
            v-for="node in nodes" 
            :key="node.id"
            class="workflow-node"
            :class="{ 'node-selected': selectedNodes.some(n => n.id === node.id) }"
            :data-node-id="node.id"
            :style="{ left: node.x + 'px', top: node.y + 'px' }"
            @mousedown="handleNodeMouseDown($event, node)"
            @mousemove="handleNodeMouseMove"
            @mouseup="handleNodeMouseUp"
            @mouseleave="handleNodeMouseLeave"
            @contextmenu="handleNodeContextMenu($event, node)"
            @dblclick="openMappingConfig(node)"
          >
            <div class="node-content">
              <div class="node-body">
                <div 
                  v-if="node.method && node.method.parameters && node.method.parameters.length > 0"
                  class="node-dot node-dot-left"
                  :class="{ 'node-dot-filled': isPortConnected(node.id, 'left') }"
                  @mousedown="handlePortMouseDown($event, node, 'left')"
                ></div>
                <div class="node-content-inner">
                  <div class="node-header">
                    <span class="node-method-name">{{ node.method ? node.method.name : '未知方法' }}</span>
                  </div>
                  <div v-if="node.method && node.method.description" class="node-description">
                    {{ node.method.description }}
                  </div>
                  <div class="node-params">
                    <span v-for="(param, index) in (node.method && node.method.parameters ? node.method.parameters : [])" :key="index" class="node-param">
                      {{ param.type }} {{ param.name }}
                    </span>
                  </div>
                  <div class="node-return">
                    <span class="return-label">返回值:</span>
                    <span class="return-type">{{ node.method ? node.method.returnType : 'void' }}</span>
                  </div>
                </div>
                <div 
                  v-if="node.method && node.method.returnType && node.method.returnType !== 'void'"
                  class="node-dot node-dot-right"
                  :class="{ 'node-dot-filled': isPortConnected(node.id, 'right') }"
                  @mousedown="handlePortMouseDown($event, node, 'right')"
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="showCanvasPlaceholder" class="canvas-placeholder">
          <h3>工作流画布</h3>
          <p>拖拽左侧插件到此处创建工作流节点</p>
        </div>
        
        <!-- 右键菜单 -->
        <div 
          v-if="showContextMenu" 
          class="context-menu"
          :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
          @click.stop
        >
          <div v-if="contextMenuTarget === 'node'" class="context-menu-items">
            <div class="context-menu-item" @click="openMappingConfig(selectedNodes[0])">配置映射</div>
            <div v-if="canSetCondition" class="context-menu-item" @click="openConditionConfig(selectedNodes[0])">配置条件</div>
            <div class="context-menu-item" @click="deleteSelectedNodes">删除</div>
            <div class="context-menu-item" @click="copySelectedNodes">复制</div>
            <div class="context-menu-item" @click="disconnectSelectedNodes">解除连线</div>
          </div>
          <div v-else-if="contextMenuTarget === 'canvas'" class="context-menu-items">
            <div class="context-menu-item" @click="clearCanvas">清空画布</div>
          </div>
          <div v-else-if="contextMenuTarget === 'connection'" class="context-menu-items">
            <div class="context-menu-item" @click="deleteSelectedConnection">删除连线</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 数据映射与默认值配置弹窗 -->
    <workflow-mapping-config
      :visible="showMappingConfig"
      :node="currentNode"
      :pre-nodes="preNodes"
      @update:visible="showMappingConfig = $event"
      @save="saveMappingConfig"
    />
    
    <!-- 条件配置弹窗 -->
    <workflow-condition-config
      :visible="showConditionConfig"
      :node="currentNode"
      @update:visible="showConditionConfig = $event"
      @save="saveConditionConfig"
    />
  </div>
</template>

<style scoped>
.workflow-edit-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* 顶部导航栏（悬浮） */
.workflow-header {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
  backdrop-filter: blur(10px);
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.exit-button {
  color: #909399;
  transition: all 0.3s ease;
}

.exit-button:hover {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.1);
}

.workflow-name-container {
  position: relative;
}

.workflow-name {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  cursor: text;
  transition: all 0.3s ease;
}

.workflow-name:hover {
  color: #409eff;
}

.workflow-name-input {
  width: 300px;
  font-size: 18px;
  font-weight: bold;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* 工作流描述 */
.workflow-description {
  padding: 15px 20px;
  background-color: white;
  border-bottom: 1px solid #e6e6e6;
}

.description-input {
  width: 100%;
  resize: none;
}

/* 主内容区域 */
.workflow-main-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #f9f9f9;
}

/* 左侧插件列表（悬浮窗） */
.plugin-list-float {
  position: absolute;
  left: 20px;
  top: 100px;
  width: 320px;
  height: calc(100% - 120px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 300;
  transition: all 0.3s ease;
  display: block !important;
}

/* 插件列表收起状态 */
.plugin-list-float.plugin-list-collapsed {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.plugin-list-float.plugin-list-collapsed .plugin-list-header {
  padding: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: none;
  background-color: white;
}

.plugin-list-float.plugin-list-collapsed .plugin-list-header h3 {
  display: none;
}

.plugin-list-float.plugin-list-collapsed .plugin-tabs {
  display: none;
}

.plugin-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e6e6e6;
  background-color: #f9f9f9;
}

.plugin-list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.plugin-tabs {
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs) {
  width: 100%;
}

:deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
  justify-content: space-around;
}

:deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plugin-item-card {
  margin-bottom: 0;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.plugin-item-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.plugin-card-content {
  padding: 15px;
  position: relative;
}

.plugin-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.plugin-name {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-version-selector {
  flex-shrink: 0;
}

.version-select {
  width: 80px;
}

.info-icon {
  font-size: 18px;
  color: #409eff;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 2px;
  border-radius: 4px;
}

.info-icon:hover {
  color: #66b1ff;
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(1.1);
}

.plugin-card-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 10px;
}

.plugin-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

.expand-icon {
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.expand-icon:hover {
  color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(1.1);
}

.plugin-card-methods {
  font-size: 14px;
  margin-top: 10px;
  animation: slideDown 0.3s ease;
}

.plugin-card-methods h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

/* 方法类卡片样式 */
.method-class-card {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  margin-bottom: 15px;
  overflow: hidden;
  background-color: white;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.method-class-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.method-class-header {
  padding: 10px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.method-class-name {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.method-class-description {
  font-size: 12px;
  color: #606266;
}

/* 方法列表样式 */
.methods-list {
  padding: 10px 15px;
}

/* 方法项样式 */
.method-item {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.method-item:last-child {
  border-bottom: none;
}

.method-item:hover {
  background-color: #f5f7fa;
  padding-left: 8px;
  border-radius: 4px;
}

/* 方法签名样式 */
.method-signature {
  font-weight: bold;
  color: #303133;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  line-height: 1.4;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.plugin-card-methods h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.method-class-name {
  font-weight: bold;
  margin-bottom: 5px;
  color: #303133;
}

.methods-list {
  margin-left: 15px;
  margin-bottom: 10px;
}

.method-item {
  font-size: 13px;
  color: #606266;
  margin-bottom: 3px;
}

.no-methods {
  font-size: 13px;
  color: #909399;
  margin: 10px 0;
  text-align: center;
}

/* 右侧画布 */
.canvas-container {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
  margin: 0;
  overflow: hidden;
  position: relative;
  background-color: white;
  box-shadow: none;
}



.canvas {
  width: 4000px; /* 缩小画布宽度 */
  height: 3000px; /* 缩小画布高度 */
  position: absolute;
  top: 0;
  left: 0;
  background-image: radial-gradient(#e0e0e0 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: grab;
  transition: none; /* 移除过渡效果，确保画布拖动时完全跟随鼠标 */
  border: 2px solid #909399; /* 添加画布边框，明确标注边界 */
  box-sizing: border-box;
  user-select: none; /* 禁止选中 */
}

.canvas:active {
  cursor: grabbing;
}

.canvas-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #909399;
  user-select: none;
  z-index: 10;
  pointer-events: none; /* 确保点击穿透到画布 */
}

.canvas-placeholder h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: normal;
  user-select: none;
}

.canvas-placeholder p {
  margin: 0;
  font-size: 14px;
  user-select: none;
}

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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.node-content {
  width: 100%;
}

.node-body {
  background-color: white;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 80px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.node-content-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #409eff;
  border-radius: 50%;
  background-color: white;
  flex-shrink: 0;
  cursor: crosshair;
  transition: all 0.3s ease;
}

.node-dot:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
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
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.return-label {
  font-weight: bold;
}

.return-type {
  background-color: #ecf5ff;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #d9ecff;
  color: #409eff;
  font-family: 'Courier New', monospace;
}

/* 拖动时的样式 */
.method-signature {
  cursor: grab;
  transition: all 0.2s ease;
}

.method-signature:hover {
  color: #409eff;
  text-decoration: underline;
}

.method-signature:active {
  cursor: grabbing;
}

/* 连线点击区域样式 */
.connection-hitbox {
  background-color: transparent;
  position: absolute;
  pointer-events: auto;
}

/* 选中节点的样式 */
.node-selected .node-body {
  border: 2px solid #409eff;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 4px 0;
}

.context-menu-items {
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  transition: all 0.3s ease;
}

.context-menu-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}
</style>