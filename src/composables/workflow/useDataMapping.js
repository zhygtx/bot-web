import { isTriggerCallable } from '../../utils/workflow'

// 节点参数配置模块（新模型：inputs 数组）
export function useDataMapping() {
  // 规范化节点
  const normalizeNode = (node) => {
    if (!node) return node
    if (!Array.isArray(node.inputs)) node.inputs = []
    if (!node.config) node.config = {}
    if (node.branch === undefined) node.branch = false
    return node
  }

  // 获取参数输入配置
  const getParamInput = (node, paramIndex) => {
    normalizeNode(node)
    return node.inputs.find(input => input.paramIndex === paramIndex)
  }

  // 校验工作流节点
  const validateWorkflowNodes = (nodes) => {
    if (!Array.isArray(nodes)) {
      return { valid: true, message: '' }
    }
    for (const node of nodes) {
      normalizeNode(node)
      if (node.callable === 'system:schedule') {
        const cron = node.config?.cronExpression
        if (!cron || String(cron).trim() === '') {
          return { valid: false, message: '定时触发节点未配置 Cron 表达式' }
        }
      }
      const descriptor = node.descriptor || {}
      const parameters = descriptor.parameters || []
      for (let i = 0; i < parameters.length; i++) {
        const param = parameters[i]
        if (param.nullable) continue
        const input = getParamInput(node, i)
        const hasSource = input?.source && String(input.source).trim() !== ''
        const hasDefault = input?.defaultValue !== undefined && input?.defaultValue !== null
        if (!hasSource && !hasDefault) {
          return {
            valid: false,
            message: `节点 ${descriptor.name || node.callable} 的参数 ${param.name} 未设置来源或默认值`
          }
        }
      }
    }
    return { valid: true, message: '' }
  }

  // 保存节点配置
  const saveNodeConfig = (node, inputs, branch, config) => {
    normalizeNode(node)
    node.inputs = inputs
    node.branch = !!branch
    if (config) node.config = config
  }

  return {
    normalizeNode,
    getParamInput,
    validateWorkflowNodes,
    saveNodeConfig
  }
}
