import request from '../../utils/request'
import { ElMessage } from 'element-plus'
import { attachDescriptor } from '../../utils/workflow'

// 工作流 API 模块（新模型：definition JSON）
export function useWorkflowAPI() {
  // 批量解析节点 callable 描述
  const resolveNodeDescriptors = async (nodes) => {
    const keys = [...new Set((nodes || []).map(node => node.callable).filter(Boolean))]
    if (keys.length === 0) return
    try {
      const response = await request({
        url: '/workflow/resolveCallables',
        method: 'post',
        data: keys
      })
      if (response.code === 200) {
        const descriptors = response.data || {}
        ;(nodes || []).forEach(node => attachDescriptor(node, descriptors))
      }
    } catch (error) {
      console.error('解析 callable 失败:', error)
    }
  }

  // 加载工作流信息
  const loadWorkflowInfo = async (workflowId, workflowInfo, nodes, edges, canvasX, canvasY, zoom) => {
    if (!workflowId) {
      if (nodes) nodes.value = []
      if (edges) edges.value = []
      return
    }
    try {
      const response = await request({
        url: `/workflow/${workflowId}`,
        method: 'get'
      })
      if (response.code === 200) {
        const data = response.data || {}
        const definition = data.definition || { nodes: [], edges: [], view: {} }
        workflowInfo.value = data
        nodes.value = (definition.nodes || []).map(node => ({
          ...node,
          inputs: node.inputs || [],
          config: node.config || {},
          branch: !!node.branch
        }))
        edges.value = (definition.edges || []).map(edge => ({
          id: `${edge.from}:${edge.to}:${edge.port || 'success'}`,
          fromNode: edge.from,
          toNode: edge.to,
          port: edge.port || 'success'
        }))
        if (canvasX) canvasX.value = definition.view?.offsetX ?? 0
        if (canvasY) canvasY.value = definition.view?.offsetY ?? 0
        if (zoom) zoom.value = definition.view?.scale ?? 1
        await resolveNodeDescriptors(nodes.value)
      }
    } catch (error) {
      console.error('加载工作流失败:', error)
    }
  }

  // 加载插件列表
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
      }
    } catch (error) {
      console.error('加载插件失败:', error)
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
      }
    } catch (error) {
      console.error('加载 BOT 事件失败:', error)
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
      }
    } catch (error) {
      console.error('加载 BOT 动作失败:', error)
    }
  }

  // 构建工作流保存数据
  const buildWorkflowData = (workflowInfo, nodes, edges, canvasX, canvasY, zoom) => {
    const wfInfo = workflowInfo?.value !== undefined ? workflowInfo.value : workflowInfo
    const nodeList = nodes?.value !== undefined ? nodes.value : nodes
    const edgeList = edges?.value !== undefined ? edges.value : edges
    return {
      id: wfInfo?.id || '',
      userId: wfInfo?.userId || localStorage.getItem('userId') || '',
      name: wfInfo?.name || '',
      enabled: wfInfo?.enabled !== undefined ? wfInfo.enabled : true,
      definition: {
        view: {
          offsetX: canvasX?.value ?? canvasX ?? 0,
          offsetY: canvasY?.value ?? canvasY ?? 0,
          scale: zoom?.value ?? zoom ?? 1
        },
        nodes: (nodeList || []).map(node => ({
          id: node.id,
          x: node.x || 0,
          y: node.y || 0,
          callable: node.callable,
          inputs: (node.inputs || []).map(input => ({
            paramIndex: input.paramIndex,
            source: input.source || '',
            defaultValue: input.defaultValue ?? null
          })),
          branch: !!node.branch,
          config: node.config || {}
        })),
        edges: (edgeList || []).map(edge => ({
          from: edge.fromNode,
          to: edge.toNode,
          port: edge.port || 'success'
        }))
      }
    }
  }

  // 保存工作流
  const saveWorkflow = async (workflowInfo, nodes, edges, router, canvasX, canvasY, zoom) => {
    const wfInfo = workflowInfo?.value !== undefined ? workflowInfo.value : workflowInfo
    if (!wfInfo?.name) {
      ElMessage.error('请输入工作流名称')
      return null
    }
    const data = buildWorkflowData(workflowInfo, nodes, edges, canvasX, canvasY, zoom)
    try {
      const response = await request({
        url: '/workflow',
        method: data.id ? 'put' : 'post',
        data
      })
      if (response.code === 200) {
        const saved = response.data
        if (saved?.id && router) {
          router.replace(`/workflow/edit/${saved.id}`)
        }
        workflowInfo.value = saved
        return saved
      }
      return null
    } catch (error) {
      console.error('保存工作流失败:', error)
      return null
    }
  }

  // 保存并测试工作流
  const saveAndTestWorkflow = async (workflowInfo, nodes, edges, router, canvasX, canvasY, zoom) => {
    const saved = await saveWorkflow(workflowInfo, nodes, edges, router, canvasX, canvasY, zoom)
    if (!saved?.id) return null
    try {
      const response = await request({
        url: '/workflow/test',
        method: 'post',
        params: { workflowId: saved.id }
      })
      return response.code === 200 ? response.data : null
    } catch (error) {
      console.error('测试工作流失败:', error)
      return null
    }
  }

  // 同步机器人信息
  const syncBotInfo = async (hasBotQQ, isBotOnline) => {
    try {
      const response = await request({
        url: '/bot',
        method: 'get'
      })
      if (response.code === 200 && response.data?.botQQ) {
        localStorage.setItem('botQQ', response.data.botQQ)
        if (hasBotQQ) hasBotQQ.value = true
        if (isBotOnline) isBotOnline.value = response.data.online === true
      } else {
        localStorage.removeItem('botQQ')
        if (hasBotQQ) hasBotQQ.value = false
        if (isBotOnline) isBotOnline.value = false
      }
    } catch (error) {
      console.error('同步机器人信息失败:', error)
      if (isBotOnline) isBotOnline.value = false
    }
  }

  return {
    loadWorkflowInfo,
    loadPlugins,
    loadBotEvents,
    loadBotActions,
    saveWorkflow,
    saveAndTestWorkflow,
    syncBotInfo,
    resolveNodeDescriptors
  }
}
