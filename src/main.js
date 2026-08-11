import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import './styles/app.css'
import App from './App.vue'
import { initTheme } from './composables/useTheme'
import { useThemeStore } from './stores/theme'

initTheme()

// 创建应用实例
const app = createApp(App)

// 创建并使用Pinia
const pinia = createPinia()
app.use(pinia)

// 使用Element Plus
app.use(ElementPlus)

// 使用数据库中的用户主题覆盖启动时的本地快照；失败时保留本地或默认主题，避免影响应用进入。
const themeStore = useThemeStore()
themeStore.loadCurrentTheme().catch(error => {
  console.error('加载用户主题失败:', error)
})

// 注册所有Element Plus图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用Vue Router
app.use(router)

// 挂载应用
app.mount('#app')
