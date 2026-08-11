import { annotateCss } from './cssAnnotation'

const cssModules = import.meta.glob('../styles/**/*.css', {
  eager: true,
  query: '?raw',
  import: 'default'
})

/**
 * 全局样式源文件导读。
 * 新增 CSS 文件时不需要改导入列表，但建议在这里补一条说明，让参考弹窗更好读。
 */
const styleSourceGuides = {
  'app.css': '全局样式入口，只负责按顺序引入所有 CSS 文件，本身不包含组件样式。要看具体规则请打开对应文件。',
  'theme/light.css': '亮色模式兜底主题变量。:root 里是默认 token，html.dark 段是暗色模式下 Element Plus 组件适配。实际主题值由运行时动态覆盖，这里主要用来对照默认值。',
  'theme/dark.css': '暗色模式兜底主题变量，只保留 html.dark 下 Element Plus 的暗色适配，颜色本体来自默认暗色主题。',
  'base.css': '全局基础层：reset、body/#app、el-card、输入控件等通用组件样式，决定所有页面的底层排版和组件底色。',
  'layout.css': '主布局样式：Layout、GlobalMenu、MobileNavBar 的侧边栏、顶栏、内容区、移动端适配都在这。',
  'views/auth.css': '认证页样式：登录、注册、找回密码的页面容器、卡片、表单、页脚和暗色模式适配。',
  'views/settings.css': '基础信息配置页：用户信息、Bot、Docker、AI 配置等设置区块的布局与控件样式。',
  'views/plugin.css': '插件管理相关页面：插件列表、创建/编辑、详情、版本切换、元数据展示等样式。',
  'views/ai-plugin.css': 'AI 写插件工作台：会话列表、消息卡片、思考内容、工具调用、代码文件、SSE 编译状态等样式。',
  'views/workflow.css': '工作流列表和日志页面样式，与编辑器画布组件样式分开；日志表格、状态标签、详情展示都在这里。',
  'views/statistics.css': '数据统计首页：指标卡、BOT 在线状态、趋势图表、Top 工作流表格和响应式布局。',
  'views/theme-studio.css': '主题中心页面：两栏布局、主题列表、颜色/CSS 编辑器区域。',
  'components/theme-editor.css': '主题编辑器面板：颜色选择行、CSS 高亮编辑框、变量模板、选择器速查、全局样式参考弹窗。',
  'components/global-theme-editor.css': '全局悬浮主题编辑器：可拖动的面板、收起气泡、进入/退出动画和移动端尺寸适配。',
  'components/workflow.css': '工作流编辑器组件样式：连线、节点、右键菜单、执行状态栏、插件面板、配置栏、执行详情。',
  'components/pagination.css': '公共分页样式：所有 AppPagination 统一的外观、按钮、页码、输入框、移动端适配。'
}

const rawStyleSourceFiles = Object.entries(cssModules)
  .map(([path, content]) => {
    const name = path.replace('../styles/', '').replace(/\\/g, '/')
    return {
      name,
      guide: styleSourceGuides[name] || `新增全局样式文件：${name}`,
      content: String(content)
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

export const styleSourceFiles = rawStyleSourceFiles.map(file => ({
  ...file,
  content: annotateCss(file.content)
}))
