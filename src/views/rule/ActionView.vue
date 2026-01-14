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
  isConcat: false,
  seq: 0
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

// 数据名称加载状态
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

// 获取动作列表
const getActions = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/api/action/list',
      method: 'get'
    })
    actions.value = response.data || []
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
  // 清空表单数据
  actionForm.id = ''
  actionForm.roleId = ''
  actionForm.needAt = false
  actionForm.actionType = 'text'
  actionForm.dataId = ''
  actionForm.isConcat = false
  actionForm.seq = 0
  // 获取最新的规则列表
  getRoles()
  dialogVisible.value = true
}

// 打开编辑动作对话框
const openEditDialog = (action) => {
  dialogTitle.value = '编辑动作'
  // 填充表单数据
  actionForm.id = action.id
  actionForm.roleId = action.roleId
  actionForm.needAt = action.needAt
  actionForm.actionType = action.actionType
  // 先设置动作类型，然后获取对应的数据名称列表
  getDataNames(action.actionType).then(() => {
    // 在数据名称列表加载完成后设置数据ID，确保选项存在
    actionForm.dataId = action.dataId
    actionForm.isConcat = action.isConcat
    actionForm.seq = action.seq
    // 获取最新的规则列表
    getRoles()
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
    getActions()
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

// 组件挂载时获取动作列表和规则列表
onMounted(() => {
  getActions()
  getRoles()
  // 初始化数据名称列表
  getDataNames(actionForm.actionType)
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
        <el-table-column prop="isConcat" label="拼接消息" min-width="100" align="center">
          <template #default="scope">
            <el-switch v-model="scope.row.isConcat" disabled></el-switch>
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
                <el-select v-model="actionForm.dataId" placeholder="请选择数据名称" :loading="dataNameLoading">
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
            <el-col :span="12">
              <el-form-item label="拼接消息">
                <el-switch v-model="actionForm.isConcat"></el-switch>
              </el-form-item>
            </el-col>
          </el-row>
          
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
