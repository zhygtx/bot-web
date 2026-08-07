<template>
  <transition name="panel-slide">
    <div v-if="visible && node" class="config-panel-float" @click.stop>
      <div class="panel-header">
        <h3 class="panel-title">{{ node.descriptor?.name || '节点配置' }}</h3>
        <el-button :icon="Close" circle size="small" class="panel-close-btn" @click="closePanel" />
      </div>
      <div class="panel-body">
        <!-- 定时触发节点 -->
        <template v-if="node.callable === 'system:schedule'">
          <div class="scheduled-event-config">
            <h4>定时任务配置</h4>
            <el-radio-group
              v-model="scheduleConfigMode"
              size="small"
              class="schedule-mode-switch"
              @change="onScheduleModeChange"
            >
              <el-radio-button value="preset">快捷预设</el-radio-button>
              <el-radio-button value="builder">拼接配置</el-radio-button>
              <el-radio-button value="custom">手动 Cron</el-radio-button>
            </el-radio-group>

            <template v-if="scheduleConfigMode === 'preset'">
              <div class="scheduled-time-selector">
                <label>快捷配置：</label>
                <el-select v-model="schedulePreset" placeholder="请选择快捷配置" style="width: 220px;" @change="onSchedulePresetChange">
                  <el-option v-for="option in scheduleOptions" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
              </div>
            </template>

            <template v-else-if="scheduleConfigMode === 'builder'">
              <div class="cron-builder">
                <div v-for="segment in builderSegments" :key="segment.key" class="cron-builder-row">
                  <span class="cron-field-label">{{ segment.label }}</span>
                  <el-select v-model="segment.mode" size="small" style="width: 120px;" @change="onBuilderChange">
                    <el-option v-for="mode in segment.modes" :key="mode.value" :label="mode.label" :value="mode.value" />
                  </el-select>
                  <el-input-number
                    v-if="segment.mode === 'step'"
                    v-model="segment.step"
                    :min="segment.minStep"
                    :max="segment.maxStep"
                    :controls="false"
                    size="small"
                    style="width: 90px;"
                    @change="onBuilderChange"
                  />
                  <span v-if="segment.mode === 'step'" class="cron-unit">{{ segment.unit }}</span>
                  <el-select
                    v-else-if="segment.mode === 'specify'"
                    v-model="segment.values"
                    multiple
                    collapse-tags
                    size="small"
                    style="width: 200px;"
                    placeholder="请选择"
                    @change="onBuilderChange"
                  >
                    <el-option v-for="option in segment.options" :key="option.value" :label="option.label" :value="option.value" />
                  </el-select>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="scheduled-time-selector">
                <label>Cron 表达式：</label>
                <el-input v-model="cronExpression" placeholder="例如 0 */5 * * * ?" style="width: 280px;" />
              </div>
            </template>

            <div class="cron-preview">
              <span class="cron-preview-label">最终 Cron：</span>
              <code>{{ cronExpression }}</code>
            </div>
            <p class="schedule-hint">最短执行间隔为 5 分钟，保存时后端会校验 Cron 表达式。</p>
          </div>
        </template>

        <!-- BOT 事件触发节点 -->
        <div v-else-if="node.callable.startsWith('system:botEvent:')" class="trigger-info">
          <h4>BOT 事件触发</h4>
          <p>该节点使用当前注册 BOT 的 QQ：{{ botQQText }}</p>
        </div>

        <!-- 普通任务节点 -->
        <template v-else>
          <div class="mapping-section">
            <h4 class="section-title">数据映射与默认值</h4>
            <div v-for="(config, idx) in paramConfigs" :key="idx" class="param-row">
              <div class="param-name-col">
                <span class="param-name">
                  <span v-if="!config.nullable" class="param-required">*</span>
                  {{ config.paramName }}
                </span>
                <span class="param-type">{{ config.paramType }}</span>
                <span v-if="config.paramDescription" class="param-desc">{{ config.paramDescription }}</span>
              </div>
              <div class="param-ref-col">
                <el-select v-model="config.mode" size="small" style="width: 100px;" :disabled="config.locked" @change="onModeChange(config)">
                  <el-option label="引用" value="source" />
                  <el-option label="默认值" value="default" />
                </el-select>
              </div>
              <div class="param-value-col">
                <!-- 来源模式：选择节点 + 返回字段，并做类型校验 -->
                <template v-if="config.mode === 'source'">
                  <div class="source-picker-row">
                    <el-select
                      v-model="config.sourceNodeId"
                      placeholder="来源节点"
                      size="small"
                      class="source-node-select"
                      @change="onSourceNodeChange(config)"
                    >
                      <el-option
                        v-for="sourceNode in ancestorNodes"
                        :key="sourceNode.id"
                        :label="getNodeName(sourceNode)"
                        :value="sourceNode.id"
                      />
                    </el-select>
                    <el-select
                      v-model="config.sourceFieldPath"
                      placeholder="返回字段"
                      size="small"
                      class="source-field-select"
                      @change="onSourceFieldChange(config)"
                    >
                      <el-option
                        v-for="field in config.sourceFields"
                        :key="field.selectValue"
                        :label="fieldLabel(field)"
                        :value="field.selectValue"
                      />
                    </el-select>
                  </div>
                </template>

                <!-- 默认值模式：按参数类型展示输入控件 -->
                <template v-else>
                  <el-select
                    v-if="isBooleanType(config.paramType)"
                    v-model="config.defaultValue"
                    size="small"
                    style="width: 100%;"
                    :disabled="config.locked"
                    @change="onDefaultChange(config)"
                  >
                    <el-option :value="true" label="true" />
                    <el-option :value="false" label="false" />
                  </el-select>
                  <el-input-number
                    v-else-if="isNumericType(config.paramType)"
                    v-model="config.defaultValue"
                    :controls="false"
                    :precision="isFloatType(config.paramType) ? 6 : 0"
                    size="small"
                    style="width: 100%;"
                    :disabled="config.locked"
                    @change="onDefaultChange(config)"
                  />
                  <el-input
                    v-else
                    v-model="config.defaultValue"
                    :placeholder="defaultPlaceholder(config.paramType)"
                    size="small"
                    style="width: 100%;"
                    :disabled="config.locked"
                    @input="onDefaultChange(config)"
                  />
                </template>

                <div v-if="config.locked" class="locked-hint">已自动填充当前 QQ，不可修改</div>
                <div v-if="config.error" class="type-error">{{ config.error }}</div>
              </div>
            </div>
            <div v-if="paramConfigs.length === 0" class="no-params-hint">该节点无需配置参数</div>
          </div>

          <div v-if="canBranch" class="branch-section">
            <h4 class="section-title">分支设置</h4>
            <el-checkbox v-model="branch">作为分支节点（成功/失败两个输出口）</el-checkbox>
            <p class="branch-hint">分支节点根据方法返回的 Boolean 值选择 success/failure 出边。</p>
          </div>
        </template>
      </div>
      <div class="panel-footer">
        <el-button @click="closePanel">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElButton, ElSelect, ElOption, ElInput, ElInputNumber, ElCheckbox, ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { isBooleanReturn, isTypeCompatible, sortParameters, getNodeName } from '../../utils/workflow'

