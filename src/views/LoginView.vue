<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

// 获取路由实例
const router = useRouter()

// 获取用户状态管理
const userStore = useUserStore()

// 登录表单数据
const loginForm = reactive({
  account: '',
  pwd: ''
})

// 表单验证规则
const rules = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  pwd: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 表单引用
const loginFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 登录方法
const handleLogin = async () => {
  // 表单验证
  if (!loginFormRef.value) return
  
  const valid = await loginFormRef.value.validate()
  if (!valid) {
    return
  }
  
  try {
    // 设置加载状态
    loading.value = true
    
    console.log('开始发送登录请求')
    // 发送登录请求
    const response = await request({
      url: '/user/login',
      method: 'post',
      params: {
        account: loginForm.account,
        pwd: loginForm.pwd
      }
    })
    
    console.log('登录请求响应:', response)
    
    // 登录成功，保存用户信息
    userStore.loginSuccess(response.data)
    
    // 跳转到基础信息配置
    router.push('/settings')
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    // 关闭加载状态
    loading.value = false
  }
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/register')
}

// 跳转到找回密码页面
const goToForgotPassword = () => {
  router.push('/forgot-password')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>BotFlow</h2>
        <p>欢迎登录，可视化编排你的 QQ Bot</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-position="top"
        class="login-form"
      >
        <el-form-item label="账号" prop="account">
          <el-input
            v-model="loginForm.account"
            placeholder="请输入账号"
            prefix-icon="el-icon-user"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="pwd">
          <el-input
            v-model="loginForm.pwd"
            type="password"
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            登录
          </el-button>
        </el-form-item>
        
        <div class="login-footer">
          <span @click="goToRegister">注册账号</span>
          <span @click="goToForgotPassword">忘记密码</span>
        </div>
      </el-form>
    </div>
  </div>
</template>

