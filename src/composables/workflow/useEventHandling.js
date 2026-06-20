import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 事件处理模块
export function useEventHandling() {
  // 画布拖拽功能
  const canvasRef = ref(null)
  const isDragging = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const canvasX = ref(0)
  const canvasY = ref(0)

  // 画布鼠标按下事件
  const handleCanvasMouseDown = (e, currentMode) => {
    if (currentMode === 'drag' || (currentMode === 'select' && e.button === 1)) { // 1 是鼠标中键
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
    }
  }

  // 鼠标移动事件
  const handleMouseMove = (e, isDrawing, tempConnection, canvasSize) => {
    if (isDragging.value) {
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
      // 向右拖动（画布向左移动）：canvasX 最小为 -(canvasSize.width - containerWidth/2)
      const maxLeftDrag = -(canvasSize.width - containerWidth / 2)
      // 向上拖动（画布向下移动）：canvasY 最大为 containerHeight/2
      const maxDownDrag = containerHeight / 2
      // 向下拖动（画布向上移动）：canvasY 最小为 -(canvasSize.height - containerHeight/2)
      const maxUpDrag = -(canvasSize.height - containerHeight / 2)
      
      // 限制拖拽范围
      newX = Math.max(maxLeftDrag, Math.min(maxRightDrag, newX))
      newY = Math.max(maxUpDrag, Math.min(maxDownDrag, newY))
      
      // 更新画布位置
      canvasX.value = newX
      canvasY.value = newY
    }
  }

  // 鼠标释放事件
  const handleMouseUp = (e, isDrawing, canvasRef) => {
    if (isDragging.value && canvasRef) {
      // 处理画布拖动结束
      isDragging.value = false
      canvasRef.style.cursor = 'grab'
    }
  }

  // 鼠标离开事件
  const handleMouseLeave = (e, isDrawing, canvasRef) => {
    if (isDragging.value && canvasRef) {
      // 处理画布拖动结束
      isDragging.value = false
      canvasRef.style.cursor = 'grab'
    }
  }

  // 节点鼠标按下事件
  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发画布拖动
    return {
      node,
      offset: {
        x: e.clientX - e.target.closest('.workflow-node').getBoundingClientRect().left,
        y: e.clientY - e.target.closest('.workflow-node').getBoundingClientRect().top
      }
    }
  }

  // 节点鼠标移动事件
  const handleNodeMouseMove = (e, draggingNode, nodeDragStart, canvasX, canvasSize) => {
    if (!draggingNode) return
    e.preventDefault()
    
    // 直接使用鼠标位置减去偏移量，确保节点完全跟随鼠标
    let newX = e.clientX - nodeDragStart.x - canvasX.value
    let newY = e.clientY - nodeDragStart.y - canvasX.value
    
    // 限制节点在画布范围内
    const nodeWidth = 250 // 节点的实际宽度
    
    // 尝试获取节点的实际高度
    let nodeHeight = 120 // 默认高度
    try {
      // 查找当前拖动的节点元素
      const nodeElement = document.querySelector(`.workflow-node[data-node-id="${draggingNode.id}"]`)
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
    newX = Math.min(canvasSize.width - nodeWidth, newX)
    // 确保节点不超出画布上边界
    newY = Math.max(0, newY)
    // 确保节点不超出画布下边界
    newY = Math.min(canvasSize.height - nodeHeight, newY)
    
    // 更新节点位置
    draggingNode.x = newX
    draggingNode.y = newY
  }

  // 节点鼠标释放事件
  const handleNodeMouseUp = () => {
    return null
  }

  // 节点鼠标离开事件
  const handleNodeMouseLeave = () => {
    return null
  }

  // 链接点鼠标按下事件
  const handlePortMouseDown = (e, node, port, canvasRef) => {
    e.stopPropagation()
    // 记录鼠标起始位置
    const rect = canvasRef.value.getBoundingClientRect()
    return {
      fromNode: node.id,
      fromPort: port,
      toX: e.clientX - rect.left,
      toY: e.clientY - rect.top
    }
  }

  // 开始拖动方法
  const startDrag = (e, method, methodClass, plugin, version) => {
    e.dataTransfer.effectAllowed = 'copy'
    return {
      method,
      methodClass,
      plugin,
      version,
      type: 'method'
    }
  }

  // 开始拖动 BOT 事件
  const startDragBotEvent = (e, event) => {
    e.dataTransfer.effectAllowed = 'copy'
    return {
      event,
      type: 'botEvent'
    }
  }

  // 开始拖动 BOT 动作
  const startDragBotAction = (e, action) => {
    e.dataTransfer.effectAllowed = 'copy'
    return {
      action,
      type: 'botAction'
    }
  }

  // 拖动结束
  const endDrag = () => {
    return null
  }

  // 画布上放置节点
  const dropNode = (e, draggingElement, canvasRef, nodes, showCanvasPlaceholder, zoom) => {
    e.preventDefault()
    if (draggingElement) {
      // 计算节点在画布上的位置（相对于画布的偏移，需除以缩放系数）
      const rect = canvasRef.value.getBoundingClientRect()
      const z = zoom?.value ?? 1
      const nodeX = (e.clientX - rect.left) / z
      const nodeY = (e.clientY - rect.top) / z
      
      let newNode
      
      if (draggingElement.type === 'method') {
        // 对方法参数按照order字段排序，当order相同或不存在时按照参数名排序
        const method = draggingElement.method
        if (method && method.parameters) {
          method.parameters = [...method.parameters].sort((a, b) => {
            // 首先按照 order 字段排序
            const orderDiff = (a.order || 0) - (b.order || 0)
            if (orderDiff !== 0) {
              return orderDiff
            }
            // 如果 order 相同，按照参数名排序
            return a.name.localeCompare(b.name)
          })
        }
        
        // 创建新节点
        newNode = {
          id: Date.now().toString(),
          x: nodeX,
          y: nodeY,
          workflowId: '',
          pluginId: draggingElement.plugin?.id || '',
          pluginVersionId: draggingElement.version?.id || '',
          methodClassId: draggingElement.methodClass?.id || '',
          methodId: draggingElement.method?.id || '',
          nodeType: 'pluginMethod',
          eventType: null,
          botQQ: null,
          inDegree: 0,
          dataMaps: [],
          preNodeId: [],
          nextNodeId: [],
          nodeDefaults: [],
          condition: null,
          pluginInfo: draggingElement.plugin || null,
          pluginVersion: draggingElement.version || null,
          methodClassInfo: draggingElement.methodClass || null,
          methodInfo: method,
          method: method,
          methodClass: draggingElement.methodClass,
          plugin: draggingElement.plugin
        }
      } else if (draggingElement.type === 'botEvent') {
        // 检查是否已经存在 BOT 事件节点
        const existingBotEventNode = nodes.find(node => node.nodeType === 'botEvent')
        if (existingBotEventNode) {
          // 显示警告消息，不允许添加多个 BOT 事件节点
          ElMessage.warning('每个工作流只能有一个 BOT 事件节点')
          return null
        }
        
        const event = draggingElement.event
        // 获取用户注册的机器人QQ号
        const botQQ = localStorage.getItem('botQQ')
        
        // 创建 BOT 事件节点
        // 使用实体类名称作为返回类型，定时事件返回 void
        let returnType = 'void'
        if (event.eventType !== 'scheduledEvent' && event.entityInfo) {
          returnType = event.entityInfo.entityName
        }
        newNode = {
          id: Date.now().toString(),
          x: nodeX,
          y: nodeY,
          workflowId: '',
          pluginId: null,
          pluginVersionId: null,
          methodClassId: null,
          methodId: null,
          nodeType: 'botEvent',
          eventType: event.eventType,
          botQQ: botQQ,
          botEventName: event.eventName,
          inDegree: 0,
          dataMaps: [],
          preNodeId: [],
          nextNodeId: [],
          nodeDefaults: [],
          condition: null,
          pluginInfo: null,
          pluginVersion: null,
          methodClassInfo: null,
          entityInfo: event.entityInfo,
          methodInfo: {
            name: event.eventName,
            description: event.description,
            returnType: returnType,
            parameters: []
          },
          method: {
            name: event.eventName,
            description: event.description,
            returnType: returnType,
            parameters: []
          }
        }
      } else if (draggingElement.type === 'botAction') {
        const action = draggingElement.action
        // 对方法参数按照order字段排序，当order相同或不存在时按照参数名排序
        if (action.parameters) {
          action.parameters = [...action.parameters].sort((a, b) => {
            // 首先按照 order 字段排序
            const orderDiff = (a.order || 0) - (b.order || 0)
            if (orderDiff !== 0) {
              return orderDiff
            }
            // 如果 order 相同，按照参数名排序
            return a.name.localeCompare(b.name)
          })
        }
        
        // 获取用户注册的机器人QQ号
        const botQQ = localStorage.getItem('botQQ')
        
        // 创建 BOT 动作节点
        newNode = {
          id: Date.now().toString(),
          x: nodeX,
          y: nodeY,
          workflowId: '',
          pluginId: null,
          pluginVersionId: null,
          methodClassId: null,
          methodId: null,
          nodeType: 'botAction',
          botQQ: botQQ,
          botActionName: action.actionName,
          inDegree: 0,
          dataMaps: [],
          preNodeId: [],
          nextNodeId: [],
          nodeDefaults: [],
          condition: null,
          pluginInfo: null,
          pluginVersion: null,
          methodClassInfo: null,
          methodInfo: {
            name: action.actionDisplayName,
            description: action.description,
            returnType: 'void',
            parameters: action.parameters || []
          },
          method: {
            name: action.actionDisplayName,
            description: action.description,
            returnType: 'void',
            parameters: action.parameters || []
          }
        }
        
        // 为botQQ参数预填充值
        if (botQQ && action.parameters) {
          const botQQParam = action.parameters.find(p => p.name === 'botQQ')
          if (botQQParam) {
            newNode.nodeDefaults.push({
              paramName: 'botQQ',
              defaultValue: botQQ,
              defaultValueType: 'Long'
            })
          }
        }
      }
      
      if (newNode) {
        // 添加到节点列表
        nodes.push(newNode)
        
        // 隐藏提示信息
        showCanvasPlaceholder.value = false
      }
    }
    return null
  }

  return {
    canvasRef,
    isDragging,
    startX,
    startY,
    canvasX,
    canvasY,
    handleCanvasMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleNodeMouseDown,
    handleNodeMouseMove,
    handleNodeMouseUp,
    handleNodeMouseLeave,
    handlePortMouseDown,
    startDrag,
    startDragBotEvent,
    startDragBotAction,
    endDrag,
    dropNode
  }
}