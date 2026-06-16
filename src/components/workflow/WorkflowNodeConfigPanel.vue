<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElPopover, ElInput, ElSelect, ElOption, ElButton, ElForm, ElFormItem } from 'element-plus'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  node: { type: Object, default: () => ({}) },
  preNodes: { type: Array, default: () => [] },
  allNodes: { type: Array, default: () => [] },
  plugins: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'saveMapping', 'saveCondition'])

// ===== 通用类型工具 =====
const basicTypes = [
  'String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Byte', 'Short', 'Character',
  'int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char',
  'BigInteger', 'BigDecimal', 'Date', 'LocalDate', 'LocalDateTime', 'Timestamp',
  'Object', 'String[]', 'Integer[]', 'Long[]', 'Double[]', 'Boolean[]'
]
const collectionTypes = ['List', 'Set', 'Collection', 'Map', 'ArrayList', 'HashSet', 'HashMap', 'LinkedList']
const getBaseType = (type) => { if (!type) return ''; const m = type.match(/^(\w+)</); return m ? m[1] : type }
const isBasicType = (type) => {
  if (!type) return false
  const bts = ['String', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Byte', 'Short', 'Character', 'int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char', 'BigInteger', 'BigDecimal', 'Date', 'LocalDate', 'LocalDateTime', 'Timestamp']
  return bts.includes(getBaseType(type))
}

// ===== 定时事件 =====
const scheduledTimeOptions = [
  { label: '1分钟', value: 60 }, { label: '2分钟', value: 120 }, { label: '5分钟', value: 300 },
  { label: '10分钟', value: 600 }, { label: '30分钟', value: 1800 }, { label: '1小时', value: 3600 },
  { label: '2小时', value: 7200 }, { label: '6小时', value: 21600 }, { label: '12小时', value: 43200 }, { label: '24小时', value: 86400 }
]
const selectedScheduledTime = ref(null)
const isScheduledEventNode = computed(() => props.node?.nodeType === 'botEvent' && props.node?.eventType === 'scheduledEvent')

// ===== 条件配置 =====
const canSetCondition = computed(() => {
  if (!props.node?.method) return false
  return ['boolean', 'Boolean'].includes(props.node.method.returnType)
})
const condition = ref({ id: '', nodeId: '', trueAction: 'CONTINUE', falseAction: 'CONTINUE' })

// ===== 参数行配置 =====
// 每个参数的配置行
const paramConfigs = ref([])
// paramConfigs[i] = { paramName, paramIndex, paramType, refType: 'input'|'reference', inputValue, referencePath: [] }

const isSaving = ref(false)

// ===== 自定义级联选择器状态 =====
const cascaderOpenIdx = ref(-1)           // 当前打开的是哪个参数的级联选择器
const cascaderActiveNode = ref(null)       // 当前打开的级联选择器中选中的节点

const toggleCascader = (idx) => {
  if (cascaderOpenIdx.value === idx) {
    closeCascader()
  } else {
    openCascader(idx)
  }
}

const openCascader = (idx) => {
  // 先关闭其他已打开的面板
  cascaderOpenIdx.value = idx
  const config = paramConfigs.value[idx]
  if (config?.referencePath?.length === 2) {
    const nodeOption = ancestorCascaderOptions.value.find(o => o.value === config.referencePath[0])
    cascaderActiveNode.value = nodeOption || null
  } else {
    cascaderActiveNode.value = null
  }
}

const closeCascader = () => {
  cascaderOpenIdx.value = -1
  cascaderActiveNode.value = null
}

const selectCascaderNode = (idx, option) => {
  cascaderActiveNode.value = option === cascaderActiveNode.value ? null : option
}

const selectCascaderValue = (idx, child) => {
  const config = paramConfigs.value[idx]
  if (!config || !cascaderActiveNode.value) return
  config.referencePath = [cascaderActiveNode.value.value, child.value]
  closeCascader()
}

// 点击外部时关闭级联面板（使用 trigger="manual" 时需要手动处理）
const handleDocumentClick = (e) => {
  if (cascaderOpenIdx.value === -1) return
  // 检查点击目标是否在面板内或触发器内
  const target = e.target
  const isInPopover = target.closest('.custom-cascader-popper')
  const isInTrigger = target.closest('.cascader-trigger')
  if (!isInPopover && !isInTrigger) {
    closeCascader()
  }
}

// 当前打开的级联选择器中的节点子选项
const cascaderActiveNodeChildren = computed(() => {
  if (!cascaderActiveNode.value) return []
  return cascaderActiveNode.value.children || []
})

// ===== 递归获取所有祖先节点 =====
const getAllAncestors = (nodeId, allNodes, visited = new Set()) => {
  if (!nodeId || visited.has(nodeId)) return []
  visited.add(nodeId)
  const node = allNodes.find(n => n.id === nodeId)
  if (!node || !node.preNodeId || node.preNodeId.length === 0) return []
  const ancestors = []
  for (const preId of node.preNodeId) {
    const preNode = allNodes.find(n => n.id === preId)
    if (preNode && !visited.has(preId)) {
      ancestors.push(preNode)
      ancestors.push(...getAllAncestors(preId, allNodes, visited))
    }
  }
  return ancestors
}

// ===== 构建级联选择器选项 =====
// 第一层：节点名(节点描述)
// 第二层：返回值参数(参数描述或返回值描述)
const ancestorCascaderOptions = computed(() => {
  if (!props.allNodes || props.allNodes.length === 0) return []
  if (!props.node?.preNodeId || props.node.preNodeId.length === 0) return []

  const visited = new Set([props.node.id])
  const options = []

  // 构建单个节点选项的辅助函数
  const buildNodeOption = (node) => {
    if (!node.method?.returnType || node.method.returnType === 'void') return null

    let returnType = node.method.returnType
    if (node.entityInfo?.entityName) returnType = node.entityInfo.entityName

    const nodeDescription = node.method.description || node.method.returnDescription || ''
    const nodeLabel = nodeDescription
      ? `${node.method.name}(${nodeDescription})`
      : node.method.name

    const option = {
      value: `node_${node.id}`,
      label: nodeLabel,
      nodeName: node.method.name,
      nodeDescription: nodeDescription,
      children: []
    }

    // 实体类：列出所有属性
    if (node.entityInfo?.fields) {
      option.children = node.entityInfo.fields.map(field => ({
        value: `attr_${node.id}_${field.fieldName}`,
        label: field.description ? `${field.fieldName}(${field.description})` : field.fieldName,
        returnName: field.fieldName,
        returnDescription: field.description || '',
        nodeId: node.id,
        nodeName: node.method.name,
        nodeDescription: nodeDescription,
        attrName: field.fieldName,
        typeName: field.fieldType,
        description: field.description || '',
        path: `value.${field.fieldName}`
      }))
    } else if (node.pluginInfo?.pluginVersionList) {
      let foundEntity = false
      for (const version of node.pluginInfo.pluginVersionList) {
        if (version.entityInfoList) {
          const entityInfo = version.entityInfoList.find(e => e.name === getBaseType(returnType) || e.entityName === returnType)
          if (entityInfo?.attributes && Array.isArray(entityInfo.attributes)) {
            option.children = entityInfo.attributes.map(attr => ({
              value: `attr_${node.id}_${attr.name}`,
              label: attr.description ? `${attr.name}(${attr.description})` : attr.name,
              returnName: attr.name,
              returnDescription: attr.description || '',
              nodeId: node.id,
              nodeName: node.method.name,
              nodeDescription: nodeDescription,
              attrName: attr.name,
              typeName: attr.type,
              description: attr.description || '',
              path: `value.${attr.name}`
            }))
            foundEntity = true
            break
          }
        }
      }
      if (!foundEntity) {
        const returnDescription = node.method.returnDescription || node.method.description || ''
        option.children.push({
          value: `value_${node.id}`,
          label: returnDescription ? `${returnType}(${returnDescription})` : returnType,
          returnName: returnType,
          returnDescription: returnDescription,
          nodeId: node.id,
          nodeName: node.method.name,
          nodeDescription: nodeDescription,
          path: 'value',
          typeName: node.method.returnType,
          description: returnDescription
        })
      }
    } else {
      const returnDescription = node.method.returnDescription || node.method.description || ''
      option.children.push({
        value: `value_${node.id}`,
        label: returnDescription ? `${returnType}(${returnDescription})` : returnType,
        returnName: returnType,
        returnDescription: returnDescription,
        nodeId: node.id,
        nodeName: node.method.name,
        nodeDescription: nodeDescription,
        path: 'value',
        typeName: node.method.returnType,
        description: returnDescription
      })
    }

    if (option.children.length > 0) {
      return option
    }
    return null
  }

  // 先添加直接前置节点
  for (const preId of props.node.preNodeId) {
    const preNode = props.allNodes.find(n => n.id === preId)
    if (!preNode || visited.has(preId)) continue
    visited.add(preId)
    const option = buildNodeOption(preNode)
    if (option) options.push(option)
  }

  // 递归添加祖先节点
  for (const preId of props.node.preNodeId) {
    const ancestors = getAllAncestors(preId, props.allNodes, new Set([props.node.id]))
    for (const ancestor of ancestors) {
      if (visited.has(ancestor.id)) continue
      visited.add(ancestor.id)
      const option = buildNodeOption(ancestor)
      if (option) options.push(option)
    }
  }

  return options
})

// ===== 获取级联选择器显示文本 =====
const getCascaderTriggerNode = (referencePath) => {
  if (!referencePath || referencePath.length < 2) return ''
  for (const option of ancestorCascaderOptions.value) {
    if (option.value === referencePath[0]) {
      for (const child of option.children) {
        if (child.value === referencePath[1]) {
          return child.nodeName || ''
        }
      }
    }
  }
  return ''
}

const getCascaderTriggerReturn = (referencePath) => {
  if (!referencePath || referencePath.length < 2) return ''
  for (const option of ancestorCascaderOptions.value) {
    if (option.value === referencePath[0]) {
      for (const child of option.children) {
        if (child.value === referencePath[1]) {
          return child.returnName || ''
        }
      }
    }
  }
  return ''
}

const getCascaderDescText = (referencePath) => {
  if (!referencePath || referencePath.length < 2) return ''
  for (const option of ancestorCascaderOptions.value) {
    if (option.value === referencePath[0]) {
      for (const child of option.children) {
        if (child.value === referencePath[1]) {
          return child.returnDescription || ''
        }
      }
    }
  }
  return ''
}

// ===== 初始化参数配置 =====
const initParamConfigs = () => {
  const configs = []
  if (props.node?.method?.parameters && props.node.method.parameters.length > 0) {
    const sortedParams = [...props.node.method.parameters].sort((a, b) => (a.order || 0) - (b.order || 0))
    sortedParams.forEach((param, index) => {
      const config = {
        paramName: param.name,
        paramIndex: index,
        paramType: param.type,
        refType: 'input',  // 默认输入
        inputValue: '',
        referencePath: []
      }
      configs.push(config)
    })
  }
  paramConfigs.value = configs
}

// ===== 从已有数据(已保存的dataMaps/nodeDefaults)回填参数配置 =====
const restoreParamConfigsFromData = () => {
  if (!props.node) return
  const configs = []
  if (props.node.method?.parameters && props.node.method.parameters.length > 0) {
    const sortedParams = [...props.node.method.parameters].sort((a, b) => (a.order || 0) - (b.order || 0))
    sortedParams.forEach((param, index) => {
      const config = {
        paramName: param.name,
        paramIndex: index,
        paramType: param.type,
        refType: 'input',
        inputValue: '',
        referencePath: []
      }

      // 特殊处理 botQQ
      if (param.name === 'botQQ') {
        config.refType = 'input'
        config.inputValue = localStorage.getItem('botQQ') || ''
      }

      // 检查是否有映射
      const dataMaps = props.node.dataMaps || []
      const map = dataMaps.find(m => m.targetParamName === param.name || m.targetPath === param.name)
      if (map) {
        config.refType = 'reference'
        if (map.sourcePath && map.sourcePath !== 'value') {
          // attr_ mapping
          const attrName = map.sourcePath.replace('value.', '')
          config.referencePath = [`node_${map.sourceNodeId}`, `attr_${map.sourceNodeId}_${attrName}`]
        } else {
          config.referencePath = [`node_${map.sourceNodeId}`, `value_${map.sourceNodeId}`]
        }
      } else {
        // 检查默认值
        const nodeDefaults = props.node.nodeDefaults || []
        const def = nodeDefaults.find(d => d.paramName === param.name || d.fieldPath === param.name)
        if (def) {
          config.refType = 'input'
          config.inputValue = def.defaultValue ?? ''
        } else {
          config.refType = 'input'
          config.inputValue = ''
        }
      }

      configs.push(config)
    })
  }
  paramConfigs.value = configs
}

// ===== 获取级联选择器选中项的详细信息 =====
const getReferenceInfo = (referencePath) => {
  if (!referencePath || referencePath.length < 2) return { nodeId: null, path: '', typeName: '', description: '' }
  for (const option of ancestorCascaderOptions.value) {
    if (option.value === referencePath[0]) {
      for (const child of option.children) {
        if (child.value === referencePath[1]) {
          return {
            nodeId: child.nodeId,
            path: child.path,
            typeName: child.typeName,
            description: child.description
          }
        }
      }
    }
  }
  return { nodeId: null, path: '', typeName: '', description: '' }
}

// ===== 检查所有参数是否已填充 =====
const areAllParamsFilled = computed(() => {
  if (!paramConfigs.value.length) return true
  return paramConfigs.value.every(config => {
    if (config.paramName === 'botQQ') return true
    if (config.refType === 'input') {
      return config.inputValue !== undefined && config.inputValue !== ''
    }
    if (config.refType === 'reference') {
      return config.referencePath.length === 2
    }
    return false
  })
})

// ===== 验证默认值 =====
const validateDefaultValue = (value, type) => {
  if (!value || value.trim() === '') return true
  const bt = getBaseType(type)
  try {
    switch (bt) {
      case 'String': return true
      case 'Integer': case 'int': return Number.isInteger(Number(value))
      case 'Long': case 'long': case 'Double': case 'double': case 'Float': case 'float': case 'BigInteger': case 'BigDecimal': return !isNaN(Number(value))
      case 'Boolean': case 'boolean': return ['true', 'false', '1', '0'].includes(value.toLowerCase())
      case 'Byte': case 'byte': const bv = Number(value); return !isNaN(bv) && bv >= -128 && bv <= 127
      case 'Short': case 'short': const sv = Number(value); return !isNaN(sv) && sv >= -32768 && sv <= 32767
      case 'Character': case 'char': return value.length === 1
      case 'Date': case 'LocalDate': case 'LocalDateTime': case 'Timestamp': return !isNaN(new Date(value).getTime())
      default: return true
    }
  } catch (e) { return false }
}

// ===== 保存 =====
const saveConfig = async () => {
  if (isScheduledEventNode.value) {
    if (!selectedScheduledTime.value) { ElMessage.error('请选择执行间隔'); return }
    isSaving.value = true
    props.node.scheduledTime = selectedScheduledTime.value
    emit('saveMapping', { dataMaps: [], nodeDefaults: [] })
    emit('saveCondition', condition.value)
    closePanel()
    setTimeout(() => { isSaving.value = false }, 100)
    return
  }

  if (!areAllParamsFilled.value) { ElMessage.error('请为所有参数设置数据映射或默认值'); return }

  const newDataMaps = []
  const newNodeDefaults = []

  for (const config of paramConfigs.value) {
    if (config.paramName === 'botQQ') {
      newNodeDefaults.push({
        id: Date.now().toString(),
        paramIndex: config.paramIndex,
        paramName: config.paramName,
        fieldPath: config.paramName,
        defaultValue: config.inputValue || localStorage.getItem('botQQ') || '',
        defaultValueType: config.paramType
      })
      continue
    }

    if (config.refType === 'reference') {
      const ref = getReferenceInfo(config.referencePath)
      if (!ref.nodeId) continue
      let sourceType = ref.typeName || 'String'
      let targetType = config.paramType || 'String'
      newDataMaps.push({
        id: Date.now().toString(),
        sourceNodeId: ref.nodeId.toString(),
        sourcePath: ref.path || 'value',
        targetParamName: config.paramName,
        paramIndex: config.paramIndex,
        targetPath: config.paramName,
        sourceType,
        targetType
      })
    } else if (config.refType === 'input') {
      if (config.inputValue !== undefined && config.inputValue !== '') {
        if (!isBasicType(config.paramType)) {
          ElMessage.warning(`参数 ${config.paramName} 类型 ${config.paramType} 不是基本数据类型，不能设置默认值`)
          return
        }
        if (!validateDefaultValue(config.inputValue, config.paramType)) {
          ElMessage.error(`参数 ${config.paramName} 的默认值不符合 ${config.paramType} 类型要求`)
          return
        }
        newNodeDefaults.push({
          id: Date.now().toString(),
          paramIndex: config.paramIndex,
          paramName: config.paramName,
          fieldPath: config.paramName,
          defaultValue: config.inputValue,
          defaultValueType: config.paramType
        })
      }
    }
  }

  isSaving.value = true
  emit('saveMapping', { dataMaps: newDataMaps, nodeDefaults: newNodeDefaults })
  emit('saveCondition', condition.value)
  closePanel()
  setTimeout(() => { isSaving.value = false }, 100)
}

// ===== 关闭面板 =====
const closePanel = () => {
  emit('update:visible', false)
}

// ===== 初始化 =====
const initPanel = () => {
  if (isScheduledEventNode.value) {
    selectedScheduledTime.value = props.node?.scheduledTime || null
    return
  }

  // 初始化条件
  if (props.node?.condition) {
    condition.value = { ...props.node.condition }
  } else {
    condition.value = { id: Date.now().toString(), nodeId: props.node?.id || '', trueAction: 'CONTINUE', falseAction: 'CONTINUE' }
  }

  // 先初始化参数配置模板，再回填已保存数据
  initParamConfigs()
  restoreParamConfigsFromData()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick, true)
})

