<template>
  <div class="plugin-list-float" :class="{ 'plugin-list-collapsed': !showPluginList }">
    <!-- 收起按钮 -->
    <div class="collapse-btn" @click="togglePanel" v-if="!showPluginList">
      <el-icon><ArrowUp /></el-icon>
    </div>

    <template v-if="showPluginList">
      <!-- 收缩按钮 -->
      <div class="collapse-bar">
        <el-button @click="togglePanel" circle size="small">
          <el-icon><ArrowUp /></el-icon>
        </el-button>
      </div>

      <div class="plugin-panel-body">
        <!-- 左侧图标导航 -->
        <div class="side-nav">
          <div 
            class="nav-item" 
            :class="{ active: activeTab === 'my' }"
            @click="activeTab = 'my'"
            title="我的插件"
          >
            <el-icon :size="20"><User /></el-icon>
          </div>
          <div 
            class="nav-item" 
            :class="{ active: activeTab === 'public' }"
            @click="activeTab = 'public'"
            title="公开插件"
          >
            <el-icon :size="20"><Connection /></el-icon>
          </div>
          <div 
            v-if="hasBotQQFromLocalStorage && isBotOnline"
            class="nav-item" 
            :class="{ active: activeTab === 'bot' }"
            @click="activeTab = 'bot'"
            title="BOT 系统"
          >
            <el-icon :size="20"><Cpu /></el-icon>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="content-area">
          <!-- 搜索框 -->
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索插件名称或描述"
              clearable
              size="small"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- 我的插件 / 公开插件 -->
          <el-scrollbar
            v-if="activeTab !== 'bot'"
            ref="scrollbarRef"
            class="scroll-container"
            @scroll="handleScroll"
          >
            <div class="plugin-list">
              <!-- 加载提示 -->
              <div v-if="loading && pluginList.length === 0" class="loading-state">
                <el-icon class="is-loading" :size="24"><Loading /></el-icon>
                <p>加载中...</p>
              </div>

              <el-card 
                v-for="plugin in pluginList" 
                :key="plugin.id" 
                class="plugin-item-card"
              >
                <div class="plugin-card-content">
                  <div class="plugin-card-header">
                    <h3 class="plugin-name">{{ plugin.name }}</h3>
                    <div class="plugin-version-selector" v-if="plugin.pluginVersionList && plugin.pluginVersionList.length > 0">
                      <el-select 
                        :model-value="getVersionId(plugin.id)" 
                        @update:model-value="(val) => updateVersion(plugin.id, val)"
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
                      <InfoFilled />
                    </el-icon>
                  </div>
                  <div class="plugin-card-description">{{ plugin.description }}</div>

                  <!-- 展开/收起按钮 -->
                  <div class="plugin-card-toggle" @click="togglePluginExpand(plugin.id)">
                    <el-icon>
                      <ArrowDown v-if="expandedPluginId !== plugin.id" />
                      <ArrowUp v-else />
                    </el-icon>
                  </div>

                  <!-- 展开的方法列表 -->
                  <div class="plugin-card-methods" v-if="expandedPluginId === plugin.id">
                    <h4>方法类</h4>
                    <div v-if="getVersionId(plugin.id)">
                      <div v-loading="detailLoading">
                        <template v-if="getPluginDetail(plugin.id)">
                          <div v-if="getPluginDetail(plugin.id).pluginVersionList?.[0]?.methodClassInfoList?.length">
                            <div v-for="methodClass in getPluginDetail(plugin.id).pluginVersionList[0].methodClassInfoList" :key="methodClass.id" class="method-class-card">
                              <div class="method-class-header">
                                <h5 class="method-class-name">{{ methodClass.simpleClassName }}</h5>
                                <p class="method-class-description">{{ methodClass.description || '无描述' }}</p>
                              </div>
                              <div class="methods-list">
                                <div v-for="method in methodClass.methods" :key="method.id" class="method-item">
                                  <span 
                                    class="method-signature"
                                    draggable="true"
                                    @dragstart="startDrag($event, method, methodClass, plugin, getPluginDetail(plugin.id).pluginVersionList[0])"
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
                          <div v-else class="no-methods">该版本暂无方法类</div>
                        </template>
                        <div v-else class="no-methods">加载中...</div>
                      </div>
                    </div>
                    <div v-else class="no-methods">暂无版本或未选择版本</div>
                  </div>
                </div>
              </el-card>

              <!-- 加载更多 -->
              <div v-if="loading && pluginList.length > 0" class="loading-more">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载更多...</span>
              </div>
              <div v-if="!hasMore && pluginList.length > 0" class="no-more">— 已加载全部 —</div>
              <el-empty v-if="!loading && pluginList.length === 0" description="暂无插件" />
            </div>
          </el-scrollbar>

          <!-- BOT 系统 -->
          <el-scrollbar v-if="activeTab === 'bot'" class="scroll-container bot-content">
            <div class="plugin-list">
              <!-- BOT 事件 -->
              <el-card class="plugin-item-card">
                <div class="plugin-card-content">
                  <div class="plugin-card-header">
                    <h3 class="plugin-name">BOT 事件</h3>
                  </div>
                  <div class="plugin-card-description">触发工作流的 BOT 事件（按分类展示）</div>
                  <div class="plugin-card-methods">
                    <!-- 分类树形结构 -->
                    <div v-for="group in groupedBotEvents" :key="'event-cat-' + group.category" class="category-group">
                      <div class="category-header" @click="toggleCategory('event', group.category)">
                        <el-icon class="category-toggle-icon">
                          <ArrowDown v-if="isCategoryExpanded('event', group.category)" />
                          <ArrowRight v-else />
                        </el-icon>
                        <span class="category-name">{{ group.category }}</span>
                        <span class="category-count">({{ group.items.length }})</span>
                      </div>
                      <div v-show="isCategoryExpanded('event', group.category)" class="category-items">
                        <div v-for="event in group.items" :key="event.eventType" class="method-item">
                          <span 
                            class="method-signature"
                            draggable="true"
                            @dragstart="startDragBotEvent($event, event)"
                            @dragend="endDrag"
                          >{{ event.eventName }}</span>
                          <p v-if="event.description" class="method-item-description">{{ event.description }}</p>
                        </div>
                      </div>
                    </div>
                    <div v-if="groupedBotEvents.length === 0" class="no-methods">无匹配事件</div>
                  </div>
                </div>
              </el-card>

              <!-- BOT 动作 -->
              <el-card class="plugin-item-card" style="margin-top: 16px">
                <div class="plugin-card-content">
                  <div class="plugin-card-header">
                    <h3 class="plugin-name">BOT 动作</h3>
                  </div>
                  <div class="plugin-card-description">BOT 执行的动作（按分类展示）</div>
                  <div class="plugin-card-methods">
                    <!-- 分类树形结构 -->
                    <div v-for="group in groupedBotActions" :key="'action-cat-' + group.category" class="category-group">
                      <div class="category-header" @click="toggleCategory('action', group.category)">
                        <el-icon class="category-toggle-icon">
                          <ArrowDown v-if="isCategoryExpanded('action', group.category)" />
                          <ArrowRight v-else />
                        </el-icon>
                        <span class="category-name">{{ group.category }}</span>
                        <span class="category-count">({{ group.items.length }})</span>
                      </div>
                      <div v-show="isCategoryExpanded('action', group.category)" class="category-items">
                        <div v-for="action in group.items" :key="action.actionName" class="method-item">
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
                    <div v-if="groupedBotActions.length === 0" class="no-methods">无匹配动作</div>
                  </div>
                </div>
              </el-card>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { User, Connection, Cpu, ArrowUp, ArrowDown, ArrowRight, Search, Loading, InfoFilled } from '@element-plus/icons-vue'