const props = defineProps({
  visible: { type: Boolean, default: false },
  node: { type: Object, default: null },
  allNodes: { type: Array, default: () => [] },
  allEdges: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'saveConfig'])

const scheduleOptions = [
  { label: '每 5 分钟', value: 'every5', cron: '0 */5 * * * ?' },
  { label: '每 10 分钟', value: 'every10', cron: '0 */10 * * * ?' },
  { label: '每 15 分钟', value: 'every15', cron: '0 */15 * * * ?' },
  { label: '每 30 分钟', value: 'every30', cron: '0 */30 * * * ?' },
  { label: '每小时', value: 'hourly', cron: '0 0 * * * ?' },
  { label: '每天 0 点', value: 'daily', cron: '0 0 0 * * ?' },
  { label: '每周一 9 点', value: 'weeklyMon', cron: '0 0 9 ? * MON' },
  { label: '自定义', value: 'custom', cron: '' }
]

const cronExpression = ref('0 */5 * * * ?')
const schedulePreset = ref('every5')
const scheduleConfigMode = ref('preset')
const paramConfigs = ref([])
const branch = ref(false)
const botQQText = localStorage.getItem('botQQ') || '未配置'

const rangeOptions = (min, max) => {
  const options = []
  for (let i = min; i <= max; i++) {
    options.push({ value: String(i), label: String(i) })
  }
  return options
}

