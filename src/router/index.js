import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
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
    // 规则配置模块路由
    {
      path: '/rule',
      name: 'rule',
      component: () => import('../views/rule/RuleLayout.vue'),
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: 'role',
          name: 'role',
          component: () => import('../views/rule/RoleView.vue')
        },
        {
          path: 'scope',
          name: 'scope',
          component: () => import('../views/rule/ScopeView.vue')
        },
        {
          path: 'extract-position',
          name: 'extractPosition',
          component: () => import('../views/rule/ExtractPositionView.vue')
        },
        {
          path: 'action',
          name: 'action',
          component: () => import('../views/rule/ActionView.vue')
        },
        {
          path: 'action-content',
          name: 'actionContent',
          component: () => import('../views/rule/ActionContentView.vue')
        }
      ]
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
