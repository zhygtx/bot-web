<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Search } from '@element-plus/icons-vue'
import { useUserStore } from '../../stores/user'
import request from '../../utils/request'

// 获取用户状态管理
const userStore = useUserStore()

// 加载状态
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('编辑个人信息')

// 用户信息数据
const userInfo = ref({
  id: '',
  account: '',
  name: '',
  email: '',
  QQ: null,
  botQQ: null,
  userRole: '',
  createTime: '',
  updateTime: ''
})

// 表单数据
const profileForm = reactive({
  id: '',
  name: '',
  email: '',
  QQ: null
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  QQ: [
    { pattern: /^[0-9]+$/, message: 'QQ号必须是数字', trigger: 'blur' }
  ]
}

// 表单引用
const profileFormRef = ref(null)

// 获取用户信息
const getUserInfo = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/user/info',
      method: 'get'
    })
    userInfo.value = response.data
  } catch (error) {
    ElMessage.error(error.message || '获取用户信息失败')
  } finally {
    loading.value = false
  }
}

// 打开编辑个人信息对话框
const openEditDialog = () => {
  dialogTitle.value = '编辑个人信息'
  // 填充表单数据
  profileForm.id = userInfo.value.id
  profileForm.name = userInfo.value.name
  profileForm.email = userInfo.value.email
  profileForm.QQ = userInfo.value.QQ
  dialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  if (!profileFormRef.value) return
  
  const valid = await profileFormRef.value.validate()
  if (!valid) {
    return
  }
  
  try {
    await request({
      url: '/user/update',
      method: 'post',
      data: profileForm
    })
    
    ElMessage.success('更新个人信息成功')
    dialogVisible.value = false
    getUserInfo()
    
    // 更新用户状态管理中的信息
    userStore.updateUserInfo({
      name: profileForm.name
    })
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 组件挂载时获取用户信息
onMounted(() => {
  getUserInfo()
})
</script>

<template>
  <div class="profile-view">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>个人信息管理</h2>
          <el-button
            type="primary"
            @click="openEditDialog"
            :icon="Edit"
          >
            编辑信息
          </el-button>
        </div>
      </template>
      
      <!-- 个人信息展示 -->
      <el-descriptions
        v-loading="loading"
        :column="2"
        border
        class="profile-descriptions"
      >
        <el-descriptions-item label="账号" prop="account">{{ userInfo.account }}</el-descriptions-item>
        <el-descriptions-item label="用户名" prop="name">{{ userInfo.name }}</el-descriptions-item>
        <el-descriptions-item label="邮箱" prop="email">{{ userInfo.email }}</el-descriptions-item>
        <el-descriptions-item label="QQ号" prop="QQ">{{ userInfo.QQ }}</el-descriptions-item>
        <el-descriptions-item label="机器人QQ" prop="botQQ">{{ userInfo.botQQ || '未绑定' }}</el-descriptions-item>
        <el-descriptions-item label="用户角色" prop="userRole">{{ userInfo.userRole || '普通用户' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" prop="createTime">{{ userInfo.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间" prop="updateTime">{{ userInfo.updateTime }}</el-descriptions-item>
      </el-descriptions>
      
      <!-- 编辑个人信息表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="500px"
      >
        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="用户名" prop="name">
            <el-input v-model="profileForm.name" placeholder="请输入用户名"></el-input>
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="profileForm.email" placeholder="请输入邮箱"></el-input>
          </el-form-item>
          <el-form-item label="QQ号" prop="QQ">
            <el-input v-model="profileForm.QQ" placeholder="请输入QQ号"></el-input>
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
.profile-view {
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

.profile-descriptions {
  margin-top: 20px;
}
</style>