import request from '../../utils/request'

const props = defineProps({
  botEvents: { type: Array, default: () => [] },
  botActions: { type: Array, default: () => [] },
  hasBotQQ: { type: Boolean, default: false },
  isBotOnline: { type: Boolean, default: false },
  showPluginList: { type: Boolean, default: true }
})

const emit = defineEmits([
  'toggle-plugin-list',
  'go-to-plugin-detail',
  'start-drag',
  'start-drag-bot-event',
  'start-drag-bot-action',
  'end-drag'
])

// ───────── 状态 ─────────
const activeTab = ref('my')
const searchKeyword = ref('')
const expandedPluginId = ref(null)
const detailLoading = ref(false)
const scrollbarRef = ref(null)

// 分页状态
const pluginList = ref([])
const pageNum = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loading = ref(false)

// 版本选择（每个插件当前选中版本ID）
const versionMap = ref({})

// 详情缓存
const pluginDetailCache = ref({})

const hasBotQQFromLocalStorage = computed(() => {
  return localStorage.getItem('botQQ') !== null
})

// BOT 事件/动作过滤
const filteredBotEvents = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return props.botEvents
  return props.botEvents.filter(e =>
    (e.eventName || '').toLowerCase().includes(kw) ||
    (e.description || '').toLowerCase().includes(kw)
  )
})

