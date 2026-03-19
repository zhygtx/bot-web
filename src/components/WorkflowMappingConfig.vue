<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElInput, ElSelect, ElOption, ElTree, ElButton, ElDialog, ElForm, ElFormItem, ElIcon } from 'element-plus'
import { Close, Check } from '@element-plus/icons-vue'

// 定义组件属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  node: {
    type: Object,
    default: () => ({})
  },
  // 前置节点列表
  preNodes: {
    type: Array,
    default: () => []
  }
})

// 定义事件
const emit = defineEmits(['update:visible', 'save'])

// 弹窗标题
const dialogTitle = ref('配置数据映射与默认值')

// 弹窗可见性
const dialogVisible = ref(false)

// 数据映射列表
const dataMaps = ref([])

// 默认值列表
const nodeDefaults = ref([])

// 默认值临时存储
const defaultValues = ref({})

// 左侧树数据（前置节点数据）
const leftTreeData = ref([])

// 右侧树数据（方法参数）
const rightTreeData = ref([])

// 选中的左侧节点
const selectedLeftNode = ref(null)

// 选中的右侧节点
const selectedRightNode = ref(null)

// 连接线数据
const connections = ref([])

// 正在拖动的左侧节点
const draggingLeftNode = ref(null)

// 正在拖动的右侧节点
const draggingRightNode = ref(null)

// 连线相关状态
const isDrawing = ref(false)
const tempPath = ref('')
const startNode = ref(null)
const startPosition = ref({ x: 0, y: 0 })
const canvasRef = ref(null)

// 右键菜单相关状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const selectedConnection = ref(null)

// 基本类型列表（可以随意映射）
const basicTypes = [
  'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Byte', 'Short', 'Character',
  'int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char',
  'BigInteger', 'BigDecimal', 'Date', 'LocalDate', 'LocalDateTime', 'Timestamp',
  'Object', 'String[]', 'Integer[]', 'Long[]', 'Double[]', 'Boolean[]'
]

// 集合类型列表
const collectionTypes = ['List', 'Set', 'Collection', 'Map', 'ArrayList', 'HashSet', 'HashMap', 'LinkedList']

// 检查是否是集合类型
const isCollectionType = (type) => {
  if (!type) return false
  return collectionTypes.some(ct => type === ct || type.endsWith('<' + ct + '>') || type.endsWith('<' + ct + ',>'))
}

// 获取集合类型的基础类型（不包含泛型）
const getBaseType = (type) => {
  if (!type) return ''
  const match = type.match(/^(\w+)</)
  if (match) return match[1]
  return type
}

// 检查类型是否兼容（用于映射验证）
const isTypeCompatible = (sourceType, targetType) => {
  if (!sourceType || !targetType) return false
  
  const sourceBaseType = getBaseType(sourceType)
  const targetBaseType = getBaseType(targetType)
  
  // 任意类型都可以映射到Object
  if (targetBaseType === 'Object') return true
  
  // 基本类型之间可以相互映射
  const sourceIsBasic = basicTypes.includes(sourceBaseType)
  const targetIsBasic = basicTypes.includes(targetBaseType)
  
  if (sourceIsBasic && targetIsBasic) {
    return true
  }
  
  // 集合类型：必须完全匹配
  if (isCollectionType(sourceBaseType) || isCollectionType(targetBaseType)) {
    return sourceBaseType === targetBaseType
  }
  
  // 实体类：名称必须相同
  const sourceIsEntity = !sourceIsBasic && !isCollectionType(sourceBaseType) && sourceBaseType[0] === sourceBaseType[0].toUpperCase()
  const targetIsEntity = !targetIsBasic && !isCollectionType(targetBaseType) && targetBaseType[0] === targetBaseType[0].toUpperCase()
  
  if (sourceIsEntity && targetIsEntity) {
    return sourceBaseType === targetBaseType
  }
  
  return false
}

// 获取类型不兼容的错误消息
const getTypeMismatchMessage = (sourceType, targetType) => {
  const sourceBaseType = getBaseType(sourceType)
  const targetBaseType = getBaseType(targetType)
  
  if (isCollectionType(sourceBaseType) || isCollectionType(targetBaseType)) {
    return `集合类型只能映射到相同的集合类型，当前：${sourceBaseType} -> ${targetBaseType}`
  }
  
  if (sourceBaseType === 'Object' && targetBaseType !== 'Object') {
    return `Object类型只能映射到Object类型，当前：${sourceBaseType} -> ${targetBaseType}`
  }
  
  if (targetBaseType === 'Object') {
    return null
  }
  
  return `类型不兼容，当前：${sourceBaseType} -> ${targetBaseType}`
}

