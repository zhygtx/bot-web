import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: (to) => {
        // 检查token是否存在
        const token = localStorage.getItem('token')
        // 如果有token，跳转到首页；否则跳转到登录页
        return token ? '/home' : '/login'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgotPassword',
      component: () => import('../views/ForgotPasswordView.vue')
    },
    {
    path: '/home',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      requiresAuth: true
    }
  },
  // 插件管理模块路由
  {
    path: '/plugin',
    component: () => import('../views/plugin/PluginLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: 'list'
      },
      {
        path: 'list',
        name: 'plugin',
        component: () => import('../views/plugin/PluginListView.vue')
      }
    ]
  },
  // 插件详情页面（独立页面，无侧边栏）
  {
    path: '/plugin/detail/:id',
    name: 'pluginDetail',
    component: () => import('../views/plugin/PluginDetailView.vue'),
    meta: {
      requiresAuth: true
    }
  },
  // 工作流管理模块路由
  {
    path: '/workflow',
    component: () => import('../views/workflow/WorkflowLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: 'list'
      },
      {
        path: 'list',
        name: 'workflow',
        component: () => import('../views/workflow/WorkflowListView.vue')
      }
    ]
  },
  // 工作流编辑页面（独立页面，无侧边栏）
  {
    path: '/workflow/edit/:id?',
    name: 'workflowEdit',
    component: () => import('../views/workflow/WorkflowEditView.vue'),
    meta: {
      requiresAuth: true
    }
  },
    // 机器人管理模块路由
    {
      path: '/bot',
      name: 'bot',
      component: () => import('../views/bot/BotLayout.vue'),
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: 'info',
          name: 'botInfo',
          component: () => import('../views/bot/BotInfoView.vue')
        },
        {
          path: 'docker',
          name: 'docker',
          component: () => import('../views/bot/DockerView.vue')
        }
      ]
    },
    // 辅助功能模块路由
    {
      path: '/user',
      name: 'user',
      component: () => import('../views/user/UserLayout.vue'),
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: 'profile',
          name: 'userProfile',
          component: () => import('../views/user/ProfileView.vue')
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 获取token
  const token = localStorage.getItem('token')
  
  // 如果路由需要认证且没有token，则跳转到登录页
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
