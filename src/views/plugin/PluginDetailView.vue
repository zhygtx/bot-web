<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElTabs, ElTabPane, ElCard, ElDescriptions, ElDescriptionsItem, ElButton, ElTag, ElDivider } from 'element-plus'
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { PluginInfo } from '../../models'
import PluginCreateView from './PluginCreateView.vue'
import AIMessageMarkdown from './ai-create/AIMessageMarkdown.vue'

const route = useRoute()
const router = useRouter()

// 插件信息
const pluginInfo = ref(null)
// 加载状态
const loading = ref(false)
// 版本详情加载状态
const versionLoading = ref(false)
// 当前激活的版本标签
const activeVersion = ref('')
// 插件版本列表（简要信息，id → version）
const versionList = ref({})
// 是否已完成初始加载
const initialLoadDone = ref(false)

// 当前编辑的版本
const editedVersion = ref(null)

// 当前版本的兼容版本
const compatibleVersions = ref([])

// 获取插件ID
const pluginId = computed(() => route.params.id)
// 获取默认版本ID
const pluginVersionId = computed(() => route.query.versionId || '')

// 只读模式
const isReadOnly = computed(() => route.query.readOnly === 'true' || route.query.fromWorkflowEdit === 'true')

// 返回路径
const returnUrl = computed(() => route.query.returnUrl)

// 加载插件版本简要列表（返回格式: { "1": {id, version}, "2": {id, version} }）
const loadVersionList = async () => {
  try {
    const response = await request({
      url: '/plugin/findPluginVersionByPluginId',
      method: 'get',
      params: { pluginId: pluginId.value }
    })
    if (response.code === 200) {
      // 转换为 { id: version } 格式
      const raw = response.data || {}
      const mapped = {}
      for (const key of Object.keys(raw)) {
        const item = raw[key]
        if (item && item.id) {
          mapped[item.id] = item.version
        }
      }
      versionList.value = mapped
    }
  } catch (error) {
    console.error('加载版本列表失败', error)
  }
}

