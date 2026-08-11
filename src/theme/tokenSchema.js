export const predefinedThemeColors = [
  '#1677ff',
  '#4096ff',
  '#67c23a',
  '#e6a23c',
  '#f56c6c',
  '#303133',
  '#606266',
  '#909399',
  '#c0c4cc',
  '#ffffff',
  '#0f141a',
  '#15181d',
  '#111d2c',
  '#1f2933'
]

const colorToken = (key, label) => ({ key, label, type: 'color', placeholder: '#1677ff / rgba(22, 119, 255, 0.12)' })
const cssToken = (key, label, type, placeholder) => ({ key, label, type, placeholder })

export const colorTokenGroups = [
  {
    title: '文字与边框颜色',
    tokens: [
      colorToken('--app-text', '主文字'),
      colorToken('--app-text-soft', '次文字'),
      colorToken('--app-text-muted', '弱文字'),
      colorToken('--app-text-disabled', '禁用文字'),
      colorToken('--app-border', '边框色'),
      colorToken('--app-border-soft', '弱边框色')
    ]
  },
  {
    title: '品牌与状态颜色',
    tokens: [
      colorToken('--app-primary', '主色'),
      colorToken('--app-primary-hover', '主色悬停'),
      colorToken('--app-primary-soft', '主色弱背景'),
      colorToken('--app-primary-border', '主色边框'),
      colorToken('--app-success', '成功'),
      colorToken('--app-warning', '警告'),
      colorToken('--app-danger', '危险')
    ]
  },
  {
    title: '组件颜色',
    tokens: [
      colorToken('--sidebar-text', '侧边栏文字'),
      colorToken('--sidebar-text-active', '侧边栏选中文字'),
      colorToken('--sidebar-active-bg', '侧边栏选中背景'),
      colorToken('--app-canvas-dot', '画布网格'),
      colorToken('--chart-primary', '图表主色'),
      colorToken('--chart-warning', '图表强调色')
    ]
  }
]

export const backgroundTokenGroups = [
  {
    title: '背景样式',
    tokens: [
      cssToken('--auth-bg', '登录页背景', 'background', 'linear-gradient(135deg, #f5f7fa 0%, #e9eef6 100%)'),
      cssToken('--app-bg', '页面背景', 'background', '#f5f7fa / linear-gradient(...)'),
      cssToken('--app-bg-muted', '弱背景', 'background', 'rgba(255, 255, 255, 0.72)'),
      cssToken('--app-card-bg', '卡片背景', 'background', '#ffffff / linear-gradient(...)'),
      cssToken('--app-card-bg-hover', '卡片悬停背景', 'background', '#ffffff / linear-gradient(...)'),
      cssToken('--app-panel-bg', '面板背景', 'background', 'rgba(255, 255, 255, 0.96)'),
      cssToken('--app-panel-muted', '弱面板背景', 'background', '#f5f7fa'),
      cssToken('--app-surface-raised', '浮层背景', 'background', 'rgba(255, 255, 255, 0.96)'),
      cssToken('--app-surface-raised-soft', '半透明浮层', 'background', 'rgba(255, 255, 255, 0.82)'),
      cssToken('--sidebar-bg', '侧边栏背景', 'background', '#ffffff / linear-gradient(...)'),
      cssToken('--app-header-bg', '头部背景', 'background', 'rgba(255, 255, 255, 0.96)'),
      cssToken('--app-canvas-bg', '工作流画布', 'background', '#ffffff / radial-gradient(...)')
    ]
  }
]

export const borderTokenGroups = [
  {
    title: '边框样式',
    tokens: [
      cssToken('--app-border-card', '卡片边框', 'border', '1px solid var(--app-border-soft)'),
      cssToken('--app-border-panel', '面板边框', 'border', '1px solid var(--app-border-soft)'),
      cssToken('--app-border-control', '控件边框', 'border', '1px solid var(--app-border)'),
      cssToken('--app-border-focus', '聚焦描边', 'shadow', '0 0 0 2px var(--app-primary-border)'),
      cssToken('--workflow-node-border', '工作流节点边框', 'border', '1px solid var(--app-border)'),
      cssToken('--workflow-node-selected-outline', '节点选中描边', 'shadow', '0 0 0 2px var(--app-primary-border-strong)')
    ]
  }
]

export const shadowTokenGroups = [
  {
    title: '阴影与发光',
    tokens: [
      cssToken('--app-shadow', '通用阴影', 'shadow', '0 4px 12px rgba(0, 0, 0, 0.1)'),
      cssToken('--app-shadow-hover', '悬浮阴影', 'shadow', '0 8px 22px rgba(15, 23, 42, 0.14)'),
      cssToken('--app-header-shadow', '头部阴影', 'shadow', '0 2px 8px rgba(0, 0, 0, 0.06)'),
      cssToken('--app-surface-shadow', '表面阴影', 'shadow', '0 2px 12px rgba(0, 0, 0, 0.1)'),
      cssToken('--workflow-node-shadow', '工作流节点阴影', 'shadow', '0 4px 12px rgba(0, 0, 0, 0.1)'),
      cssToken('--workflow-panel-shadow', '工作流面板阴影', 'shadow', '0 4px 12px rgba(0, 0, 0, 0.1)')
    ]
  }
]

export const shapeTokenGroups = [
  {
    title: '圆角与形状',
    tokens: [
      cssToken('--app-radius-card', '卡片圆角', 'length', '8px'),
      cssToken('--app-radius-control', '控件圆角', 'length', '6px'),
      cssToken('--app-radius-pill', '胶囊圆角', 'length', '999px'),
      cssToken('--app-radius-floating', '悬浮窗圆角', 'length', '10px'),
      cssToken('--workflow-node-radius', '工作流节点圆角', 'length', '8px'),
      cssToken('--workflow-port-size', '节点端口尺寸', 'length', '12px')
    ]
  }
]

