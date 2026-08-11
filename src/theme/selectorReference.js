import { extractStyleSelectors } from './cssAnnotation'

const cssModules = import.meta.glob('../styles/**/*.css', {
  query: '?raw',
  import: 'default'
})

/**
 * 按需加载全部全局 CSS，提取顶层类选择器并分组。
 * 以后新增 CSS 文件会自动出现在这里，不需要手动维护选择器列表。
 */
export const loadSelectorGroups = async () => {
  const entries = await Promise.all(
    Object.entries(cssModules).map(async ([path, load]) => {
      const name = path.replace('../styles/', '').replace(/\\/g, '/')
      return {
        title: name,
        selectors: extractStyleSelectors(String(await load()))
      }
    })
  )
  return entries
    .filter(group => group.selectors.length)
    .sort((a, b) => a.title.localeCompare(b.title))
}