const weekOptions = [
  { value: 'MON', label: '周一' },
  { value: 'TUE', label: '周二' },
  { value: 'WED', label: '周三' },
  { value: 'THU', label: '周四' },
  { value: 'FRI', label: '周五' },
  { value: 'SAT', label: '周六' },
  { value: 'SUN', label: '周日' }
]

const builderSegments = ref([
  {
    key: 'second', label: '秒', mode: 'specify', step: 5, values: ['0'],
    minStep: 1, maxStep: 59, unit: '秒',
    modes: [{ value: 'every', label: '每秒' }, { value: 'step', label: '每 N 秒' }, { value: 'specify', label: '指定' }],
    options: rangeOptions(0, 59)
  },
  {
    key: 'minute', label: '分', mode: 'step', step: 5, values: [],
    minStep: 1, maxStep: 59, unit: '分',
    modes: [{ value: 'every', label: '每分' }, { value: 'step', label: '每 N 分' }, { value: 'specify', label: '指定' }],
    options: rangeOptions(0, 59)
  },
  {
    key: 'hour', label: '时', mode: 'every', step: 1, values: [],
    minStep: 1, maxStep: 23, unit: '时',
    modes: [{ value: 'every', label: '每小时' }, { value: 'step', label: '每 N 时' }, { value: 'specify', label: '指定' }],
    options: rangeOptions(0, 23)
  },
  {
    key: 'day', label: '日', mode: 'every', step: 1, values: [],
    minStep: 1, maxStep: 31, unit: '日',
    modes: [{ value: 'every', label: '每天' }, { value: 'none', label: '不指定' }, { value: 'specify', label: '指定' }],
    options: rangeOptions(1, 31)
  },
  {
    key: 'month', label: '月', mode: 'every', step: 1, values: [],
    minStep: 1, maxStep: 12, unit: '月',
    modes: [{ value: 'every', label: '每月' }, { value: 'specify', label: '指定' }],
    options: rangeOptions(1, 12)
  },
  {
    key: 'week', label: '周', mode: 'none', step: 1, values: [],
    minStep: 1, maxStep: 7, unit: '周',
    modes: [{ value: 'none', label: '不指定' }, { value: 'every', label: '每周' }, { value: 'specify', label: '指定' }],
    options: weekOptions
  }
])

const canBranch = computed(() => {
  return props.node?.descriptor && isBooleanReturn(props.node.descriptor.returnType)
})

// 沿连线反向遍历，收集当前节点的全部祖先节点
const ancestorNodes = computed(() => {
  const result = []
  if (!props.node?.id) return result
  const visited = new Set([props.node.id])
  const queue = [props.node.id]
  while (queue.length > 0) {
    const currentId = queue.shift()
    for (const edge of props.allEdges || []) {
      if (edge.toNode === currentId && !visited.has(edge.fromNode)) {
        visited.add(edge.fromNode)
        const sourceNode = props.allNodes.find(node => node.id === edge.fromNode)
        if (sourceNode) {
          result.push(sourceNode)
          queue.push(sourceNode.id)
        }
      }
    }
  }
  return result
})

const initPanel = () => {
  if (!props.node) return
  branch.value = !!props.node.branch
  if (props.node.callable === 'system:schedule') {
    cronExpression.value = props.node.config?.cronExpression || '0 */5 * * * ?'
    const matched = scheduleOptions.find(option => option.value !== 'custom' && option.cron === cronExpression.value)
    schedulePreset.value = matched ? matched.value : 'custom'
    if (matched) {
      scheduleConfigMode.value = 'preset'
    } else if (parseCronToBuilder(cronExpression.value)) {
      scheduleConfigMode.value = 'builder'
    } else {
      scheduleConfigMode.value = 'custom'
    }
    return
  }
  const parameters = sortParameters(props.node.descriptor?.parameters)
  paramConfigs.value = parameters.map((param, index) => {
    const existing = props.node.inputs?.find(input => input.paramIndex === index)
    const hasDefault = existing?.defaultValue !== undefined && existing?.defaultValue !== null
    const mode = existing?.source ? 'source' : (hasDefault ? 'default' : 'source')
    let sourceNodeId = ''
    let sourceFieldPath = ''
    let source = ''
    if (existing?.source) {
      source = String(existing.source)
      const parts = source.split('.')
      sourceNodeId = parts[0]
      sourceFieldPath = parts.slice(1).join('.')
    }
    const config = {
      paramName: param.name,
      paramType: param.type,
      paramDescription: param.description || '',
      nullable: !!param.nullable,
      mode,
      sourceNodeId,
      sourceFieldPath,
      source,
      sourceFields: [],
      defaultValue: existing?.defaultValue ?? '',
      error: '',
      locked: param.name === 'botQQ'
    }
    if (config.locked) {
      config.mode = 'default'
      config.source = ''
      config.sourceNodeId = ''
      config.sourceFieldPath = ''
      config.defaultValue = botQQText
    } else {
      config.sourceFields = getSourceFields(config.sourceNodeId)
      if (sourceFieldPath === '' && sourceNodeId) {
        config.sourceFieldPath = '__whole__'
      }
    }
    if (mode === 'source') {
      validateSource(config)
    } else {
      validateDefault(config)
    }
    return config
  })
}

