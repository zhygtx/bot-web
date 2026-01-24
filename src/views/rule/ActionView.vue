<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'

// 动作列表数据
const actions = ref([])

// 规则列表数据
const roles = ref([])

// 加载状态
const loading = ref(false)
const rolesLoading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加动作')

// 表单数据
const actionForm = reactive({
  id: '',
  roleId: '',
  needAt: false,
  actionType: 'text',
  dataId: '',
  seq: 0,
  receivers: []
})

// 表单验证规则
const rules = {
  roleId: [
    { required: true, message: '请选择关联规则', trigger: 'change' }
  ],
  actionType: [
    { required: true, message: '请选择动作类型', trigger: 'change' }
  ],
  dataId: [
    { required: true, message: '请选择数据名称', trigger: 'change' }
  ]
}

// 表单引用
const actionFormRef = ref(null)

// 动作类型选项
const actionTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: 'API', value: 'api' },
  { label: 'URL', value: 'url' },
  { label: '模板', value: 'template' }
]

// 数据名称选项
const dataNameOptions = ref([])

// 数据名称加载状态，改为对象形式，跟踪每种数据类型的加载状态
const dataNameLoading = ref({
  text: false,
  api: false,
  url: false,
  image: false,
  template: false
})

// 数据缓存，用于存储不同类型的数据列表
const dataCache = ref({
  text: [],
  api: [],
  url: [],
  image: [],
  template: []
})

// 数据名称缓存，用于快速查找数据名称
const dataNameCache = ref({
  text: {},
  api: {},
  url: {},
  image: {},
  template: {}
})

// 获取动作列表
const getActions = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/api/action/list',
      method: 'get'
    })
    actions.value = response.data || []
    
    // 获取动作列表后，确保所有类型的数据名称列表都已加载（缓存逻辑）
    // 这样在显示动作列表时，就能直接从缓存中获取数据名称，而不是显示ID
    Promise.all([
      getDataNames('text'),
      getDataNames('api'),
      getDataNames('url'),
      getDataNames('template')
    ])
  } catch (error) {
    ElMessage.error(error.message || '获取动作列表失败')
  } finally {
    loading.value = false
  }
}

// 获取规则列表
const getRoles = async () => {
  try {
    rolesLoading.value = true
    const response = await request({
      url: '/api/role/list',
      method: 'get'
    })
    roles.value = response.data || []
  } catch (error) {
    ElMessage.error(error.message || '获取规则列表失败')
  } finally {
    rolesLoading.value = false
  }
}

