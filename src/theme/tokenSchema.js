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

export const cssValueLooksSafe = (value) => {
  const next = String(value || '').trim()
  if (!next || next.length > 420) return false
  if (/[;{}<>]/.test(next)) return false
  if (/url\s*\(|expression\s*\(|@import|javascript:/i.test(next)) return false
  return /^[#a-zA-Z0-9(),.%\s\-/]+$/.test(next)
}
