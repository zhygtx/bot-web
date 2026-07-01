import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/settings'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { title: '登录' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { title: '注册' }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { title: '忘记密码' }
    },
    
    {
      path: '/settings',
      name: 'bot-settings',
      component: () => import('../views/bot/SettingsView.vue'),
      meta: { title: '基础信息配置' }
    },
    {
      path: '/bot/docker',
      name: 'bot-docker',
      component: () => import('../views/bot/DockerView.vue'),
      meta: { title: 'Docker管理' }
    },
    {
      path: '/plugin/list',
      name: 'plugin-list',
      component: () => import('../views/plugin/PluginListView.vue'),
      meta: { title: '插件列表' }
    },
    {
      path: '/plugin/create',
      name: 'plugin-create',
      component: () => import('../views/plugin/PluginCreateView.vue'),
      meta: { title: '创建插件' }
    },
    {
      path: '/plugin/ai-list',
      name: 'plugin-ai-list',
      component: () => import('../views/plugin/AIPluginListView.vue'),
      meta: { title: 'AI 生成插件' }
    },
    {
      path: '/plugin/ai-create',
      name: 'plugin-ai-create',
      component: () => import('../views/plugin/AIPluginCreateView.vue'),
      meta: { title: 'AI 生成插件' }
    },
    {
      path: '/plugin/:id',
      name: 'plugin-detail',
      component: () => import('../views/plugin/PluginDetailView.vue'),
      meta: { title: '插件详情' }
    },
    {
      path: '/workflow/list',
      name: 'workflow-list',
      component: () => import('../views/workflow/WorkflowListView.vue'),
      meta: { title: '工作流列表' }
    },
    {
      path: '/workflow/edit/:id',
      name: 'workflow-edit',
      component: () => import('../views/workflow/WorkflowEditView.vue'),
      meta: { title: '工作流编辑' }
    },
    {
      path: '/workflow/edit',
      name: 'workflow-create',
      component: () => import('../views/workflow/WorkflowEditView.vue'),
      meta: { title: '新建工作流' }
    },
    {
      path: '/workflow/log',
      name: 'workflow-log',
      component: () => import('../views/workflow/WorkflowLogView.vue'),
      meta: { title: '工作流日志' }
    },
    {
      path: '/user/profile',
      name: 'user-profile',
      component: () => import('../views/user/ProfileView.vue'),
      meta: { title: '个人信息' }
    }
  ]
})

export default router
