/**
 * 全量主题变量参考表。
 * 只用于生成带注释的 CSS 模板和编辑器速查，不参与保存校验。
 */
export const themeVariableGroups = [
  {
    title: '文字与边框颜色',
    tokens: [
      { key: '--app-text', comment: '主文字：页面正文、表格、表单等主要文字颜色' },
      { key: '--app-text-soft', comment: '次文字：描述、辅助标题等次要文字颜色' },
      { key: '--app-text-muted', comment: '弱文字：提示、占位、辅助信息颜色' },
      { key: '--app-text-disabled', comment: '禁用文字：禁用按钮、禁用输入、不可点击状态' },
      { key: '--app-border', comment: '通用边框：布局分隔、头部底部、控件描边' },
      { key: '--app-border-soft', comment: '弱边框：卡片、面板、分页等较轻的边框' }
    ]
  },
  {
    title: '品牌与状态颜色',
    tokens: [
      { key: '--app-primary', comment: '主色：按钮、链接、激活项、图表主色' },
      { key: '--app-primary-hover', comment: '主色悬停：按钮 hover 与链接 hover' },
      { key: '--app-primary-soft', comment: '主色弱背景：选中背景、标签背景、提示背景' },
      { key: '--app-primary-border', comment: '主色边框：聚焦描边、主色控件边框' },
      { key: '--app-success', comment: '成功色：成功状态、成功图标、成功连线' },
      { key: '--app-warning', comment: '警告色：警告状态、警告图标' },
      { key: '--app-danger', comment: '危险色：错误、删除、失败状态、失败连线' }
    ]
  },
  {
    title: '组件颜色',
    tokens: [
      { key: '--sidebar-text', comment: '侧边栏普通文字：菜单项默认文字' },
      { key: '--sidebar-text-active', comment: '侧边栏选中文字：当前菜单项文字' },
      { key: '--sidebar-active-bg', comment: '侧边栏选中背景：当前菜单项背景' },
      { key: '--app-canvas-dot', comment: '工作流画布网格点颜色' },
      { key: '--chart-primary', comment: '统计图表主色：趋势图、柱状图' },
      { key: '--chart-warning', comment: '统计图表强调色：次要序列、提醒序列' }
    ]
  },
  {
    title: '页面背景与表面',
    tokens: [
      { key: '--auth-bg', comment: '认证页背景：登录、注册、找回密码页面' },
      { key: '--app-bg', comment: '页面主背景：body、主内容区、未指定背景的面板' },
      { key: '--app-bg-muted', comment: '弱背景：次级区块、工具栏、列表底色' },
      { key: '--app-card-bg', comment: '卡片背景：el-card 与统计卡片' },
      { key: '--app-card-bg-hover', comment: '卡片悬停背景：鼠标悬停卡片时' },
      { key: '--app-panel-bg', comment: '面板背景：配置栏、弹窗、输入控件' },
      { key: '--app-panel-muted', comment: '弱面板背景：次级面板、页签内容区' },
      { key: '--app-surface-raised', comment: '浮层背景：弹窗、下拉、气泡、较高层级表面' },
      { key: '--app-surface-raised-soft', comment: '半透明浮层：悬浮编辑器、分页容器等' },
      { key: '--sidebar-bg', comment: '侧边栏背景：左侧导航整体背景' },
      { key: '--app-header-bg', comment: '头部背景：顶部导航栏背景' },
      { key: '--app-canvas-bg', comment: '工作流画布背景：节点编辑区域' }
    ]
  },
  {
    title: '边框样式',
    tokens: [
      { key: '--app-border-card', comment: '卡片边框：el-card 边框' },
      { key: '--app-border-panel', comment: '面板边框：配置栏、分页、悬浮面板边框' },
      { key: '--app-border-control', comment: '控件边框：输入框、选择器、按钮默认边框' },
      { key: '--app-border-focus', comment: '聚焦描边：输入控件 focus 时的外圈' },
      { key: '--workflow-node-border', comment: '工作流节点边框' },
      { key: '--workflow-node-selected-outline', comment: '工作流节点选中描边' }
    ]
  },
  {
    title: '阴影与发光',
    tokens: [
      { key: '--app-shadow', comment: '通用阴影：卡片、面板默认阴影' },
      { key: '--app-shadow-hover', comment: '悬浮阴影：卡片、列表项 hover 阴影' },
      { key: '--app-header-shadow', comment: '头部阴影：顶部导航阴影' },
      { key: '--app-surface-shadow', comment: '表面阴影：浮层、分页、次级表面' },
      { key: '--workflow-node-shadow', comment: '工作流节点阴影' },
      { key: '--workflow-panel-shadow', comment: '工作流面板阴影' }
    ]
  },
  {
    title: '圆角与形状',
    tokens: [
      { key: '--app-radius-card', comment: '卡片圆角：el-card、统计卡片' },
      { key: '--app-radius-control', comment: '控件圆角：输入框、按钮、选择器' },
      { key: '--app-radius-pill', comment: '胶囊圆角：标签、徽标、胶囊按钮' },
      { key: '--app-radius-floating', comment: '悬浮窗圆角：悬浮编辑器、浮层' },
      { key: '--workflow-node-radius', comment: '工作流节点圆角' },
      { key: '--workflow-port-size', comment: '工作流节点端口尺寸' }
    ]
  },
  {
    title: '玻璃与滤镜',
    tokens: [
      { key: '--app-blur-surface', comment: '浮层模糊半径：悬浮层背景模糊' },
      { key: '--app-backdrop-filter', comment: '通用背板滤镜：面板、弹窗背景滤镜' },
      { key: '--app-header-backdrop-filter', comment: '头部背板滤镜：顶部导航背景滤镜' },
      { key: '--app-floating-backdrop-filter', comment: '悬浮窗背板滤镜：全局悬浮编辑器' }
    ]
  },
  {
    title: '间距与密度',
    tokens: [
      { key: '--app-gap', comment: '通用间距：页面、面板、列表的默认间距' },
      { key: '--app-card-padding', comment: '卡片内边距：el-card body' },
      { key: '--app-panel-padding', comment: '面板内边距：配置栏、分页面板' },
      { key: '--app-control-height', comment: '控件高度：输入框、选择器、按钮高度' },
      { key: '--app-toolbar-height', comment: '工具栏高度：画布工具栏、页面工具栏' },
      { key: '--app-list-item-height', comment: '列表项高度：插件、工作流列表项' }
    ]
  },
  {
    title: '动效',
    tokens: [
      { key: '--app-transition-fast', comment: '快速过渡：hover、focus、即时反馈' },
      { key: '--app-transition', comment: '标准过渡：主题切换、面板显示、布局变化' },
      { key: '--app-transition-slow', comment: '慢速过渡：大区域渐变、强调动画' },
      { key: '--app-ease-standard', comment: '标准缓动曲线：统一动画节奏' },
      { key: '--app-hover-translate', comment: '悬停位移：卡片 hover 上移距离' },
      { key: '--app-hover-scale', comment: '悬停缩放：图标、小控件 hover 缩放' }
    ]
  },
  {
    title: '工作流画布与节点',
    tokens: [
      { key: '--app-canvas-grid-size', comment: '画布网格尺寸：节点吸附与背景网格' },
      { key: '--workflow-plugin-panel-bg', comment: '左侧插件面板背景' },
      { key: '--workflow-toolbar-bg', comment: '画布工具栏背景' },
      { key: '--workflow-config-panel-bg', comment: '右侧配置栏背景' },
      { key: '--workflow-node-bg', comment: '工作流节点背景' },
      { key: '--workflow-node-param-bg', comment: '工作流节点参数区背景' },
      { key: '--workflow-node-port-bg', comment: '工作流节点端口中心背景' }
    ]
  },
  {
    title: '底层背景与侧边栏扩展',
    tokens: [
      { key: '--app-bg-soft', comment: '柔和页面背景：次级页面、代码区背景' },
      { key: '--app-surface', comment: '基础表面：通用容器底色' },
      { key: '--page-bg', comment: '页面背景别名：部分页面保留的旧入口' },
      { key: '--sidebar-primary', comment: '侧边栏主色：侧边栏品牌色' },
      { key: '--sidebar-text-primary', comment: '侧边栏强文字：标题、重点菜单' },
      { key: '--sidebar-icon', comment: '侧边栏图标：普通菜单图标' },
      { key: '--sidebar-icon-active', comment: '侧边栏激活图标：当前菜单图标' },
      { key: '--sidebar-hover-bg', comment: '侧边栏悬停背景：菜单 hover' },
      { key: '--sidebar-border', comment: '侧边栏边框：右侧分隔线' },
      { key: '--sidebar-divider', comment: '侧边栏分割线：菜单区块分隔' }
    ]
  },
  {
    title: '状态扩展与代码块',
    tokens: [
      { key: '--app-primary-strong', comment: '主色强调：主要按钮、强状态背景' },
      { key: '--app-primary-soft-strong', comment: '主色弱背景强：强调型标签、激活背景' },
      { key: '--app-primary-soft-weak', comment: '主色弱背景浅：轻量提示、hover 背景' },
      { key: '--app-primary-border-strong', comment: '主色强边框：选中描边、强调边框' },
      { key: '--app-success-soft', comment: '成功弱背景：成功标签、成功提示背景' },
      { key: '--app-success-border', comment: '成功边框：成功状态边框' },
      { key: '--app-danger-soft', comment: '危险弱背景：错误标签、删除悬停背景' },
      { key: '--app-danger-soft-strong', comment: '危险弱背景强：强错误提示背景' },
      { key: '--app-danger-border', comment: '危险边框：错误状态边框' },
      { key: '--app-on-primary', comment: '主色上文字：主色背景上的文字颜色' },
      { key: '--app-code-bg', comment: '代码块背景：代码查看、AI 代码区' },
      { key: '--app-code-text', comment: '代码块文字：代码查看、AI 代码区' },
      { key: '--app-header-text', comment: '头部文字：移动端头部等深色头部上的文字' },
      { key: '--app-mobile-header-bg', comment: '移动端头部背景' },
      { key: '--app-surface-border', comment: '表面边框色：表面容器分隔线' }
    ]
  }
]
