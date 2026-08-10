// 全局菜单配置
import { Connection, Operation, List, Clock, Setting, MagicStick, DataAnalysis } from '@element-plus/icons-vue'

export const menuItems = [
  {
    path: '/statistics',
    name: 'statistics',
    label: '数据统计',
    icon: DataAnalysis
  },
  {
    path: '/plugin/list',
    name: 'plugin',
    label: '插件管理',
    icon: Operation,
    children: [
      {
        path: '/plugin/list',
        name: 'plugin-list',
        label: '插件列表',
        icon: List
      },
      {
        path: '/plugin/ai-list',
        name: 'plugin-ai-list',
        label: 'AI 生成插件',
        icon: MagicStick
      }
    ]
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
    path: '/settings',
    name: 'botSettings',
    label: '基础信息配置',
    icon: Setting
  }
]
