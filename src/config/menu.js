// 全局菜单配置
import { House, Connection, Operation, Monitor, Cpu, User, List, Clock, Setting } from '@element-plus/icons-vue'

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
    path: '/bot/settings',
    name: 'botSettings',
    label: '基础信息配置',
    icon: Setting
  }
]
