import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import './styles/theme/light.css'
import './styles/theme/dark.css'
import './styles/app.css'
import App from './App.vue'
import { initTheme } from './composables/useTheme'

initTheme()

// 创建应用实例
const app = createApp(App)

// 创建并使用Pinia
const pinia = createPinia()
app.use(pinia)

// 使用Element Plus
app.use(ElementPlus)

// 注册所有Element Plus图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用Vue Router
app.use(router)

// 挂载应用
app.mount('#app')
