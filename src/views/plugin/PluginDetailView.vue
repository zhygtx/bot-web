<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElTabs, ElTabPane, ElCard, ElDescriptions, ElDescriptionsItem, ElButton, ElTag, ElDivider } from 'element-plus'
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { PluginInfo } from '../../models'
import PluginCreateView from './PluginCreateView.vue'

const route = useRoute()
const router = useRouter()

// 插件信息
const pluginInfo = ref(null)
// 加载状态
const loading = ref(false)
// 当前激活的版本标签
const activeVersion = ref('')

// 当前编辑的版本
const editedVersion = ref(null)

// 当前版本的兼容版本
const compatibleVersions = ref([])

// 获取插件ID
const pluginId = computed(() => route.params.id)

// 只读模式
const isReadOnly = computed(() => route.query.readOnly === 'true' || route.query.fromWorkflowEdit === 'true')

// 返回路径
const returnUrl = computed(() => route.query.returnUrl)

// 加载插件详情
const loadPluginDetail = async () => {
  loading.value = true
  try {
    const response = await request({
      url: `/plugin/${pluginId.value}`,
      method: 'get'
    })
    if (response.code === 200) {
      pluginInfo.value = new PluginInfo(response.data)
      // 设置默认激活的版本标签
      if (pluginInfo.value.pluginVersionList && pluginInfo.value.pluginVersionList.length > 0) {
        activeVersion.value = pluginInfo.value.pluginVersionList[0].id
      }
    } else {
      ElMessage.error(response.message || '加载插件详情失败')
    }
  } catch (error) {
    ElMessage.error('加载插件详情失败')
  } finally {
    loading.value = false
  }
}

// 清除页面缓存
const clearCache = () => {
  // 清除会话存储中的插件相关缓存
  sessionStorage.removeItem('pluginCache')
  // 清除localStorage中的插件相关缓存
  localStorage.removeItem('pluginCache')
}

