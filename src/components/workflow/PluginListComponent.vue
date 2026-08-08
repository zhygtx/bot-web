<template>
  <div class="plugin-list-float" :class="{ 'plugin-list-collapsed': !showPluginList }">
    <div class="collapse-btn" v-if="!showPluginList" @click="togglePanel">
      <el-icon><ArrowUp /></el-icon>
    </div>
    <template v-if="showPluginList">
      <div class="collapse-bar">
        <el-button circle size="small" @click="togglePanel">
          <el-icon><ArrowUp /></el-icon>
        </el-button>
      </div>
      <div class="plugin-panel-body">
        <div class="side-nav">
          <div class="nav-item" :class="{ active: activeTab === 'my' }" @click="activeTab = 'my'" title="我的插件">
            <el-icon :size="20"><User /></el-icon>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'public' }" @click="activeTab = 'public'" title="公开插件">
            <el-icon :size="20"><Connection /></el-icon>
          </div>
          <div v-if="hasBotQQFromLocalStorage && isBotOnline" class="nav-item" :class="{ active: activeTab === 'bot' }" @click="activeTab = 'bot'" title="BOT 系统">
            <el-icon :size="20"><Cpu /></el-icon>
          </div>
        </div>
        <div class="content-area">
          <div class="search-box">
            <el-input v-model="searchKeyword" placeholder="搜索名称或描述" clearable size="small" />
          </div>
          <el-scrollbar v-if="activeTab !== 'bot'" class="scroll-container">
            <div class="plugin-list">
              <el-card v-for="plugin in filteredPlugins" :key="plugin.id" class="plugin-item-card">
                <div class="plugin-card-content">
                  <div class="plugin-card-header">
                    <h3 class="plugin-name">{{ plugin.name }}</h3>
                    <el-select
                      v-if="plugin.pluginVersionList?.length"
                      :model-value="getVersionId(plugin.id)"
                      @update:model-value="val => updateVersion(plugin.id, val)"
                      size="small"
                      class="version-select"
                    >
                      <el-option v-for="ver in plugin.pluginVersionList" :key="ver.id" :label="ver.version" :value="ver.id" />
                    </el-select>
                  </div>
                  <div class="plugin-card-description">{{ plugin.description }}</div>
                  <div class="plugin-card-toggle" @click="togglePluginExpand(plugin.id)">
                    <el-icon>
                      <ArrowDown v-if="expandedPluginId !== plugin.id" />
                      <ArrowUp v-else />
                    </el-icon>
                  </div>
                  <div v-if="expandedPluginId === plugin.id" class="plugin-card-methods">
                    <template v-if="getPluginDetail(plugin.id)">
                      <div v-for="methodClass in getPluginDetail(plugin.id).pluginVersionList?.[0]?.methodClassInfoList || []" :key="methodClass.id" class="method-class-group">
                        <h5 class="method-class-name">{{ methodClass.simpleClassName }}</h5>
                        <div
                          v-for="method in methodClass.methods || []"
                          :key="method.id"
                          class="method-item"
                          draggable="true"
                          @dragstart="startDrag($event, buildPluginCallable(plugin, getVersionId(plugin.id), method), buildPluginDescriptor(method, getPluginDetail(plugin.id)?.pluginVersionList?.[0]))"
                          @dragend="endDrag"
                        >
                          <span class="method-signature">{{ method.returnType }} {{ method.name }}</span>
                          <p v-if="method.description" class="method-item-description">{{ method.description }}</p>
                        </div>
                      </div>
                    </template>
                    <div v-else class="no-methods">加载中...</div>
                  </div>
                </div>
              </el-card>
              <el-empty v-if="filteredPlugins.length === 0" description="暂无插件" />
            </div>
          </el-scrollbar>

          <el-scrollbar v-else class="scroll-container bot-content">
            <div class="bot-section">
              <div class="bot-section-header" @click="toggleSection('botEvents')">
                <el-icon class="category-toggle-icon">
                  <ArrowDown v-if="isSectionExpanded('botEvents')" />
                  <ArrowRight v-else />
                </el-icon>
                <h3 class="bot-section-title">事件与定时</h3>
              </div>
              <div v-show="isSectionExpanded('botEvents')" class="bot-section-body">
                <div
                  class="method-item"
                  draggable="true"
                  @dragstart="startDrag($event, 'system:schedule', scheduleDescriptor)"
                  @dragend="endDrag"
                >
                  <span class="method-signature">定时触发</span>
                  <p class="method-item-description">按照设定间隔自动执行</p>
                </div>
                <div
                  v-for="event in filteredBotEvents"
                  :key="event.eventType"
                  class="method-item"
                  draggable="true"
                  @dragstart="startDrag($event, `system:botEvent:${event.eventType}`, buildEventDescriptor(event))"
                  @dragend="endDrag"
                >
                  <span class="method-signature">{{ event.eventName }}</span>
                  <p v-if="event.description" class="method-item-description">{{ event.description }}</p>
                </div>
              </div>
            </div>
            <div class="bot-section">
              <div class="bot-section-header" @click="toggleSection('botActions')">
                <el-icon class="category-toggle-icon">
                  <ArrowDown v-if="isSectionExpanded('botActions')" />
                  <ArrowRight v-else />
                </el-icon>
                <h3 class="bot-section-title">BOT 动作</h3>
              </div>
              <div v-show="isSectionExpanded('botActions')" class="bot-section-body">
                <div v-for="group in botActionGroups" :key="group.name" class="bot-action-group">
                  <div class="bot-action-group-header" @click="toggleActionGroup(group.name)">
                    <el-icon class="category-toggle-icon">
                      <ArrowDown v-if="isActionGroupExpanded(group.name)" />
                      <ArrowRight v-else />
                    </el-icon>
                    <h5 class="bot-action-group-title">{{ group.name }}</h5>
                    <span class="bot-action-count">{{ group.actions.length }}</span>
                  </div>
                  <div v-show="isActionGroupExpanded(group.name)" class="bot-action-group-body">
                    <div
                      v-for="action in group.actions"
                      :key="action.actionName"
                      class="method-item"
                      draggable="true"
                      @dragstart="startDrag($event, `system:botAction:${action.actionName}`, buildActionDescriptor(action))"
                      @dragend="endDrag"
                    >
                      <span class="method-signature">{{ action.actionDisplayName }}</span>
                      <p v-if="getActionDescription(action)" class="method-item-description">{{ getActionDescription(action) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { User, Connection, Cpu, ArrowUp, ArrowDown, ArrowRight, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'

const props = defineProps({
  botEvents: { type: Array, default: () => [] },
  botActions: { type: Array, default: () => [] },
  hasBotQQ: { type: Boolean, default: false },
  isBotOnline: { type: Boolean, default: false },
  showPluginList: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle-plugin-list', 'start-drag', 'end-drag'])

const activeTab = ref('my')
const searchKeyword = ref('')
const expandedPluginId = ref(null)
const pluginList = ref([])
const versionMap = ref({})
const pluginDetailCache = ref({})
const sectionExpanded = ref({ botEvents: true, botActions: false })
const actionGroupExpanded = ref({})

const hasBotQQFromLocalStorage = computed(() => localStorage.getItem('botQQ') !== null)

const scheduleDescriptor = {
  key: 'system:schedule',
  name: '定时触发',
  description: '按照设定间隔自动触发',
  kind: 'TRIGGER',
  source: 'SYSTEM',
  returnType: 'Object',
  parameters: [{ name: 'cronExpression', type: 'String', description: 'Cron 表达式，最短执行间隔 5 分钟', order: 0, nullable: false }]
}

const filteredPlugins = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return pluginList.value
  return pluginList.value.filter(p =>
    (p.name || '').toLowerCase().includes(kw) || (p.description || '').toLowerCase().includes(kw))
})

const filteredBotEvents = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const list = props.botEvents.filter(e => e.eventType !== 'scheduledEvent')
  if (!kw) return list
  return list.filter(e => (e.eventName || '').toLowerCase().includes(kw) || (e.description || '').toLowerCase().includes(kw))
})

const botActionGroups = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const list = props.botActions.filter(a =>
    !kw || (a.actionDisplayName || '').toLowerCase().includes(kw) || (a.description || '').toLowerCase().includes(kw))
  const groupMap = new Map()
  list.forEach(action => {
    const categories = Array.isArray(action.categories) && action.categories.length
      ? action.categories
      : ['其他']
    categories.forEach((category, index) => {
      if (!groupMap.has(category)) {
        groupMap.set(category, {
          name: category,
          order: action.categoryOrders?.[index] ?? 0,
          actions: []
        })
      }
      groupMap.get(category).actions.push(action)
    })
  })
  return [...groupMap.values()].sort((a, b) =>
    (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'zh-CN'))
})

