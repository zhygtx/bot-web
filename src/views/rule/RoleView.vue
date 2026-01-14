<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'

// 规则列表数据
const roles = ref([])

// 作用域列表数据
const scopes = ref([])

// 加载状态
const loading = ref(false)
const scopesLoading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加规则')

// 表单数据
const roleForm = reactive({
  id: '',
  name: '',
  scopeId: '',
  matchMode: 'text',
  regex: '',
  isEnable: false,
  isExtract: false,
  extractPosition: []
})

// 添加提取位置
const addExtractPosition = () => {
  roleForm.extractPosition.push(0)
}

// 删除提取位置
const removeExtractPosition = (index) => {
  roleForm.extractPosition.splice(index, 1)
}

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' },
    { min: 2, max: 20, message: '规则名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  scopeId: [
    { required: true, message: '请选择作用域', trigger: 'change' }
  ],
  regex: [
    { required: true, message: '请输入正则表达式', trigger: 'blur' }
  ]
}

// 表单引用
const roleFormRef = ref(null)

// 选项数据
const matchModes = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' }
]

// 获取规则列表
const getRoles = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/api/role/list',
      method: 'get'
    })
    roles.value = response.data || []
  } catch (error) {
    ElMessage.error(error.message || '获取规则列表失败')
  } finally {
    loading.value = false
  }
}

// 获取作用域列表
const getScopes = async () => {
  try {
    scopesLoading.value = true
    const response = await request({
      url: '/api/scope/list',
      method: 'get'
    })
    scopes.value = response.data || []
  } catch (error) {
    ElMessage.error(error.message || '获取作用域列表失败')
  } finally {
    scopesLoading.value = false
  }
}

// 搜索规则
const searchRoles = () => {
  getRoles()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  getRoles()
}

// 打开添加规则对话框
const openAddDialog = () => {
  dialogTitle.value = '添加规则'
  // 重置表单
  if (roleFormRef.value) {
    roleFormRef.value.resetFields()
  }
  // 清空表单数据
  roleForm.id = ''
  roleForm.name = ''
  roleForm.scopeId = ''
  roleForm.matchMode = 'text'
  roleForm.regex = ''
  roleForm.isEnable = false
  roleForm.isExtract = false
  roleForm.extractPosition = []
  // 获取最新的作用域列表
  getScopes()
  dialogVisible.value = true
}

// 打开编辑规则对话框
const openEditDialog = (role) => {
  dialogTitle.value = '编辑规则'
  // 填充表单数据
  roleForm.id = role.id
  roleForm.name = role.name
  roleForm.scopeId = role.scopeId
  roleForm.matchMode = role.matchMode
  roleForm.regex = role.regex
  roleForm.isEnable = role.isEnable
  roleForm.isExtract = role.isExtract
  roleForm.extractPosition = role.extractPosition || []
  // 获取最新的作用域列表
  getScopes()
  dialogVisible.value = true
}

// 删除规则
const deleteRole = async (role) => {
  try {
    await ElMessageBox.confirm('确定要删除该规则吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: `/api/role/delete/${role.id}`,
      method: 'get'
    })
    
    ElMessage.success('删除规则成功')
    getRoles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除规则失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!roleFormRef.value) return
  
  await roleFormRef.value.validate()
  
  try {
    // 检查提取位置：若提取位置为true但具体位置数量为0时将其改为false
    if (roleForm.isExtract && (!roleForm.extractPosition || roleForm.extractPosition.length === 0)) {
      roleForm.isExtract = false
    }
    
    let response
    if (roleForm.id) {
      // 编辑规则
      response = await request({
        url: `/api/role/update/${roleForm.id}`,
        method: 'post',
        data: roleForm
      })
    } else {
      // 添加规则
      response = await request({
        url: '/api/role/add',
        method: 'post',
        data: roleForm
      })
    }
    
    ElMessage.success(response.message || (roleForm.id ? '编辑规则成功' : '添加规则成功'))
    dialogVisible.value = false
    getRoles()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}



// 组件挂载时获取规则列表和作用域列表
onMounted(() => {
  getRoles()
  getScopes()
})
</script>