// 解析实体类属性信息
const parseEntityAttributes = (entityName, attributes) => {
  try {
    if (!attributes) return []
    const attrMap = JSON.parse(attributes)
    const children = []
    for (const [name, type] of Object.entries(attrMap)) {
      children.push({
        id: `attr_${entityName}_${name}`,
        label: name,
        type: 'entity_attr',
        entityName: entityName,
        attrName: name,
        typeName: type,
        path: name
      })
    }
    return children
  } catch (e) {
    console.error('解析实体类属性失败:', e)
    return []
  }
}

// 计算前置节点数据
const computeLeftTreeData = () => {
  const treeData = []
  
  props.preNodes.forEach(preNode => {
    if (preNode.method && preNode.method.returnType && preNode.method.returnType !== 'void') {
      const nodeData = {
        id: `node_${preNode.id}`,
        label: `${preNode.method.name}`,
        type: 'node',
        nodeId: preNode.id,
        children: []
      }
      
      // 添加返回值根节点
      const returnValueNode = {
        id: `value_${preNode.id}`,
        label: 'value',
        type: 'value',
        nodeId: preNode.id,
        path: 'value',
        typeName: preNode.method.returnType,
        children: []
      }
      
      // 检查是否是实体类，尝试解析属性
      const returnType = preNode.method.returnType
      const returnTypeBase = getBaseType(returnType)
      
      // 尝试从插件信息中找到实体类信息
      if (preNode.plugin && preNode.plugin.pluginVersionList) {
        for (const version of preNode.plugin.pluginVersionList) {
          if (version.entityInfoList) {
            const entityInfo = version.entityInfoList.find(e => 
              e.name === returnTypeBase || e.entityName === returnType
            )
            if (entityInfo && entityInfo.attributes) {
              returnValueNode.children = parseEntityAttributes(returnTypeBase, entityInfo.attributes)
              break
            }
          }
        }
      }
      
      nodeData.children.push(returnValueNode)
      treeData.push(nodeData)
    }
  })
  
  leftTreeData.value = treeData
}

// 计算方法参数数据
const computeRightTreeData = () => {
  const treeData = []
  
  if (props.node && props.node.method && props.node.method.parameters) {
    // 按照order字段排序参数，当order相同或不存在时按照参数名排序
    const sortedParameters = [...props.node.method.parameters].sort((a, b) => {
      // 首先按照order字段排序
      const orderDiff = (a.order || 0) - (b.order || 0)
      if (orderDiff !== 0) {
        return orderDiff
      }
      // 如果order相同，按照参数名排序
      return a.name.localeCompare(b.name)
    })
    
    sortedParameters.forEach((param, index) => {
      const paramData = {
        id: `param_${index}`,
        label: `${param.type} ${param.name}`,
        type: 'param',
        paramIndex: index,
        paramName: param.name,
        children: []
      }
      
      // 添加参数根节点
      const paramValueNode = {
        id: `param_${index}_value`,
        label: param.name,
        type: 'param_value',
        paramIndex: index,
        paramName: param.name,
        path: param.name,
        paramTypeName: param.type,
        children: []
      }
      
      // 检查是否是实体类，尝试解析属性
      const paramType = param.type
      const paramTypeBase = getBaseType(paramType)
      
      // 尝试从插件信息中找到实体类信息
      if (props.node.plugin && props.node.plugin.pluginVersionList) {
        for (const version of props.node.plugin.pluginVersionList) {
          if (version.entityInfoList) {
            const entityInfo = version.entityInfoList.find(e => 
              e.name === paramTypeBase || e.entityName === paramType
            )
            if (entityInfo && entityInfo.attributes) {
              paramValueNode.children = parseEntityAttributes(paramTypeBase, entityInfo.attributes)
              break
            }
          }
        }
      }
      
      paramData.children.push(paramValueNode)
      treeData.push(paramData)
    })
  }
  
  rightTreeData.value = treeData
}

// 选择左侧节点
const selectLeftNode = (node) => {
  selectedLeftNode.value = node
  selectedRightNode.value = null
}

// 选择右侧节点
const selectRightNode = (node) => {
  selectedRightNode.value = node
  selectedLeftNode.value = null
}

// 开始绘制连线
const startDrawing = (node, event) => {
  isDrawing.value = true
  startNode.value = node
  
  // 计算起始位置 - 以左侧的空心圆点为起点
  const portDotElement = event.target.closest('.port-dot')
  if (!portDotElement) return
  
  const rect = portDotElement.getBoundingClientRect()
  const canvasRect = canvasRef.value.getBoundingClientRect()
  startPosition.value = {
    x: rect.left + rect.width / 2 - canvasRect.left,
    y: rect.top + rect.height / 2 - canvasRect.top
  }
  
  // 初始化临时路径
  tempPath.value = `M ${startPosition.value.x} ${startPosition.value.y} L ${startPosition.value.x} ${startPosition.value.y}`
}

