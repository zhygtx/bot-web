<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

// 获取路由实例
const router = useRouter()

// 注册表单数据
const registerForm = reactive({
  account: '',
  name: '',
  pwd: '',
  confirmPwd: '',
  email: '',
  code: ''
})

// 确认密码验证
const validateConfirmPwd = (rule, value, callback) => {
  if (value !== registerForm.pwd) {
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
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  pwd: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPwd: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPwd, trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'submit' },
    { min: 6, max: 6, message: '验证码长度为 6 个字符', trigger: 'submit' }
  ]
}

// 表单引用
const registerFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 验证码倒计时
const codeCountdown = ref(0)

// 发送验证码
const sendCode = async () => {
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(registerForm.email)) {
    ElMessage.error('请输入有效的邮箱地址')
    return
  }
  
  // 立即开始倒计时，防止重复点击
  codeCountdown.value = 60
  const timer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
  
  try {
    // 发送验证码请求，设置超时时间为30秒
    await request({
      url: '/email/sendVerificationCode',
      method: 'post',
      params: {
        email: registerForm.email
      },
      timeout: 30000
    })
    
  } catch (error) {
    console.error('验证码发送失败:', error)
  }
}

// 注册方法
const handleRegister = async () => {
  // 表单验证
  if (!registerFormRef.value) return
  
  await registerFormRef.value.validate((valid) => {
    if (!valid) {
      return false
    }
  })
  
  try {
    // 设置加载状态
    loading.value = true
    
    // 发送注册请求
    await request({
      url: '/user/insertUser',
      method: 'post',
      data: {
        account: registerForm.account,
        name: registerForm.name,
        pwd: registerForm.pwd,
        email: registerForm.email
      }
    })
    
    // 跳转到登录页
    router.push('/login')
  } catch (error) {
    console.error('注册失败:', error)
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
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h2>BotFlow</h2>
        <p>注册账号，构建你的 Bot 自动化</p>
      </div>
      
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        label-position="top"
        class="register-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="账号" prop="account">
              <el-input
                v-model="registerForm.account"
                placeholder="请输入账号"
                prefix-icon="el-icon-user"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用户名" prop="name">
              <el-input
                v-model="registerForm.name"
                placeholder="请输入用户名"
                prefix-icon="el-icon-user-solid"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="密码" prop="pwd">
              <el-input
                v-model="registerForm.pwd"
                type="password"
                placeholder="请输入密码"
                prefix-icon="el-icon-lock"
                show-password
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" prop="confirmPwd">
              <el-input
                v-model="registerForm.confirmPwd"
                type="password"
                placeholder="请确认密码"
                prefix-icon="el-icon-lock"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="registerForm.email"
                placeholder="请输入邮箱"
                prefix-icon="el-icon-message"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验证码" prop="code">
              <el-input
                v-model="registerForm.code"
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
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleRegister"
            class="register-button"
          >
            注册
          </el-button>
        </el-form-item>
        
        <div class="register-footer">
          <span>已有账号？</span>
          <span @click="goToLogin" class="login-link">立即登录</span>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-box {
  width: 600px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  color: #303133;
  font-size: 24px;
  margin-bottom: 10px;
}

.register-header p {
  color: #909399;
  font-size: 14px;
}

.register-form {
  width: 100%;
}

.register-button {
  width: 100%;
  height: 40px;
  font-size: 16px;
}

.register-footer {
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

<style>
/* ───────── 暗色模式 ───────── */
html.dark .register-container {
  background: var(--app-bg);
}
html.dark .register-box {
  background: var(--app-card-bg);
  box-shadow: var(--app-shadow);
}
html.dark .register-header h2 {
  color: var(--app-text);
}
html.dark .register-header p,
html.dark .register-footer {
  color: var(--app-text-soft);
}
html.dark .register-footer .login-link {
  color: var(--app-primary);
}
</style>
