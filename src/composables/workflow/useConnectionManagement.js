// 连线管理组合式函数
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { validateConnection, generateConnections, getPortPosition, isPortConnected, getConnectionHitboxStyle } from '../../utils/workflow'

export function useConnectionManagement(nodes) {
  // 连线相关状态
  const connections = ref([]) // 存储所有连线
  const isDrawing = ref(false) // 是否正在绘制连线
  const startNode = ref(null) // 起始节点
  const startPort = ref(null) // 起始端口（left 或 right）
  const tempConnection = ref(null) // 临时连线
  
  // 生成连线
  const generateWorkflowConnections = () => {
    connections.value = generateConnections(nodes.value)
  }
  
  // 链接点鼠标按下事件
  const handlePortMouseDown = (e, node, port) => {
    e.stopPropagation()
    isDrawing.value = true
    startNode.value = node
    startPort.value = port
    document.body.style.cursor = 'crosshair'
    
    // 记录鼠标起始位置
    const rect = e.currentTarget.closest('.canvas').getBoundingClientRect()
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
    
    const rect = e.currentTarget.getBoundingClientRect()
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
      if (validateConnection(startNode.value, startPort.value, targetNode, targetPort, connections.value)) {
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
  }
  
  // 删除选中的连线
  const deleteSelectedConnection = (connection) => {
    if (connection) {
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
        
        // 删除对应的映射关系
        if (toNode.dataMaps) {
          // 过滤掉与被删除连线相关的映射
          toNode.dataMaps = toNode.dataMaps.filter(map => map.sourceNodeId !== connection.fromNode)
        }
      }
      
      // 删除连线
      connections.value = connections.value.filter(conn => conn.id !== connection.id)
    }
  }
  
  // 解除选中节点的所有连线
  const disconnectSelectedNodes = (selectedNodeIds) => {
    if (selectedNodeIds && selectedNodeIds.length > 0) {
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
          
          // 删除对应的映射关系
          if (toNode.dataMaps) {
            // 过滤掉与被删除连线相关的映射
            toNode.dataMaps = toNode.dataMaps.filter(map => map.sourceNodeId !== connection.fromNode)
          }
        }
      })
      
      // 删除连线
      connections.value = connections.value.filter(conn => {
        return !selectedNodeIds.includes(conn.fromNode) && !selectedNodeIds.includes(conn.toNode)
      })
    }
  }
  
  // 获取链接点位置
  const getPortPositionWrapper = (nodeId, port) => {
    return getPortPosition(nodeId, port, nodes.value)
  }
  
  // 检查链接点是否已连接
  const isPortConnectedWrapper = (nodeId, port) => {
    return isPortConnected(nodeId, port, connections.value)
  }
  
  // 计算连线点击区域的样式
  const getConnectionHitboxStyleWrapper = (connection) => {
    return getConnectionHitboxStyle(connection, nodes.value)
  }
  
  return {
    connections,
    isDrawing,
    startNode,
    startPort,
    tempConnection,
    generateWorkflowConnections,
    handlePortMouseDown,
    handleMouseMoveForConnection,
    handleMouseUpForConnection,
    deleteSelectedConnection,
    disconnectSelectedNodes,
    getPortPositionWrapper,
    isPortConnectedWrapper,
    getConnectionHitboxStyleWrapper
  }
}