watch(() => props.visible, (newVal) => {
  if (newVal) { initPanel() }
})
</script>

<template>
  <transition name="panel-slide">
    <div v-if="visible" class="config-panel-float" @click.stop>
      <div class="panel-header">
        <h3 class="panel-title">{{ node?.method?.name || '节点配置' }}</h3>
        <el-button @click="closePanel" :icon="Close" circle size="small" class="panel-close-btn" />
      </div>
      <div class="panel-body">
        <!-- 定时事件节点配置 -->
        <div v-if="isScheduledEventNode" class="scheduled-event-config">
          <h4>定时任务配置</h4>
          <div class="scheduled-time-selector">
            <label>执行间隔：</label>
            <el-select v-model="selectedScheduledTime" placeholder="请选择执行间隔" style="width: 200px;">
              <el-option v-for="option in scheduledTimeOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </div>
          <div class="scheduled-time-hint">
            <p>提示：定时任务将按照设定的间隔自动触发工作流执行，最小间隔为1分钟</p>
          </div>
        </div>

        <!-- 普通节点：数据映射配置 -->
        <template v-else>
          <div class="mapping-section">
            <h4 class="section-title">数据映射与默认值</h4>
            <!-- 每个参数一行 -->
            <div class="param-rows">
              <div v-for="(config, idx) in paramConfigs" :key="idx" class="param-row">
                <div class="param-name-col">
                  <span class="param-name">{{ config.paramName }}</span>
                  <span class="param-type">{{ config.paramType }}</span>
                </div>
                <div class="param-ref-col">
                  <el-select v-model="config.refType" placeholder="选择方式" size="small" style="width: 100px;">
                    <el-option label="引用" value="reference" />
                    <el-option label="输入" value="input" />
                  </el-select>
                </div>
                <div class="param-value-col">
                  <!-- 输入模式 -->
                  <el-input
                    v-if="config.refType === 'input'"
                    v-model="config.inputValue"
                    placeholder="请输入值"
                    size="small"
                    style="width: 100%;"
                    :disabled="config.paramName === 'botQQ' || !isBasicType(config.paramType)"
                  />
                  <span v-if="config.paramName === 'botQQ' && config.refType === 'input'" class="hint-text">已预填充</span>
                  <!-- 引用模式 -->
                  <el-popover
                    v-else-if="config.refType === 'reference'"
                    trigger="manual"
                    :visible="cascaderOpenIdx === idx"
                    placement="bottom-start"
                    :width="440"
                    :offset="4"
                    popper-class="custom-cascader-popper"
                  >
                    <template #reference>
                      <div class="cascader-trigger" @click.stop="toggleCascader(idx)">
                        <span v-if="config.referencePath.length === 2" class="trigger-content">
                          <span class="trigger-node">{{ getCascaderTriggerNode(config.referencePath) }}</span>
                          <span class="trigger-sep">/</span>
                          <span class="trigger-return">{{ getCascaderTriggerReturn(config.referencePath) }}</span>
                          <span v-if="getCascaderDescText(config.referencePath)" class="trigger-desc">({{ getCascaderDescText(config.referencePath) }})</span>
                        </span>
                        <span v-else class="trigger-placeholder">选择前置节点</span>
                        <span class="trigger-arrow">▼</span>
                      </div>
                    </template>
                    <div class="cascader-panel-custom">
                      <!-- 第一层：祖先节点 -->
                      <div class="cascader-level">
                        <div class="level-label">选择节点</div>
                        <div class="level-list">
                          <div
                            v-for="option in ancestorCascaderOptions"
                            :key="option.value"
                            class="cascader-option"
                            :class="{ active: cascaderActiveNode?.value === option.value }"
                            @mouseenter="selectCascaderNode(idx, option)"
                          >
                            <span class="option-main">{{ option.nodeName }}</span>
                            <span v-if="option.nodeDescription" class="option-desc">({{ option.nodeDescription }})</span>
                          </div>
                          <div v-if="ancestorCascaderOptions.length === 0" class="level-empty">无前置节点</div>
                        </div>
                      </div>
                      <!-- 第二层：返回值 -->
                      <div class="cascader-level cascader-level-right">
                        <div class="level-label">选择返回值</div>
                        <div class="level-list">
                          <template v-if="cascaderActiveNode">
                            <div
                              v-for="child in cascaderActiveNodeChildren"
                              :key="child.value"
                              class="cascader-option"
                              :class="{ active: config.referencePath[1] === child.value }"
                              @click="selectCascaderValue(idx, child)"
                            >
                              <span class="option-main">{{ child.returnName || child.label }}</span>
                              <span v-if="child.returnDescription" class="option-desc">({{ child.returnDescription }})</span>
                            </div>
                          </template>
                          <div v-else class="level-hint">
                            ← 请先选择左侧节点
                          </div>
                        </div>
                      </div>
                    </div>
                  </el-popover>
                </div>
              </div>
            </div>
            <!-- 无参数提示 -->
            <div v-if="paramConfigs.length === 0" class="no-params-hint">
              该节点无需配置参数
            </div>
          </div>

          <!-- 条件配置（仅布尔返回类型） -->
          <div v-if="canSetCondition" class="condition-section">
            <h4 class="section-title">条件配置</h4>
            <el-form label-width="170px">
              <el-form-item label="返回值为 true 时执行">
                <el-select v-model="condition.trueAction" placeholder="请选择执行动作">
                  <el-option label="继续执行" value="CONTINUE" />
                  <el-option label="结束当前分支" value="BREAK" />
                  <el-option label="结束整个工作流" value="END" />
                </el-select>
              </el-form-item>
              <el-form-item label="返回值为 false 时执行">
                <el-select v-model="condition.falseAction" placeholder="请选择执行动作">
                  <el-option label="继续执行" value="CONTINUE" />
                  <el-option label="结束当前分支" value="BREAK" />
                  <el-option label="结束整个工作流" value="END" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>
        </template>
      </div>
      <div class="panel-footer">
        <el-button @click="closePanel">取消</el-button>
        <el-button type="primary" @click="saveConfig" :loading="isSaving">保存</el-button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* 右侧配置面板（悬浮窗） */