const isBooleanType = (type) => {
  return String(type || '').toLowerCase() === 'boolean'
}

const isNumericType = (type) => {
  return ['int', 'integer', 'long', 'short', 'byte', 'double', 'float'].includes(String(type || '').toLowerCase())
}

const isFloatType = (type) => {
  return ['double', 'float'].includes(String(type || '').toLowerCase())
}

const isObjectType = (type) => {
  return String(type || '').toLowerCase() === 'object'
}

const defaultPlaceholder = (type) => {
  if (isObjectType(type)) return '请输入 JSON'
  if (isNumericType(type)) return '请输入数字'
  return '请输入值'
}

// 获取来源节点可选的返回字段
const getSourceFields = (nodeId) => {
  const sourceNode = props.allNodes.find(node => node.id === nodeId)
  if (!sourceNode) return []
  const fields = sourceNode.descriptor?.returnFields
  const list = fields?.length
    ? fields
    : [{
    name: '返回值',
    type: sourceNode.descriptor?.returnType || 'Object',
    description: '整个返回值',
    path: ''
  }]
  return list.map(field => ({
    ...field,
    selectValue: field.path === '' ? '__whole__' : field.path
  }))
}

const fieldLabel = (field) => {
  const label = `${field.name} (${field.type})`
  return field.description ? `${label} - ${field.description}` : label
}

const onSchedulePresetChange = () => {
  if (schedulePreset.value === 'custom') return
  const option = scheduleOptions.find(item => item.value === schedulePreset.value)
  if (option) {
    cronExpression.value = option.cron
    parseCronToBuilder(cronExpression.value)
  }
}

const onScheduleModeChange = (mode) => {
  if (mode === 'builder' && !parseCronToBuilder(cronExpression.value)) {
    cronExpression.value = '0 */5 * * * ?'
    parseCronToBuilder(cronExpression.value)
  }
}

const findBuilderSegment = (key) => builderSegments.value.find(segment => segment.key === key)

const fieldValue = (segment) => {
  if (segment.mode === 'every') return '*'
  if (segment.mode === 'none') return '?'
  if (segment.mode === 'step') return `*/${segment.step}`
  return (segment.values || []).join(',') || '*'
}

const buildCronFromSegments = () => {
  let day = fieldValue(findBuilderSegment('day'))
  let week = fieldValue(findBuilderSegment('week'))
  if (day !== '?' && week !== '?') week = '?'
  if (day === '?' && week === '?') day = '*'
  return [
    fieldValue(findBuilderSegment('second')),
    fieldValue(findBuilderSegment('minute')),
    fieldValue(findBuilderSegment('hour')),
    day,
    fieldValue(findBuilderSegment('month')),
    week
  ].join(' ')
}

const applyCronValue = (segment, value) => {
  if (value === '*') {
    segment.mode = 'every'
    segment.values = []
  } else if (value === '?') {
    segment.mode = 'none'
    segment.values = []
  } else if (value.startsWith('*/')) {
    segment.mode = 'step'
    segment.step = Number(value.slice(2)) || segment.step
  } else {
    segment.mode = 'specify'
    segment.values = value.split(',').filter(Boolean)
  }
}

const parseCronToBuilder = (cron) => {
  const parts = String(cron || '').trim().split(/\s+/)
  if (parts.length !== 6) return false
  applyCronValue(findBuilderSegment('second'), parts[0])
  applyCronValue(findBuilderSegment('minute'), parts[1])
  applyCronValue(findBuilderSegment('hour'), parts[2])
  applyCronValue(findBuilderSegment('day'), parts[3])
  applyCronValue(findBuilderSegment('month'), parts[4])
  applyCronValue(findBuilderSegment('week'), parts[5])
  return true
}

