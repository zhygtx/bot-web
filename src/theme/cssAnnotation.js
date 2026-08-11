const selectorComments = {
  '.el-card': 'Element Plus 卡片容器',
  '.el-dialog': 'Element Plus 弹窗容器',
  '.el-message-box': 'Element Plus 消息确认框',
  '.el-popper': 'Element Plus 浮层容器',
  '.el-button': 'Element Plus 按钮',
  '.el-input__wrapper': '输入框容器',
  '.el-select__wrapper': '选择器容器',
  '.el-textarea__inner': '多行文本域',
  '.el-table': 'Element Plus 表格',
  '.el-pagination': '分页容器',
  '.el-pager li': '分页页码项',
  '.el-menu-item': '菜单项',
  '.el-scrollbar__wrap': '滚动区域',
  '.el-scrollbar__bar': '滚动条',
  '.el-form-item': '表单项',
  '.el-color-picker': '颜色选择器',
  '.el-segmented': '分段控件',
  '.layout-container': '主布局容器',
  '.layout-header': '顶部导航容器',
  '.layout-aside': '侧边栏容器',
  '.layout-content': '内容滚动区',
  '.global-menu-wrapper': '全局菜单外层',
  '.menu-header': '菜单头部',
  '.menu-title': '菜单标题',
  '.sidebar-scrollbar': '侧边栏滚动区',
  '.header-content': '头部内容条',
  '.mobile-nav-bar': '移动端导航',
  '.workflow-edit-view': '工作流编辑器整体',
  '.workflow-canvas': '工作流画布',
  '.workflow-node': '工作流节点',
  '.workflow-config-panel': '工作流配置面板',
  '.workflow-plugin-panel': '工作流插件面板',
  '.workflow-toolbar': '工作流工具栏',
  '.workflow-connection': '工作流连线',
  '.workflow-context-menu': '工作流右键菜单',
  '.execution-status-bar': '执行状态栏',
  '.node-execution-details': '节点执行详情',
  '.theme-studio': '主题中心整体',
  '.theme-library': '主题列表区',
  '.theme-preview-panel': '主题预览区',
  '.preview-card': '主题预览卡片',
  '.statistics-page': '统计首页整体',
  '.plugin-list': '插件列表容器',
  '.ai-plugin-workspace': 'AI 插件工作台',
  '.conversation-panel': 'AI 会话面板',
  '.message-card': 'AI 消息卡片',
  '.code-files-dialog': '代码文件弹窗'
}

/**
 * 为 CSS 源码生成带逐块注释的展示文本。
 * 只影响参考弹窗展示，不改写实际样式文件。
 */
export const annotateCss = (css) => {
  const blocks = []
  collectBlocks(css, 0, css.length, blocks)
  const insertions = blocks
    .filter(block => !hasPrecedingComment(css, block.headerStart))
    .map(block => ({
      index: block.headerStart,
      text: commentForSelector(css.slice(block.headerStart, block.headerEnd))
    }))
  return applyInsertions(css, insertions)
}

/**
 * 提取每个 CSS 文件顶层出现的类选择器，用于自动维护常用选择器速查。
 */
export const extractStyleSelectors = (css) => {
  const blocks = []
  collectBlocks(css, 0, css.length, blocks)
  const selectors = new Set()
  blocks
    .filter(block => block.depth === 0)
    .forEach(block => {
      const header = css.slice(block.headerStart, block.headerEnd).trim()
      if (/^@/.test(header)) return
      header.split(',').forEach(part => {
        const selector = part.trim()
        if (!selector || selector.includes(':deep') || selector.includes(':')) return
        const words = selector.split(/\s+/)
        if (words.length > 2) return
        if (words.some(word => !word.startsWith('.'))) return
        selectors.add(selector)
      })
    })
  return [...selectors].sort()
}

