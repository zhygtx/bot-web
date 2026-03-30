<template>
  <div class="plugin-list-float" :class="{ 'plugin-list-collapsed': !showPluginList }">
    <div class="plugin-list-header">
      <h3 v-if="showPluginList">插件列表</h3>
      <el-button @click="togglePluginList" circle size="small">
        <el-icon v-if="showPluginList"><ArrowUp /></el-icon>
        <el-icon v-else><ArrowDown /></el-icon>
      </el-button>
    </div>
    <el-tabs :model-value="localActiveTab" @update:model-value="updateActiveTab" class="plugin-tabs" :tab-position="'top'">
      <el-tab-pane label="我的插件" name="my">
        <div class="plugin-list">
          <el-card 
            v-for="plugin in plugins" 
            :key="plugin.id" 
            class="plugin-item-card"
          >
            <div class="plugin-card-content">
                <div class="plugin-card-header">
                  <h3 class="plugin-name">{{ plugin.name }}</h3>
                  <div class="plugin-version-selector" v-if="plugin.pluginVersionList && plugin.pluginVersionList.length > 0">
                    <el-select 
                      :model-value="selectedVersions[plugin.id]" 
                      @update:model-value="(val) => updateVersionSelection(plugin.id, val)"
                      size="small" 
                      class="version-select"
                    >
                      <el-option 
                        v-for="ver in plugin.pluginVersionList" 
                        :key="ver.id" 
                        :label="ver.version" 
                        :value="ver.id"
                      />
                    </el-select>
                  </div>
                  <el-icon @click="goToPluginDetail(plugin.id)" title="查看插件详情" class="info-icon">
                    <Warning />
                  </el-icon>
                </div>
                <div class="plugin-card-description">
                  {{ plugin.description }}
                </div>
                <div class="plugin-card-footer" v-if="!expandedPlugins.has(plugin.id)">
                  <el-icon @click="togglePluginExpand(plugin.id)" class="expand-icon">
                    <ArrowDown />
                  </el-icon>
                </div>
                <div class="plugin-card-methods" v-if="expandedPlugins.has(plugin.id)">
                  <h4>方法类</h4>
                  <div v-if="plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0 && selectedVersions[plugin.id]">
                    <!-- 直接找到选中的版本 -->
                    <div v-if="true">
                      <!-- 找到选中的版本对象 -->
                      <div v-if="true">
                        <!-- 使用计算属性的方式找到选中的版本 -->
                        <div v-if="true">
                          <!-- 检查是否有选中的版本 -->
                          <div v-if="selectedVersions[plugin.id]">
                            <!-- 找到选中的版本 -->
                            <div v-if="true">
                              <!-- 遍历所有版本，找到选中的那个 -->
                              <div v-for="versionItem in plugin.pluginVersionList" :key="versionItem?.id">
                                <!-- 只显示选中的版本 -->
                                <div v-if="versionItem && versionItem.id && versionItem.id === selectedVersions[plugin.id]">
                                  <!-- 检查是否有方法类 -->
                                  <div v-if="versionItem.methodClassInfoList && versionItem.methodClassInfoList.length > 0">
                                    <!-- 显示方法类 -->
                                    <div v-for="methodClass in versionItem.methodClassInfoList" :key="methodClass.id" class="method-class-card">
                                      <div class="method-class-header">
                                        <h5 class="method-class-name">{{ methodClass.simpleClassName }}</h5>
                                        <p class="method-class-description">{{ methodClass.description || '无描述' }}</p>
                                      </div>
                                      <div class="methods-list">
                                        <!-- 显示方法 -->
                                        <div v-for="method in methodClass.methods" :key="method.id" class="method-item">
                                          <span 
                                            class="method-signature"
                                            draggable="true"
                                            @dragstart="startDrag($event, method, methodClass, plugin, versionItem)"
                                            @dragend="endDrag"
                                          >
                                            {{ method.returnType }} {{ method.name }}(
                                              <template v-if="method.parameters && method.parameters.length > 0">
                                                <span v-for="(param, index) in sortParameters(method.parameters)" :key="param.id">
                                                  {{ param.type }} {{ param.name }}{{ index < method.parameters.length - 1 ? ', ' : '' }}
                                                </span>
                                              </template>
                                            )
                                          </span>
                                          <p v-if="method.description" class="method-item-description">{{ method.description }}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div v-else class="no-methods">
                                    该版本暂无方法类
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-methods">
                    暂无版本或未选择版本
                  </div>
                  <div class="plugin-card-footer">
                    <el-icon @click="togglePluginExpand(plugin.id)" class="expand-icon">
                      <ArrowUp />
                    </el-icon>
                  </div>
                </div>
              </div>
          </el-card>
        </div>
      </el-tab-pane>
      <el-tab-pane label="公开插件" name="public">
        <div class="plugin-list">
          <!-- 公开插件列表 -->
          <el-card 
            v-for="plugin in publicPlugins" 
            :key="plugin.id" 
            class="plugin-item-card"
          >
            <div class="plugin-card-content">
                <div class="plugin-card-header">
                  <h3 class="plugin-name">{{ plugin.name }}</h3>
                  <div class="plugin-version-selector" v-if="plugin.pluginVersionList && plugin.pluginVersionList.length > 0">
                    <el-select 
                      :model-value="selectedPublicVersions[plugin.id]" 
                      @update:model-value="(val) => updatePublicVersionSelection(plugin.id, val)"
                      size="small" 
                      class="version-select"
                    >
                      <el-option 
                        v-for="ver in plugin.pluginVersionList" 
                        :key="ver.id" 
                        :label="ver.version" 
                        :value="ver.id"
                      />
                    </el-select>
                  </div>
                  <el-icon @click="goToPluginDetail(plugin.id)" title="查看插件详情" class="info-icon">
                    <Warning />
                  </el-icon>
                </div>
                <div class="plugin-card-description">
                  {{ plugin.description }}
                </div>
                <div class="plugin-card-footer" v-if="!expandedPlugins.has(plugin.id)">
                  <el-icon @click="togglePluginExpand(plugin.id)" class="expand-icon">
                    <ArrowDown />
                  </el-icon>
                </div>
                <div class="plugin-card-methods" v-if="expandedPlugins.has(plugin.id)">
                  <h4>方法类</h4>
                  <div v-if="plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0 && selectedPublicVersions[plugin.id]">
                    <div v-for="versionItem in plugin.pluginVersionList" :key="versionItem?.id">
                      <div v-if="versionItem && versionItem.id && versionItem.id === selectedPublicVersions[plugin.id]">
                        <div v-if="versionItem.methodClassInfoList && versionItem.methodClassInfoList.length > 0">
                          <div v-for="methodClass in versionItem.methodClassInfoList" :key="methodClass.id" class="method-class-card">
                            <div class="method-class-header">
                              <h5 class="method-class-name">{{ methodClass.simpleClassName }}</h5>
                              <p class="method-class-description">{{ methodClass.description || '无描述' }}</p>
                            </div>
                            <div class="methods-list">
                              <div v-for="method in methodClass.methods" :key="method.id" class="method-item">
                                <span 
                                  class="method-signature"
                                  draggable="true"
                                  @dragstart="startDrag($event, method, methodClass, plugin, versionItem)"
                                  @dragend="endDrag"
                                >
                                  {{ method.returnType }} {{ method.name }}(
                                    <template v-if="method.parameters && method.parameters.length > 0">
                                      <span v-for="(param, index) in sortParameters(method.parameters)" :key="param.id">
                                        {{ param.type }} {{ param.name }}{{ index < method.parameters.length - 1 ? ', ' : '' }}
                                      </span>
                                    </template>
                                  )
                                </span>
                                <p v-if="method.description" class="method-item-description">{{ method.description }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-else class="no-methods">
                          该版本暂无方法类
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-methods">
                    暂无版本或未选择版本
                  </div>
                  <div class="plugin-card-footer">
                    <el-icon @click="togglePluginExpand(plugin.id)" class="expand-icon">
                      <ArrowUp />
                    </el-icon>
                  </div>
                </div>
              </div>
          </el-card>
          <el-empty v-if="publicPlugins.length === 0" description="暂无公开插件" />
        </div>
      </el-tab-pane>
      <el-tab-pane v-if="hasBotQQFromLocalStorage" label="BOT 系统" name="bot">
        <div class="plugin-list">
          <!-- BOT 事件 -->
          <el-card class="plugin-item-card">
            <div class="plugin-card-content">
              <div class="plugin-card-header">
                <h3 class="plugin-name">BOT 事件</h3>
              </div>
              <div class="plugin-card-description">
                触发工作流的 BOT 事件
              </div>
              <div class="plugin-card-methods">
                <h4>事件列表</h4>
                <div class="methods-list">
                  <div v-for="event in botEvents" :key="event.eventType" class="method-item">
                    <span 
                      class="method-signature"
                      draggable="true"
                      @dragstart="startDragBotEvent($event, event)"
                      @dragend="endDrag"
                    >
                      {{ event.eventName }}
                    </span>
                    <p v-if="event.description" class="method-item-description">{{ event.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
          
          <!-- BOT 动作 -->
          <el-card class="plugin-item-card" style="margin-top: 16px;">
            <div class="plugin-card-content">
              <div class="plugin-card-header">
                <h3 class="plugin-name">BOT 动作</h3>
              </div>
              <div class="plugin-card-description">
                BOT 执行的动作
              </div>
              <div class="plugin-card-methods">
                <h4>动作列表</h4>
                <div class="methods-list">
                  <div v-for="action in botActions" :key="action.actionName" class="method-item">
                    <span 
                      class="method-signature"
                      draggable="true"
                      @dragstart="startDragBotAction($event, action)"
                      @dragend="endDrag"
                    >
                      {{ action.actionDisplayName }}(
                        <template v-if="action.parameters && action.parameters.length > 0">
                          <span v-for="(param, index) in sortParameters(action.parameters)" :key="param.id">
                            {{ param.type }} {{ param.name }}{{ index < action.parameters.length - 1 ? ', ' : '' }}
                          </span>
                        </template>
                      )
                    </span>
                    <p v-if="action.description" class="method-item-description">{{ action.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ArrowUp, ArrowDown, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  plugins: {
    type: Array,
    default: () => []
  },
  publicPlugins: {
    type: Array,
    default: () => []
  },
  botEvents: {
    type: Array,
    default: () => []
  },
  botActions: {
    type: Array,
    default: () => []
  },
  hasBotQQ: {
    type: Boolean,
    default: false
  },
  showPluginList: {
    type: Boolean,
    default: true
  },
  activeTab: {
    type: String,
    default: 'my'
  },
  selectedVersions: {
    type: Object,
    default: () => ({})
  },
  selectedPublicVersions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'toggle-plugin-list',
  'go-to-plugin-detail',
  'start-drag',
  'start-drag-bot-event',
  'start-drag-bot-action',
  'end-drag',
  'update:model-value',
  'update:selectedVersions',
  'update:selectedPublicVersions'
])

// 展开的插件卡片
const expandedPlugins = ref(new Set())
// 本地activeTab状态
const localActiveTab = ref(props.activeTab)
// 计算属性：直接从localStorage获取botQQ的值
const hasBotQQFromLocalStorage = computed(() => {
  const botQQ = localStorage.getItem('botQQ')
  return botQQ !== null
})

// 监听props变化
watch(() => props.activeTab, (newVal) => {
  localActiveTab.value = newVal
})

// 监听hasBotQQ变化
watch(() => props.hasBotQQ, (newVal) => {
  // 强制重新渲染组件
  localActiveTab.value = localActiveTab.value
})

// 监听botEvents变化
watch(() => props.botEvents, (newVal) => {
  // 当botEvents变化时，强制重新渲染组件
  localActiveTab.value = localActiveTab.value
}, { deep: true })

// 监听botActions变化
watch(() => props.botActions, (newVal) => {
  // 当botActions变化时，强制重新渲染组件
  localActiveTab.value = localActiveTab.value
}, { deep: true })

// 监听props中的selectedVersions变化，初始化默认选择
watch(() => props.selectedVersions, (newVersions) => {
  // 当plugins加载完成后，如果没有选择版本，自动选择第一个版本
  if (props.plugins && props.plugins.length > 0) {
    props.plugins.forEach(plugin => {
      if (plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0) {
        if (!props.selectedVersions[plugin.id]) {
          // 找到第一个有效的版本
          const validVersion = plugin.pluginVersionList.find(v => v && v.id && v.version)
          if (validVersion) {
            emit('update:selectedVersions', { ...props.selectedVersions, [plugin.id]: validVersion.id })
          }
        }
      }
    })
  }
}, { immediate: true, deep: true })

// 监听plugins变化，自动选择版本
watch(() => props.plugins, (newPlugins) => {
  if (newPlugins && newPlugins.length > 0) {
    newPlugins.forEach(plugin => {
      if (plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0) {
        if (!props.selectedVersions[plugin.id]) {
          // 找到第一个有效的版本
          const validVersion = plugin.pluginVersionList.find(v => v && v.id && v.version)
          if (validVersion) {
            emit('update:selectedVersions', { ...props.selectedVersions, [plugin.id]: validVersion.id })
          }
        }
      }
    })
  }
}, { immediate: true, deep: true })

// 监听props中的selectedPublicVersions变化，初始化默认选择
watch(() => props.selectedPublicVersions, (newVersions) => {
  // 当publicPlugins加载完成后，如果没有选择版本，自动选择第一个版本
  if (props.publicPlugins && props.publicPlugins.length > 0) {
    props.publicPlugins.forEach(plugin => {
      if (plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0) {
        if (!props.selectedPublicVersions[plugin.id]) {
          // 找到第一个有效的版本
          const validVersion = plugin.pluginVersionList.find(v => v && v.id && v.version)
          if (validVersion) {
            emit('update:selectedPublicVersions', { ...props.selectedPublicVersions, [plugin.id]: validVersion.id })
          }
        }
      }
    })
  }
}, { immediate: true, deep: true })

// 监听publicPlugins变化，自动选择版本
watch(() => props.publicPlugins, (newPlugins) => {
  if (newPlugins && newPlugins.length > 0) {
    newPlugins.forEach(plugin => {
      if (plugin && plugin.pluginVersionList && plugin.pluginVersionList.length > 0) {
        if (!props.selectedPublicVersions[plugin.id]) {
          // 找到第一个有效的版本
          const validVersion = plugin.pluginVersionList.find(v => v && v.id && v.version)
          if (validVersion) {
            emit('update:selectedPublicVersions', { ...props.selectedPublicVersions, [plugin.id]: validVersion.id })
          }
        }
      }
    })
  }
}, { immediate: true, deep: true })

// 更新activeTab
const updateActiveTab = (value) => {
  localActiveTab.value = value
  emit('update:model-value', value)
}

// 切换插件卡片展开/收起状态
const togglePluginExpand = (pluginId) => {
  if (expandedPlugins.value.has(pluginId)) {
    expandedPlugins.value.delete(pluginId)
  } else {
    expandedPlugins.value.add(pluginId)
  }
}

// 跳转到插件详情页
const goToPluginDetail = (pluginId) => {
  emit('go-to-plugin-detail', pluginId)
}

// 切换插件列表显示/隐藏
const togglePluginList = () => {
  emit('togglePluginList')
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

// 开始拖动方法
const startDrag = (e, method, methodClass, plugin, version) => {
  emit('start-drag', e, method, methodClass, plugin, version)
}

// 开始拖动 BOT 事件
const startDragBotEvent = (e, event) => {
  emit('start-drag-bot-event', e, event)
}

// 开始拖动 BOT 动作
const startDragBotAction = (e, action) => {
  emit('start-drag-bot-action', e, action)
}

// 拖动结束
const endDrag = () => {
  emit('end-drag')
}

// 更新版本选择
const updateVersionSelection = (pluginId, versionId) => {
  emit('update:selectedVersions', { ...props.selectedVersions, [pluginId]: versionId })
}

// 更新公开插件版本选择
const updatePublicVersionSelection = (pluginId, versionId) => {
  emit('update:selectedPublicVersions', { ...props.selectedPublicVersions, [pluginId]: versionId })
}
</script>

<style scoped>
/* 左侧插件列表（悬浮窗） */
.plugin-list-float {
  position: absolute;
  left: 20px;
  top: 100px;
  width: 320px;
  height: calc(100% - 120px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 300;
  transition: all 0.3s ease;
  display: block !important;
}

/* 插件列表收起状态 */
.plugin-list-float.plugin-list-collapsed {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.plugin-list-float.plugin-list-collapsed .plugin-list-header {
  padding: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: none;
  background-color: white;
}

.plugin-list-float.plugin-list-collapsed .plugin-list-header h3 {
  display: none;
}

.plugin-list-float.plugin-list-collapsed .plugin-tabs {
  display: none;
}

.plugin-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e6e6e6;
  background-color: #f9f9f9;
}

.plugin-list-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.plugin-tabs {
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs) {
  width: 100%;
}

:deep(.el-tabs__nav) {
  width: 100%;
  display: flex;
  justify-content: space-around;
}

:deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plugin-item-card {
  margin-bottom: 0;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.plugin-item-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.plugin-card-content {
  padding: 15px;
  position: relative;
}

.plugin-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 8px;
}

.plugin-name {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-version-selector {
  flex-shrink: 0;
}

.version-select {
  width: 80px;
}

.info-icon {
  font-size: 18px;
  color: #409eff;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 2px;
  border-radius: 4px;
}

.info-icon:hover {
  color: #66b1ff;
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(1.1);
}

.plugin-card-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 10px;
}

.plugin-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

.expand-icon {
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.expand-icon:hover {
  color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(1.1);
}

.plugin-card-methods {
  font-size: 14px;
  margin-top: 10px;
  animation: slideDown 0.3s ease;
}

.plugin-card-methods h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

/* 方法类卡片样式 */
.method-class-card {
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  margin-bottom: 15px;
  overflow: hidden;
  background-color: white;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.method-class-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.method-class-header {
  padding: 10px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.method-class-name {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.method-class-description {
  font-size: 13px;
  color: #606266;
  margin: 0;
  line-height: 1.4;
  width: 100%;
}

/* 方法列表样式 */
.methods-list {
  padding: 10px 15px;
}

/* 方法项样式 */
.method-item {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  gap: 6px;
}

.method-item:last-child {
  border-bottom: none;
}

/* 方法签名样式 */
.method-signature {
  font-weight: bold;
  color: #303133;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  line-height: 1.4;
  cursor: grab;
}

.method-signature:active {
  cursor: grabbing;
}

/* 方法描述样式 */
.method-item-description {
  font-size: 12px;
  color: #606266;
  margin: 0;
  line-height: 1.4;
  padding-left: 10px;
  border-left: 2px solid #e4e7ed;
  user-select: none; /* 禁止选中注释文字 */
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.no-methods {
  font-size: 13px;
  color: #909399;
  margin: 10px 0;
  text-align: center;
}
</style>