const filteredBotActions = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return props.botActions
  return props.botActions.filter(a =>
    (a.actionDisplayName || '').toLowerCase().includes(kw) ||
    (a.actionName || '').toLowerCase().includes(kw) ||
    (a.description || '').toLowerCase().includes(kw)
  )
})

// ───────── BOT 事件/动作 分类分组 ─────────
const isSearching = computed(() => searchKeyword.value.trim().length > 0)

/** 按 categories 对事件列表进行分组 */
const groupedBotEvents = computed(() => {
  const groups = {}
  filteredBotEvents.value.forEach(event => {
    const cats = (event.categories && event.categories.length > 0) ? event.categories : ['未分类']
    const catOrders = event.categoryOrders || []
    cats.forEach((cat, idx) => {
      if (!groups[cat]) {
        groups[cat] = { category: cat, order: catOrders[idx] ?? 999, items: [] }
      }
      groups[cat].items.push(event)
    })
  })
  return Object.values(groups).sort((a, b) => a.order - b.order)
})

/** 按 categories 对动作列表进行分组 */
const groupedBotActions = computed(() => {
  const groups = {}
  filteredBotActions.value.forEach(action => {
    const cats = (action.categories && action.categories.length > 0) ? action.categories : ['未分类']
    const catOrders = action.categoryOrders || []
    cats.forEach((cat, idx) => {
      if (!groups[cat]) {
        groups[cat] = { category: cat, order: catOrders[idx] ?? 999, items: [] }
      }
      groups[cat].items.push(action)
    })
  })
  return Object.values(groups).sort((a, b) => a.order - b.order)
})

/** 分类展开/折叠状态（记忆状态，key 为 "event:分类名" 或 "action:分类名"） */
const expandedCategories = ref({})

/**
 * 切换分类的展开/折叠状态
 * @param {'event'|'action'} type 类型
 * @param {string} cat 分类名称
 */
const toggleCategory = (type, cat) => {
  const key = `${type}:${cat}`
  expandedCategories.value[key] = expandedCategories.value[key] === false
}

/**
 * 判断分类是否应展开
 * - 搜索时自动展开所有有内容的分类
 * - 非搜索时使用用户的记忆状态，默认展开
 */
const isCategoryExpanded = (type, cat) => {
  if (isSearching.value) return true
  const key = `${type}:${cat}`
  return expandedCategories.value[key] !== false
}

// ───────── 数据加载 ─────────
const buildQueryParams = (page = 1) => {
  const params = {
    pageNum: page,
    pageSize
  }
  if (activeTab.value === 'my') {
    params.authorId = localStorage.getItem('userId') || ''
  } else if (activeTab.value === 'public') {
    params.isPublic = true
  }
  if (searchKeyword.value.trim()) {
    params.content = searchKeyword.value.trim()
  }
  return params
}

