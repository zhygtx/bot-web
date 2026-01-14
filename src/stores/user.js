import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: localStorage.getItem('userId') || '',
    name: localStorage.getItem('name') || '',
    account: localStorage.getItem('account') || '',
    token: localStorage.getItem('token') || ''
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  
  actions: {
    // 登录成功后保存用户信息
    loginSuccess(userInfo) {
      this.userId = userInfo.userId
      this.name = userInfo.name || userInfo.username
      this.account = userInfo.account
      this.token = userInfo.token
      
      // 保存到localStorage
      localStorage.setItem('userId', userInfo.userId)
      localStorage.setItem('name', this.name)
      localStorage.setItem('account', userInfo.account)
      localStorage.setItem('token', userInfo.token)
    },
    
    // 退出登录
    logout() {
      this.userId = ''
      this.name = ''
      this.account = ''
      this.token = ''
      
      // 清除localStorage
      localStorage.removeItem('userId')
      localStorage.removeItem('name')
      localStorage.removeItem('account')
      localStorage.removeItem('token')
    },
    
    // 更新用户信息
    updateUserInfo(userInfo) {
      this.name = userInfo.name || this.name
      this.account = userInfo.account || this.account
      
      // 更新localStorage
      localStorage.setItem('name', this.name)
      localStorage.setItem('account', this.account)
    }
  }
})