// 处理鼠标移动
const handleMouseMove = (event) => {
  if (!isDrawing.value) return
  
  const canvasRect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - canvasRect.left
  const y = event.clientY - canvasRect.top
  
  // 更新临时路径
  tempPath.value = `M ${startPosition.value.x} ${startPosition.value.y} L ${x} ${y}`
}

// 结束绘制连线
const endDrawing = (targetNode, event) => {
  if (!isDrawing.value || !startNode.value) return
  
  isDrawing.value = false
  
  // 检查目标节点是否有效，并且确保点击的是右侧的空心圆点
  const portDotElement = event?.target.closest('.port-dot')
  if (targetNode && targetNode.type === 'param_value' && startNode.value.type === 'value' && portDotElement) {
    createConnection(startNode.value, targetNode)
  }
  
  // 重置状态
  startNode.value = null
  tempPath.value = ''
}

// 为整个文档添加鼠标事件监听
const initEvents = () => {
  // 为整个文档添加鼠标释放事件，确保在任何地方释放鼠标都能触发
  document.addEventListener('mouseup', handleMouseUp)
  // 为整个文档添加鼠标移动事件，确保在任何地方移动鼠标都能触发
  document.addEventListener('mousemove', handleMouseMove)
  // 为整个文档添加点击事件，用于隐藏右键菜单
  document.addEventListener('click', hideContextMenu)
}

// 组件挂载时初始化事件
onMounted(() => {
  console.log('WorkflowMappingConfig mounted with props:', props)
  computeLeftTreeData()
  computeRightTreeData()
  initEvents()
  
  // 初始化数据映射和默认值
  if (props.node && props.node.dataMaps) {
    dataMaps.value = props.node.dataMaps
    // 转换为连接数据
    connections.value = dataMaps.value.map(map => ({
      id: parseInt(map.id),
      sourceNodeId: parseInt(map.sourceNodeId),
      sourcePath: map.sourcePath,
      paramIndex: map.paramIndex,
      targetParamName: map.targetParamName,
      targetPath: map.targetPath
    }))
  }
  
  if (props.node && props.node.nodeDefaults) {
    nodeDefaults.value = props.node.nodeDefaults
  }
})

// 处理鼠标松开
const handleMouseUp = (event) => {
  if (isDrawing.value) {
    // 尝试获取鼠标位置下的目标端口点
    const portDotElement = event.target.closest('.port-dot')
    if (portDotElement) {
      // 从端口点元素向上查找对应的端口元素
      const portElement = portDotElement.closest('.port')
      if (portElement) {
        // 获取目标节点的ID
        const targetNodeId = portElement.getAttribute('data-node-id')
        if (targetNodeId) {
          // 遍历右侧树数据，找到对应的目标节点
          for (const nodeData of rightTreeData.value) {
            for (const child of nodeData.children) {
              if (child.id === targetNodeId || (child.children && child.children.some(attr => attr.id === targetNodeId))) {
                let targetNode
                if (child.id === targetNodeId) {
                  targetNode = child
                } else {
                  targetNode = child.children.find(attr => attr.id === targetNodeId)
                }
                
                // 检查目标节点是否有效
                if (targetNode && (targetNode.type === 'param_value' || targetNode.type === 'entity_attr') && startNode.value.type === 'value') {
                  createConnection(startNode.value, targetNode)
                  break
                }
              }
            }
          }
        }
      }
    }
    
    isDrawing.value = false
    startNode.value = null
    tempPath.value = ''
  }
}

// 获取连线路径
const getConnectionPath = (connection) => {
  // 计算实际的连线路径
  // 尝试获取源节点和目标节点的位置
  const sourcePortElement = document.querySelector(`[data-node-id="${connection.sourceId}"] .port-dot`)
  const targetPortElement = document.querySelector(`[data-node-id="${connection.targetId}"] .port-dot`)
  
  if (sourcePortElement && targetPortElement) {
    const canvasRect = canvasRef.value.getBoundingClientRect()
    
    // 计算源节点位置
    const sourceRect = sourcePortElement.getBoundingClientRect()
    const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left
    const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top
    
    // 计算目标节点位置
    const targetRect = targetPortElement.getBoundingClientRect()
    const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left
    const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top
    
    // 返回直线路径
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  }
  
  // 如果没有找到源节点或目标节点，返回空路径
  return ''
}