.config-panel-float {
  position: absolute;
  right: 20px;
  top: 100px;
  width: 600px;
  height: calc(100% - 120px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 300;
  display: flex;
  flex-direction: column;
}

/* 面板头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e6e6e6;
  background-color: #f9f9f9;
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.panel-close-btn {
  color: #909399;
}

/* 面板主体 */
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* 面板底部 */
.panel-footer {
  padding: 12px 20px;
  border-top: 1px solid #e6e6e6;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

/* 参数行 */
.param-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #ececec;
}

.param-name-col {
  width: 150px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.param-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.param-type {
  font-size: 11px;
  color: #909399;
}

.param-ref-col {
  width: 100px;
  flex-shrink: 0;
}

.param-value-col {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint-text {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

/* 自定义级联选择器触发器（模拟 input 外观） */
.cascader-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s;
  font-size: 12px;
}
.cascader-trigger:hover {
  border-color: #c0c4cc;
}

.trigger-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  overflow: hidden;
  min-width: 0;
}

.trigger-node {
   overflow: hidden;
   text-overflow: ellipsis;
   white-space: nowrap;
   font-size: 12px;
   color: #303133;
 }

 .trigger-sep {
   font-size: 12px;
   color: #c0c4cc;
   flex-shrink: 0;
   margin: 0 1px;
 }

 .trigger-return {
   font-size: 12px;
   color: #409EFF;
   flex-shrink: 0;
 }

.trigger-desc {
  color: #909399;
  flex-shrink: 0;
  margin-left: 8px;
  font-size: 12px;
}

.trigger-placeholder {
  flex: 1;
  font-size: 12px;
  color: #c0c4cc;
}

.trigger-arrow {
  font-size: 10px;
  color: #c0c4cc;
  margin-left: 4px;
  flex-shrink: 0;
}

.no-params-hint {
  text-align: center;
  color: #909399;
  padding: 30px;
  font-size: 14px;
}

/* 条件配置区域 */
.condition-section {
  margin-top: 20px;
}

/* 定时事件配置 */
.scheduled-event-config {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px; background-color: #f9f9f9; border-radius: 8px;
}
.scheduled-event-config h4 { margin-bottom: 30px; font-size: 18px; color: #303133; }
.scheduled-time-selector { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
.scheduled-time-selector label { font-size: 14px; color: #606266; font-weight: 500; }
.scheduled-time-hint { margin-top: 20px; padding: 15px 20px; background-color: #e6f7ff; border-radius: 4px; border-left: 4px solid #409eff; }
.scheduled-time-hint p { margin: 0; font-size: 13px; color: #606266; }

/* 面板滑入/滑出动画 */
.panel-slide-enter-active { transition: transform 0.3s ease; }
.panel-slide-leave-active { transition: transform 0.25s ease; }
.panel-slide-enter-from { transform: translateX(100%); }
.panel-slide-leave-to { transform: translateX(100%); }
</style>

<style>
/* 自定义级联面板（popover 内容，非 scoped） */
.custom-cascader-popper {
  padding: 0 !important;
}

.cascader-panel-custom {
  display: flex;
  height: 280px;
  overflow: hidden;
}

.cascader-level {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e6e6e6;
  min-width: 0;
}
.cascader-level-right {
  border-right: none;
}

.level-label {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  background: #fafafa;
  border-bottom: 1px solid #e6e6e6;
  flex-shrink: 0;
}

.level-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.cascader-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  min-width: 0;
}
.cascader-option:hover {
  background: #f5f7fa;
}
.cascader-option.active {
  background: #ecf5ff;
  color: #409eff;
}

.option-main {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
  color: inherit;
}

.option-desc {
  color: #909399;
  flex-shrink: 0;
  margin-left: 8px;
  font-size: 12px;
  white-space: nowrap;
}

.level-empty,
.level-hint {
  padding: 20px 12px;
  font-size: 13px;
  color: #c0c4cc;
  text-align: center;
}
</style>
