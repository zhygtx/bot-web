// 工作流工具函数（新模型：callable + edges）

export const NODE_WIDTH = 250

// 判断 callable 是否为触发节点
export const isTriggerCallable = (callable) => {
  return callable === 'system:schedule' || (callable || '').startsWith('system:botEvent:')
}

// 判断返回值是否为 Boolean
export const isBooleanReturn = (returnType) => {
  return returnType === 'boolean' || returnType === 'Boolean'
}

// 根据 callable 描述创建默认参数输入
export const createDefaultInputs = (descriptor) => {
  const parameters = descriptor?.parameters || []
  return parameters.map((param, index) => ({
    paramIndex: index,
    source: '',
    defaultValue: null
  }))
}

// 创建新节点
export const createDefaultNode = (callable, descriptor, x, y) => {
  const node = {
    id: `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    x,
    y,
    callable,
    inputs: createDefaultInputs(descriptor),
    branch: false,
    config: {},
    descriptor: descriptor || { name: callable, parameters: [], returnType: 'void' }
  }

  if (callable === 'system:schedule') {
    node.config = { cronExpression: '0 */5 * * * ?' }
  } else if ((callable || '').startsWith('system:botEvent:')) {
    node.config = { botQQ: localStorage.getItem('botQQ') || '' }
  } else if ((callable || '').startsWith('system:botAction:')) {
    const botQQ = localStorage.getItem('botQQ') || ''
    node.inputs.forEach(input => {
      const param = descriptor?.parameters?.[input.paramIndex]
      if (param?.name === 'botQQ' && botQQ) {
        input.defaultValue = botQQ
      }
    })
  }
  return node
}

// 排序参数
export const sortParameters = (parameters) => {
  if (!parameters) return []
  return [...parameters].sort((a, b) => {
    const orderDiff = (a.order || 0) - (b.order || 0)
    return orderDiff !== 0 ? orderDiff : String(a.name || '').localeCompare(String(b.name || ''))
  })
}

// 为节点挂载描述信息
export const attachDescriptor = (node, descriptors) => {
  if (descriptors && descriptors[node.callable]) {
    node.descriptor = descriptors[node.callable]
  }
  if (!node.descriptor) {
    node.descriptor = {
      key: node.callable,
      name: node.callable,
      description: '',
      parameters: [],
      returnType: 'void'
    }
  }
  return node
}

// 获取节点显示名称
export const getNodeName = (node) => {
  return node?.descriptor?.name || node?.callable || '未知节点'
}

// 获取节点可用输出端口
export const getNodePorts = (node) => {
  if (node?.branch) return ['success', 'failure']
  return ['success']
}

// 连线校验
export const validateConnection = (fromNode, toNode, port, connections) => {
  if (!fromNode || !toNode) {
    return { valid: false, message: '缺少连线节点' }
  }
  if (fromNode.id === toNode.id) {
    return { valid: false, message: '节点不能链接自身' }
  }
  if (isTriggerCallable(toNode.callable)) {
    return { valid: false, message: '触发节点不能作为连线目标' }
  }
  if (port !== 'success' && port !== 'failure') {
    return { valid: false, message: '未知连线端口' }
  }
  if (!fromNode.branch && port === 'failure') {
    return { valid: false, message: '普通节点只有成功输出' }
  }
  if (wouldCreateCycle(fromNode.id, toNode.id, connections)) {
    return { valid: false, message: '连线会创建环，无法连接' }
  }
  return { valid: true, message: '' }
}

// 检查是否会创建环
export const wouldCreateCycle = (fromNodeId, toNodeId, connections) => {
  const visited = new Set()
  const stack = [toNodeId]
  while (stack.length > 0) {
    const currentNodeId = stack.pop()
    if (currentNodeId === fromNodeId) return true
    if (visited.has(currentNodeId)) continue
    visited.add(currentNodeId)
    for (const conn of connections) {
      if (conn.fromNode === currentNodeId) {
        stack.push(conn.toNode)
      }
    }
  }
  return false
}

// 获取节点端口位置
export const getPortPosition = (nodeId, port, nodes, nodeHeights) => {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  const height = nodeHeights?.[nodeId] || 80
  let y
  if (port === 'left') {
    y = node.y + height / 2
    return { x: node.x, y }
  }
  if (port === 'success') {
    y = node.y + (node.branch ? height * 0.35 : height / 2)
  } else {
    y = node.y + height * 0.75
  }
  return { x: node.x + NODE_WIDTH, y }
}

// 生成稳定连线ID
export const getConnectionId = (conn) => {
  if (conn.id) return conn.id
  return `${conn.fromNode}:${conn.toNode}:${conn.port}`
}

// 类型简名归一化：去掉包名/泛型，基本类型映射为包装类
const WRAPPER_MAP = {
  int: 'Integer',
  boolean: 'Boolean',
  char: 'Character',
  byte: 'Byte',
  short: 'Short',
  long: 'Long',
  float: 'Float',
  double: 'Double'
}

export const normalizeTypeName = (type) => {
  if (!type) return ''
  let t = String(type).trim()
  const genericIndex = t.indexOf('<')
  if (genericIndex >= 0) t = t.substring(0, genericIndex)
  const dot = t.lastIndexOf('.')
  if (dot >= 0) t = t.substring(dot + 1)
  return WRAPPER_MAP[t] || t
}

// Java 原生数值拓宽顺序（与反射调用行为一致）
const NUMERIC_ORDER = ['Byte', 'Short', 'Integer', 'Long', 'Float', 'Double']

// 判断来源类型是否能直接赋给目标参数类型（不做自定义转换）
export const isTypeCompatible = (sourceType, targetType) => {
  const source = normalizeTypeName(sourceType)
  const target = normalizeTypeName(targetType)
  if (!source || !target) return true
  if (target === 'Object') return true
  if (target === 'String') return true
  if (source === target) return true
  if (source === 'Character' && (target === 'Integer' || target === 'Long')) return true
  const sourceIndex = NUMERIC_ORDER.indexOf(source)
  const targetIndex = NUMERIC_ORDER.indexOf(target)
  if (sourceIndex >= 0 && targetIndex >= 0) return sourceIndex <= targetIndex
  return false
}