// 返回
const goBack = () => {
  // 退出时清除缓存
  clearCache()
  if (returnUrl.value) {
    // 直接返回原URL，确保 fromPluginDetail 和 reloadPlugins 参数被正确传递
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
  // 深拷贝插件信息，用于编辑
  editedPluginInfo.value = JSON.parse(JSON.stringify(pluginInfo.value))
}

// 保存编辑
const saveEdit = async () => {
  loading.value = true
  try {
    // 处理兼容版本，确保每个版本都包含自身
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
    
    const response = await request({
      url: '/plugin',
      method: 'put',
      data: editedPluginInfo.value
    })
    
    if (response.code === 200) {
      ElMessage.success('修改插件成功')
      isEditMode.value = false
      // 保存成功时清除缓存
      clearCache()
      loadPluginDetail()
    } else {
      ElMessage.error(response.message || '修改插件失败')
    }
  } catch (error) {
    ElMessage.error('修改插件失败')
  } finally {
    loading.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  isEditMode.value = false
  editedPluginInfo.value = null
  // 取消编辑时清除缓存
  clearCache()
}

// 更新插件版本弹窗状态
const updateVersionDialogVisible = ref(false)

// 打开更新版本弹窗
const goToUpdateVersion = () => {
  updateVersionDialogVisible.value = true
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 监听版本标签变化
watch(() => activeVersion.value, (newVersionId) => {
  if (isEditMode.value && editedPluginInfo.value) {
    // 找到当前版本并设置为editedVersion
    const currentVersion = editedPluginInfo.value.pluginVersionList.find(v => v.id === newVersionId)
    if (currentVersion) {
      editedVersion.value = currentVersion
      // 更新兼容版本，过滤掉当前版本
      if (currentVersion.compatibleVersion) {
        compatibleVersions.value = JSON.parse(currentVersion.compatibleVersion).filter(v => v !== currentVersion.version)
      } else {
        compatibleVersions.value = []
      }
    }
  }
})

// 监听编辑模式变化
watch(() => isEditMode.value, (isEdit) => {
  if (isEdit && editedPluginInfo.value && activeVersion.value) {
    // 找到当前版本并设置为editedVersion
    const currentVersion = editedPluginInfo.value.pluginVersionList.find(v => v.id === activeVersion.value)
    if (currentVersion) {
      editedVersion.value = currentVersion
      // 更新兼容版本，过滤掉当前版本
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
onMounted(() => {
  loadPluginDetail()
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
    <el-card v-if="pluginInfo && pluginInfo.pluginVersionList && pluginInfo.pluginVersionList.length > 0" class="detail-card">
      <template #header>
        <h3>版本信息</h3>
      </template>
      
      <el-tabs v-model="activeVersion">
        <el-tab-pane
          v-for="version in pluginInfo.pluginVersionList"
          :key="version.id"
          :label="version.version"
          :name="version.id"
        >
          <el-descriptions :column="2" border>
            <el-descriptions-item label="版本号">
              {{ version.version }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ version.createTime }}
            </el-descriptions-item>
            <el-descriptions-item label="兼容版本" :span="2">
              <div v-if="!isEditMode">
                <div v-if="version.compatibleVersion" class="compatible-versions">
                  <el-tag
                    v-for="(v, index) in JSON.parse(version.compatibleVersion).filter(v => v !== version.version)"
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
            <p v-if="!isEditMode">{{ version.changelog || '无' }}</p>
            <el-input v-else type="textarea" v-model="editedVersion.changelog" placeholder="请输入版本变更说明" class="edit-changelog" />
          </div>
          
          <el-divider />
          
          <!-- 实体类信息 -->
          <div class="version-entity-info">
            <h4>实体类信息</h4>
            <div v-if="version.entityInfoList && version.entityInfoList.length > 0" class="entity-cards-container">
              <el-card 
                v-for="entity in (isEditMode ? editedVersion.entityInfoList : version.entityInfoList)" 
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
                          // 按照属性名排序
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
            <div v-if="version.methodClassInfoList && version.methodClassInfoList.length > 0" class="method-classes-container">
              <el-card 
                v-for="(methodClass, index) in (isEditMode ? editedVersion.methodClassInfoList : version.methodClassInfoList)" 
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
                                  // 首先按照order字段排序
                                  const orderDiff = (a.order || 0) - (b.order || 0)
                                  if (orderDiff !== 0) {
                                    return orderDiff
                                  }
                                  // 如果order相同，按照参数名排序
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
      @close="updateVersionDialogVisible = false"
    >
      <PluginCreateView 
        :plugin-id="pluginId"
        :is-update="true"
        @close="updateVersionDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.plugin-detail {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.detail-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.detail-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plugin-name {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.plugin-description {
  margin-top: 20px;
}

.plugin-description h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.plugin-description p {
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.version-changelog {
  margin-top: 20px;
}

.version-changelog h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.version-changelog p {
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.version-entity-info,
.version-method-info {
  margin-top: 20px;
}

.version-entity-info h4,
.version-method-info h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

/* 实体类卡片样式 */
.entity-cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.entity-card-item {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.entity-card-item:hover {
  transform: translateY(-2px);
}

.entity-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
}

.entity-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  flex: 1;
}

.entity-card-description {
  font-size: 13px;
  color: #606266;
  flex: 1;
  min-width: 200px;
  text-align: right;
}

.entity-card-body {
  padding-top: 10px;
}

/* 方法类卡片样式 */
.method-classes-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.method-class-card {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.method-class-card:hover {
  transform: translateY(-2px);
}

.method-class-header {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.method-class-title {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.method-class-body {
  padding-top: 10px;
}

.method-class-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
}

.methods-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-card-item {
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.3s ease;
  border-left: 3px solid #409eff;
}

.method-card-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.method-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.method-name {
  font-weight: bold;
  color: #303133;
  font-size: 14px;
  flex: 1;
}

.method-description {
  font-size: 13px;
  color: #606266;
  margin: 8px 0;
  line-height: 1.4;
}

.method-return-type {
  font-size: 12px;
  color: #909399;
  background-color: #ecf5ff;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid #d9ecff;
  flex-shrink: 0;
}

.method-card-body {
  padding-top: 8px;
}

/* 通用样式 */
.properties-collapse,
.parameters-collapse {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.properties-collapse-item,
.parameters-collapse-item {
  border-bottom: 1px solid #e4e7ed;
}

.properties-collapse-item:last-child,
.parameters-collapse-item:last-child {
  border-bottom: none;
}

.properties-list,
.parameters-list {
  padding: 12px;
  background-color: #ffffff;
  border-top: 1px solid #e4e7ed;
}

.property-item,
.parameter-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
  padding: 4px 0;
  align-items: flex-start;
  flex-wrap: wrap;
}

.property-name,
.parameter-name {
  font-weight: bold;
  margin-right: 12px;
  color: #303133;
  min-width: 100px;
  flex-shrink: 0;
}

.property-type,
.parameter-type {
  color: #606266;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  background-color: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #e9ecef;
  margin-right: 12px;
  flex-shrink: 0;
}

.property-description,
.parameter-description {
  color: #909399;
  font-size: 12px;
  flex: 1;
  min-width: 150px;
  font-style: italic;
}

.method-return-description {
  font-size: 12px;
  color: #909399;
  background-color: #f0f9ff;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid #e6f7ff;
  margin-left: 8px;
  flex-shrink: 0;
  font-style: italic;
}

.no-properties,
.no-parameters {
  margin-top: 10px;
  font-size: 13px;
  color: #909399;
  font-style: italic;
}

/* 编辑模式样式 */
.edit-entity-description {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.edit-method-description {
  width: 100%;
  margin: 8px 0;
}

.edit-method-class-description {
  width: 100%;
  min-height: 60px;
  margin-bottom: 16px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .entity-cards-container,
  .method-classes-container {
    grid-template-columns: 1fr;
  }
  
  .entity-card-header,
  .method-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .entity-card-description {
    text-align: left;
    min-width: auto;
  }
}

.compatible-versions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 32px;
  padding: 4px 0;
}

.compatible-tag {
  margin-right: 8px;
  margin-bottom: 4px;
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 12px;
  background-color: #f0f9ff;
  border: 1px solid #e6f7ff;
  color: #1890ff;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  height: 24px;
}

.compatible-tag:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
  color: #096dd9;
}

/* 编辑模式下的表单元素样式 */
.edit-plugin-name {
  width: 300px;
  font-size: 24px;
  font-weight: bold;
}

.edit-plugin-description {
  width: 100%;
  min-height: 100px;
}

.edit-changelog {
  width: 100%;
  min-height: 80px;
}

.edit-method-class-description {
  width: 100%;
  min-height: 60px;
  margin-bottom: 10px;
}

.edit-compatible-versions {
  width: 100%;
}

/* 加载状态样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.loading-text {
  color: #606266;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>