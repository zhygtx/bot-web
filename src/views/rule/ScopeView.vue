<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { useUserStore } from '../../stores/user'

// 作用域列表数据
const scopes = ref([])

// 加载状态
const loading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加作用域')

// 用户信息全局存储
const userStore = useUserStore()

// 表单数据
const scopeForm = reactive({
  id: '',
  name: '',
  isAt: true,
  QQUserRole: 'all',
  QQBotRole: 'all',
  QQScopeType: 'all',
  QQScopeId: null
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入作用域名称', trigger: 'blur' },
    { min: 2, max: 20, message: '作用域名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  QQScopeType: [
    { required: true, message: '请选择作用域类型', trigger: 'change' }
  ],
  QQUserRole: [
    { required: true, message: '请选择用户权限', trigger: 'change' }
  ],
  QQBotRole: [
    { required: true, message: '请选择Bot权限', trigger: 'change' }
  ]
}

// 表单引用
const scopeFormRef = ref(null)

// 选项数据
const scopeTypes = [
  { label: '全部', value: 'all' },
  { label: '群聊', value: 'groupMsg' },
  { label: '私聊', value: 'privateMsg' }
]

// 监听作用域类型变化
watch(() => scopeForm.QQScopeType, (newVal) => {
  console.log('QQScopeType变化:', newVal);
  // 当作用域类型为私聊时，自动设置isAt为false
  if (newVal === 'privateMsg') {
    scopeForm.isAt = false;
  }
})

const roleOptions = [
  { label: '全部', value: 'all' },
  { label: '群主', value: 'owner' },
  { label: '管理员', value: 'admin' },
  { label: '成员', value: 'member' }
]

// 获取作用域列表
const getScopes = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/api/scope/list',
      method: 'get'
    })
    scopes.value = response.data || []
  } catch (error) {
    ElMessage.error(error.message || '获取作用域列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索作用域
const searchScopes = () => {
  getScopes()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  getScopes()
}

// 打开添加作用域对话框
const openAddDialog = () => {
  dialogTitle.value = '添加作用域'
  // 清空表单数据
  scopeForm.id = ''
  scopeForm.name = ''
  scopeForm.isAt = true
  scopeForm.QQUserRole = 'all'
  scopeForm.QQBotRole = 'all'
  scopeForm.QQScopeType = 'all'
  scopeForm.QQScopeId = null
  dialogVisible.value = true
}

// 打开编辑作用域对话框
const openEditDialog = (scope) => {
  dialogTitle.value = '编辑作用域'
  // 填充表单数据，同时处理大小写字段名，兼容后端返回的数据格式
  scopeForm.id = scope.id || scope.id
  scopeForm.name = scope.name || scope.name
  scopeForm.isAt = scope.isAt || scope.isAt
  scopeForm.QQUserRole = scope.QQUserRole || scope.qqUserRole || 'all'
  scopeForm.QQBotRole = scope.QQBotRole || scope.qqBotRole || 'all'
  scopeForm.QQScopeType = scope.QQScopeType || scope.qqScopeType || 'all'
  scopeForm.QQScopeId = scope.QQScopeId || scope.qqScopeId || null
  dialogVisible.value = true
}

// 删除作用域
const deleteScope = async (scope) => {
  try {
    await ElMessageBox.confirm('确定要删除该作用域吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: `/api/scope/delete/${scope.id}`,
      method: 'get'
    })
    
    ElMessage.success('删除作用域成功')
    getScopes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除作用域失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!scopeFormRef.value) return
  
  console.log('提交前的表单数据:', scopeForm);
  console.log('QQScopeType的值:', scopeForm.QQScopeType);
  console.log('QQScopeType的类型:', typeof scopeForm.QQScopeType);
  
  await scopeFormRef.value.validate()
  
  try {
    // 直接使用scopeForm，确保所有字段都被正确发送
    console.log('实际提交的数据:', scopeForm);
    
    // 构建最终提交数据，确保所有字段名称与后端实体类完全匹配
    const finalData = {
      name: scopeForm.name,
      isAt: scopeForm.isAt,
      // 将字段名称改为小写，与后端实体类字段名称匹配
      qqUserRole: String(scopeForm.QQUserRole || 'all'),
      qqBotRole: String(scopeForm.QQBotRole || 'all'),
      qqScopeType: String(scopeForm.QQScopeType || 'all'),
      // 转换QQScopeId为数字类型，如果为空则为null
      qqScopeId: scopeForm.QQScopeId ? Number(scopeForm.QQScopeId) : null
    };
    
    // 如果是编辑模式，添加id字段
    if (scopeForm.id) {
      finalData.id = scopeForm.id;
    }
    
    console.log('最终提交的数据:', JSON.stringify(finalData, null, 2));
    
    let response
    if (scopeForm.id) {
      // 编辑作用域
      response = await request({
        url: `/api/scope/update/${scopeForm.id}`,
        method: 'post',
        data: finalData
      })
    } else {
      // 添加作用域
      response = await request({
        url: '/api/scope/add',
        method: 'post',
        data: finalData
      })
    }
    
    ElMessage.success(response.message || (scopeForm.id ? '编辑作用域成功' : '添加作用域成功'))
    dialogVisible.value = false
    getScopes()
  } catch (error) {
    console.error('提交失败:', error);
    ElMessage.error(error.message || '操作失败')
  }
}

// 获取用户的botQQ信息
const getUserBotQQ = async () => {
  try {
    const response = await request({
      url: `/api/user/${userStore.userId}`,
      method: 'get'
    })
    return response.data.botQQ
  } catch (error) {
    console.error('获取用户botQQ失败:', error)
    return null
  }
}

// 组件挂载时获取作用域列表
onMounted(() => {
  getScopes()
})
</script>

<template>
  <div class="scope-view">
    <el-card class="scope-card">
      <template #header>
        <div class="card-header">
          <h2>作用域管理</h2>
          <el-button
            type="primary"
            @click="openAddDialog"
            :icon="Plus"
          >
            添加作用域
          </el-button>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="作用域名称">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入作用域名称"
            clearable
            @keyup.enter="searchScopes"
          >
            <template #append>
              <el-button @click="searchScopes" :icon="Search"></el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 作用域列表 -->
      <el-table
          v-loading="loading"
          :data="scopes"
          style="width: 100%"
          border
        >
          <el-table-column prop="name" label="作用域名称" min-width="150"></el-table-column>
          <el-table-column label="作用域类型" min-width="120" align="center">
            <template #default="scope">
              {{ (scope.row.QQScopeType || scope.row.qqScopeType) === 'all' ? '全部' : (scope.row.QQScopeType || scope.row.qqScopeType) === 'groupMsg' ? '群聊' : '私聊' }}
            </template>
          </el-table-column>
          <el-table-column label="需要@" min-width="100" align="center">
            <template #default="scope">
              <el-switch :model-value="scope.row.isAt || scope.row.isAt" disabled></el-switch>
            </template>
          </el-table-column>
          <el-table-column label="作用对象ID" min-width="120" align="center">
            <template #default="scope">
              {{ scope.row.QQScopeId || scope.row.qqScopeId || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
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
                  @click="deleteScope(scope.row)"
                  :icon="Delete"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      
      <!-- 作用域表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="600px"
        @close="() => {
          if (scopeFormRef.value) {
            scopeFormRef.value.resetFields()
          }
        }"
      >
        <el-form
          ref="scopeFormRef"
          :model="scopeForm"
          :rules="rules"
          label-width="120px"
        >
          <el-form-item label="作用域名称" prop="name">
            <el-input v-model="scopeForm.name" placeholder="请输入作用域名称"></el-input>
          </el-form-item>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="作用域类型" prop="QQScopeType">
                <el-select v-model="scopeForm.QQScopeType" placeholder="请选择作用域类型">
                  <el-option
                    v-for="item in scopeTypes"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="scopeForm.QQScopeType !== 'privateMsg'">
              <el-form-item label="需要@才可触发">
                <el-switch v-model="scopeForm.isAt"></el-switch>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20" v-if="scopeForm.QQScopeType !== 'all'">
            <el-col :span="12">
              <el-form-item label="作用对象ID">
                <el-input v-model="scopeForm.QQScopeId" placeholder="请输入作用对象ID"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="用户权限" prop="QQUserRole">
                <el-select v-model="scopeForm.QQUserRole" placeholder="请选择用户权限">
                  <el-option
                    v-for="item in roleOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Bot权限" prop="QQBotRole">
                <el-select v-model="scopeForm.QQBotRole" placeholder="请选择Bot权限">
                  <el-option
                    v-for="item in roleOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
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
.scope-view {
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
</style>