<template>
  <div class="role-view">
    <el-card class="role-card">
      <template #header>
        <div class="card-header">
          <h2>规则管理</h2>
          <el-button
            type="primary"
            @click="openAddDialog"
            :icon="Plus"
          >
            添加规则
          </el-button>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="规则关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入规则关键词"
            clearable
            @keyup.enter="searchRoles"
          >
            <template #append>
              <el-button @click="searchRoles" :icon="Search"></el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 规则列表 -->
      <el-table
          v-loading="loading"
          :data="roles"
          style="width: 100%"
          border
        >
          <el-table-column prop="name" label="规则名称" min-width="150"></el-table-column>
          <el-table-column label="作用域名称" min-width="150">
            <template #default="scope">
              {{ scopes.find(s => s.id === scope.row.scopeId)?.name || scope.row.scopeId }}
            </template>
          </el-table-column>
          <el-table-column prop="matchMode" label="匹配模式" min-width="100" align="center">
            <template #default="scope">
              {{ scope.row.matchMode === 'text' ? '文本' : '图片' }}
            </template>
          </el-table-column>
          <el-table-column prop="regex" label="正则表达式" min-width="200"></el-table-column>
          <el-table-column prop="isEnable" label="是否启用" min-width="100" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.isEnable" disabled></el-switch>
            </template>
          </el-table-column>
          <el-table-column label="提取位置" min-width="200" align="center">
            <template #default="scope">
              <div v-if="scope.row.isExtract && scope.row.extractPosition && scope.row.extractPosition.length > 0">
                <div v-for="(pos, index) in scope.row.extractPosition" :key="index">
                  {{ pos }}
                  <span v-if="index < scope.row.extractPosition.length - 1">, </span>
                </div>
              </div>
              <div v-else>
                No Data
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center">
            <template #default="scope">
              <div style="display: flex; justify-content: center; gap: 8px;">
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
                  @click="deleteRole(scope.row)"
                  :icon="Delete"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      
      <!-- 规则表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
      >
        <el-form
          ref="roleFormRef"
          :model="roleForm"
          :rules="rules"
          label-width="120px"
        >
          <el-form-item label="规则名称" prop="name">
            <el-input v-model="roleForm.name" placeholder="请输入规则名称"></el-input>
          </el-form-item>
          
          <el-form-item label="关联作用域" prop="scopeId">
            <el-select v-model="roleForm.scopeId" placeholder="请选择作用域" :loading="scopesLoading">
              <el-option
                v-for="scope in scopes"
                :key="scope.id"
                :label="scope.name"
                :value="scope.id"
              ></el-option>
            </el-select>
          </el-form-item>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="匹配模式">
                <el-select v-model="roleForm.matchMode" placeholder="请选择匹配模式">
                  <el-option
                    v-for="item in matchModes"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="是否启用">
                <el-switch v-model="roleForm.isEnable"></el-switch>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="正则表达式" prop="regex">
            <el-input
              v-model="roleForm.regex"
              placeholder="请输入正则表达式"
              type="textarea"
              :rows="3"
            >
              <template #append>
                <div class="regex-tip">提取位置按组进行提取</div>
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="提取位置">
            <el-switch v-model="roleForm.isExtract"></el-switch>
          </el-form-item>
          
          <el-form-item label="提取位置列表" v-if="roleForm.isExtract">
            <div class="extract-positions">
              <div v-for="(position, index) in roleForm.extractPosition" :key="index" class="extract-position-item">
                <el-row :gutter="10" style="margin-bottom: 10px;">
                  <el-col :span="20">
                    <el-input-number v-model="roleForm.extractPosition[index]" placeholder="组号" :min="0"></el-input-number>
                  </el-col>
                  <el-col :span="4">
                    <el-button
                      type="danger"
                      size="small"
                      @click="removeExtractPosition(index)"
                    >
                      删除
                    </el-button>
                  </el-col>
                </el-row>
              </div>
              <el-button
                type="primary"
                size="small"
                @click="addExtractPosition"
                style="margin-top: 10px;"
              >
                添加提取位置
              </el-button>
            </div>
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
.role-view {
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

.regex-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  text-align: right;
}
</style>
