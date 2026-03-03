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
    path: '/plugin/list',
    name: 'plugin',
    label: '插件管理',
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
