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

export const colorTokenGroups = [
  {
    title: '文字与边框',
    tokens: [
      { key: '--app-text', label: '主文字' },
      { key: '--app-text-soft', label: '次文字' },
      { key: '--app-text-muted', label: '弱文字' },
      { key: '--app-text-disabled', label: '禁用文字' },
      { key: '--app-border', label: '边框' },
      { key: '--app-border-soft', label: '弱边框' }
    ]
  },
  {
    title: '品牌与状态',
    tokens: [
      { key: '--app-primary', label: '主色' },
      { key: '--app-primary-hover', label: '主色悬停' },
      { key: '--app-primary-soft', label: '主色弱背景' },
      { key: '--app-primary-border', label: '主色边框' },
      { key: '--app-success', label: '成功' },
      { key: '--app-warning', label: '警告' },
      { key: '--app-danger', label: '危险' }
    ]
  },
  {
    title: '组件颜色',
    tokens: [
      { key: '--sidebar-text', label: '侧边栏文字' },
      { key: '--sidebar-text-active', label: '侧边栏选中文字' },
      { key: '--sidebar-active-bg', label: '侧边栏选中背景' },
      { key: '--app-canvas-dot', label: '画布网格' },
      { key: '--chart-primary', label: '图表主色' },
      { key: '--chart-warning', label: '图表强调色' }
    ]
  }
]

export const backgroundTokenGroups = [
  {
    title: '背景样式',
    tokens: [
      { key: '--auth-bg', label: '登录页背景' },
      { key: '--app-bg', label: '页面背景' },
      { key: '--app-bg-muted', label: '弱背景' },
      { key: '--app-card-bg', label: '卡片背景' },
      { key: '--app-panel-bg', label: '面板背景' },
      { key: '--app-surface-raised', label: '浮层背景' },
      { key: '--app-surface-raised-soft', label: '半透明浮层' },
      { key: '--sidebar-bg', label: '侧边栏背景' },
      { key: '--app-header-bg', label: '头部背景' },
      { key: '--app-canvas-bg', label: '工作流画布' }
    ]
  }
]

export const shadowTokenGroups = [
  {
    title: '阴影样式',
    tokens: [
      { key: '--app-shadow', label: '通用阴影' },
      { key: '--app-shadow-hover', label: '悬浮阴影' },
      { key: '--app-header-shadow', label: '头部阴影' },
      { key: '--app-surface-shadow', label: '表面阴影' }
    ]
  }
]

export const shapeTokenGroups = [
  {
    title: '尺寸与形状',
    tokens: [
      { key: '--app-radius-card', label: '卡片圆角' },
      { key: '--app-radius-control', label: '控件圆角' },
      { key: '--app-radius-pill', label: '胶囊圆角' },
      { key: '--app-blur-surface', label: '浮层模糊' },
      { key: '--app-canvas-grid-size', label: '画布网格' }
    ]
  }
]

export const cssValueLooksSafe = (value) => {
  const next = String(value || '').trim()
  if (!next || next.length > 320) return false
  if (/[;{}<>]/.test(next)) return false
  if (/url\s*\(|expression\s*\(|@import|javascript:/i.test(next)) return false
  return /^[#a-zA-Z0-9(),.%\s\-/]+$/.test(next)
}
