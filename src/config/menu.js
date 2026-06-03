// 全局菜单配置
import { House, Connection, Operation, Monitor, Cpu, User, List, Clock } from '@element-plus/icons-vue'

export const menuItems = [
  {
    path: '/home',
    name: 'home',
    label: '首页',
    icon: House
  },
  {
    path: '/plugin/list',
    name: 'plugin',
    label: '插件管理',
    icon: Operation
  },
  {
    path: '/workflow/list',
    name: 'workflow',
    label: '工作流管理',
    icon: Connection,
    children: [
      {
        path: '/workflow/list',
        name: 'workflow-list',
        label: '工作流列表',
        icon: List
      },
      {
        path: '/workflow/log',
        name: 'workflow-log',
        label: '执行日志',
        icon: Clock
      }
    ]
  },
  {
    path: '/bot/docker',
    name: 'docker',
    label: 'Docker管理',
    icon: Monitor
  },
  {
    path: '/bot/info',
    name: 'botInfo',
    label: '机器人信息',
    icon: Cpu
  },
  {
    path: '/user/profile',
    name: 'userProfile',
    label: '个人信息',
    icon: User
  }
]
