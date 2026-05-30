<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import request from '../../utils/request'

// 机器人信息数据
const botInfo = ref({
  id: '',
  name: '',
  botQQ: null,
  userId: '',
  // 兼容后端返回的online字段名
  online: false,
  isOnline: false
})

// 加载状态
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('编辑机器人信息')

// 表单数据
const botInfoForm = reactive({
  name: '',
  botQQ: null
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入机器人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '机器人名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  botQQ: [
    { required: true, message: '请输入机器人QQ', trigger: 'blur' },
    { pattern: /^[0-9]+$/, message: '机器人QQ必须是数字', trigger: 'blur' }
  ]
}

// 表单引用
const botInfoFormRef = ref(null)

// 获取机器人信息
const getBotInfo = async () => {
  try {
    loading.value = true
    const response = await request({
      url: '/bot/info',
      method: 'get'
    })
    const data = response.data || {}
    // 处理字段名不匹配问题，将后端返回的online字段值赋给isOnline字段
    botInfo.value = {
      ...data,
      // 兼容后端返回的online字段名，同时支持isOnline字段
      isOnline: data.online || data.isOnline || false,
      online: data.online || data.isOnline || false
    }
  } catch (error) {
    console.error('获取机器人信息失败:', error)
    // 如果获取失败，可能是用户还没有绑定机器人，不显示错误提示
    botInfo.value = {}
  } finally {
    loading.value = false
  }
}

// 打开机器人信息对话框
const openBotDialog = () => {
  if (botInfo.value.id) {
    // 如果机器人已存在，显示编辑对话框
    dialogTitle.value = '编辑机器人信息'
    // 填充表单数据
    botInfoForm.name = botInfo.value.name
    botInfoForm.botQQ = botInfo.value.botQQ
  } else {
    // 如果机器人不存在，显示添加对话框
    dialogTitle.value = '添加机器人信息'
    // 清空表单数据
    botInfoForm.name = ''
    botInfoForm.botQQ = null
  }
  dialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
  if (!botInfoFormRef.value) return
  
  const valid = await botInfoFormRef.value.validate()
  if (!valid) {
    return
  }
  
  try {
    let url = ''
    if (botInfo.value.id) {
      // 更新机器人信息
      url = '/bot/update'
    } else {
      // 添加机器人信息
      url = '/bot/insert'
    }
    
    await request({
      url: url,
      method: 'get',
      params: {
        name: botInfoForm.name,
        botQQ: botInfoForm.botQQ
      }
    })
    
    ElMessage.success(botInfo.value.id ? '更新机器人信息成功' : '添加机器人信息成功')
    dialogVisible.value = false
    getBotInfo()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 删除机器人
const deleteBot = async () => {
  try {
    await request({
      url: '/bot/delete',
      method: 'get'
    })
    
    localStorage.removeItem('botQQ')
    ElMessage.success('删除机器人信息成功')
    getBotInfo()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 组件挂载时获取机器人信息
onMounted(() => {
  getBotInfo()
})
</script>

<template>
  <div class="bot-info-view">
    <el-card class="bot-info-card">
      <template #header>
        <div class="card-header">
          <h2>机器人信息管理</h2>
          <div class="card-actions">
            <el-button
              v-if="botInfo.id"
              type="primary"
              @click="openBotDialog"
              :icon="Edit"
            >
              编辑信息
            </el-button>
            <el-button
              v-else
              type="primary"
              @click="openBotDialog"
              :icon="Plus"
            >
              添加机器人
            </el-button>
            <el-button
              v-if="botInfo.id"
              type="danger"
              @click="deleteBot"
              :icon="Delete"
            >
              删除机器人
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 机器人信息展示 -->
      <el-descriptions
        v-loading="loading"
        :column="2"
        border
        class="bot-info-descriptions"
      >
        <template v-if="botInfo.id">
          <el-descriptions-item label="机器人ID" prop="id">{{ botInfo.id }}</el-descriptions-item>
          <el-descriptions-item label="机器人名称" prop="name">{{ botInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="机器人QQ" prop="botQQ">{{ botInfo.botQQ }}</el-descriptions-item>
          <el-descriptions-item label="机器人状态" prop="isOnline">
            <el-tag :type="botInfo.isOnline ? 'success' : 'danger'">
              {{ botInfo.isOnline ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属用户ID" prop="userId" :span="2">{{ botInfo.userId }}</el-descriptions-item>
        </template>
        <template v-else>
          <el-descriptions-item label="提示" :span="2">
            <el-empty description="暂无机器人信息，请点击添加机器人按钮进行添加"></el-empty>
          </el-descriptions-item>
        </template>
      </el-descriptions>
      
      <!-- 机器人信息表单对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="500px"
      >
        <el-form
          ref="botInfoFormRef"
          :model="botInfoForm"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="机器人名称" prop="name">
            <el-input v-model="botInfoForm.name" placeholder="请输入机器人名称"></el-input>
          </el-form-item>
          <el-form-item label="机器人QQ" prop="botQQ">
            <el-input v-model="botInfoForm.botQQ" placeholder="请输入机器人QQ"></el-input>
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
.bot-info-view {
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

.card-actions {
  display: flex;
  gap: 10px;
}

.bot-info-descriptions {
  margin-top: 20px;
}
</style>