// 创建连接
const createConnection = (sourceNode, targetNode) => {
  // 检查参数是否有效
  if (!sourceNode || !targetNode || !sourceNode.nodeId || targetNode.paramIndex === undefined) {
    ElMessage.error('连接参数无效')
    return
  }
  
  // 检查是否已存在相同的连接
  const existingConnection = connections.value.find(conn => 
    conn.sourceNodeId === sourceNode.nodeId && 
    conn.sourcePath === sourceNode.path && 
    conn.paramIndex === targetNode.paramIndex && 
    conn.targetPath === targetNode.path
  )
  
  if (existingConnection) {
    ElMessage.warning('该映射已存在')
    return
  }
  
  // 检查右侧标签是否已经有连接（右侧标签只能链接一个左侧标签）
  const targetConnected = connections.value.find(conn => 
    conn.targetId === targetNode.id
  )
  
  if (targetConnected) {
    ElMessage.warning('右侧标签只能链接一个左侧标签')
    return
  }
  
  // 检查参数是否已经设置了默认值
  if (hasAnyDefaultValue(targetNode.paramIndex)) {
    ElMessage.warning('该参数已经设置了默认值，不能再设置映射')
    return
  }
  
  // 检查父级节点是否已经设置了映射
  if (hasParentMapping(targetNode)) {
    ElMessage.warning('父级节点已经设置了映射，子级节点不能再设置映射')
    return
  }
  
  // 获取源类型和目标类型
  const sourceType = sourceNode.typeName || props.preNodes.find(n => n.id === sourceNode.nodeId)?.method?.returnType || ''
  const targetType = targetNode.paramTypeName || targetNode.typeName || props.node?.method?.parameters?.[targetNode.paramIndex]?.type || ''
  
  // 检查类型是否兼容
  if (!isTypeCompatible(sourceType, targetType)) {
    const errorMsg = getTypeMismatchMessage(sourceType, targetType)
    if (errorMsg) {
      ElMessage.warning(errorMsg)
      return
    }
  }
  
  // 创建新连接
  const newConnection = {
    id: Date.now(),
    sourceNodeId: sourceNode.nodeId,
    sourcePath: sourceNode.path || 'value',
    sourceId: sourceNode.id,
    paramIndex: targetNode.paramIndex,
    targetParamName: targetNode.paramName,
    targetPath: targetNode.path || targetNode.paramName,
    targetId: targetNode.id
  }
  
  connections.value.push(newConnection)
  
  // 更新数据映射
  updateDataMaps()
}

// 更新数据映射
const updateDataMaps = () => {
  dataMaps.value = connections.value.map(conn => ({
    id: conn.id ? conn.id.toString() : '',
    sourceNodeId: conn.sourceNodeId ? conn.sourceNodeId.toString() : '',
    sourcePath: conn.sourcePath || 'value',
    targetParamName: conn.targetParamName || '',
    paramIndex: conn.paramIndex || 0,
    targetPath: conn.targetPath || '',
    sourceType: 'String', // 这里需要根据实际类型设置
    targetType: 'String'  // 这里需要根据实际类型设置
  }))
}

// 删除连接
const deleteConnection = (connectionId) => {
  connections.value = connections.value.filter(conn => conn.id !== connectionId)
  updateDataMaps()
}

// 检查节点是否已经连接
const isNodeConnected = (node) => {
  if (!node || !node.id) return false
  
  if (node.type === 'value' || node.type === 'entity_attr') {
    // 检查左侧节点是否有连接
    return connections.value.some(conn => conn.sourceId === node.id)
  } else if (node.type === 'param_value' || node.type === 'entity_attr') {
    // 检查右侧节点是否有连接
    return connections.value.some(conn => conn.targetId === node.id)
  }
  return false
}

// 检查参数是否已经设置了默认值
const hasDefaultValue = (paramIndex, path) => {
  return Object.keys(defaultValues.value).some(key => {
    if (key.endsWith('_value')) {
      const parts = key.split('_')
      const paramIdx = parseInt(parts[0])
      const paramPath = parts.slice(1, -1).join('_')
      return paramIdx === paramIndex && paramPath === path && defaultValues.value[key] !== ''
    }
    return false
  })
}

// 检查参数或其子属性是否已经设置了映射
const hasMapping = (paramIndex) => {
  return connections.value.some(conn => conn.paramIndex === paramIndex)
}

// 检查参数或其子属性是否已经设置了默认值
const hasAnyDefaultValue = (paramIndex) => {
  return Object.keys(defaultValues.value).some(key => {
    if (key.endsWith('_value')) {
      const parts = key.split('_')
      const paramIdx = parseInt(parts[0])
      return paramIdx === paramIndex && defaultValues.value[key] !== ''
    }
    return false
  })
}

// 检查当前节点的父级是否已经设置了映射
const hasParentMapping = (node) => {
  if (node.type === 'entity_attr') {
    // 检查父级节点是否有连接
    const parentPath = node.path.split('.')[0]
    return connections.value.some(conn => {
      if (conn.targetPath === parentPath) {
        return true
      }
      return false
    })
  }
  return false
}