export const effectTokenGroups = [
  {
    title: '玻璃与滤镜',
    tokens: [
      cssToken('--app-blur-surface', '浮层模糊半径', 'length', '10px'),
      cssToken('--app-backdrop-filter', '通用背板滤镜', 'filter', 'blur(10px) / saturate(180%) blur(16px)'),
      cssToken('--app-header-backdrop-filter', '头部背板滤镜', 'filter', 'blur(10px)'),
      cssToken('--app-floating-backdrop-filter', '悬浮窗背板滤镜', 'filter', 'blur(10px)')
    ]
  }
]

export const densityTokenGroups = [
  {
    title: '间距与密度',
    tokens: [
      cssToken('--app-gap', '通用间距', 'length', '16px'),
      cssToken('--app-card-padding', '卡片内边距', 'length', '20px'),
      cssToken('--app-panel-padding', '面板内边距', 'length', '16px'),
      cssToken('--app-control-height', '控件高度', 'length', '32px'),
      cssToken('--app-toolbar-height', '工具栏高度', 'length', '56px'),
      cssToken('--app-list-item-height', '列表项高度', 'length', '40px')
    ]
  }
]

export const motionTokenGroups = [
  {
    title: '动效',
    tokens: [
      cssToken('--app-transition-fast', '快速过渡', 'transition', '0.15s ease'),
      cssToken('--app-transition', '标准过渡', 'transition', '0.3s ease'),
      cssToken('--app-transition-slow', '慢速过渡', 'transition', '0.45s ease'),
      cssToken('--app-ease-standard', '标准曲线', 'timing', 'cubic-bezier(0.2, 0.8, 0.2, 1)'),
      cssToken('--app-hover-translate', '悬停位移', 'transform', 'translateY(-2px)'),
      cssToken('--app-hover-scale', '悬停缩放', 'transform', 'scale(1.02)')
    ]
  }
]

export const workflowTokenGroups = [
  {
    title: '工作流画布与节点',
    tokens: [
      cssToken('--app-canvas-grid-size', '画布网格尺寸', 'length', '20px'),
      cssToken('--workflow-plugin-panel-bg', '左侧插件面板背景', 'background', 'var(--app-surface-raised)'),
      cssToken('--workflow-toolbar-bg', '画布工具栏背景', 'background', 'var(--app-surface-raised-soft)'),
      cssToken('--workflow-config-panel-bg', '右侧配置栏背景', 'background', 'var(--app-surface-raised)'),
      cssToken('--workflow-node-bg', '节点背景', 'background', 'var(--app-surface-raised)'),
      cssToken('--workflow-node-param-bg', '节点参数背景', 'background', 'var(--app-bg)'),
      cssToken('--workflow-node-port-bg', '节点端口中心', 'background', 'var(--app-surface-raised)')
    ]
  }
]

export const foundationTokenGroups = [
  {
    title: '底层背景与侧边栏扩展',
    tokens: [
      cssToken('--app-bg-soft', '柔和页面背景', 'background', '#ffffff'),
      cssToken('--app-surface', '基础表面', 'background', '#ffffff'),
      cssToken('--page-bg', '页面背景别名', 'background', '#f5f7fa'),
      colorToken('--sidebar-primary', '侧边栏主色'),
      colorToken('--sidebar-text-primary', '侧边栏强文字'),
      colorToken('--sidebar-icon', '侧边栏图标'),
      colorToken('--sidebar-icon-active', '侧边栏激活图标'),
      cssToken('--sidebar-hover-bg', '侧边栏悬停背景', 'background', '#f0f5ff'),
      colorToken('--sidebar-border', '侧边栏边框'),
      colorToken('--sidebar-divider', '侧边栏分割线')
    ]
  },
  {
    title: '状态扩展与代码块',
    tokens: [
      colorToken('--app-primary-strong', '主色强调'),
      colorToken('--app-primary-soft-strong', '主色弱背景强'),
      colorToken('--app-primary-soft-weak', '主色弱背景浅'),
      colorToken('--app-primary-border-strong', '主色强边框'),
      colorToken('--app-success-soft', '成功弱背景'),
      colorToken('--app-success-border', '成功边框'),
      colorToken('--app-danger-soft', '危险弱背景'),
      colorToken('--app-danger-soft-strong', '危险弱背景强'),
      colorToken('--app-danger-border', '危险边框'),
      colorToken('--app-on-primary', '主色上文字'),
      colorToken('--app-code-bg', '代码块背景'),
      colorToken('--app-code-text', '代码块文字'),
      colorToken('--app-header-text', '头部文字'),
      colorToken('--app-mobile-header-bg', '移动端头部背景'),
      colorToken('--app-surface-border', '表面边框色')
    ]
  }
]

export const advancedTokenGroups = [
  ...colorTokenGroups,
  ...foundationTokenGroups,
  ...backgroundTokenGroups,
  ...borderTokenGroups,
  ...shadowTokenGroups,
  ...shapeTokenGroups,
  ...effectTokenGroups,
  ...densityTokenGroups,
  ...motionTokenGroups,
  ...workflowTokenGroups
]

export const cssValueLooksSafe = (value) => {
  const next = String(value || '').trim()
  if (!next || next.length > 420) return false
  if (/[;{}<>]/.test(next)) return false
  if (/url\s*\(|expression\s*\(|@import|javascript:/i.test(next)) return false
  return /^[#a-zA-Z0-9(),.%\s\-/]+$/.test(next)
}
