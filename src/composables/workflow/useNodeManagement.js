// 节点管理组合式函数
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { processNodeInfo, sortParameters } from '../../utils/workflow'

export function useNodeManagement(botEvents, botActions) {
  // 画布上的节点
  const nodes = ref([])
  // 当前拖动的元素
  const draggingElement = ref(null)
  // 拖动的起始位置
  const dragStart = ref({ x: 0, y: 0 })
  // 当前拖动的节点
  const draggingNode = ref(null)
  // 节点拖动的起始位置
  const nodeDragStart = ref({ x: 0, y: 0 })
  // 提示信息是否显示
  const showCanvasPlaceholder = ref(true)
  
  // 监听节点变化，更新提示信息显示状态
  const updatePlaceholderVisibility = (newLength) => {
    showCanvasPlaceholder.value = newLength === 0
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
  
  // 开始拖动 BOT 事件
  const startDragBotEvent = (e, event) => {
    draggingElement.value = {
      event,
      type: 'botEvent'
    }
    dragStart.value = {
      x: e.clientX,
      y: e.clientY
    }
    document.body.style.cursor = 'grabbing'
    e.dataTransfer.effectAllowed = 'copy'
  }
  
  // 开始拖动 BOT 动作
  const startDragBotAction = (e, action) => {
    draggingElement.value = {
      action,
      type: 'botAction'
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
    if (draggingElement.value) {
      // 计算节点在画布上的位置（相对于画布的偏移）
      const rect = e.currentTarget.getBoundingClientRect()
      const nodeX = e.clientX - rect.left
      const nodeY = e.clientY - rect.top
      
      let newNode
      
      if (draggingElement.value.type === 'method') {
        // 对方法参数按照order字段排序，当order相同或不存在时按照参数名排序
        const method = draggingElement.value.method
        if (method && method.parameters) {
          method.parameters = sortParameters(method.parameters)
        }
        
        // 创建新节点
        newNode = {
          id: Date.now().toString(),
          x: nodeX,
          y: nodeY,
          workflowId: '',
          pluginId: draggingElement.value.plugin?.id || '',
          pluginVersionId: draggingElement.value.version?.id || '',
          methodClassId: draggingElement.value.methodClass?.id || '',
          methodId: draggingElement.value.method?.id || '',
          nodeType: 'pluginMethod',
          eventType: null,
          botQQ: null,
          inDegree: 0,
          dataMaps: [],
          preNodeId: [],
          nextNodeId: [],
          nodeDefaults: [],
          condition: null,
          pluginInfo: draggingElement.value.plugin || null,
          pluginVersion: draggingElement.value.version || null,
          methodClassInfo: draggingElement.value.methodClass || null,
          methodInfo: method,
          method: method,
          methodClass: draggingElement.value.methodClass,
          plugin: draggingElement.value.plugin
        }
      } else if (draggingElement.value.type === 'botEvent') {
        const event = draggingElement.value.event
        // 获取用户注册的机器人QQ号
        const botQQ = localStorage.getItem('botQQ')
        
        // 创建 BOT 事件节点
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
          methodInfo: {
            name: event.eventName,
            returnType: 'object',
            parameters: []
          },
          method: {
            name: event.eventName,
            returnType: 'object',
            parameters: []
          }
        }
      } else if (draggingElement.value.type === 'botAction') {
        const action = draggingElement.value.action
        // 对方法参数按照order字段排序，当order相同或不存在时按照参数名排序
        if (action.parameters) {
          action.parameters = sortParameters(action.parameters)
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
        nodes.value.push(newNode)
        
        // 隐藏提示信息
        showCanvasPlaceholder.value = false
      }
    }
    endDrag()
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
  
  // 节点鼠标移动事件（无范围限制）
  const handleNodeMouseMove = (e) => {
    if (!draggingNode.value) return
    e.preventDefault()
    
    // 直接使用鼠标位置减去偏移量，确保节点完全跟随鼠标
    draggingNode.value.x = e.clientX - nodeDragStart.value.x
    draggingNode.value.y = e.clientY - nodeDragStart.value.y
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
  
  // 处理节点信息
  const handleProcessNodeInfo = (node) => {
    processNodeInfo(node, botEvents.value, botActions.value)
  }
  
  return {
    nodes,
    draggingElement,
    dragStart,
    draggingNode,
    nodeDragStart,
    showCanvasPlaceholder,
    updatePlaceholderVisibility,
    startDrag,
    startDragBotEvent,
    startDragBotAction,
    endDrag,
    dropNode,
    handleNodeMouseDown,
    handleNodeMouseMove,
    handleNodeMouseUp,
    handleNodeMouseLeave,
    handleProcessNodeInfo
  }
}