// 检查类型是否是基本数据类型或包装类
const isBasicType = (type) => {
  if (!type) return false
  const baseType = getBaseType(type)
  const basicTypesOnly = [
    'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Byte', 'Short', 'Character',
    'int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char',
    'BigInteger', 'BigDecimal', 'Date', 'LocalDate', 'LocalDateTime', 'Timestamp'
  ]
  return basicTypesOnly.includes(baseType)
}

// 获取连线点击区域的样式
const getConnectionHitboxStyle = (connection) => {
  // 尝试获取源节点和目标节点的位置
  const sourcePortElement = document.querySelector(`[data-node-id="${connection.sourceId}"] .port-dot`)
  const targetPortElement = document.querySelector(`[data-node-id="${connection.targetId}"] .port-dot`)
  
  if (sourcePortElement && targetPortElement) {
    const canvasRect = canvasRef.value.getBoundingClientRect()
    
    // 计算源节点位置
    const sourceRect = sourcePortElement.getBoundingClientRect()
    const fromPos = {
      x: sourceRect.left + sourceRect.width / 2 - canvasRect.left,
      y: sourceRect.top + sourceRect.height / 2 - canvasRect.top
    }
    
    // 计算目标节点位置
    const targetRect = targetPortElement.getBoundingClientRect()
    const toPos = {
      x: targetRect.left + targetRect.width / 2 - canvasRect.left,
      y: targetRect.top + targetRect.height / 2 - canvasRect.top
    }
    
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
  
  // 如果没有找到源节点或目标节点，返回隐藏样式
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
    display: 'none'
  }
}

// 显示右键菜单
const showContextMenu = (connection, event) => {
  event.preventDefault()
  selectedConnection.value = connection
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  contextMenuVisible.value = true
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
  selectedConnection.value = null
}

// 删除选中的连接
const deleteSelectedConnection = () => {
  if (selectedConnection.value) {
    deleteConnection(selectedConnection.value.id)
    hideContextMenu()
  }
}

// 关闭弹窗
const closeDialog = () => {
  console.log('closeDialog called')
  // 关闭弹窗
  emit('update:visible', false)
}

// 标志，用于避免在点击保存按钮时重复保存
const isSaving = ref(false)

// 保存配置
const saveConfig = () => {
  isSaving.value = true
  // 处理默认值
  const newNodeDefaults = []
  
  // 遍历defaultValues，创建nodeDefaults
  Object.keys(defaultValues.value).forEach(key => {
    if (key.endsWith('_value')) {
      const parts = key.split('_')
      const paramIndex = parseInt(parts[0])
      const path = parts.slice(1, -1).join('_')
      const value = defaultValues.value[key]
      const type = defaultValues.value[`${paramIndex}_${path}_type`] || 'String'
      
      if (value !== undefined && value !== '') {
        // 检查参数是否已经设置了映射
        if (hasMapping(paramIndex)) {
          ElMessage.warning(`参数 ${path} 已经设置了映射，不能再设置默认值`)
          return
        }
        
        // 检查父级节点是否已经设置了映射
        const targetNode = {
          type: 'entity_attr',
          path: path,
          paramIndex: paramIndex
        }
        if (hasParentMapping(targetNode)) {
          ElMessage.warning(`父级节点已经设置了映射，子级节点 ${path} 不能再设置默认值`)
          return
        }
        
        // 检查类型是否是基本数据类型或包装类
        if (!isBasicType(type)) {
          ElMessage.warning(`类型 ${type} 不是基本数据类型或包装类，不能设置默认值`)
          return
        }
        
        newNodeDefaults.push({
          id: Date.now().toString(),
          paramIndex: paramIndex,
          paramName: path,
          fieldPath: path,
          defaultValue: value,
          defaultValueType: type
        })
      }
    }
  })
  
  emit('save', {
    dataMaps: dataMaps.value,
    nodeDefaults: newNodeDefaults
  })
  // 保存后关闭弹窗
  dialogVisible.value = false
  // 重置标志
  setTimeout(() => {
    isSaving.value = false
  }, 100)
}

// 监听节点变化，更新树数据和重置状态
watch(() => props.node, (newNode) => {
  // 重置所有相关状态
  connections.value = []
  dataMaps.value = []
  nodeDefaults.value = []
  defaultValues.value = {}
  selectedLeftNode.value = null
  selectedRightNode.value = null
  
  // 更新树数据
  computeRightTreeData()
  computeLeftTreeData()
  
  // 初始化新节点的数据映射和默认值
  if (newNode && newNode.dataMaps) {
    dataMaps.value = newNode.dataMaps
    // 转换为连接数据
    connections.value = dataMaps.value.map(map => ({
      id: map.id ? parseInt(map.id) : Date.now(),
      sourceNodeId: map.sourceNodeId ? parseInt(map.sourceNodeId) : null,
      sourcePath: map.sourcePath || 'value',
      sourceId: map.sourceNodeId ? `value_${map.sourceNodeId}` : null, // 构建sourceId
      paramIndex: map.paramIndex || 0,
      targetParamName: map.targetParamName || '',
      targetPath: map.targetPath || '',
      targetId: `param_${map.paramIndex || 0}_value` // 构建targetId
    })).filter(conn => conn.sourceNodeId !== null && conn.sourceId !== null) // 过滤掉无效连接
  }
  
  if (newNode && newNode.nodeDefaults) {
    nodeDefaults.value = newNode.nodeDefaults
  }
}, { deep: true })