const onBuilderChange = () => {
  cronExpression.value = buildCronFromSegments()
  schedulePreset.value = 'custom'
}

const onModeChange = (config) => {
  if (config.locked) return
  config.error = ''
  if (config.mode === 'source') validateSource(config)
  else validateDefault(config)
}

const onSourceNodeChange = (config) => {
  config.sourceFields = getSourceFields(config.sourceNodeId)
  config.sourceFieldPath = ''
  config.source = ''
  config.error = ''
}

const onSourceFieldChange = (config) => {
  const field = config.sourceFields.find(item => item.selectValue === config.sourceFieldPath)
  if (!field) {
    config.source = ''
    config.error = '请选择返回字段'
    return
  }
  config.source = field.path ? `${config.sourceNodeId}.${field.path}` : config.sourceNodeId
  validateSource(config)
}

const validateSource = (config) => {
  if (!config.sourceNodeId) {
    config.error = '请选择来源节点'
    return false
  }
  const field = config.sourceFields.find(item => item.selectValue === config.sourceFieldPath)
  if (!field) {
    config.error = '请选择返回字段'
    return false
  }
  if (!isTypeCompatible(field.type, config.paramType)) {
    config.error = `类型不兼容：${field.type} -> ${config.paramType}`
    return false
  }
  config.error = ''
  return true
}

const onDefaultChange = (config) => {
  validateDefault(config)
}

const validateDefault = (config) => {
  if (config.locked) {
    config.error = ''
    return true
  }
  const value = config.defaultValue
  if (value === undefined || value === null || value === '') {
    config.error = config.nullable ? '' : '请填写默认值'
    return !config.nullable ? false : true
  }
  if (isBooleanType(config.paramType)) {
    config.error = (value === true || value === false || value === 'true' || value === 'false') ? '' : '默认值必须是 true/false'
  } else if (isNumericType(config.paramType)) {
    const num = Number(value)
    config.error = Number.isNaN(num) ? '默认值必须是数字' : ''
  } else if (isObjectType(config.paramType)) {
    try {
      if (typeof value === 'string') JSON.parse(value)
      config.error = ''
    } catch (e) {
      config.error = '默认值必须是合法 JSON'
    }
  } else {
    config.error = ''
  }
  return !config.error
}

const parseDefaultValue = (value, type) => {
  if (value === undefined || value === null || value === '') return null
  if (isBooleanType(type)) {
    return value === true || value === 'true'
  }
  if (isNumericType(type)) {
    const num = Number(value)
    return Number.isNaN(num) ? null : num
  }
  if (isObjectType(type)) {
    return typeof value === 'string' ? JSON.parse(value) : value
  }
  return String(value)
}

const saveConfig = () => {
  if (props.node.callable === 'system:schedule') {
    emit('saveConfig', {
      inputs: [],
      branch: false,
      config: { ...props.node.config, cronExpression: cronExpression.value }
    })
    closePanel()
    return
  }
  if (props.node.callable.startsWith('system:botEvent:')) {
    emit('saveConfig', {
      inputs: [],
      branch: false,
      config: props.node.config || {}
    })
    closePanel()
    return
  }

  for (const config of paramConfigs.value) {
    if (config.locked) {
      config.defaultValue = botQQText
    }
    if (config.mode === 'source') {
      const valid = validateSource(config)
      if (!valid) {
        ElMessage.error(`参数 ${config.paramName}：${config.error}`)
        return
      }
    } else {
      const valid = validateDefault(config)
      if (!valid) {
        ElMessage.error(`参数 ${config.paramName}：${config.error}`)
        return
      }
    }
  }

  const inputs = paramConfigs.value.map((config, index) => {
    if (config.mode === 'source') {
      return {
        paramIndex: index,
        source: config.source || '',
        defaultValue: null
      }
    }
    return {
      paramIndex: index,
      source: '',
      defaultValue: parseDefaultValue(config.defaultValue, config.paramType)
    }
  })
  emit('saveConfig', {
    inputs,
    branch: branch.value,
    config: props.node.config || {}
  })
  closePanel()
}

const closePanel = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (visible) => {
  if (visible) initPanel()
})
</script>
