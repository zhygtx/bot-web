<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'

// 动作内容列表数据
const actionContents = ref([])

// 加载状态
const loading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加动作内容')

// 当前选择的动作内容类型
const currentContentType = ref('text')

// 动作内容类型选项
const contentTypes = [
  { label: '文本', value: 'text' },
  { label: 'API', value: 'api' },
  { label: 'URL', value: 'url' },
  { label: '模板', value: 'template' }
]

// 表单数据
const contentForm = reactive({
  id: '',
  name: '',
  text: '', // 文本内容
  url: '', // URL地址
  params: [], // URL参数，改为数组类型
  content: '', // 模板内容
  width: 0, // 模板宽度
  height: 0, // 模板高度
  dataId: '', // 模板数据ID
  templateType: 'text', // 模板类型
  apiName: '' // API名称
})

// 数据名称选项
const dataNameOptions = ref([])

// 加载状态
const dataNameLoading = ref(false)

// 数据缓存，用于存储不同类型的数据列表
const dataCache = ref({
  text: [],
  api: [],
  url: [],
  template: []
})

// 数据名称缓存，用于快速查找数据名称
const dataNameCache = ref({
  text: {},
  api: {},
  url: {},
  template: {}
})

// API名称选项
const apiNameOptions = [
  { label: 'setGroupSpecialTitle', value: 'setGroupSpecialTitle' },
  { label: 'getWarframeFissure', value: 'getWarframeFissure' }
]