const collectBlocks = (css, start, end, blocks, depth = 0) => {
  let index = skipIgnorable(css, start, end)
  while (index < end) {
    const braceIndex = findNextChar(css, index, end, '{')
    if (braceIndex < 0) return
    const headerStart = index
    const headerEnd = braceIndex
    const bodyStart = braceIndex + 1
    const bodyEnd = findMatchingBrace(css, bodyStart, end)
    if (bodyEnd < 0) return
    blocks.push({ headerStart, headerEnd, bodyStart, bodyEnd, depth })
    collectBlocks(css, bodyStart, bodyEnd, blocks, depth + 1)
    index = skipIgnorable(css, bodyEnd + 1, end)
  }
}

const skipIgnorable = (css, start, end) => {
  let index = start
  while (index < end) {
    const char = css[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (char === '/' && css[index + 1] === '*') {
      const commentEnd = css.indexOf('*/', index + 2)
      if (commentEnd < 0) return end
      index = commentEnd + 2
      continue
    }
    break
  }
  return index
}

const findNextChar = (css, start, end, target) => {
  let index = start
  while (index < end) {
    const char = css[index]
    if (char === '/' && css[index + 1] === '*') {
      const commentEnd = css.indexOf('*/', index + 2)
      if (commentEnd < 0) return -1
      index = commentEnd + 2
      continue
    }
    if (char === '\'' || char === '"') {
      index = skipString(css, index, end)
      continue
    }
    if (char === target) return index
    index += 1
  }
  return -1
}

const findMatchingBrace = (css, start, end) => {
  let depth = 1
  let index = start
  while (index < end) {
    const char = css[index]
    if (char === '/' && css[index + 1] === '*') {
      const commentEnd = css.indexOf('*/', index + 2)
      if (commentEnd < 0) return -1
      index = commentEnd + 2
      continue
    }
    if (char === '\'' || char === '"') {
      index = skipString(css, index, end)
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
    index += 1
  }
  return -1
}

const skipString = (css, start, end) => {
  const quote = css[start]
  let index = start + 1
  while (index < end) {
    if (css[index] === '\\') {
      index += 2
      continue
    }
    if (css[index] === quote) return index + 1
    index += 1
  }
  return end
}

const hasPrecedingComment = (css, index) => {
  const before = css.slice(0, index)
  const lastCommentEnd = before.lastIndexOf('*/')
  if (lastCommentEnd < 0) return false
  const lastCommentStart = before.lastIndexOf('/*', lastCommentEnd)
  if (lastCommentStart < 0) return false
  const between = before.slice(lastCommentEnd + 2, index)
  return !between.includes('\n\n') && between.trim().length === 0
}

const commentForSelector = (header) => {
  const trimmed = header.trim()
  if (/^@media/i.test(trimmed)) return `媒体查询：${trimmed}`
  if (/^@supports/i.test(trimmed)) return `特性查询：${trimmed}`
  if (/^@keyframes/i.test(trimmed)) return `动画关键帧：${trimmed}`
  if (/^@layer/i.test(trimmed)) return `级联层：${trimmed}`
  if (/^@container/i.test(trimmed)) return `容器查询：${trimmed}`
  if (/^@font-face/i.test(trimmed)) return '自定义字体声明'

  const firstRule = trimmed.split(',')[0].trim()
  if (selectorComments[firstRule]) {
    return selectorComments[firstRule]
  }
  const firstToken = firstRule.split(/\s+/)[0]
  if (selectorComments[firstToken]) {
    return selectorComments[firstToken]
  }
  return `控制 ${humanizeSelector(firstRule)} 的样式`
}

const humanizeSelector = (selector) => {
  const cleaned = selector
    .replace(/\[[^\]]*\]/g, '')
    .replace(/::?[a-z-]+/g, '')
    .replace(/[.#]/g, ' ')
    .replace(/[\s>+~]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
  return cleaned || selector
}

const applyInsertions = (css, insertions) => {
  let result = css
  insertions.sort((a, b) => b.index - a.index)
  insertions.forEach(insertion => {
    const before = result.slice(0, insertion.index)
    const after = result.slice(insertion.index)
    const lineStart = before.lastIndexOf('\n') + 1
    const indent = before.slice(lineStart).match(/^[ \t]*/)[0]
    result = `${before}${indent}/* ${insertion.text} */\n${after}`
  })
  return result
}