// 加载插件详情（传入指定版本ID）
const loadPluginDetail = async (versionId) => {
  // 优先使用传入的 versionId，其次 query 参数，最后取版本列表的第一个
  let targetVersionId = versionId || pluginVersionId.value
  if (!targetVersionId && Object.keys(versionList.value).length > 0) {
    targetVersionId = Object.keys(versionList.value)[0]
  }
  if (!pluginId.value || !targetVersionId) return

  versionLoading.value = true
  try {
    const response = await request({
      url: '/plugin/findPlugin',
      method: 'get',
      params: {
        pluginId: pluginId.value,
        pluginVersionId: targetVersionId
      }
    })
    if (response.code === 200) {
      pluginInfo.value = new PluginInfo(response.data)
      // 设置默认激活的版本标签
      if (pluginInfo.value.pluginVersionList && pluginInfo.value.pluginVersionList.length > 0) {
        activeVersion.value = pluginInfo.value.pluginVersionList[0].id
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    versionLoading.value = false
  }
}

// 清除页面缓存
const clearCache = () => {
  sessionStorage.removeItem('pluginCache')
  localStorage.removeItem('pluginCache')
}

// 返回
const goBack = () => {
  clearCache()
  if (returnUrl.value) {
    window.location.href = returnUrl.value
  } else {
    router.push('/plugin/list')
  }
}

// 编辑模式状态
const isEditMode = ref(false)

// 编辑后的数据
const editedPluginInfo = ref(null)

// 进入编辑模式
const goToEdit = () => {
  isEditMode.value = true
  editedPluginInfo.value = JSON.parse(JSON.stringify(pluginInfo.value))
}

// 保存编辑
const saveEdit = async () => {
  loading.value = true
  try {
    if (editedPluginInfo.value.pluginVersionList) {
      editedPluginInfo.value.pluginVersionList.forEach(version => {
        if (version.compatibleVersion) {
          const compatibleVersions = JSON.parse(version.compatibleVersion)
          if (!compatibleVersions.includes(version.version)) {
            compatibleVersions.push(version.version)
            version.compatibleVersion = JSON.stringify(compatibleVersions)
          }
        } else {
          version.compatibleVersion = JSON.stringify([version.version])
        }
      })
    }
    
    await request({
      url: '/plugin',
      method: 'put',
      data: editedPluginInfo.value
    })
    
    isEditMode.value = false
    clearCache()
    loadPluginDetail(activeVersion.value)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  isEditMode.value = false
  editedPluginInfo.value = null
  clearCache()
}

// 更新插件版本弹窗状态
const updateVersionDialogVisible = ref(false)

// 打开更新版本弹窗
const goToUpdateVersion = () => {
  updateVersionDialogVisible.value = true
}

// 更新版本弹窗关闭时刷新数据
const handleUpdateVersionClose = () => {
  updateVersionDialogVisible.value = false
  loadVersionList()
  loadPluginDetail(activeVersion.value)
}

// 监听版本标签变化 → 请求新版本数据
watch(() => activeVersion.value, (newVersionId, oldVersionId) => {
  if (!newVersionId || newVersionId === oldVersionId) return
  // 初始加载时跳过（由 loadPluginDetail 自行设置）
  if (!initialLoadDone.value) return
  if (isEditMode.value && editedPluginInfo.value) {
    const currentVersion = editedPluginInfo.value.pluginVersionList.find(v => v.id === newVersionId)
    if (currentVersion) {
      editedVersion.value = currentVersion
      if (currentVersion.compatibleVersion) {
        compatibleVersions.value = JSON.parse(currentVersion.compatibleVersion).filter(v => v !== currentVersion.version)
      } else {
        compatibleVersions.value = []
      }
    }
  } else {
    // 非编辑模式下切换版本 → 重新请求
    loadPluginDetail(newVersionId)
  }
})

// 监听编辑模式变化
watch(() => isEditMode.value, (isEdit) => {
  if (isEdit && editedPluginInfo.value && activeVersion.value) {
    const currentVersion = editedPluginInfo.value.pluginVersionList.find(v => v.id === activeVersion.value)
    if (currentVersion) {
      editedVersion.value = currentVersion
      if (currentVersion.compatibleVersion) {
        compatibleVersions.value = JSON.parse(currentVersion.compatibleVersion).filter(v => v !== currentVersion.version)
      } else {
        compatibleVersions.value = []
      }
    }
  }
})

// 监听兼容版本变化
watch(() => compatibleVersions.value, (newVersions) => {
  if (isEditMode.value && editedVersion.value) {
    editedVersion.value.compatibleVersion = JSON.stringify(newVersions)
  }
}, { deep: true })

// 初始化加载
onMounted(async () => {
  await loadVersionList()
  await loadPluginDetail(pluginVersionId.value)
  initialLoadDone.value = true
})
</script>

<template>
  <div class="plugin-detail">
    <!-- 顶部导航 -->
    <div class="detail-header">
      <el-button type="primary" @click="goBack" plain>
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <div class="header-actions" v-if="!isEditMode && !isReadOnly">
        <el-button type="success" @click="goToEdit" plain>
          <el-icon><Edit /></el-icon>
          编辑插件
        </el-button>
        <el-button type="warning" @click="goToUpdateVersion" plain>
          <el-icon><Edit /></el-icon>
          更新版本
        </el-button>
      </div>
      <div class="header-actions" v-else-if="isEditMode && !isReadOnly">
        <el-button type="primary" @click="saveEdit" :loading="loading">
          保存
        </el-button>
        <el-button @click="cancelEdit">
          取消
        </el-button>
      </div>
    </div>
    
    <!-- 插件基本信息 -->
    <el-card v-if="pluginInfo" class="detail-card">
      <template #header>
        <div class="card-header">
          <h2 class="plugin-name" v-if="!isEditMode">{{ pluginInfo.name }}</h2>
          <el-input v-else v-model="editedPluginInfo.name" placeholder="请输入插件名称" class="edit-plugin-name" />
          <el-tag v-if="!isEditMode && pluginInfo.isPublic" type="success">公开</el-tag>
          <el-tag v-else-if="!isEditMode" type="danger">私有</el-tag>
          <el-switch v-else v-model="editedPluginInfo.isPublic" />
        </div>
      </template>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="作者">
          {{ pluginInfo.authorName }}
        </el-descriptions-item>
        <el-descriptions-item label="最新版本">
          {{ pluginInfo.latestVersion }}
        </el-descriptions-item>
        <el-descriptions-item label="版本总数">
          {{ pluginInfo.versionCount }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ pluginInfo.updateTime }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider />
      
      <div class="plugin-description">
        <h3>插件描述</h3>
        <p v-if="!isEditMode">{{ pluginInfo.description }}</p>
        <el-input v-else type="textarea" v-model="editedPluginInfo.description" placeholder="请输入插件描述" class="edit-plugin-description" />
      </div>
    </el-card>
    
    <!-- 版本信息 -->
    <el-card v-if="pluginInfo && Object.keys(versionList).length > 0" class="detail-card">
      <template #header>
        <h3>版本信息</h3>
      </template>
      
      <el-tabs v-model="activeVersion">
        <el-tab-pane
          v-for="(ver, vid) in versionList"
          :key="vid"
          :label="ver"
          :name="vid"
        >
          <div v-loading="versionLoading">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="版本号">
              <span class="version-number">{{ pluginInfo.pluginVersionList?.[0]?.version || ver }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ pluginInfo.pluginVersionList?.[0]?.createTime }}
            </el-descriptions-item>
            <el-descriptions-item label="兼容版本" :span="2">
              <div v-if="!isEditMode">
                <div v-if="pluginInfo.pluginVersionList?.[0]?.compatibleVersion" class="compatible-versions">
                  <el-tag
                    v-for="(v, index) in JSON.parse(pluginInfo.pluginVersionList[0].compatibleVersion).filter(v => v !== pluginInfo.pluginVersionList[0].version)"
                    :key="index"
                    size="small"
                    effect="plain"
                    class="compatible-tag"
                  >
                    {{ v }}
                  </el-tag>
                </div>
                <span v-else>无</span>
              </div>
              <el-select
                v-else
                v-model="compatibleVersions"
                multiple
                placeholder="请选择兼容版本"
                class="edit-compatible-versions"
              >
                <el-option
                  v-for="v in editedPluginInfo.pluginVersionList.filter(v => v.version !== editedVersion.version)"
                  :key="v.version"
                  :label="v.version"
                  :value="v.version"
                />
              </el-select>
            </el-descriptions-item>
          </el-descriptions>
          
          <el-divider />
          
          <div class="version-changelog">
            <h4>版本变更说明</h4>
            <AIMessageMarkdown v-if="!isEditMode && pluginInfo.pluginVersionList?.[0]?.changelog" :content="pluginInfo.pluginVersionList[0].changelog" />
            <p v-else-if="!isEditMode">无</p>
            <el-input v-else type="textarea" v-model="editedVersion.changelog" placeholder="请输入版本变更说明" class="edit-changelog" />
          </div>
          
          <el-divider />
          
          <!-- 实体类信息 -->
          <div class="version-entity-info">
            <h4>实体类信息</h4>
            <div v-if="pluginInfo.pluginVersionList?.[0]?.entityInfoList && pluginInfo.pluginVersionList[0].entityInfoList.length > 0" class="entity-cards-container">
              <el-card 
                v-for="entity in (isEditMode ? editedVersion.entityInfoList : pluginInfo.pluginVersionList[0].entityInfoList)" 
                :key="entity.id" 
                class="entity-card-item"
                shadow="hover"
              >
                <template #header>
                  <div class="entity-card-header">
                    <h5 class="entity-card-title">{{ entity.name }}</h5>
                    <span v-if="!isEditMode" class="entity-card-description">{{ entity.description || '无描述' }}</span>
                    <el-input v-else v-model="entity.description" placeholder="请输入描述" size="small" class="edit-entity-description" />
                  </div>
                </template>
                <div v-if="entity.attributes && entity.attributes.length > 0" class="entity-card-body">
                  <el-collapse class="properties-collapse">
                    <el-collapse-item title="查看属性" class="properties-collapse-item">
                      <div class="properties-list">
                        <div v-for="attr in [...entity.attributes].sort((a, b) => {
                          return a.name.localeCompare(b.name)
                        })" :key="attr.id" class="property-item">
                          <span class="property-name">{{ attr.name }}</span>
                          <span class="property-type">{{ attr.type }}</span>
                          <span class="property-description">{{ attr.description || '无描述' }}</span>
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
                <div v-else class="no-properties">无属性</div>
              </el-card>
            </div>
            <el-empty v-else description="暂无实体类信息" />
          </div>
          
          <el-divider />
          
          <!-- 方法类信息 -->
          <div class="version-method-info">
            <h4>方法类信息</h4>
            <div v-if="pluginInfo.pluginVersionList?.[0]?.methodClassInfoList && pluginInfo.pluginVersionList[0].methodClassInfoList.length > 0" class="method-classes-container">
              <el-card 
                v-for="methodClass in (isEditMode ? editedVersion.methodClassInfoList : pluginInfo.pluginVersionList[0].methodClassInfoList)" 
                :key="methodClass.id" 
                class="method-class-card"
                shadow="hover"
              >
                <template #header>
                  <div class="method-class-header">
                    <h5 class="method-class-title">{{ methodClass.simpleClassName }}</h5>
                  </div>
                </template>
                <div class="method-class-body">
                  <p v-if="!isEditMode" class="method-class-description">{{ methodClass.description || '无描述' }}</p>
                  <el-input v-else type="textarea" v-model="methodClass.description" placeholder="请输入描述" class="edit-method-class-description" />
                  <div v-if="methodClass.methods && methodClass.methods.length > 0" class="methods-container">
                    <el-card 
                      v-for="method in methodClass.methods" 
                      :key="method.id" 
                      class="method-card-item"
                      shadow="hover"
                      size="small"
                    >
                      <div class="method-card-header">
                        <span class="method-name">{{ method.name }}</span>
                        <span class="method-return-type">返回: {{ method.returnType }}</span>
                        <span class="method-return-description">{{ method.returnDescription || '' }}</span>
                      </div>
                      <div class="method-card-body">
                        <p v-if="!isEditMode" class="method-description">{{ method.description || '无描述' }}</p>
                        <el-input v-else v-model="method.description" placeholder="请输入描述" size="small" class="edit-method-description" />
                        <div v-if="method.parameters && method.parameters.length > 0" class="method-parameters">
                          <el-collapse class="parameters-collapse">
                            <el-collapse-item title="查看参数" class="parameters-collapse-item">
                              <div class="parameters-list">
                                <div v-for="param in [...method.parameters].sort((a, b) => {
                                  const orderDiff = (a.order || 0) - (b.order || 0)
                                  if (orderDiff !== 0) {
                                    return orderDiff
                                  }
                                  return a.name.localeCompare(b.name)
                                })" :key="param.id" class="parameter-item">
                                  <span class="parameter-name">{{ param.name }}</span>
                                  <span class="parameter-type">{{ param.type }}</span>
                                  <span class="parameter-description">{{ param.description || '无描述' }}</span>
                                </div>
                              </div>
                            </el-collapse-item>
                          </el-collapse>
                        </div>
                        <div v-else class="no-parameters">无参数</div>
                      </div>
                    </el-card>
                  </div>
                  <el-empty v-else description="暂无方法信息" style="margin-top: 10px" />
                </div>
              </el-card>
            </div>
            <el-empty v-else description="暂无方法类信息" />
          </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 空状态 -->
    <el-empty v-if="!pluginInfo && !loading" description="暂无插件信息" />
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">加载中...</div>
          </div>
        </div>
    
    <!-- 更新插件版本弹窗 -->
    <el-dialog
      v-model="updateVersionDialogVisible"
      title="更新插件版本"
      width="800px"
      @close="handleUpdateVersionClose"
    >
      <PluginCreateView 
        :plugin-id="pluginId"
        :is-update="true"
        :plugin-data="pluginInfo"
        @close="updateVersionDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