// 模板类型选项
const templateTypeOptions = [
  { label: '文本', value: 'text' },
  { label: 'API', value: 'api' },
  { label: 'URL', value: 'url' }
]

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入动作内容名称', trigger: 'blur' },
    { min: 2, max: 20, message: '动作内容名称长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 表单引用
const contentFormRef = ref(null)

// 获取动作内容列表
const getActionContents = async () => {
  try {
    loading.value = true
    const response = await request({
      url: `/api/action-content/${currentContentType.value}/list`,
      method: 'get'
    })
    actionContents.value = response.data || []
    
    // 如果是模板类型，加载所有可能的数据类型列表用于显示数据名称
    if (currentContentType.value === 'template') {
      // 加载文本、API、URL类型的数据列表
      await Promise.all([
        getDataNames('text'),
        getDataNames('api'),
        getDataNames('url')
      ])
    }
  } catch (error) {
    ElMessage.error(error.message || '获取动作内容列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索动作内容
const searchActionContents = () => {
  getActionContents()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  getActionContents()
}

// 打开添加动作内容对话框
const openAddDialog = () => {
  dialogTitle.value = '添加动作内容'
  // 重置表单
  if (contentFormRef.value) {
    contentFormRef.value.resetFields()
  }
  // 清空表单数据
  contentForm.id = ''
  contentForm.name = ''
  contentForm.text = ''
  contentForm.url = ''
  contentForm.params = [{ key: '', value: '' }]
  contentForm.content = ''
  contentForm.width = 0
  contentForm.height = 0
  contentForm.dataId = ''
  contentForm.templateType = 'text'
  contentForm.apiName = ''
  // 加载对应模板类型的数据名称
  getDataNames('text')
  dialogVisible.value = true
}

// 打开编辑动作内容对话框
const openEditDialog = (content) => {
  dialogTitle.value = '编辑动作内容'
  // 填充表单数据
  contentForm.id = content.id
  contentForm.name = content.name
  contentForm.text = content.text || ''
  contentForm.url = content.url || ''
  // 将params对象转换为数组
  const paramsObj = content.params || {}
  contentForm.params = Object.keys(paramsObj).map(key => ({ key, value: paramsObj[key] }))
  if (contentForm.params.length === 0) {
    contentForm.params = [{ key: '', value: '' }]
  }
  contentForm.content = content.content || ''
  contentForm.width = content.width || 0
  contentForm.height = content.height || 0
  contentForm.dataId = content.dataId || ''
  contentForm.templateType = content.templateType || 'text'
  contentForm.apiName = content.name || '' // API的name字段是枚举类型
  // 加载对应模板类型的数据名称
  getDataNames(content.templateType || 'text')
  dialogVisible.value = true
}

// 删除动作内容
const deleteActionContent = async (content) => {
  try {
    await ElMessageBox.confirm('确定要删除该动作内容吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: `/api/action-content/${currentContentType.value}/delete/${content.id}`,
      method: 'get'
    })
    
    ElMessage.success('删除动作内容成功')
    getActionContents()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除动作内容失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!contentFormRef.value) return
  
  await contentFormRef.value.validate()
  
  try {
    let url = ''
    let submitData = { ...contentForm }
    
    // 根据不同类型处理数据
    switch (currentContentType.value) {
      case 'text':
        submitData = { id: contentForm.id, name: contentForm.name, text: contentForm.text }
        break
      case 'api':
        submitData = { id: contentForm.id, name: contentForm.apiName }
        break
      case 'url':
        // 将params数组转换为对象
        const paramsObj = {}
        contentForm.params.forEach(item => {
          if (item.key && item.key.trim()) {
            paramsObj[item.key.trim()] = item.value || ''
          }
        })
        submitData = { id: contentForm.id, name: contentForm.name, url: contentForm.url, params: paramsObj }
        break
      case 'template':
        submitData = { 
          id: contentForm.id, 
          name: contentForm.name, 
          content: contentForm.content,
          width: contentForm.width,
          height: contentForm.height,
          dataId: contentForm.dataId,
          templateType: contentForm.templateType
        }
        break
    }
    
    if (contentForm.id) {
      // 编辑动作内容
      url = `/api/action-content/${currentContentType.value}/update/${contentForm.id}`
    } else {
      // 添加动作内容
      url = `/api/action-content/${currentContentType.value}/add`
    }
    
    const response = await request({
      url: url,
      method: 'post',
      data: submitData
    })
    
    ElMessage.success(response.message || (contentForm.id ? '编辑动作内容成功' : '添加动作内容成功'))
    dialogVisible.value = false
    getActionContents()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 监听动作内容类型变化
const handleContentTypeChange = () => {
  getActionContents()
}

// 获取数据名称列表
const getDataNames = async (type) => {
  if (!type) return
  
  dataNameLoading.value = true
  try {
    const response = await request({
      url: `/api/action-content/${type}/list`,
      method: 'get'
    })
    dataNameOptions.value = response.data.map(item => ({
      label: item.name,
      value: item.id
    }))
    
    // 更新数据缓存和名称缓存
    dataCache.value[type] = response.data
    const nameCache = {}
    response.data.forEach(item => {
      nameCache[item.id] = item.name
    })
    dataNameCache.value[type] = nameCache
  } catch (error) {
    ElMessage.error(error.message || '获取数据名称列表失败')
    dataNameOptions.value = []
  } finally {
    dataNameLoading.value = false
  }
}

// 根据数据ID和类型获取数据名称
const getDataNameById = (dataId, type) => {
  if (!dataId || !type) return dataId
  
  // 先从缓存中查找
  if (dataNameCache.value[type] && dataNameCache.value[type][dataId]) {
    return dataNameCache.value[type][dataId]
  }
  
  // 如果缓存中没有，尝试从数据列表中查找
  if (dataCache.value[type]) {
    const dataItem = dataCache.value[type].find(item => item.id === dataId)
    if (dataItem) {
      // 更新缓存
      dataNameCache.value[type][dataId] = dataItem.name
      return dataItem.name
    }
  }
  
  return dataId
}

// 监听模板类型变化
const handleTemplateTypeChange = () => {
  getDataNames(contentForm.templateType)
}

// 组件挂载时获取动作内容列表
onMounted(() => {
  getActionContents()
  // 初始加载文本类型的数据名称
  getDataNames('text')
})
</script>

<template>
  <div class="action-content-view">
    <el-card class="action-content-card">
      <template #header>
        <div class="card-header">
          <h2>动作内容管理</h2>
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-select 
              v-model="currentContentType" 
              placeholder="请选择动作内容类型"
              @change="handleContentTypeChange"
              style="width: 120px;"
            >
              <el-option
                v-for="item in contentTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
            <el-button
              type="primary"
              @click="openAddDialog"
              :icon="Plus"
            >
              添加动作内容
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入关键词"
            clearable
            @keyup.enter="searchActionContents"
          >
            <template #append>
              <el-button @click="searchActionContents" :icon="Search"></el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 动作内容列表 -->
      <el-table
        v-loading="loading"
        :data="actionContents"
        style="width: 100%"
        border
      >
        <el-table-column prop="name" label="名称" min-width="150"></el-table-column>
        
        <!-- 文本类型特有列 -->
        <el-table-column v-if="currentContentType === 'text'" prop="text" label="文本内容" min-width="200"></el-table-column>
        
        <!-- API类型特有列 -->
        <el-table-column v-if="currentContentType === 'api'" prop="name" label="API名称" min-width="200"></el-table-column>
        
        <!-- URL类型特有列 -->
        <el-table-column v-if="currentContentType === 'url'" prop="url" label="URL地址" min-width="200"></el-table-column>
        <el-table-column v-if="currentContentType === 'url'" prop="params" label="参数" min-width="150">
          <template #default="scope">
            {{ JSON.stringify(scope.row.params || {}) }}
          </template>
        </el-table-column>
        
        <!-- 模板类型特有列 -->
        <el-table-column v-if="currentContentType === 'template'" prop="content" label="模板内容" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.content" placement="top">
              <div class="template-content-truncate">
                {{ scope.row.content }}
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column v-if="currentContentType === 'template'" prop="width" label="宽度" min-width="100" align="center"></el-table-column>
        <el-table-column v-if="currentContentType === 'template'" prop="height" label="高度" min-width="100" align="center"></el-table-column>
        <el-table-column v-if="currentContentType === 'template'" prop="templateType" label="模板类型" min-width="120" align="center">
          <template #default="scope">
            {{ scope.row.templateType === 'text' ? '文本' : scope.row.templateType === 'api' ? 'API' : scope.row.templateType === 'url' ? 'URL' : '模板' }}
          </template>
        </el-table-column>
        <el-table-column v-if="currentContentType === 'template'" prop="dataId" label="数据名称" min-width="150">
          <template #default="scope">
            {{ getDataNameById(scope.row.dataId, scope.row.templateType) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="180" align="center">
          <template #default="scope">
            <div class="action-buttons">
              <el-button
                type="primary"
                size="small"
                @click="openEditDialog(scope.row)"
                :icon="Edit"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteActionContent(scope.row)"
                :icon="Delete"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 动作内容表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
      >
        <el-form
          ref="contentFormRef"
          :model="contentForm"
          :rules="rules"
          label-width="120px"
        >
          <el-form-item label="名称" prop="name">
            <el-input v-model="contentForm.name" placeholder="请输入名称"></el-input>
          </el-form-item>
          
          <!-- 文本类型特有表单 -->
          <el-form-item v-if="currentContentType === 'text'" label="文本内容">
            <el-input
              v-model="contentForm.text"
              placeholder="请输入文本内容"
              type="textarea"
              :rows="3"
            ></el-input>
          </el-form-item>
          
          <!-- API类型特有表单 -->
          <el-form-item v-if="currentContentType === 'api'" label="API名称">
            <el-select v-model="contentForm.apiName" placeholder="请选择API名称">
              <el-option
                v-for="item in apiNameOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </el-form-item>
          
          <!-- URL类型特有表单 -->
          <el-form-item v-if="currentContentType === 'url'" label="URL地址">
            <el-input v-model="contentForm.url" placeholder="请输入URL地址"></el-input>
          </el-form-item>
          <el-form-item v-if="currentContentType === 'url'" label="URL参数">
            <div class="url-params-form">
              <div 
                v-for="(param, index) in contentForm.params" 
                :key="index"
                class="param-row"
              >
                <el-input 
                  v-model="param.key" 
                  placeholder="键" 
                  style="width: 120px; margin-right: 8px;"
                ></el-input>
                <el-input 
                  v-model="param.value" 
                  placeholder="值" 
                  style="flex: 1; margin-right: 8px;"
                ></el-input>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="contentForm.params.splice(index, 1)"
                  :disabled="contentForm.params.length <= 1"
                >
                  删除
                </el-button>
              </div>
              <el-button 
                type="primary" 
                size="small" 
                @click="contentForm.params.push({ key: '', value: '' })"
                style="margin-top: 8px;"
              >
                添加参数
              </el-button>
            </div>
          </el-form-item>
          
          <!-- 模板类型特有表单 -->
          <el-form-item v-if="currentContentType === 'template'" label="模板内容">
            <el-input
              v-model="contentForm.content"
              placeholder="请输入模板内容，使用Playwright的语言模式编写HTML模板"
              type="textarea"
              :rows="6"
              class="html-editor"
            ></el-input>
            <div class="form-tip">
              提示：请使用Playwright的语言模式编写HTML模板
            </div>
          </el-form-item>
          <el-row v-if="currentContentType === 'template'" :gutter="20">
            <el-col :span="12">
              <el-form-item label="宽度">
                <el-input-number v-model="contentForm.width" placeholder="请输入宽度" :min="0"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="高度">
                <el-input-number v-model="contentForm.height" placeholder="请输入高度" :min="0"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item v-if="currentContentType === 'template'" label="模板类型">
            <el-select v-model="contentForm.templateType" placeholder="请选择模板类型" @change="handleTemplateTypeChange">
              <el-option
                v-for="item in templateTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item v-if="currentContentType === 'template'" label="数据名称">
            <el-select v-model="contentForm.dataId" placeholder="请选择数据名称" :loading="dataNameLoading">
              <el-option
                v-for="item in dataNameOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitForm">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<style scoped>
.action-content-view {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  font-size: 20px;
  margin: 0;
  color: #303133;
}

.search-form {
  margin-bottom: 20px;
  padding: 10px 0;
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.url-params-form {
  width: 100%;
}

.param-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
}

.html-editor {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 8px;
  resize: vertical;
}

.form-tip {
  color: #606266;
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.5;
}

.template-content-truncate {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-buttons .el-button {
  flex: 1;
  max-width: 80px;
}
</style>