const getActionDescription = (action) => {
  const description = (action?.description || '').trim()
  if (!description) return ''
  if (/^分类[：:]/.test(description)) return ''
  return description
}

const loadPluginList = async (reset = true) => {
  if (reset) pluginList.value = []
  const response = await request({
    url: '/plugin/findPlugins',
    method: 'get',
    params: {
      authorId: activeTab.value === 'my' ? localStorage.getItem('userId') || '' : undefined,
      isPublic: activeTab.value === 'public' ? true : undefined,
      pageNum: 1,
      pageSize: 100
    }
  })
  if (response.code === 200) {
    const items = response.data?.list || response.data?.records || response.data?.content || []
    pluginList.value = items
    items.forEach(plugin => {
      const first = plugin.pluginVersionList?.find(v => v?.id)
      if (first && !versionMap.value[plugin.id]) versionMap.value[plugin.id] = first.id
    })
  }
}

const getVersionId = (pluginId) => versionMap.value[pluginId] || ''

const updateVersion = (pluginId, versionId) => {
  versionMap.value = { ...versionMap.value, [pluginId]: versionId }
  if (expandedPluginId.value === pluginId) loadPluginDetail(pluginId, versionId)
}

const loadPluginDetail = async (pluginId, versionId) => {
  const cacheKey = `${pluginId}:${versionId}`
  if (pluginDetailCache.value[cacheKey]) return
  const response = await request({
    url: '/plugin/findPlugin',
    method: 'get',
    params: { pluginId, pluginVersionId: versionId }
  })
  if (response.code === 200) {
    pluginDetailCache.value = { ...pluginDetailCache.value, [cacheKey]: response.data }
  }
}