// 监听前置节点变化，更新树数据
watch(() => props.preNodes, () => {
  computeLeftTreeData()
}, { deep: true })

// 组件挂载时初始化数据
onMounted(() => {
  console.log('WorkflowMappingConfig mounted with props:', props)
  computeLeftTreeData()
  computeRightTreeData()
  
  // 初始化数据映射和默认值
  if (props.node && props.node.dataMaps) {
    dataMaps.value = props.node.dataMaps
    // 转换为连接数据
    connections.value = dataMaps.value.map(map => ({
      id: map.id ? parseInt(map.id) : Date.now(),
      sourceNodeId: map.sourceNodeId,
      sourcePath: map.sourcePath || '',
      sourceId: `value_${map.sourceNodeId}`, // 构建sourceId
      paramIndex: map.paramIndex || 0,
      targetParamName: map.targetParamName || '',
      targetPath: map.targetPath || '',
      targetId: `param_${map.paramIndex}_value` // 构建targetId
    }))
  }
  
  if (props.node && props.node.nodeDefaults) {
    nodeDefaults.value = props.node.nodeDefaults
  }
  
  // 延迟计算连线路径，确保DOM元素已经完全渲染
  setTimeout(() => {
    // 触发一次连接数据的更新，强制重新计算路径
    connections.value = [...connections.value]
  }, 100)
})

// 监听visible属性变化
watch(() => props.visible, (newValue) => {
  console.log('WorkflowMappingConfig visible changed:', newValue)
  dialogVisible.value = newValue
  
  // 当弹窗打开时，重新初始化所有状态和数据
  if (newValue) {
    // 重置所有相关状态
    connections.value = []
    dataMaps.value = []
    nodeDefaults.value = []
    defaultValues.value = {}
    selectedLeftNode.value = null
    selectedRightNode.value = null
    
    // 先更新树数据
    computeLeftTreeData()
    computeRightTreeData()
    
    // 延迟初始化数据，确保props.node已经更新
    setTimeout(() => {
      console.log('Initializing data for node:', props.node?.id)
      console.log('Node dataMaps:', props.node?.dataMaps)
      
      // 初始化当前节点的数据映射和默认值
      if (props.node && props.node.dataMaps) {
        dataMaps.value = props.node.dataMaps
        console.log('Loaded dataMaps:', dataMaps.value)
        // 转换为连接数据
        connections.value = dataMaps.value.map(map => ({
          id: map.id ? parseInt(map.id) : Date.now(),
          sourceNodeId: map.sourceNodeId ? parseInt(map.sourceNodeId) : null,
          sourcePath: map.sourcePath || 'value',
          sourceId: map.sourceNodeId ? `value_${map.sourceNodeId}` : null, // 构建sourceId
          paramIndex: map.paramIndex || 0,
          targetParamName: map.targetParamName || '',
          targetPath: map.targetPath || '',
          targetId: `param_${map.paramIndex || 0}_value` // 构建targetId
        })).filter(conn => conn.sourceNodeId !== null && conn.sourceId !== null) // 过滤掉无效连接
        console.log('Created connections:', connections.value)
      }
      
      if (props.node && props.node.nodeDefaults) {
        nodeDefaults.value = props.node.nodeDefaults
        console.log('Loaded nodeDefaults:', nodeDefaults.value)
        // 将nodeDefaults中的默认值填充到defaultValues中
        // 先按参数名建立映射
        const defaultByParamName = {}
        nodeDefaults.value.forEach(defaultVal => {
          defaultByParamName[defaultVal.paramName] = {
            value: defaultVal.defaultValue,
            type: defaultVal.defaultValueType || 'String'
          }
        })
        
        // 然后根据排序后的参数顺序设置默认值
        if (props.node.method && props.node.method.parameters) {
          props.node.method.parameters.forEach((param, index) => {
            const key = `${index}_${param.name}_value`
            const typeKey = `${index}_${param.name}_type`
            if (defaultByParamName[param.name]) {
              defaultValues.value[key] = defaultByParamName[param.name].value
              defaultValues.value[typeKey] = defaultByParamName[param.name].type
            } else {
              // 为所有参数设置类型默认值为String
              if (!defaultValues.value[typeKey]) {
                defaultValues.value[typeKey] = 'String'
              }
            }
          })
        }
      } else {
        // 为所有参数设置类型默认值为String
        if (props.node && props.node.method && props.node.method.parameters) {
          props.node.method.parameters.forEach((param, index) => {
            const typeKey = `${index}_${param.name}_type`
            if (!defaultValues.value[typeKey]) {
              defaultValues.value[typeKey] = 'String'
            }
          })
        }
      }
      
      // 再次延迟，确保DOM元素已经完全渲染，然后触发一次更新
      setTimeout(() => {
        // 触发一次连接数据的更新，强制重新计算路径
        connections.value = [...connections.value]
        console.log('Connections after update:', connections.value)
      }, 100)
    }, 100) // 延迟时间，确保props.node已经更新
  }
})

