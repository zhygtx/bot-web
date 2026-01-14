<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue'
import request from '../../utils/request'

// 提取位置列表数据
const extractPositions = ref([])

// 加载状态
const loading = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加提取位置')

// 表单数据
const extractPositionForm = reactive({
  id: '',
  name: '',
  description: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入提取位置名称', trigger: 'blur' },
    { min: 2, max: 20, message: '提取位置名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 100, message: '提取位置描述长度不能超过 100 个字符', trigger: 'blur' }
  ]
}

// 表单引用
const extractPositionFormRef = ref(null)

// 获取提取位置列表
const getExtractPositions = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/task/extractPosition/getExtractPositions',
      method: 'get',
      params: {
        page: pagination.currentPage,
        size: pagination.pageSize,
        keyword: searchKeyword.value
      }
    })
    extractPositions.value = response.data.list
    pagination.total = response.data.total
  } catch (error) {
    ElMessage.error(error.message || '获取提取位置列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索提取位置
const searchExtractPositions = () => {
  pagination.currentPage = 1
  getExtractPositions()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  pagination.currentPage = 1
  getExtractPositions()
}

// 分页变化
const handlePageChange = (page) => {
  pagination.currentPage = page
  getExtractPositions()
}

// 分页大小变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  getExtractPositions()
}

// 打开添加提取位置对话框
const openAddDialog = () => {
  dialogTitle.value = '添加提取位置'
  // 重置表单
  if (extractPositionFormRef.value) {
    extractPositionFormRef.value.resetFields()
  }
  // 清空表单数据
  extractPositionForm.id = ''
  extractPositionForm.name = ''
  extractPositionForm.description = ''
  dialogVisible.value = true
}

// 打开编辑提取位置对话框
const openEditDialog = (extractPosition) => {
  dialogTitle.value = '编辑提取位置'
  // 填充表单数据
  extractPositionForm.id = extractPosition.id
  extractPositionForm.name = extractPosition.name
  extractPositionForm.description = extractPosition.description
  dialogVisible.value = true
}

// 删除提取位置
const deleteExtractPosition = async (extractPosition) => {
  try {
    await ElMessageBox.confirm('确定要删除该提取位置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: '/task/extractPosition/deleteExtractPosition',
      method: 'post',
      params: {
        id: extractPosition.id
      }
    })
    
    ElMessage.success('删除提取位置成功')
    getExtractPositions()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除提取位置失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!extractPositionFormRef.value) return
  
  await extractPositionFormRef.value.validate((valid) => {
    if (!valid) {
      return false
    }
  })
  
  try {
    if (extractPositionForm.id) {
      // 编辑提取位置
      await request({
        url: '/task/extractPosition/updateExtractPosition',
        method: 'post',
        data: extractPositionForm
      })
      ElMessage.success('编辑提取位置成功')
    } else {
      // 添加提取位置
      await request({
        url: '/task/extractPosition/insertExtractPosition',
        method: 'post',
        data: extractPositionForm
      })
      ElMessage.success('添加提取位置成功')
    }
    
    dialogVisible.value = false
    getExtractPositions()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 组件挂载时获取提取位置列表
onMounted(() => {
  getExtractPositions()
})
</script>

<template>
  <div class="extract-position-view">
    <el-card class="extract-position-card">
      <template #header>
        <div class="card-header">
          <h2>提取位置管理</h2>
          <el-button
            type="primary"
            @click="openAddDialog"
            :icon="Plus"
          >
            添加提取位置
          </el-button>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="提取位置名称">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入提取位置名称"
            clearable
            @keyup.enter="searchExtractPositions"
          >
            <template #append>
              <el-button @click="searchExtractPositions" :icon="Search"></el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 提取位置列表 -->
      <el-table
        v-loading="loading"
        :data="extractPositions"
        style="width: 100%"
        border
      >
        <el-table-column prop="id" label="ID" width="80" align="center"></el-table-column>
        <el-table-column prop="name" label="提取位置名称" min-width="150"></el-table-column>
        <el-table-column prop="description" label="提取位置描述" min-width="200"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="180" align="center"></el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="180" align="center"></el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="openEditDialog(scope.row)"
              :icon="Edit"
              style="margin-right: 8px"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteExtractPosition(scope.row)"
              :icon="Delete"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        ></el-pagination>
      </div>
      
      <!-- 提取位置表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="500px"
      >
        <el-form
          ref="extractPositionFormRef"
          :model="extractPositionForm"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="提取位置名称" prop="name">
            <el-input v-model="extractPositionForm.name" placeholder="请输入提取位置名称"></el-input>
          </el-form-item>
          <el-form-item label="提取位置描述" prop="description">
            <el-input
              v-model="extractPositionForm.description"
              placeholder="请输入提取位置描述"
              type="textarea"
              :rows="3"
            ></el-input>
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
.extract-position-view {
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
