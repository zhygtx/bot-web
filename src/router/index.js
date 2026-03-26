import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/',
      redirect: '/home'
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
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue')
    },
    {
      path: '/bot',
      component: () => import('../views/bot/BotLayout.vue'),
      children: [
        {
          path: 'info',
          name: 'bot-info',
          component: () => import('../views/bot/BotInfoView.vue')
        },
        {
          path: 'docker',
          name: 'bot-docker',
          component: () => import('../views/bot/DockerView.vue')
        }
      ]
    },
    {
      path: '/plugin',
      component: () => import('../views/plugin/PluginLayout.vue'),
      children: [
        {
          path: 'list',
          name: 'plugin-list',
          component: () => import('../views/plugin/PluginListView.vue')
        },
        {
          path: 'create',
          name: 'plugin-create',
          component: () => import('../views/plugin/PluginCreateView.vue')
        },
        {
          path: ':id',
          name: 'plugin-detail',
          component: () => import('../views/plugin/PluginDetailView.vue')
        }
      ]
    },
    {
      path: '/workflow',
      component: () => import('../views/workflow/WorkflowLayout.vue'),
      children: [
        {
          path: 'list',
          name: 'workflow-list',
          component: () => import('../views/workflow/WorkflowListView.vue')
        },
        {
          path: 'edit/:id',
          name: 'workflow-edit',
          component: () => import('../views/workflow/WorkflowEditView.vue')
        },
        {
          path: 'edit',
          name: 'workflow-create',
          component: () => import('../views/workflow/WorkflowEditView.vue')
        }
      ]
    },
    {
      path: '/user',
      component: () => import('../views/user/UserLayout.vue'),
      children: [
        {
          path: 'profile',
          name: 'user-profile',
          component: () => import('../views/user/ProfileView.vue')
        }
      ]
    }
  ]
})

export default router