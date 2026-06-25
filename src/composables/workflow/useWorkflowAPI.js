import request from '../../utils/request'
import { ElMessage } from 'element-plus'

// 工作流API模块
export function useWorkflowAPI() {
  // 加载工作流信息
  const loadWorkflowInfo = async (workflowId, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections, canvasX, canvasY, zoom, showError = true) => {
    if (workflowId) {
      try {
        const response = await request({
          url: `/workflow/${workflowId}`,
          method: 'get'
        })

        if (response.code === 200) {
          workflowInfo.value = response.data || {}
          // 恢复画布视图状态
          const cv = workflowInfo.value.workflowCanvasView
          if (cv) {
            if (canvasX) canvasX.value = cv.offsetX ?? 0
            if (canvasY) canvasY.value = cv.offsetY ?? 0
            if (zoom) zoom.value = cv.scale ?? 1
          }
          // 加载节点信息
          if (workflowInfo.value.nodes) {
            nodes.value = workflowInfo.value.nodes
            // 处理节点信息
            const botEventsArray = botEvents.value || botEvents
            const botActionsArray = botActions.value || botActions
            nodes.value.forEach(node => processNodeInfo(node, botEventsArray, botActionsArray))
            // 生成连线
            generateConnections()
          }
        } else {
          if (showError) {
            ElMessage.error(response.message || '加载工作流信息失败')
          }
        }
      } catch (error) {
        console.error('Error:', error)
        if (showError) {
          ElMessage.error('加载工作流信息失败')
        }
      } finally {
        // 确保 nodes 是数组
        if (!nodes.value) {
          nodes.value = []
        }
      }
    }
  }

  // 加载插件列表（供节点配置面板使用）
  const loadPlugins = async (plugins) => {
    try {
      const response = await request({
        url: '/plugin/findPlugins',
        method: 'get',
        params: {
          authorId: localStorage.getItem('userId') || '',
          pageNum: 1,
          pageSize: 100
        }
      })
      if (response.code === 200) {
        plugins.value = response.data?.list || response.data?.records || response.data?.content || []
      } else {
        ElMessage.error(response.message || '加载插件失败')
      }
    } catch (error) {
      ElMessage.error('加载插件失败')
    }
  }

  // 加载公开插件列表
  const loadPublicPlugins = async (publicPlugins, selectedPublicVersions) => {
    try {
      const response = await request({
        url: '/plugin/findPlugins',
        method: 'get',
        params: {
          isPublic: true,
          pageNum: 1,
          pageSize: 100
        }
      })
      if (response.code === 200) {
        publicPlugins.value = response.data.list || []
        // 初始化插件版本选择
        publicPlugins.value.forEach(plugin => {
          if (plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0) {
            // 找到第一个有效的版本
            const validVersion = plugin.pluginVersionList.find(v => v && v.id && v.version)
            if (validVersion) {
              selectedPublicVersions.value[plugin.id] = validVersion.id
            }
          }
        })
      } else {
        ElMessage.error(response.message || '加载公开插件失败')
      }
    } catch (error) {
      ElMessage.error('加载公开插件失败')
    }
  }

  // 加载 BOT 事件列表
  const loadBotEvents = async (botEvents) => {
    try {
      const response = await request({
        url: '/api/bot/events',
        method: 'get'
      })
      if (response.code === 200) {
        botEvents.value = response.data || []
      } else {
        ElMessage.error(response.message || '加载 BOT 事件失败')
      }
    } catch (error) {
      ElMessage.error('加载 BOT 事件失败')
    }
  }

  // 加载 BOT 动作列表
  const loadBotActions = async (botActions) => {
    try {
      const response = await request({
        url: '/api/bot/actions',
        method: 'get'
      })
      if (response.code === 200) {
        botActions.value = response.data || []
      } else {
        ElMessage.error(response.message || '加载 BOT 动作失败')
      }
    } catch (error) {
      ElMessage.error('加载 BOT 动作失败')
    }
  }

  // 保存工作流
  const saveWorkflow = async (workflowInfo, nodes, validateWorkflowNodes, router, workflowId, clearWorkflowCache, generateConnections, loadWorkflowInfo, connections, botEvents, botActions, processNodeInfo, canvasX, canvasY, zoom) => {
    if (!workflowInfo || !workflowInfo.name) {
      ElMessage.error('请输入工作流名称')
      return
    }
    
    // 验证所有节点的参数是否都有数据映射或默认值
    const validationResult = validateWorkflowNodes(nodes)
    if (!validationResult.valid) {
      ElMessage.error(validationResult.message)
      return null
    }
    
    // 获取当前用户信息
    const userId = localStorage.getItem('userId')
    const name = localStorage.getItem('name')
    
    // 构建完整的工作流信息
    const workflowData = {
      // 确保工作流自身信息完整填充
      id: workflowInfo.id || '',
      userId: workflowInfo.userId || userId || '',
      authorName: workflowInfo.authorName || name || '',
      name: workflowInfo.name || '',
      description: workflowInfo.description || '',
      enabled: workflowInfo.enabled !== undefined ? workflowInfo.enabled : true,
      createTime: workflowInfo.createTime || null,
      updateTime: workflowInfo.updateTime || null,
      workflowCanvasView: {
        workflowId: workflowInfo.id || '',
        userId: workflowInfo.userId || userId || '',
        offsetX: canvasX?.value ?? canvasX ?? 0,
        offsetY: canvasY?.value ?? canvasY ?? 0,
        scale: zoom?.value ?? zoom ?? 1
      },
      nodes: (nodes || []).map(node => {
        // 构建节点数据
        return {
          id: node.id ? node.id.toString() : '',
          x: node.x || 0,
          y: node.y || 0,
          workflowId: workflowInfo.id || workflowId || '',
          pluginId: node.pluginId,
          pluginVersionId: node.pluginVersionId,
          methodClassId: node.methodClassId,
          methodId: node.methodId,
          nodeType: node.nodeType || 'pluginMethod',
          eventType: node.eventType || null,
          botQQ: node.botQQ || null,
          botActionName: node.botActionName || null,
          botEventName: node.botEventName || null,
          scheduledTime: node.scheduledTime || null,
          inDegree: node.inDegree || 0,
          dataMaps: node.dataMaps || [],
          preNodeId: node.preNodeId || [],
          nextNodeId: node.nextNodeId || [],
          nodeDefaults: node.nodeDefaults || [],
          condition: node.condition || null
        }
      })
    }
    
    try {
      const response = await request({
        url: '/workflow',
        method: workflowInfo.id ? 'put' : 'post',
        data: workflowData
      })
      
      if (response.code === 200) {
        ElMessage.success(workflowInfo.id ? '更新工作流成功' : '创建工作流成功')
        // 更新浏览器URL，添加工作流ID
        if (response.data && response.data.id) {
          router.replace(`/workflow/edit/${response.data.id}`)
          // 使用后端返回的完整工作流数据替换原本的数据
          if (workflowInfo && typeof workflowInfo === 'object') {
            if ('value' in workflowInfo) {
              // 响应式对象
              workflowInfo.value = response.data
            } else {
              // 普通对象
              Object.assign(workflowInfo, response.data)
            }
          }
        }
        // 刷新画布，重新加载工作流信息
        if (loadWorkflowInfo) {
          loadWorkflowInfo(workflowInfo.id || response.data.id, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections, canvasX, canvasY, zoom)
        }
        // 返回保存后的工作流信息
        return response.data
      } else {
        ElMessage.error(response.message || (workflowInfo.id ? '更新工作流失败' : '创建工作流失败'))
        return null
      }
    } catch (error) {
      ElMessage.error(workflowInfo.id ? '更新工作流失败' : '创建工作流失败')
      return null
    }
  }

  // 保存并测试工作流
  const saveAndTestWorkflow = async (workflowInfo, nodes, validateWorkflowNodes, router, workflowId, clearWorkflowCache, processNodeInfo, botEvents, botActions, generateConnections, loadWorkflowInfo, connections, canvasX, canvasY, zoom) => {
    // 兼容 ref 与普通对象
    const wfInfo = workflowInfo?.value !== undefined ? workflowInfo.value : workflowInfo
    if (!wfInfo || !wfInfo.name) {
      ElMessage.error('请输入工作流名称')
      return null
    }
    const validationResult = validateWorkflowNodes(nodes.value)
    if (!validationResult.valid) {
      ElMessage.error(validationResult.message)
      return null
    }
    
    // 获取当前用户信息
    const userId = localStorage.getItem('userId')
    const name = localStorage.getItem('name')
    
    // 构建完整的工作流信息
    const workflowData = {
      // 确保工作流自身信息完整填充
      id: wfInfo.id || '',
      userId: wfInfo.userId || userId || '',
      authorName: wfInfo.authorName || name || '',
      name: wfInfo.name || '',
      description: wfInfo.description || '',
      enabled: wfInfo.enabled !== undefined ? wfInfo.enabled : true,
      createTime: wfInfo.createTime || null,
      updateTime: wfInfo.updateTime || null,
      workflowCanvasView: {
        workflowId: wfInfo.id || '',
        userId: wfInfo.userId || userId || '',
        offsetX: canvasX?.value ?? canvasX ?? 0,
        offsetY: canvasY?.value ?? canvasY ?? 0,
        scale: zoom?.value ?? zoom ?? 1
      },
      nodes: (nodes.value || nodes).map(node => {
        // 构建节点数据
        return {
          id: node.id ? node.id.toString() : '',
          x: node.x || 0,
          y: node.y || 0,
          workflowId: wfInfo.id || workflowId || '',
          pluginId: node.pluginId,
          pluginVersionId: node.pluginVersionId,
          methodClassId: node.methodClassId,
          methodId: node.methodId,
          nodeType: node.nodeType || 'pluginMethod',
          eventType: node.eventType || null,
          botQQ: node.botQQ || null,
          inDegree: node.inDegree || 0,
          dataMaps: node.dataMaps || [],
          preNodeId: node.preNodeId || [],
          nextNodeId: node.nextNodeId || [],
          nodeDefaults: node.nodeDefaults || [],
          condition: node.condition || null
        }
      })
    }
    
    try {
      // 先保存工作流
      let saveResponse
      if (wfInfo.id) {
        // 有UUID，调用更新接口
        saveResponse = await request({
          url: '/workflow',
          method: 'put',
          data: workflowData
        })
      } else {
        // 无UUID，调用保存接口
        saveResponse = await request({
          url: '/workflow',
          method: 'post',
          data: workflowData
        })
      }
      
      if (saveResponse.code !== 200) {
        ElMessage.error(saveResponse.message || (wfInfo.id ? '更新工作流失败' : '创建工作流失败'))
        return null
      }
      
      // 获取工作流ID
      const currentWorkflowId = wfInfo.id || (saveResponse.data && saveResponse.data.id)
      
      // 保存成功，更新完整工作流信息
      if (saveResponse.data) {
        // 更新浏览器URL，添加工作流ID
        if (saveResponse.data.id) {
          router.replace(`/workflow/edit/${saveResponse.data.id}`)
          // 使用后端返回的完整工作流数据替换原本的数据
          if (workflowInfo && typeof workflowInfo === 'object') {
            if ('value' in workflowInfo) {
              // 响应式对象
              workflowInfo.value = saveResponse.data
            } else {
              // 普通对象
              Object.assign(workflowInfo, saveResponse.data)
            }
          }
        }
        // 清除工作流缓存
        clearWorkflowCache()
        // 刷新画布，重新加载工作流信息
        if (loadWorkflowInfo) {
          // 传递 showError: false，避免与测试成功消息冲突
          await loadWorkflowInfo(currentWorkflowId, workflowInfo, nodes, connections, botEvents, botActions, processNodeInfo, generateConnections, canvasX, canvasY, zoom, false)
        }
      }
      
      // 调用测试接口
      const testResponse = await request({
        url: '/workflow/test',
        method: 'post',
        params: {
          workflowId: currentWorkflowId
        }
      })
      
      if (testResponse.code === 200) {
        // 返回日志ID，由调用方查询完整日志
        const logId = testResponse.data
        ElMessage.success('测试工作流成功')
        return logId
      } else {
        ElMessage.error(testResponse.message || '测试工作流失败')
        return null
      }
    } catch (error) {
      console.error('测试工作流失败:', error)
      ElMessage.error('测试工作流失败')
      return null
    }
  }

  // 同步机器人信息到localStorage，同时更新在线状态
  const syncBotInfo = async (hasBotQQ, botEvents, botActions, loadBotEvents, loadBotActions, isBotOnline) => {
    try {
      const response = await request({
        url: '/bot/info',
        method: 'get'
      })
      if (response.code === 200 && response.data && response.data.botQQ) {
        localStorage.setItem('botQQ', response.data.botQQ)
        if (hasBotQQ) {
          hasBotQQ.value = true
        }
        if (isBotOnline) {
          isBotOnline.value = response.data.online === true
        }
        if (loadBotEvents) {
          loadBotEvents(botEvents)
        }
        if (loadBotActions) {
          loadBotActions(botActions)
        }
      } else {
        localStorage.removeItem('botQQ')
        if (hasBotQQ) {
          hasBotQQ.value = false
        }
        if (isBotOnline) {
          isBotOnline.value = false
        }
      }
    } catch (error) {
      console.error('同步机器人信息失败:', error)
      if (isBotOnline) {
        isBotOnline.value = false
      }
    }
  }

  return {
    loadWorkflowInfo,
    loadPlugins,
    loadPublicPlugins,
    loadBotEvents,
    loadBotActions,
    saveWorkflow,
    saveAndTestWorkflow,
    syncBotInfo
  }
}