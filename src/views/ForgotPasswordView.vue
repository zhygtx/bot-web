<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

// 获取路由实例
const router = useRouter()

// 找回密码表单数据
const forgotPasswordForm = reactive({
  account: '',
  email: '',
  code: '',
  newPwd: '',
  confirmPwd: ''
})

// 确认密码验证
const validateConfirmPwd = (rule, value, callback) => {
  if (value !== forgotPasswordForm.newPwd) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

// 表单验证规则
const rules = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 6, max: 6, message: '验证码长度为 6 个字符', trigger: 'blur' }
  ],
  newPwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPwd: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPwd, trigger: 'blur' }
  ]
}

// 表单引用
const forgotPasswordFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 验证码倒计时
const codeCountdown = ref(0)

// 发送验证码
const sendCode = async () => {
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(forgotPasswordForm.email)) {
    ElMessage.error('请输入有效的邮箱地址')
    return
  }
  
  try {
    // 发送验证码请求
    await request({
      url: '/email/sendVerificationCode',
      method: 'post',
      params: {
        email: forgotPasswordForm.email
      }
    })
    
    ElMessage.success('验证码发送成功')
    
    // 开始倒计时
    codeCountdown.value = 60
    const timer = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    ElMessage.error(error.message || '验证码发送失败')
  }
}

// 重置密码方法
const handleResetPassword = async () => {
  // 表单验证
  if (!forgotPasswordFormRef.value) return
  
  await forgotPasswordFormRef.value.validate((valid) => {
    if (!valid) {
      return false
    }
  })
  
  try {
    // 设置加载状态
    loading.value = true
    
    // 发送重置密码请求
    await request({
      url: '/user/retrievePwd',
      method: 'put',
      params: {
        account: forgotPasswordForm.account,
        email: forgotPasswordForm.email,
        code: forgotPasswordForm.code,
        newPwd: forgotPasswordForm.newPwd
      }
    })
    
    ElMessage.success('密码重置成功')
    
    // 跳转到登录页
    router.push('/login')
  } catch (error) {
    ElMessage.error(error.message || '密码重置失败')
  } finally {
    // 关闭加载状态
    loading.value = false
  }
}

// 跳转到登录页面
const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="forgot-password-container">
    <div class="forgot-password-box">
      <div class="forgot-password-header">
        <h2>QQbot匹配回复规则系统</h2>
        <p>找回密码，重新获取账号访问权限</p>
      </div>
      
      <el-form
        ref="forgotPasswordFormRef"
        :model="forgotPasswordForm"
        :rules="rules"
        label-position="top"
        class="forgot-password-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="账号" prop="account">
              <el-input
                v-model="forgotPasswordForm.account"
                placeholder="请输入账号"
                prefix-icon="el-icon-user"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="forgotPasswordForm.email"
                placeholder="请输入邮箱"
                prefix-icon="el-icon-message"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="验证码" prop="code">
              <el-input
                v-model="forgotPasswordForm.code"
                placeholder="请输入验证码"
                prefix-icon="el-icon-key"
              >
                <template #append>
                  <el-button
                    type="primary"
                    :disabled="codeCountdown > 0"
                    @click="sendCode"
                  >
                    {{ codeCountdown > 0 ? `${codeCountdown}s后重发` : '发送验证码' }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="新密码" prop="newPwd">
              <el-input
                v-model="forgotPasswordForm.newPwd"
                type="password"
                placeholder="请输入新密码"
                prefix-icon="el-icon-lock"
                show-password
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" prop="confirmPwd">
              <el-input
                v-model="forgotPasswordForm.confirmPwd"
                type="password"
                placeholder="请确认密码"
                prefix-icon="el-icon-lock"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleResetPassword"
            class="reset-password-button"
          >
            重置密码
          </el-button>
        </el-form-item>
        
        <div class="forgot-password-footer">
          <span>想起密码了？</span>
          <span @click="goToLogin" class="login-link">立即登录</span>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.forgot-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.forgot-password-box {
  width: 600px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.forgot-password-header {
  text-align: center;
  margin-bottom: 30px;
}

.forgot-password-header h2 {
  color: #303133;
  font-size: 24px;
  margin-bottom: 10px;
}

.forgot-password-header p {
  color: #909399;
  font-size: 14px;
}

.forgot-password-form {
  width: 100%;
}

.reset-password-button {
  width: 100%;
  height: 40px;
  font-size: 16px;
}

.forgot-password-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #606266;
}

.login-link {
  color: #409eff;
  cursor: pointer;
  margin-left: 5px;
  transition: color 0.3s;
}

.login-link:hover {
  color: #66b1ff;
}
</style>
