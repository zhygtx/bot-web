<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, ElTree, ElIcon } from 'element-plus'
import { Plus, Edit, Delete, Search, Close, InfoFilled } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { useRoute } from 'vue-router'

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

// 路由实例
const route = useRoute()

// 悬浮球和树形控件显示状态
const showFloatBall = ref(true)
const showTreeDialog = ref(false)

// 实体类属性中文解释
const entityPropertyExplain = {
  // GroupMessageEvent相关属性
  font: '字体大小',
  time: '消息时间戳',
  avatar: '头像URL',
  sender: '发送者信息',
  age: '年龄',
  sex: '性别',
  area: '地区',
  card: '群名片',
  role: '群成员角色',
  level: '群等级',
  title: '专属头衔',
  user_id: '用户QQ号',
  nickname: '昵称',
  message: '消息内容',
  self_id: '机器人QQ号',
  group_id: '群号',
  sub_type: '消息子类型',
  anonymous: '匿名信息',
  post_type: '事件类型',
  message_id: '消息ID',
  raw_message: '原始消息内容',
  message_type: '消息类型',
  is_binded_user_id: '绑定用户ID',
  real_message_type: '真实消息类型',
  is_binded_group_id: '绑定群ID',
  
  // GroupIncreaseNoticeEvent和GroupDecreaseNoticeEvent相关属性
  notice_type: '通知类型',
  operator_id: '操作者QQ号',
  
  // PrivateMessageEvent相关属性
  temp_source: '临时会话来源'
}

// 将JSON转换为树形结构的方法
const convertJsonToTree = (json, path = '') => {
  if (typeof json !== 'object' || json === null) {
    return []
  }
  
  return Object.keys(json).map(key => {
    const currentPath = path ? `${path}.${key}` : key
    const value = json[key]
    const isObject = typeof value === 'object' && value !== null
    
    const node = {
      label: key,
      path: currentPath,
      value: value,
      example: value,
      explain: entityPropertyExplain[key] || key,
      type: typeof value,
      isCopyable: !isObject, // 只有非对象类型可以被复制
      children: []
    }
    
    if (isObject) {
      node.children = convertJsonToTree(value, currentPath)
    }
    
    return node
  })
}

// 实体类原始数据
const entityRawData = {
  GroupMessageEvent: {
    font: 0,
    time: 1769062335,
    avatar: null,
    sender: {
      age: 0,
      sex: "unknown",
      area: "",
      card: "",
      role: "owner",
      level: "0",
      title: "2",
      user_id: 1874743565,
      nickname: "机械之咒"
    },
    message: "1",
    self_id: 3845884126,
    user_id: 1874743565,
    group_id: 1053302473,
    sub_type: "normal",
    anonymous: null,
    post_type: "message",
    message_id: 10004,
    raw_message: "1",
    message_type: "group",
    is_binded_user_id: null,
    real_message_type: null,
    is_binded_group_id: null
  },
  GroupIncreaseNoticeEvent: {
    time: 1769062345,
    self_id: 3845884126,
    user_id: 3304372782,
    group_id: 1053302473,
    sub_type: "approve",
    post_type: "notice",
    notice_type: "group_increase",
    operator_id: 1874743565
  },
  GroupDecreaseNoticeEvent: {
    time: 1769062352,
    self_id: 3845884126,
    user_id: 3304372782,
    group_id: 1053302473,
    sub_type: "leave",
    post_type: "notice",
    notice_type: "group_decrease",
    operator_id: 3304372782
  },
  PrivateMessageEvent: {
    font: 0,
    time: 1769062597,
    sender: {
      age: 0,
      sex: "unknown",
      user_id: 1874743565,
      group_id: null,
      nickname: "机械之咒"
    },
    message: "6",
    self_id: 3845884126,
    user_id: 1874743565,
    sub_type: "group",
    post_type: "message",
    message_id: 10013,
    raw_message: "6",
    temp_source: null,
    message_type: "private"
  },
  GroupAddRequestEvent: {
    flag: "e0aaf374-62be-4ed3-bc7f-e6b761be0a1c",
    time: 1769154428,
    comment: "",
    self_id: 3845884126,
    user_id: 3304372782,
    group_id: 1053302473,
    sub_type: "add",
    post_type: "request",
    invitor_id: null,
    request_type: "group"
  }
}

// 生成树形结构数据
const entityTreeData = ref(
  Object.keys(entityRawData).map(key => {
    // 根节点注释
    const rootExplain = {
      GroupMessageEvent: '群消息事件消息体',
      GroupIncreaseNoticeEvent: '群成员增加事件消息体',
      GroupDecreaseNoticeEvent: '群成员减少事件消息体',
      PrivateMessageEvent: '私聊消息事件消息体',
      GroupAddRequestEvent: '加群请求事件消息体'
    }[key] || key
    
    return {
      label: key,
      children: convertJsonToTree(entityRawData[key]),
      type: 'entity',
      explain: rootExplain,
      example: JSON.stringify(entityRawData[key])
    }
  })
)

// 切换悬浮球和树形控件显示状态
const toggleFloatBall = () => {
  if (showFloatBall.value) {
    // 打开树形控件
    showFloatBall.value = false
    showTreeDialog.value = true
  } else {
    // 关闭树形控件，使用关闭动画
    closeTreeDialog()
  }
}