const getPluginDetail = (pluginId) => {
  const versionId = getVersionId(pluginId)
  return versionId ? pluginDetailCache.value[`${pluginId}:${versionId}`] : null
}

const togglePluginExpand = (pluginId) => {
  expandedPluginId.value = expandedPluginId.value === pluginId ? null : pluginId
  const versionId = getVersionId(pluginId)
  if (expandedPluginId.value === pluginId && versionId) loadPluginDetail(pluginId, versionId)
}

const toggleSection = (key) => {
  sectionExpanded.value[key] = !sectionExpanded.value[key]
}

const isSectionExpanded = (key) => sectionExpanded.value[key] !== false

const isActionGroupExpanded = (key) => actionGroupExpanded.value[key] !== false

const toggleActionGroup = (key) => {
  actionGroupExpanded.value = {
    ...actionGroupExpanded.value,
    [key]: !isActionGroupExpanded(key)
  }
}

const togglePanel = () => emit('toggle-plugin-list')

const buildEventDescriptor = (event) => ({
  key: `system:botEvent:${event.eventType}`,
  name: event.eventName,
  description: event.description,
  kind: 'TRIGGER',
  source: 'SYSTEM',
  returnType: event.entityInfo?.entityName || 'Object',
  parameters: [],
  returnFields: buildEventReturnFields(event)
})

const buildActionDescriptor = (action) => ({
  key: `system:botAction:${action.actionName}`,
  name: action.actionDisplayName,
  description: getActionDescription(action),
  kind: 'TASK',
  source: 'SYSTEM',
  returnType: action.returnInfo?.type || 'void',
  parameters: action.parameters || [],
  returnFields: buildActionReturnFields(action)
})

const buildPluginCallable = (plugin, versionId, method) => `plugin:${plugin.id}:${versionId}:${method.id}`

const buildPluginDescriptor = (method, version) => ({
  key: method.id,
  name: method.name,
  description: method.description,
  kind: 'TASK',
  source: 'PLUGIN',
  returnType: method.returnType,
  parameters: method.parameters || [],
  returnFields: buildPluginReturnFields(method, version)
})

const buildEventReturnFields = (event) => {
  const fields = [{
    name: '整个事件对象',
    type: event.entityInfo?.entityName || 'Object',
    description: '整个事件对象',
    path: ''
  }]
  ;(event.entityInfo?.fields || []).forEach(field => {
    fields.push({
      name: field.fieldName,
      type: field.fieldType,
      description: field.description || '',
      path: field.fieldName
    })
  })
  return fields
}

const buildActionReturnFields = (action) => {
  const fields = [{
    name: '返回值',
    type: action.returnInfo?.type || 'void',
    description: '整个返回值',
    path: ''
  }]
  ;(action.returnInfo?.fields || []).forEach(field => {
    fields.push({
      name: field.name,
      type: field.type,
      description: field.description || '',
      path: field.fieldPath === 'value' ? '' : field.fieldPath
    })
  })
  return fields
}

const buildPluginReturnFields = (method, version) => {
  const fields = [{
    name: '返回值',
    type: method.returnType,
    description: '整个返回值',
    path: ''
  }]
  const returnType = method.returnType || ''
  const simpleReturnType = returnType.includes('.') ? returnType.split('.').pop() : returnType
  const entity = version?.entityInfoList?.find(item =>
    item.entityName === returnType || item.name === returnType || item.entityName?.split('.').pop() === simpleReturnType)
  if (entity) {
    ;(entity.attributes || []).forEach(attribute => {
      fields.push({
        name: attribute.name,
        type: attribute.type,
        description: attribute.description || '',
        path: attribute.name
      })
    })
  }
  return fields
}

const startDrag = (e, callable, descriptor) => emit('start-drag', e, callable, descriptor)
const endDrag = () => emit('end-drag')

watch(activeTab, (tab) => {
  expandedPluginId.value = null
  if (tab !== 'bot') {
    pluginDetailCache.value = {}
    nextTick(() => loadPluginList(true))
  }
})

watch(botActionGroups, (groups) => {
  const next = { ...actionGroupExpanded.value }
  groups.forEach(group => {
    if (!(group.name in next)) next[group.name] = false
  })
  actionGroupExpanded.value = next
}, { immediate: true })

loadPluginList(true)
</script>
