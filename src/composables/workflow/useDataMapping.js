// 数据映射模块
export function useDataMapping() {
  // 处理节点信息
  const processNodeInfo = (node, botEvents, botActions) => {
    let methodInitialized = false
    
    // 根据节点类型和 botEventName/botActionName 补全 BOT 节点信息
    if (node.nodeType === 'botEvent' && node.botEventName) {
      // 从 botEvents 中匹配事件信息
      const matchedEvent = botEvents.find(event => event.eventName === node.botEventName)
      if (matchedEvent) {
        node.eventType = matchedEvent.eventType
        node.entityInfo = matchedEvent.entityInfo
        // 使用实体类名称作为返回类型，定时事件返回 void
        let returnType = 'void'
        if (matchedEvent.eventType !== 'scheduledEvent' && matchedEvent.entityInfo) {
          returnType = matchedEvent.entityInfo.entityName
        }
        node.method = {
          name: matchedEvent.eventName,
          description: matchedEvent.description,
          returnType: returnType,
          parameters: []
        }
        node.methodInfo = {
          name: matchedEvent.eventName,
          description: matchedEvent.description,
          returnType: returnType,
          parameters: []
        }
        methodInitialized = true
      }
    } else if (node.nodeType === 'botAction' && node.botActionName) {
      // 从 botActions 中匹配动作信息
      const matchedAction = botActions.find(action => action.actionName === node.botActionName)
      if (matchedAction) {
        const returnInfo = matchedAction.returnInfo || {}
        node.method = {
          name: matchedAction.actionDisplayName,
          description: matchedAction.description,
          returnType: returnInfo.type || 'void',
          returnFields: returnInfo.fields || [],
          returnDescription: returnInfo.description || '',
          parameters: matchedAction.parameters || []
        }
        node.methodInfo = {
          name: matchedAction.actionDisplayName,
          description: matchedAction.description,
          returnType: returnInfo.type || 'void',
          returnFields: returnInfo.fields || [],
          returnDescription: returnInfo.description || '',
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
      node.method.parameters.sort((a, b) => {
        // 首先按照 order 字段排序
        const orderDiff = (a.order || 0) - (b.order || 0)
        if (orderDiff !== 0) {
          return orderDiff
        }
        // 如果 order 相同，按照参数名排序
        return a.name.localeCompare(b.name)
      })
    }
    
    // 确保 preNodeId 和 nextNodeId 是数组
    if (!node.preNodeId) node.preNodeId = []
    if (!node.nextNodeId) node.nextNodeId = []
    // 确保 dataMaps 是数组
    if (!node.dataMaps) node.dataMaps = []
    // 确保 nodeDefaults 是数组
    if (!node.nodeDefaults) node.nodeDefaults = []
  }

  // 排序参数的函数
  const sortParameters = (parameters) => {
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

  // 保存映射配置
  const saveMappingConfig = (config, currentNode, nodes, workflowId) => {
    if (currentNode) {
      // 更新 currentNode
      currentNode.dataMaps = config.dataMaps
      currentNode.nodeDefaults = config.nodeDefaults
      
      // 同时更新 nodes 中对应的节点
      if (Array.isArray(nodes)) {
        const nodeIndex = nodes.findIndex(n => n.id === currentNode.id)
        if (nodeIndex !== -1) {
          nodes[nodeIndex].dataMaps = config.dataMaps
          nodes[nodeIndex].nodeDefaults = config.nodeDefaults
          // 同步scheduledTime属性
          if (currentNode.scheduledTime !== undefined) {
            nodes[nodeIndex].scheduledTime = currentNode.scheduledTime
          }
        }
        
        // 保存到本地存储
        localStorage.setItem(`workflow_${workflowId}_nodes`, JSON.stringify(nodes))
      }
    }
  }

  // 保存条件配置
  const saveConditionConfig = (condition, currentNode, nodes, workflowId) => {
    if (currentNode) {
      // 更新 currentNode
      currentNode.condition = condition
      
      // 同时更新 nodes 中对应的节点
      const nodeIndex = nodes.findIndex(n => n.id === currentNode.id)
      if (nodeIndex !== -1) {
        nodes[nodeIndex].condition = condition
      }
      
      // 保存到本地存储
      localStorage.setItem(`workflow_${workflowId}_nodes`, JSON.stringify(nodes))
    }
  }

  // 验证工作流节点参数
  const validateWorkflowNodes = (nodes) => {
    // 检查nodes是否为数组
    if (!Array.isArray(nodes)) {
      return {
        valid: true,
        message: ''
      }
    }
    // 检查所有节点的参数是否都已填充
    for (const node of nodes) {
      // 特殊检查：定时任务节点必须配置执行间隔
      if (node.nodeType === 'botEvent' && node.eventType === 'scheduledEvent') {
        const hasScheduledTime = node.scheduledTime !== undefined && node.scheduledTime !== '' && node.scheduledTime !== null
        if (!hasScheduledTime) {
          return {
            valid: false,
            message: `定时任务节点 ${node.method.name} 未配置执行间隔`
          }
        }
      }
      
      if (node.method && node.method.parameters && node.method.parameters.length > 0) {
        // 检查每个参数是否都有对应的映射或默认值
        const paramNames = node.method.parameters.map(p => p.name)
        const mappedParams = new Set()
        
        // 检查数据映射
        if (node.dataMaps) {
          node.dataMaps.forEach(map => {
            // 提取参数名（处理子属性，如param.subparam）
            const paramName = map.targetParamName.split('.')[0]
            mappedParams.add(paramName)
          })
        }
        
        // 检查默认值
        if (node.nodeDefaults) {
          node.nodeDefaults.forEach(def => {
            // 提取参数名（处理子属性，如param.subparam）
            const paramName = def.paramName.split('.')[0]
            // 检查是否有默认值（支持value和defaultValue字段）
            // 注意：0和false等falsy值应该被视为有效默认值
            const hasValue = def.value !== undefined
            const hasDefaultValue = def.defaultValue !== undefined
            if (hasValue || hasDefaultValue) {
              mappedParams.add(paramName)
            }
          })
        }
        
        // 检查是否所有参数都已映射或设置默认值
        for (const paramName of paramNames) {
          // 特殊处理：botQQ参数已预填充，不可修改
          if (paramName === 'botQQ') {
            continue
          }
          // 查找该参数是否为可空参数（nullable=true），可空参数跳过必填校验
          const paramDef = node.method.parameters.find(p => p.name === paramName)
          if (paramDef && paramDef.nullable) {
            continue
          }
          if (!mappedParams.has(paramName)) {
            return {
              valid: false,
              message: `节点 ${node.method.name} 的参数 ${paramName} 未设置数据映射或默认值`
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

  return {
    processNodeInfo,
    sortParameters,
    saveMappingConfig,
    saveConditionConfig,
    validateWorkflowNodes
  }
}