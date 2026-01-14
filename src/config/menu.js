// 全局菜单配置
import { Document, User, Setting } from '@element-plus/icons-vue'

export const menuItems = [
  {
    path: '/home',
    name: 'home',
    label: '首页',
    icon: Document
  },
  {
    path: '/rule/scope',
    name: 'scope',
    label: '作用域管理',
    icon: Setting
  },
  {
    path: '/rule/role',
    name: 'role',
    label: '规则管理',
    icon: User
  },

  {
    path: '/rule/action',
    name: 'action',
    label: '动作管理',
    icon: Setting
  },
  {
    path: '/rule/action-content',
    name: 'actionContent',
    label: '动作内容管理',
    icon: Setting
  },
  {
    path: '/bot/docker',
    name: 'docker',
    label: 'Docker管理',
    icon: Setting
  },
  {
    path: '/bot/info',
    name: 'botInfo',
    label: '机器人信息',
    icon: Setting
  },
  {
    path: '/user/profile',
    name: 'userProfile',
    label: '个人信息',
    icon: User
  }
]