// 监听dialogVisible变化
watch(dialogVisible, (newValue, oldValue) => {
  console.log('WorkflowMappingConfig dialogVisible changed:', newValue)
  emit('update:visible', newValue)
  
  // 当弹窗从打开状态变为关闭状态时，自动保存配置
  if (oldValue && !newValue && !isSaving.value) {
    console.log('Auto-saving config on dialog close')
    // 处理默认值
    const newNodeDefaults = []
    
    // 遍历defaultValues，创建nodeDefaults
    Object.keys(defaultValues.value).forEach(key => {
      if (key.endsWith('_value')) {
        const parts = key.split('_')
        const paramIndex = parseInt(parts[0])
        const path = parts.slice(1, -1).join('_')
        const value = defaultValues.value[key]
        const type = defaultValues.value[`${paramIndex}_${path}_type`] || 'String'
        
        if (value !== undefined && value !== '') {
          newNodeDefaults.push({
            id: Date.now().toString(),
            paramIndex: paramIndex,
            paramName: path,
            fieldPath: path,
            defaultValue: value,
            defaultValueType: type
          })
        }
      }
    })
    
    emit('save', {
      dataMaps: dataMaps.value,
      nodeDefaults: newNodeDefaults
    })
  }
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    @close="closeDialog"
  >
    <div class="mapping-config-container">
      <!-- 左侧：前置节点数据 -->
      <div class="left-panel">
        <h3>前置节点数据</h3>
        <div class="node-list">
          <div
            v-for="nodeData in leftTreeData"
            :key="nodeData.id"
            class="source-node"
          >
            <div class="node-header">{{ nodeData.label }}</div>
            <div class="node-ports">
              <div
                v-for="child in nodeData.children"
                :key="child.id"
                class="port"
                :data-node-id="child.id"
                :class="{ 'port-selected': selectedLeftNode?.id === child.id }"
                @click="selectLeftNode(child)"
              >
                <div 
                  class="port-dot" 
                  :class="{ 'port-dot-connected': isNodeConnected(child) }"
                  @mousedown="startDrawing(child, $event)"
                ></div>
                <div class="port-label">{{ child.label }}</div>
                <!-- 实体类属性 -->
                <div v-if="child.children && child.children.length > 0" class="entity-attributes">
                  <div
                    v-for="attr in child.children"
                    :key="attr.id"
                    class="port port-attr"
                    :data-node-id="attr.id"
                    :class="{ 'port-selected': selectedLeftNode?.id === attr.id }"
                    @click="selectLeftNode(attr)"
                  >
                    <div 
                      class="port-dot" 
                      :class="{ 'port-dot-connected': isNodeConnected(attr) }"
                      @mousedown="startDrawing(attr, $event)"
                    ></div>
                    <div class="port-label">{{ attr.label }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 中间：连线画布 -->
      <div class="center-panel">
        <div class="canvas" ref="canvasRef">
          <!-- 绘制正式连线 -->
          <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
              </marker>
            </defs>
            <!-- 实际的连线 -->
            <g v-for="connection in connections" :key="connection.id">
              <path 
                :d="getConnectionPath(connection)"
                stroke="#409eff"
                stroke-width="2"
                marker-end="url(#arrowhead)"
              />
            </g>
            <!-- 绘制临时连线 -->
            <path 
              v-if="isDrawing"
              :d="tempPath"
              stroke="#409eff"
              stroke-width="2"
              stroke-dasharray="5,5"
              marker-end="url(#arrowhead)"
            />
          </svg>
          
          <!-- 连线的点击区域 -->
          <div 
            v-for="connection in connections" 
            :key="connection.id"
            class="connection-hitbox"
            :style="getConnectionHitboxStyle(connection)"
            @contextmenu="showContextMenu(connection, $event)"
          ></div>
        </div>
      </div>
      
      <!-- 右侧：方法参数 -->
      <div class="right-panel">
        <h3>方法参数</h3>
        <div class="node-list">
          <div
            v-for="nodeData in rightTreeData"
            :key="nodeData.id"
            class="target-node"
          >
            <div class="node-header">{{ nodeData.label }}</div>
            <div class="node-ports">
              <div
                v-for="child in nodeData.children"
                :key="child.id"
                class="port"
                :data-node-id="child.id"
                :class="{ 'port-selected': selectedRightNode?.id === child.id }"
                @click="selectRightNode(child)"
              >
                <!-- 当默认值未填写时显示圆圈 -->
                <div 
                  v-if="!hasDefaultValue(child.paramIndex, child.path)"
                  class="port-dot" 
                  :class="{ 'port-dot-connected': isNodeConnected(child) }"
                  @mouseup="endDrawing(child, $event)"
                ></div>
                <div class="port-label">{{ child.label }}</div>
                <div v-if="child.type === 'param_value'" class="default-value-config">
                  <el-input
                    v-model="defaultValues[`${child.paramIndex}_${child.path}_value`]"
                    placeholder="默认值"
                    size="small"
                    style="width: 100px; margin-left: 10px;"
                    :disabled="hasMapping(child.paramIndex) || !isBasicType(child.paramTypeName)"
                  />
                  <el-select
                    v-model="defaultValues[`${child.paramIndex}_${child.path}_type`]"
                    size="small"
                    style="width: 80px; margin-left: 5px;"
                    :disabled="hasMapping(child.paramIndex)"
                  >
                    <el-option label="String" value="String" />
                    <el-option label="Integer" value="Integer" />
                    <el-option label="Double" value="Double" />
                    <el-option label="Boolean" value="Boolean" />
                    <el-option label="Long" value="Long" />
                  </el-select>
                </div>
                <!-- 实体类属性 -->
                <div v-if="child.children && child.children.length > 0" class="entity-attributes">
                  <div
                    v-for="attr in child.children"
                    :key="attr.id"
                    class="port port-attr"
                    :data-node-id="attr.id"
                    :class="{ 'port-selected': selectedRightNode?.id === attr.id }"
                    @click="selectRightNode(attr)"
                  >
                    <!-- 当默认值未填写时显示圆圈 -->
                    <div 
                      v-if="!hasDefaultValue(child.paramIndex, attr.path)"
                      class="port-dot" 
                      :class="{ 'port-dot-connected': isNodeConnected(attr) }"
                      @mouseup="endDrawing(attr, $event)"
                      :style="{ cursor: hasParentMapping(attr) ? 'not-allowed' : 'crosshair' }"
                    ></div>
                    <div class="port-label">{{ attr.label }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右键菜单 -->
    <div 
      v-if="contextMenuVisible" 
      class="context-menu"
      :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="deleteSelectedConnection">
        删除映射
      </div>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.mapping-config-container {
  position: relative;
  height: 500px;
  overflow: hidden;
  user-select: none;
}

.mapping-config-container * {
  user-select: none;
}

.left-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 300px;
  height: 100%;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  z-index: 2;
  pointer-events: none;
}

.right-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 300px;
  height: 100%;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  z-index: 2;
  pointer-events: none;
}

.left-panel h3,
.right-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  pointer-events: auto;
}

.node-header {
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e6e6e6;
  font-weight: bold;
  font-size: 14px;
  pointer-events: auto;
}

.center-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  z-index: 1;
}

