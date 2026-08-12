# GeneralBot Web 前端

QQ 机器人可视化配置与管理平台的前端，基于 Vue 3 + Vite 7 + Element Plus。

## 技术栈

- Vue 3 `<script setup>` + Vite
- Element Plus + `@element-plus/icons-vue`
- Pinia + Vue Router
- axios
- echarts（数据统计首页图表）
- highlight.js / diff（AI 写插件工作台代码展示）

## 开发运行

```bash
npm install
npm run dev
npm run build
```

开发环境 axios 默认请求 `http://localhost:8080`，生产环境走 `/api`。

## 页面

- `/statistics`：数据统计首页，展示 Bot 在线状态、插件/工作流资源数量、执行趋势（默认 7 天，可切换 15 天）和 Top 工作流
- `/plugin/list`、`/plugin/ai-list`、`/plugin/ai-create`：插件管理、AI 生成插件工作台
- `/workflow/list`、`/workflow/edit/:id?`、`/workflow/log`：工作流管理、可视化编辑、执行日志
- `/settings`：基础信息配置
- `/user/profile`：个人信息
- `/theme/studio`：主题中心，主题列表、颜色/CSS 编辑、实时预览

## 约定

- 所有请求统一走 `src/utils/request.js`，自动携带 Bearer token，仅 `code === 200` 视为成功。
- 样式统一放在 `src/styles`，页面样式按视图拆分并在 `app.css` 引入。
- 暗色主题通过 `html.dark` 与 CSS 变量控制。
- 侧边栏配色统一使用 `--sidebar-*` 主题变量（专业科技蓝方案），亮/暗模式各自定义。

## 样式与主题维护

- 新增页面样式放到 `src/styles/views/xxx.css`，新增公共组件样式放到 `src/styles/components/xxx.css`，并统一在 `src/styles/app.css` 引入；组件内不要写 `<style scoped>`。
- 新增主题变量需要同步 `src/theme/presets/defaultLight.js`、`defaultDark.js`、后端 `BuiltinThemeRegistry` 和 `src/theme/themeTokenReference.js`。
- 全局样式参考会列出 `src/styles` 下的全部 CSS 源文件；常用选择器速查由 `src/theme/themeTokenReference.js` 维护。
- 主题 CSS 编辑框和全局样式参考弹窗使用 highlight.js 高亮展示。

## 主题紧急恢复

自定义 CSS 可能把界面破坏到无法点击，因此提供两个独立于页面样式的恢复入口：

- 地址栏访问 `/?theme=reset`
- 键盘快捷键 `Ctrl + Alt + Shift + R`

触发后前端会清空本地主题快照，并调用 `POST /theme/reset` 把亮色/暗色当前主题切回内置默认主题，然后刷新页面。后端不会删除用户自定义主题，只修改当前激活槽位。