// 获取数据名称列表
const getDataNames = async (type) => {
  if (!type) return
  
  // 避免重复请求
  if (dataNameLoading.value[type]) return
  
  dataNameLoading.value[type] = true
  try {
    const response = await request({
      url: `/api/action-content/${type}/list`,
      method: 'get'
    })
    
    // 更新数据缓存和名称缓存
    dataCache.value[type] = response.data
    const nameCache = {}
    response.data.forEach(item => {
      nameCache[item.id] = item.name
    })
    dataNameCache.value[type] = nameCache
    
    // 只有当当前表单正在编辑或创建该类型时，才更新表单的选项
    if (actionForm.actionType === type) {
      dataNameOptions.value = response.data.map(item => ({
        label: item.name,
        value: item.id
      }))
    }
  } catch (error) {
    ElMessage.error(error.message || '获取数据名称列表失败')
    // 只有当当前表单正在编辑或创建该类型时，才清空表单的选项
    if (actionForm.actionType === type) {
      dataNameOptions.value = []
    }
    // 清空缓存，避免错误数据影响其他页面
    dataCache.value[type] = []
    dataNameCache.value[type] = {}
  } finally {
    dataNameLoading.value[type] = false
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
  
  // 如果都没有，触发数据加载，然后返回当前ID
  // 当数据加载完成后，组件会自动重新渲染，此时会返回正确的数据名称
  getDataNames(type)
  
  return dataId
}

// 搜索动作
const searchActions = () => {
  getActions()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  getActions()
}

// 打开添加动作对话框
const openAddDialog = () => {
  dialogTitle.value = '添加动作'
  // 重置表单
  if (actionFormRef.value) {
    actionFormRef.value.resetFields()
  }
  // 获取最新的规则列表
  getRoles()
  // 清空表单数据
  actionForm.id = ''
  actionForm.roleId = ''
  actionForm.needAt = false
  actionForm.actionType = 'text'
  actionForm.dataId = ''
  actionForm.seq = 0
  // 初始添加一个默认接收者
  actionForm.receivers = [{ receiverType: 'Default', receiverGroupQQ: null, receiverUserQQ: null }]
  // 获取默认类型（text）的数据名称列表
  getDataNames('text')
  dialogVisible.value = true
}

// 打开编辑动作对话框
const openEditDialog = (action) => {
  dialogTitle.value = '编辑动作'
  // 获取最新的规则列表
  getRoles()
  // 填充表单数据
  actionForm.id = action.id
  actionForm.roleId = action.roleId
  actionForm.needAt = action.needAt
  actionForm.actionType = action.actionType
  actionForm.seq = action.seq
  // 处理receivers数组，确保数据结构正确
  actionForm.receivers = (action.receivers || []).map(receiver => ({
    receiverType: receiver.receiverType,
    receiverGroupQQ: receiver.receiverGroupQQ || null,
    receiverUserQQ: receiver.receiverUserQQ || null
  }))
  // 获取最新的数据列表（刷新缓存）
  getDataNames(action.actionType).then(() => {
    // 在数据名称列表加载完成后设置数据ID，确保选项存在
    actionForm.dataId = action.dataId
    dialogVisible.value = true
  })
}

// 删除动作
const deleteAction = async (action) => {
  try {
    await ElMessageBox.confirm('确定要删除该动作吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: `/api/action/delete/${action.id}`,
      method: 'get'
    })
    
    ElMessage.success('删除动作成功')
    // 重新获取动作列表，确保数据一致性
    getActions()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除动作失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!actionFormRef.value) return
  
  // 处理接收者逻辑
  // 确保至少有一个接收者
  if (!actionForm.receivers || actionForm.receivers.length === 0) {
    actionForm.receivers = [{ receiverType: 'Default', receiverGroupQQ: null, receiverUserQQ: null }]
  }
  
  // 验证接收者
  for (let i = 0; i < actionForm.receivers.length; i++) {
    const receiver = actionForm.receivers[i]
    
    // 私聊类型：用户QQ必填
    if (receiver.receiverType === 'Private') {
      if (!receiver.receiverUserQQ || receiver.receiverUserQQ === '') {
        ElMessage.error(`第${i+1}个接收者：私聊类型的用户QQ不能为空`)
        return
      }
    }
    
    // 群聊类型：群号必填
    if (receiver.receiverType === 'Group') {
      if (!receiver.receiverGroupQQ || receiver.receiverGroupQQ === '') {
        ElMessage.error(`第${i+1}个接收者：群聊类型的群号不能为空`)
        return
      }
      
      // 如果仅有一个群聊而且勾选了@用户的话，两个输入框都必填
      if (actionForm.receivers.length === 1 && actionForm.needAt) {
        if (!receiver.receiverUserQQ || receiver.receiverUserQQ === '') {
          ElMessage.error(`当只有一个群聊接收者且勾选了@用户时，用户QQ不能为空`)
          return
        }
      }
    }
  }
  
  // 处理默认类型
  if (actionForm.receivers.length === 1) {
    const receiver = actionForm.receivers[0]
    // 如果接收者类型不是Default，且没有填写任何QQ，则自动转换为Default
    if (receiver.receiverType !== 'Default') {
      let hasQQ = false
      if (receiver.receiverType === 'Private') {
        hasQQ = !!receiver.receiverUserQQ
      } else if (receiver.receiverType === 'Group') {
        hasQQ = !!receiver.receiverGroupQQ
      }
      if (!hasQQ) {
        receiver.receiverType = 'Default'
        receiver.receiverGroupQQ = null
        receiver.receiverUserQQ = null
      }
    }
  }
  
  await actionFormRef.value.validate()
  
  try {
    let response
    if (actionForm.id) {
      // 编辑动作
      response = await request({
        url: `/api/action/update/${actionForm.id}`,
        method: 'post',
        data: actionForm
      })
    } else {
      // 添加动作
      response = await request({
        url: '/api/action/add',
        method: 'post',
        data: actionForm
      })
    }
    
    ElMessage.success(response.message || (actionForm.id ? '编辑动作成功' : '添加动作成功'))
    dialogVisible.value = false
    // 重新获取动作列表，确保数据一致性
    getActions()
    // 清空当前类型的数据缓存，确保下次获取时是最新数据
    dataCache.value[actionForm.actionType] = []
    dataNameCache.value[actionForm.actionType] = {}
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 监听动作类型变化
watch(() => actionForm.actionType, (newType) => {
  getDataNames(newType)
  // 清空数据ID，防止类型不匹配
  actionForm.dataId = ''
})

// 提供一个方法来处理接收者类型变化
const handleReceiverTypeChange = (receiver) => {
  // 类型变化时清空相关字段
  if (receiver.receiverType === 'Private') {
    // 私聊类型：清空群号，保留用户QQ
    receiver.receiverGroupQQ = null
  } else if (receiver.receiverType === 'Group') {
    // 群聊类型：无需特殊处理，允许填写群号和用户QQ
  } else if (receiver.receiverType === 'Default') {
    // 默认类型：清空所有QQ字段
    receiver.receiverGroupQQ = null
    receiver.receiverUserQQ = null
  }
}

// 组件挂载时获取动作列表和规则列表
onMounted(() => {
  getActions()
  getRoles()
  // 初始化加载所有类型的数据名称列表，确保动作管理页面能正确显示所有类型的数据名称
  // 包括API类型，这是缓存逻辑的重要部分
  Promise.all([
    getDataNames('text'),
    getDataNames('api'),
    getDataNames('url'),
    getDataNames('template')
  ])
})
</script>

<template>
  <div class="action-view">
    <el-card class="action-card">
      <template #header>
        <div class="card-header">
          <h2>动作管理</h2>
          <el-button
            type="primary"
            @click="openAddDialog"
            :icon="Plus"
          >
            添加动作
          </el-button>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="动作关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入动作关键词"
            clearable
            @keyup.enter="searchActions"
          >
            <template #append>
              <el-button @click="searchActions" :icon="Search"></el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 动作列表 -->
      <el-table
          v-loading="loading"
          :data="actions"
          style="width: 100%"
          border
        >
          <el-table-column label="规则名称" min-width="150">
            <template #default="scope">
              {{ roles.find(r => r.id === scope.row.roleId)?.name || scope.row.roleId }}
            </template>
          </el-table-column>
        <el-table-column prop="actionType" label="动作类型" width="120" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.actionType === 'text' ? 'success' : scope.row.actionType === 'api' ? 'primary' : scope.row.actionType === 'url' ? 'warning' : scope.row.actionType === 'image' ? 'info' : 'danger'">
              {{ scope.row.actionType === 'text' ? '文本' : scope.row.actionType === 'image' ? '图片' : scope.row.actionType === 'api' ? 'API' : scope.row.actionType === 'url' ? 'URL' : '模板' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dataId" label="数据名称" min-width="150">
          <template #default="scope">
            {{ getDataNameById(scope.row.dataId, scope.row.actionType) }}
          </template>
        </el-table-column>
        <el-table-column prop="needAt" label="需要@" min-width="100" align="center">
          <template #default="scope">
            <el-switch v-model="scope.row.needAt" disabled></el-switch>
          </template>
        </el-table-column>
        <el-table-column prop="seq" label="优先级" min-width="100" align="center"></el-table-column>
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
                @click="deleteAction(scope.row)"
                :icon="Delete"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 动作表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
      >
        <el-form
          ref="actionFormRef"
          :model="actionForm"
          :rules="rules"
          label-width="120px"
        >
          <el-form-item label="关联规则" prop="roleId">
            <el-select v-model="actionForm.roleId" placeholder="请选择关联规则" :loading="rolesLoading">
              <el-option
                v-for="role in roles"
                :key="role.id"
                :label="role.name"
                :value="role.id"
              ></el-option>
            </el-select>
          </el-form-item>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="动作类型" prop="actionType">
                <el-select v-model="actionForm.actionType" placeholder="请选择动作类型">
                  <el-option
                    v-for="option in actionTypeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据名称" prop="dataId">
                <el-select v-model="actionForm.dataId" placeholder="请选择数据名称" :loading="dataNameLoading[actionForm.actionType]">
                  <el-option
                    v-for="option in dataNameOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="需要@触发用户">
                <el-switch v-model="actionForm.needAt"></el-switch>
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 消息接收者 -->
          <el-form-item label="消息接收者">
            <!-- 接收者表单容器 -->
            <div style="margin-bottom: 5px;">
              <div v-for="(receiver, index) in actionForm.receivers" :key="index" class="receiver-item" style="margin-bottom: 15px;">
                <!-- 第一行：下拉框和删除按钮 -->
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <el-select 
                    v-model="receiver.receiverType" 
                    placeholder="请选择接收者类型" 
                    style="width: 200px; margin-right: 10px;"
                    @change="handleReceiverTypeChange(receiver)">
                    <!-- 如果当前接收者是默认类型，或者没有其他默认类型接收者，则显示默认选项 -->
                    <el-option 
                      label="默认" 
                      value="Default" 
                      v-if="receiver.receiverType === 'Default' || !actionForm.receivers.some((r, i) => r.receiverType === 'Default' && i !== index)"></el-option>
                    <el-option label="私聊" value="Private"></el-option>
                    <el-option label="群聊" value="Group"></el-option>
                  </el-select>
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="actionForm.receivers.splice(index, 1)"
                    v-if="actionForm.receivers.length > 1">
                    删除
                  </el-button>
                </div>
                
                <!-- 私聊类型：只显示用户QQ输入框，单独一行 -->
                <template v-if="receiver.receiverType === 'Private'">
                  <div style="margin-left: 0;">
                    <el-input 
                      v-model="receiver.receiverUserQQ" 
                      placeholder="请输入用户QQ" 
                      type="text" 
                      style="width: 300px;"
                      required>
                    </el-input>
                  </div>
                </template>
                
                <!-- 群聊类型：显示群号和用户QQ输入框，同一行 -->
                <template v-if="receiver.receiverType === 'Group'">
                  <div>
                    <el-input 
                      v-model="receiver.receiverGroupQQ" 
                      placeholder="请输入群号" 
                      type="text" 
                      style="width: 145px; margin-right: 10px;" 
                      required>
                    </el-input>
                    <el-input 
                      v-model="receiver.receiverUserQQ" 
                      placeholder="请输入用户QQ（选填）" 
                      type="text" 
                      style="width: 145px;">
                    </el-input>
                  </div>
                </template>
              </div>
            </div>
          </el-form-item>
          
          <!-- 添加接收者按钮 -->
          <div style="margin-left: 120px; margin-bottom: 20px; margin-top: -20px;">
            <el-button 
              type="primary" 
              size="small" 
              @click="() => {
                // 检查是否已经存在默认类型的接收者
                const hasDefault = actionForm.receivers.some(r => r.receiverType === 'Default')
                // 如果已经存在默认类型，则新增的接收者为群聊类型，否则为默认类型
                actionForm.receivers.push({
                  receiverType: hasDefault ? 'Group' : 'Default',
                  receiverGroupQQ: null,
                  receiverUserQQ: null
                })
              }">
              添加接收者
            </el-button>
          </div>
          
          <el-form-item label="执行优先级">
            <el-input-number v-model="actionForm.seq" placeholder="请输入执行优先级" :min="0" :precision="0"></el-input-number>
            <div class="info-tip">优先级越小，执行顺序越靠前</div>
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
.action-view {
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

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.action-buttons .el-button {
  flex: 1;
  max-width: 80px;
}
</style>