.canvas {
  width: 100%;
  height: 100%;
  background-color: #f9f9f9;
  cursor: crosshair;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-node,
.target-node {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 3;
  pointer-events: none;
}

.port {
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  justify-content: space-between;
  pointer-events: none;
}

.port-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #409eff;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  pointer-events: auto;
  cursor: crosshair;
}

.port-dot-connected {
  background-color: #409eff;
}

.port-label {
  flex: 1;
  font-size: 13px;
  pointer-events: none;
  margin-left: 8px; /* 增加与圆圈之间的间距 */
}

.source-node .port {
  flex-direction: row-reverse;
}

.source-node .port-dot {
  margin-left: 0;
  margin-right: 8px;
}

.default-value-config {
  display: flex;
  align-items: center;
  margin-left: 10px;
  pointer-events: auto;
}

.default-value-config input,
.default-value-config select {
  pointer-events: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 5px 0;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.context-menu-item:hover {
  background-color: #f5f7fa;
}

/* 连线点击区域样式 */
.connection-hitbox {
  position: absolute;
  background-color: transparent;
  z-index: 40;
  cursor: pointer;
}

/* 实体类属性样式 */
.entity-attributes {
  margin-left: 20px;
  margin-top: 5px;
}

.port-attr {
  border-left: 2px solid #e6e6e6;
  padding-left: 10px;
  margin-left: 10px;
}
</style>