// 关闭树形控件并显示悬浮球
const closeTreeDialog = () => {
  const treeDialog = document.querySelector('.tree-dialog')
  if (treeDialog) {
    treeDialog.classList.add('closing')
    // 监听动画结束事件
    const handleAnimationEnd = () => {
      treeDialog.removeEventListener('animationend', handleAnimationEnd)
      showTreeDialog.value = false
      showFloatBall.value = true
      treeDialog.classList.remove('closing')
    }
    treeDialog.addEventListener('animationend', handleAnimationEnd)
  } else {
    // 降级处理
    showTreeDialog.value = false
    showFloatBall.value = true
  }
}

// 复制文本到剪贴板
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
    .catch(err => {
      ElMessage.error('复制失败')
      console.error('复制失败:', err)
    })
}

// 处理树形节点点击事件
const handleTreeNodeClick = (node) => {
  // 实体类节点不复制
  if (node.type === 'entity') {
    return
  }
  
  // 只有可复制节点（非对象类型）才能被复制
  if (!node.isCopyable) {
    return
  }
  
  // 复制属性路径，格式为 {{属性名}} 或 {{属性名.属性名}}
  const copyText = `{{${node.path}}}`
  copyToClipboard(copyText)
}

// 监听路由变化，自动关闭树形控件
watch(
  () => route.path,
  () => {
    showTreeDialog.value = false
    showFloatBall.value = true
  }
)

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
    
    <!-- 悬浮球 -->
    <div 
      v-show="showFloatBall" 
      class="float-ball"
      @click="toggleFloatBall"
    >
      <el-icon class="float-ball-icon"><InfoFilled /></el-icon>
    </div>
    
    <!-- 树形控件窗口 -->
    <div 
      v-show="showTreeDialog" 
      class="tree-dialog"
    >
      <div class="tree-dialog-header">
        <span>实体类属性</span>
        <el-button 
          type="text" 
          class="close-button"
          @click="closeTreeDialog"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="tree-dialog-content">
        <el-tree
          :data="entityTreeData"
          :props="{ label: 'label' }"
          @node-click="handleTreeNodeClick"
          show-checkbox
          node-key="label"
          default-expand-all
        >
          <template #default="{ node, data }">
            <div class="tree-node-content">
              <div class="tree-node-main">
                <span class="tree-node-label">{{ node.label }}</span>
                <span class="tree-node-explain" v-if="data.explain">
                  {{ data.explain }}
                </span>
                <span class="tree-node-example" v-if="data.isCopyable && data.example !== undefined && data.example !== null">
                  示例: {{ data.example }}
                </span>
              </div>
            </div>
          </template>
        </el-tree>
        
        <!-- 使用说明 -->
        <div class="usage-section">
          <div class="usage-title">使用说明：</div>
          <ul class="usage-list">
            <li>点击属性节点可复制为 <code>&lbrace;&lbrace;属性名&rbrace;&rbrace;</code> 格式，消息处理时会自动替换为对应数值</li>
            <li>支持默认值语法：<code>&lbrace;&lbrace;属性名|默认值&rbrace;&rbrace;</code>，当属性值为空时使用默认值</li>
            <li>支持引用提取文本：<code>&lbrace;&lbrace;valueN&rbrace;&rbrace;</code>，N从0开始，对应正则提取的分组内容</li>
            <li>无数据且无默认值时，将显示 <code>null</code></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-content-view {
  width: 100%;
  position: relative;
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

/* 悬浮球样式 */
.float-ball {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 9999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: scale(1);
}

.float-ball:hover {
  background-color: #66b1ff;
  transform: scale(1.1);
}

.float-ball-icon {
  font-size: 28px;
  transition: all 0.3s ease;
}

/* 树形控件窗口样式 */
.tree-dialog {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 500px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.15);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 添加缩放动画 */
  transform-origin: bottom right;
  animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* 缩放进入动画 */
@keyframes scaleIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 缩放退出动画 */
@keyframes scaleOut {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

/* 关闭动画 */
.tree-dialog.closing {
  animation: scaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* 悬浮球隐藏时的样式 */
.float-ball.hidden {
  opacity: 0;
  transform: scale(0);
}

/* 使用说明样式 */
.usage-section {
  padding: 12px;
  background-color: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-top: 16px;
  font-size: 13px;
  color: #303133;
}

.usage-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #303133;
}

.usage-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.usage-list li {
  margin-bottom: 6px;
  color: #606266;
}

.usage-list li:last-child {
  margin-bottom: 0;
}

.usage-list code {
  background-color: #ecf5ff;
  color: #409eff;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.tree-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.tree-dialog-header span {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.close-button {
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.tree-dialog-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

/* 树形节点样式 */
.tree-node-content {
  width: 100%;
  display: block;
  padding: 4px 0;
}

.tree-node-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  line-height: 1.6;
}

.tree-node-label {
  font-weight: 500;
  color: #303133;
  cursor: pointer;
  white-space: nowrap;
}

.tree-node-explain {
  font-size: 12px;
  color: #67c23a;
  font-weight: normal;
  white-space: nowrap;
}

.tree-node-example {
  font-size: 11px;
  color: #909399;
  display: inline;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

/* 调整树形节点内容的间距 */
:deep(.el-tree-node__content) {
  padding: 2px 0;
}

/* 隐藏复选框 */
:deep(.el-tree-node__content .el-checkbox) {
  display: none;
}

/* 鼠标悬停效果 */
:deep(.el-tree-node__content:hover .tree-node-label) {
  color: #409eff;
}

/* 可复制节点的光标样式 */
:deep(.el-tree-node__content:hover) {
  cursor: pointer;
}

/* 不可复制节点的光标样式 */
:deep(.el-tree-node__content:hover) .tree-node-label {
  cursor: default;
}

:deep(.el-tree-node__content:hover) .tree-node-label:has(+ .tree-node-explain) {
  cursor: pointer;
}
</style>