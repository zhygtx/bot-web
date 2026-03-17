<script setup>
import { ref, onMounted, computed, defineProps, defineEmits } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, CircleCheck, Delete } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { PluginInfo, PluginVersion } from '../../models'

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 定义props
const props = defineProps({
  pluginId: {
    type: String,
    default: null
  },
  isUpdate: {
    type: Boolean,
    default: false
  }
})

// 定义事件
const emit = defineEmits(['close'])

// 编辑模式判断
const isEditMode = computed(() => !!props.pluginId)

// 更新版本模式判断
const isUpdateMode = computed(() => props.isUpdate || new URLSearchParams(window.location.search).get('isUpdate') === 'true')

// 插件表单数据
const pluginForm = ref({
  name: '',
  description: '',
  isPublic: true,
  version: '',
  changelog: '',
  entityPackage: '',
  methodPackage: '',
  compatibleVersions: []
})

// 文件上传
const file = ref(null)
const fileList = ref([])
const uploadUrl = '/plugin'

// 加载状态
const loading = ref(false)
// 插件信息
const pluginInfo = ref(null)

// 加载插件信息（编辑或更新版本模式）
const loadPluginInfo = async () => {
  if (!isEditMode.value && !isUpdateMode.value) return
  
  const currentPluginId = props.pluginId || new URLSearchParams(window.location.search).get('pluginId')
  if (!currentPluginId) return
  
  loading.value = true
  try {
    // 真实API调用
    const response = await request({
      url: `/plugin/${currentPluginId}`,
      method: 'get'
    })
    if (response.code === 200) {
      pluginInfo.value = new PluginInfo(response.data)
      // 自动填充插件基本信息
      pluginForm.value.name = pluginInfo.value.name
      pluginForm.value.description = pluginInfo.value.description
      pluginForm.value.isPublic = pluginInfo.value.isPublic
      // 自动填充最新版本的实体类包名和方法类包名
      if (pluginInfo.value.pluginVersionList && pluginInfo.value.pluginVersionList.length > 0) {
        const latestVersion = pluginInfo.value.pluginVersionList[0]
        pluginForm.value.entityPackage = latestVersion.entityPackage
        pluginForm.value.methodPackage = latestVersion.methodPackage
      }
    } else {
      ElMessage.error(response.message || '加载插件信息失败')
    }
  } catch (error) {
    ElMessage.error('加载插件信息失败')
  } finally {
    loading.value = false
  }
}

// 处理文件上传
const handleFileChange = (file) => {
  fileList.value = [file.raw]
  pluginForm.value.file = file.raw
}

// 处理文件移除
const handleFileRemove = () => {
  fileList.value = []
  pluginForm.value.file = null
}

// 清除页面缓存
const clearCache = () => {
  // 清除会话存储中的插件相关缓存
  sessionStorage.removeItem('pluginCache')
  // 清除localStorage中的插件相关缓存
  localStorage.removeItem('pluginCache')
}

