import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:8080' : '/api',
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    ElMessage.error('请求发送失败，请检查网络连接')
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data

    if (res.code === 200) {
      // 成功后端如果有消息就显示，没有则不显示
      if (res.message) {
        ElMessage.success(res.message)
      }
      return res
    }

    // 非 200 错误码处理
    console.error('响应错误:', res.code, res.message)

    if (res.code === 401) {
      localStorage.removeItem('userId')
      localStorage.removeItem('name')
      localStorage.removeItem('account')
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    const businessError = new Error(res.message || 'Error')
    businessError.code = res.code
    businessError.data = res.data

    // 显示后端返回的错误消息，后端未返回消息时使用兜底文案
    ElMessage.error(res.message || '操作失败')
    return Promise.reject(businessError)
  },
  error => {
    console.error('响应错误:', error)

    // 网络层面的错误统一提示
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
    } else if (error.response) {
      const status = error.response.status
      if (status === 401) {
        localStorage.removeItem('userId')
        localStorage.removeItem('name')
        localStorage.removeItem('account')
        localStorage.removeItem('token')
        ElMessage.error('登录已过期，请重新登录')
        window.location.href = '/login'
      } else if (status >= 500) {
        ElMessage.error('服务器内部错误')
      } else {
        ElMessage.error('请求失败，请稍后重试')
      }
    } else if (error.request) {
      ElMessage.error('服务器无响应，请检查服务器状态')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

export default service