const loadPluginList = async (reset = false) => {
  if (loading.value) return
  loading.value = true

  try {
    const response = await request({
      url: '/plugin/findPlugins',
      method: 'get',
      params: buildQueryParams(reset ? 1 : pageNum.value)
    })

    if (response.code === 200) {
      const data = response.data
      const items = data?.records || data?.content || data?.list || data || []
      const total = data?.total || data?.totalElements || 0

      if (reset) {
        pluginList.value = []
        pageNum.value = 1
        hasMore.value = true
      }

      if (Array.isArray(items)) {
        pluginList.value = reset ? [...items] : [...pluginList.value, ...items]
        // 自动选择首个版本
        items.forEach(plugin => {
          if (plugin?.pluginVersionList?.length && !versionMap.value[plugin.id]) {
            const v = plugin.pluginVersionList.find(v => v?.id)
            if (v) versionMap.value[plugin.id] = v.id
          }
        })
      }

      if (Array.isArray(items) && items.length < pageSize) {
        hasMore.value = false
      }
    } else {
      hasMore.value = false
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const handleScroll = ({ scrollTop }) => {
  if (!hasMore.value || loading.value) return
  const wrap = scrollbarRef.value?.wrapRef
  if (!wrap) return
  const { clientHeight, scrollHeight } = wrap
  if (scrollTop + clientHeight >= scrollHeight - 20) {
    pageNum.value++
    loadPluginList(false)
  }
}

// ───────── 搜索 ─────────
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  // BOT 系统使用本地过滤，无需请求
  if (activeTab.value === 'bot') return
  searchTimer = setTimeout(() => {
    loadPluginList(true)
  }, 150)
}

// ───────── 版本管理 ─────────
const getVersionId = (pluginId) => {
  return versionMap.value[pluginId] || ''
}

const updateVersion = (pluginId, versionId) => {
  versionMap.value = { ...versionMap.value, [pluginId]: versionId }
  if (expandedPluginId.value === pluginId) {
    loadPluginVersionDetail(pluginId, versionId)
  }
}

// ───────── 展开插件详情 ─────────
const loadPluginVersionDetail = async (pluginId, versionId) => {
  if (!pluginId || !versionId) return
  const cacheKey = `${pluginId}:${versionId}`
  if (pluginDetailCache.value[cacheKey]) return

  detailLoading.value = true
  try {
    const response = await request({
      url: '/plugin/findPlugin',
      method: 'get',
      params: { pluginId, pluginVersionId: versionId }
    })
    if (response.code === 200) {
      pluginDetailCache.value = { ...pluginDetailCache.value, [cacheKey]: response.data }
    }
  } catch {
    // ignore
  } finally {
    detailLoading.value = false
  }
}

const getPluginDetail = (pluginId) => {
  const versionId = versionMap.value[pluginId]
  if (!versionId) return null
  return pluginDetailCache.value[`${pluginId}:${versionId}`] || null
}

const togglePluginExpand = (pluginId) => {
  const wasExpanded = expandedPluginId.value === pluginId
  expandedPluginId.value = wasExpanded ? null : pluginId
  if (!wasExpanded) {
    const versionId = versionMap.value[pluginId]
    if (versionId) loadPluginVersionDetail(pluginId, versionId)
  }
}

// ───────── 导航与拖拽 ─────────
const goToPluginDetail = (pluginId) => {
  emit('go-to-plugin-detail', pluginId)
}

const togglePanel = () => {
  emit('toggle-plugin-list')
}

const sortParameters = (parameters) => {
  if (!parameters) return []
  return [...parameters].sort((a, b) => {
    const orderDiff = (a.order || 0) - (b.order || 0)
    return orderDiff !== 0 ? orderDiff : a.name.localeCompare(b.name)
  })
}

const startDrag = (e, method, methodClass, plugin, version) => {
  emit('start-drag', e, method, methodClass, plugin, version)
}

const startDragBotEvent = (e, event) => {
  emit('start-drag-bot-event', e, event)
}

const startDragBotAction = (e, action) => {
  emit('start-drag-bot-action', e, action)
}

const endDrag = () => {
  emit('end-drag')
}

// ───────── Tab 切换重新加载 ─────────
watch(activeTab, (tab) => {
  expandedPluginId.value = null
  if (tab === 'bot') return // BOT 系统不需要请求插件列表
  pluginList.value = []
  pageNum.value = 1
  hasMore.value = true
  loading.value = false
  pluginDetailCache.value = {}
  nextTick(() => loadPluginList(true))
})

// ───────── 初始化 ─────────
loadPluginList(true)
</script>

<style scoped>
/* ───── 外层容器 ───── */
.plugin-list-float {
  position: absolute;
  left: 20px;
  top: 100px;
  width: 320px;
  height: calc(100% - 120px);
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 300;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.plugin-list-collapsed {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
}

/* ───── 收起栏 ───── */
.collapse-bar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
  flex-shrink: 0;
}

/* ───── 面板主体：左侧导航 + 右侧内容 ───── */
.plugin-panel-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ───── 左侧图标导航 ───── */
.side-nav {
  width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
  gap: 4px;
  border-right: 1px solid #ebeef5;
  background: #fafafa;
  flex-shrink: 0;
}

.nav-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #909399;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #ecf5ff;
  color: #409eff;
}

.nav-item.active {
  background: #409eff;
  color: #fff;
}

/* ───── 右侧内容区 ───── */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ───── 搜索框 ───── */
.search-box {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

:deep(.search-box .el-input__wrapper) {
  padding: 6px 12px;
}

:deep(.search-box .el-input__inner) {
  font-size: 14px;
  padding: 6px 0;
}

/* ───── 滚动容器（使用 el-scrollbar） ───── */
.scroll-container {
  flex: 1;
  min-height: 0;
}

:deep(.scroll-container .el-scrollbar__wrap) {
  padding: 10px 12px;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

:deep(.scroll-container .el-scrollbar__wrap::-webkit-scrollbar) {
  display: none;
}

:deep(.scroll-container .el-scrollbar__bar) {
  display: none;
}

/* ───── 插件列表 ───── */
.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ───── 插件卡片 ───── */
.plugin-item-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
  overflow: hidden;
}

.plugin-item-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.plugin-item-card .el-card__body) {
  padding: 0;
}

.plugin-card-content {
  padding: 16px;
}

.plugin-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.plugin-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
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

:deep(.version-select .el-select__wrapper) {
  padding: 4px 8px;
}

:deep(.version-select .el-select__trigger) {
  padding: 2px 8px;
}

.info-icon {
  font-size: 18px;
  color: #409eff;
  cursor: pointer;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.info-icon:hover {
  background: rgba(64, 158, 255, 0.1);
}

.plugin-card-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-card-toggle {
  display: flex;
  justify-content: flex-end;
  color: #c0c4cc;
  cursor: pointer;
  transition: color 0.2s;
}

.plugin-card-toggle:hover {
  color: #409eff;
}

/* ───── 展开的方法区域 ───── */
.plugin-card-methods {
  margin-top: 8px;
  animation: slideDown 0.25s ease;
}

.plugin-card-methods h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.method-class-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
  overflow: hidden;
  border-left: 3px solid #409eff;
}

.method-class-header {
  padding: 8px 10px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.method-class-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.method-class-description {
  font-size: 11px;
  color: #909399;
  margin: 2px 0 0;
}

.methods-list {
  padding: 6px 10px;
}

.method-item {
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.method-item:last-child {
  border-bottom: none;
}

.method-signature {
  font-weight: 600;
  color: #303133;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  cursor: grab;
  line-height: 1.4;
}

.method-signature:active {
  cursor: grabbing;
}

.method-item-description {
  font-size: 11px;
  color: #909399;
  margin: 4px 0 0;
  padding-left: 8px;
  border-left: 2px solid #ebeef5;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ───── 空状态 / 加载状态 ───── */
.no-methods {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 8px 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
  color: #c0c4cc;
  font-size: 13px;
  gap: 8px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  color: #c0c4cc;
  font-size: 12px;
}

.no-more {
  text-align: center;
  padding: 8px 0;
  color: #c0c4cc;
  font-size: 11px;
}

/* ───── BOT 系统 ───── */
.bot-content {
  padding-top: 10px;
}

/* ───── 分类树形结构 ───── */
.category-group {
  margin-bottom: 2px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.category-header:hover {
  background-color: #f5f7fa;
}

.category-toggle-icon {
  font-size: 14px;
  color: #909399;
  flex-shrink: 0;
}

.category-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.category-count {
  font-size: 11px;
  color: #c0c4cc;
  margin-left: auto;
}

.category-items {
  padding: 2px 0 6px 22px;
  border-left: 2px solid #ebeef5;
  margin-left: 6px;
}

.category-items .method-item {
  padding: 6px 0 6px 8px;
  border-bottom: none;
}

.category-items .method-item:hover {
  background-color: #f5f7fa;
  border-radius: 4px;
}

.category-items .method-signature {
  font-size: 11px;
}

.category-items .method-item-description {
  font-size: 10px;
  padding-left: 6px;
}
</style>