// 提交表单
const submitForm = async () => {
  // 验证表单
  if (!pluginForm.value.name) {
    ElMessage.error('请输入插件名称')
    return
  }
  if (!pluginForm.value.version) {
    ElMessage.error('请输入版本号')
    return
  }
  if (!pluginForm.value.entityPackage) {
    ElMessage.error('请输入实体类包名')
    return
  }
  if (!pluginForm.value.methodPackage) {
    ElMessage.error('请输入方法类包名')
    return
  }
  if (!fileList.value.length) {
    ElMessage.error('请上传插件文件')
    return
  }

  loading.value = true
  try {
    // 创建FormData
    const formData = new FormData()
    
    // 创建插件版本对象
    const pluginVersion = {
      version: pluginForm.value.version,
      changelog: pluginForm.value.changelog,
      entityPackage: pluginForm.value.entityPackage,
      methodPackage: pluginForm.value.methodPackage
    }
    
    // 无论是否设置了兼容版本，都要将当前版本加进去
    const compatibleVersions = [...(pluginForm.value.compatibleVersions || []), pluginForm.value.version]
    pluginVersion.compatibleVersion = JSON.stringify(compatibleVersions)
    
    // 创建插件信息对象
    let pluginInfoData
    if (isUpdateMode.value && pluginInfo.value) {
      // 更新版本模式：将新版本添加到列表第一位
      pluginInfoData = {
        id: pluginInfo.value.id,
        name: pluginForm.value.name,
        description: pluginForm.value.description,
        authorId: pluginInfo.value.authorId,
        authorName: pluginInfo.value.authorName,
        latestVersion: pluginInfo.value.latestVersion,
        versionCount: pluginInfo.value.versionCount,
        isPublic: pluginForm.value.isPublic,
        createTime: pluginInfo.value.createTime,
        updateTime: pluginInfo.value.updateTime,
        pluginVersionList: [pluginVersion, ...(pluginInfo.value.pluginVersionList || [])]
      }
    } else {
      // 新建或编辑模式：只包含当前版本
      pluginInfoData = {
        name: pluginForm.value.name,
        description: pluginForm.value.description,
        isPublic: pluginForm.value.isPublic,
        pluginVersionList: [pluginVersion]
      }
    }
    
    // 添加插件信息对象（使用Blob指定Content-Type为application/json）
    const pluginInfoBlob = new Blob([JSON.stringify(pluginInfoData)], { type: 'application/json' })
    formData.append('pluginInfo', pluginInfoBlob)
    // 添加文件
    formData.append('file', fileList.value[0])

    const response = await request({
      url: '/plugin',
      method: 'post',
      data: formData
    })

    if (response.code === 200) {
      ElMessage.success('操作成功')
      // 保存成功时清除缓存
      clearCache()
      emit('close')
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

// 取消操作
const cancel = () => {
  // 取消时清除缓存
  clearCache()
  emit('close')
}

// 初始化
onMounted(() => {
  loadPluginInfo()
})
</script>

<template>
  <div class="plugin-create-form">
    <!-- 基本信息（新建时显示） -->
    <div class="form-item" v-if="!isEditMode && !isUpdateMode">
      <label class="form-label">
        <span class="required">*</span>
        插件名称
      </label>
      <el-input v-model="pluginForm.name" placeholder="请输入" />
    </div>
    
    <div class="form-item" v-if="!isEditMode && !isUpdateMode">
      <label class="form-label">
        插件描述
      </label>
      <el-input type="textarea" v-model="pluginForm.description" placeholder="请输入" />
    </div>
    
    <div class="form-item" v-if="!isEditMode && !isUpdateMode">
      <label class="form-label">
        <span class="required">*</span>
        是否公开
      </label>
      <el-switch v-model="pluginForm.isPublic" />
    </div>
    
    <!-- 版本信息 -->
    <div class="form-item">
      <label class="form-label">
        <span class="required">*</span>
        版本号
      </label>
      <el-input v-model="pluginForm.version" placeholder="请输入" />
    </div>
    
    <div class="form-item">
      <label class="form-label">
        版本变更说明
      </label>
      <el-input type="textarea" v-model="pluginForm.changelog" placeholder="请输入" />
    </div>
    
    <div class="form-item">
      <label class="form-label">
        <span class="required">*</span>
        实体类包名
      </label>
      <el-input v-model="pluginForm.entityPackage" placeholder="请输入" />
    </div>
    
    <div class="form-item">
      <label class="form-label">
        <span class="required">*</span>
        方法类包名
      </label>
      <el-input v-model="pluginForm.methodPackage" placeholder="请输入" />
    </div>
    
    <!-- 兼容版本（编辑或更新版本时显示） -->
    <div class="form-item" v-if="isEditMode || isUpdateMode">
      <label class="form-label">
        兼容的版本
      </label>
      <el-select
        v-model="pluginForm.compatibleVersions"
        multiple
        placeholder="请选择"
      >
        <el-option
          v-for="version in pluginInfo?.pluginVersionList || []"
          :key="version.version"
          :label="version.version"
          :value="version.version"
        />
      </el-select>
    </div>
    
    <!-- 文件上传 -->
    <div class="form-item">
      <label class="form-label">
        <span class="required">*</span>
        插件文件
      </label>
      <el-upload
        :action="uploadUrl"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        :auto-upload="false"
        :file-list="fileList"
        accept=".jar"
        drag
        multiple="false"
        class="upload-component"
        :show-file-list="false"
      >
        <!-- 上传中/未上传状态 -->
        <template v-if="!fileList.length">
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-text">点击或拖拽文件到此处上传</div>
          <div class="upload-tip">
            只能上传单个JAR文件且大小限制为100MB
          </div>
        </template>
        
        <!-- 上传完成状态 -->
        <template v-else>
          <div class="uploaded-file">
            <el-icon class="file-icon"><CircleCheck /></el-icon>
            <div class="file-info">
              <div class="file-name">{{ fileList[0].name }}</div>
              <div class="file-size">{{ formatFileSize(fileList[0].size) }}</div>
            </div>
            <el-button type="text" @click="handleFileRemove" class="remove-button">
              <el-icon><Delete /></el-icon>
              <span>移除</span>
            </el-button>
          </div>
        </template>
      </el-upload>
    </div>
    
    <!-- 操作按钮 -->
    <div class="form-item">
      <div class="form-buttons">
        <el-button type="primary" @click="submitForm" :loading="loading">提交</el-button>
        <el-button @click="cancel">取消</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-create-form {
  padding: 10px 0;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 表单项目样式 */
.form-item {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* 确保上传框所在的form-item没有背景 */
.form-item:has(.upload-component) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 确保上传框及其所有父元素没有背景 */
.form-item:has(.upload-component),
.form-item:has(.upload-component) > * {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* 确保整个表单容器没有背景 */
.plugin-create-form {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* 标签样式 */
.form-label {
  width: 100px;
  text-align: right;
  margin-right: 20px;
  font-weight: 500;
  padding-top: 8px;
  border: none !important;
  background: transparent !important;
}

/* 必填标志 */
.required {
  color: #f56c6c;
  margin-right: 4px;
}

/* 表单输入区域 */
.form-item > *:not(.form-label) {
  flex: 1;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 上传组件 */
.upload-component {
  border: 1px dashed #d9d9d9 !important;
  border-radius: 6px !important;
  padding: 40px 20px !important;
  text-align: center !important;
  min-height: 160px !important;
  margin: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transition: all 0.3s ease;
}

.upload-component:hover {
  border-color: #409eff !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

/* 确保el-upload内部元素没有边框和背景 */
.upload-component,
.upload-component .el-upload,
.upload-component .el-upload__text,
.upload-component .el-upload--text,
.upload-component .el-upload--drag,
.upload-component .el-upload-dragger {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
  outline: none !important;
}

/* 确保el-upload组件本身没有背景 */
.el-upload,
.el-upload--drag {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 确保el-upload-dragger没有背景和阴影 */
.el-upload-dragger {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 确保el-upload-dragger在hover时没有背景和阴影 */
.el-upload-dragger:hover {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* 上传图标 */
.upload-icon {
  font-size: 36px;
  color: #c0c4cc;
  margin-bottom: 12px;
}

/* 上传文本 */
.upload-text {
  font-size: 14px;
  color: #606266;
  margin-bottom: 6px;
}

/* 上传提示 */
.upload-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* 上传完成状态 */
.uploaded-file {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid #e6f7ff;
  border-radius: 6px;
  background-color: #f6ffed;
  transition: all 0.3s ease;
}

.uploaded-file:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 文件图标 */
.file-icon {
  font-size: 24px;
  color: #52c41a;
  margin-right: 16px;
}

/* 文件信息 */
.file-info {
  flex: 1;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

/* 移除按钮 */
.remove-button {
  margin-left: 16px;
  color: #ff4d4f;
}

.remove-button:hover {
  color: #ff7875;
}

/* 操作按钮区域 */
.form-buttons {
  margin-left: 120px;
}

/* 确保输入框等元素样式正常 */
.el-input,
.el-input__wrapper,
.el-textarea,
.el-select {
  border: 1px solid #dcdfe6 !important;
  background: white !important;
  box-shadow: none !important;
}

/* 确保开关组件样式正常 */
.el-switch {
  margin-top: 4px;
}
</style>