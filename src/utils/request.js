import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:8080' : '/api', // 开发环境直连后端，生产环境通过 Nginx 反向代理
  timeout: 10000 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    
    // 如果有token，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    // 处理请求错误
    console.error('请求错误:', error)
    ElMessage.error('请求发送失败，请检查网络连接')
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 获取响应数据
    const res = response.data
    
    // 处理后端返回的数据格式
    if (res.code !== undefined) {
      // 成功状态码处理
      if (res.code === 200) {
        // 获取请求URL
        const requestUrl = response.config.url || ''
        // 如果有成功消息，且不是登录成功，且不是list请求，且不是机器人信息请求，且不是个人信息请求，且不是docker信息请求，才显示提示
        if (res.message && res.message !== '登录成功' && !requestUrl.includes('/list') && !requestUrl.includes('/bot/info') && !requestUrl.includes('/user/info') && !requestUrl.includes('/docker/info')) {
          ElMessage.success(res.message)
        }
        return res
      } else {
        // 错误状态码处理
        console.error('响应错误:', res.code, res.message)
        
        // 401表示未授权，跳转到登录页
        if (res.code === 401) {
          // 清除本地存储的用户信息
          localStorage.removeItem('userId')
          localStorage.removeItem('name')
          localStorage.removeItem('account')
          localStorage.removeItem('token')
          
          // 跳转到登录页
          window.location.href = '/login'
        }
        
        // 显示错误消息
        ElMessage.error(res.message || '操作失败')
        return Promise.reject(new Error(res.message || 'Error'))
      }
    } else {
      // 如果后端返回的数据格式不符合预期，拒绝请求
      console.error('响应格式错误：缺少code字段', res)
      ElMessage.error('服务器响应格式错误')
      return Promise.reject(new Error('无效的响应格式'))
    }
  },
  error => {
    // 处理响应错误
    console.error('响应错误:', error)
    
    // 根据错误类型显示不同的提示
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
    } else if (error.response) {
      // 服务器返回错误状态码
      const status = error.response.status
      switch (status) {
        case 400:
          ElMessage.error('请求参数错误')
          break
        case 401:
          // 清除本地存储的用户信息
          localStorage.removeItem('userId')
          localStorage.removeItem('name')
          localStorage.removeItem('account')
          localStorage.removeItem('token')
          ElMessage.error('登录已过期，请重新登录')
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('没有权限访问该资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(`请求失败，状态码: ${status}`)
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      ElMessage.error('服务器无响应，请检查服务器状态')
    } else {
      // 请求配置错误
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

export default service