// 工作流工具函数

// 排序参数的函数
export const sortParameters = (parameters) => {
  if (!parameters) return []
  return [...parameters].sort((a, b) => {
    // 首先按照 order 字段排序
    const orderDiff = (a.order || 0) - (b.order || 0)
    if (orderDiff !== 0) {
      return orderDiff
    }
    // 如果 order 相同，按照参数名排序
    return a.name.localeCompare(b.name)
  })
}

// 处理节点信息
export const processNodeInfo = (node, botEvents, botActions) => {
  let methodInitialized = false
  
  // 根据节点类型和 botEventName/botActionName 补全 BOT 节点信息
  if (node.nodeType === 'botEvent' && node.botEventName) {
    // 从 botEvents 中匹配事件信息
    const matchedEvent = botEvents.find(event => event.eventName === node.botEventName)
    if (matchedEvent) {
      node.eventType = matchedEvent.eventType
      node.method = {
        name: matchedEvent.eventName,
        description: matchedEvent.description,
        returnType: 'object',
        parameters: []
      }
      node.methodInfo = {
        name: matchedEvent.eventName,
        description: matchedEvent.description,
        returnType: 'object',
        parameters: []
      }
      methodInitialized = true
    }
  } else if (node.nodeType === 'botAction' && node.botActionName) {
    // 从 botActions 中匹配动作信息
    const matchedAction = botActions.find(action => action.actionName === node.botActionName)
    if (matchedAction) {
      node.method = {
        name: matchedAction.actionDisplayName,
        description: matchedAction.description,
        returnType: 'void',
        parameters: matchedAction.parameters || []
      }
      node.methodInfo = {
        name: matchedAction.actionDisplayName,
        description: matchedAction.description,
        returnType: 'void',
        parameters: matchedAction.parameters || []
      }
      // 对方法参数按照 order 字段排序
      if (node.method.parameters) {
        node.method.parameters = sortParameters(node.method.parameters)
      }
      methodInitialized = true
    }
  }
  
  // 如果没有初始化 method，尝试从不同的字段获取方法信息
  if (!methodInitialized && !node.method) {
    if (node.methodInfo) {
      node.method = node.methodInfo
    } else if (node.methodInfoList && node.methodInfoList.length > 0) {
      node.method = node.methodInfoList[0]
    } else if (node.methodData) {
      node.method = node.methodData
    } else {
      // 如果没有方法信息，根据节点类型创建默认的方法对象
      if (node.nodeType === 'botEvent') {
        node.method = {
          name: node.botEventName || 'BOT 事件',
          returnType: 'object',
          parameters: []
        }
      } else if (node.nodeType === 'botAction') {
        node.method = {
          name: node.botActionName || 'BOT 动作',
          returnType: 'void',
          parameters: []
        }
      } else {
        node.method = {
          name: '未知方法',
          returnType: 'void',
          parameters: []
        }
      }
    }
  } else if (!methodInitialized && node.methodInfo) {
    // 对于非 BOT 节点，使用 methodInfo
    node.method = node.methodInfo
  }
  
  // 对参数按照 order 字段排序，当 order 相同或不存在时按照参数名排序
  if (node.method && node.method.parameters) {
    node.method.parameters = sortParameters(node.method.parameters)
  }
  
  // 确保 preNodeId 和 nextNodeId 是数组
  if (!node.preNodeId) node.preNodeId = []
  if (!node.nextNodeId) node.nextNodeId = []
  // 确保 dataMaps 是数组
  if (!node.dataMaps) node.dataMaps = []
  // 确保 nodeDefaults 是数组
  if (!node.nodeDefaults) node.nodeDefaults = []
}

// 生成连线
export const generateConnections = (nodes) => {
  const connections = []
  nodes.forEach(node => {
    if (node.nextNodeId && node.nextNodeId.length > 0) {
      node.nextNodeId.forEach(nextNodeId => {
        // 检查是否已经存在这条连线
        const existingConnection = connections.find(conn => 
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
          connections.push(newConnection)
        }
      })
    }
  })
  return connections
}

// 获取节点名称
export const getNodeName = (node) => {
  if (node.nodeType === 'botEvent') {
    return node.botEventName || 'BOT 事件'
  } else if (node.nodeType === 'botAction') {
    return node.botActionName || 'BOT 动作'
  } else {
    return node.method ? node.method.name : '未知方法'
  }
}

// 验证连线规则
export const validateConnection = (fromNode, fromPort, toNode, toPort, connections) => {
  // 参数检查
  if (!fromNode || !toNode) {
    return false
  }
  
  // 1. 节点不能链接自身
  if (fromNode.id === toNode.id) {
    return false
  }
  
  // 2. 左侧只能作为入位置，右侧只能作为出位置
  if (fromPort !== 'right' || toPort !== 'left') {
    return false
  }
  
  // 3. 检查是否存在环
  if (wouldCreateCycle(fromNode.id, toNode.id, connections)) {
    return false
  }
  
  return true
}

// 检查是否会创建环
const wouldCreateCycle = (fromNodeId, toNodeId, connections) => {
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
    for (const conn of connections) {
      if (conn.fromNode === currentNodeId) {
        stack.push(conn.toNode)
      }
    }
  }
  
  return false
}

// 获取链接点位置
export const getPortPosition = (nodeId, port, nodes) => {
  const node = nodes.find(n => n.id === nodeId)
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

// 检查链接点是否已连接
export const isPortConnected = (nodeId, port, connections) => {
  if (port === 'left') {
    return connections.some(conn => conn.toNode === nodeId && conn.toPort === 'left')
  } else {
    return connections.some(conn => conn.fromNode === nodeId && conn.fromPort === 'right')
  }
}

// 计算连线点击区域的样式
export const getConnectionHitboxStyle = (connection, nodes) => {
  const fromPos = getPortPosition(connection.fromNode, connection.fromPort, nodes)
  const toPos = getPortPosition(connection.toNode, connection.toPort, nodes)
  
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
