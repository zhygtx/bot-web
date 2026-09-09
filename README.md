# GeneralBot Web 前端

GeneralBot Web 是项目的 Vue 3 管理控制台，面向 Bot、插件、工作流、AI 生成插件、主题和运行统计提供可视化操作界面。

> **项目状态：持续更新中**
>
> 前端仍在持续开发、更新和优化，页面路由、组件交互、主题变量和后端接口可能随版本变化。部署前建议重新安装依赖并执行完整构建验证。

## 功能模块

- 数据统计：Bot 在线状态、插件/工作流数量、执行趋势和 Top 工作流。
- 插件管理：插件列表、创建/编辑、详情、版本和公开状态管理。
- AI 生成插件：对话式描述需求、查看文件树和代码差异、流式生成、审查与编译。
- 工作流管理：可视化节点编辑、连线、参数映射、测试运行和执行日志。
- 基础信息配置：Bot 与 NapCat 相关配置入口。
- 主题中心：主题列表、亮暗色主题、颜色/CSS 编辑、实时预览和恢复默认主题。
- 个人中心：账号资料、邮箱及密码相关操作。

## 技术栈

- Vue 3 `<script setup>`、Vite 7、Vue Router 4、Pinia 3
- Element Plus、Element Plus Icons
- Axios、ECharts、Highlight.js、diff
- CSS 变量主题系统，支持亮色/暗色模式和运行时主题编辑

## 环境要求

- Node.js 20.19+ 或 22.12+（建议使用 LTS）
- npm 10+
- 可访问的 GeneralBot 后端，默认地址为 `http://localhost:8080`

## 本地开发

```bash
cd web
npm install
npm run dev
```

开发服务器默认监听 `0.0.0.0:5173`，访问 <http://localhost:5173>。当前 `src/utils/request.js` 在开发环境使用 `http://localhost:8080` 作为 API 地址，因此本地后端应运行在该地址；如后端端口不同，请同步修改该文件或按项目后续版本提供的环境变量配置调整。

## 构建与预览

```bash
npm run build       # 生成 dist/
npm run preview     # 本地预览构建产物
```

构建前建议确认后端接口可访问、依赖安装完整，并检查浏览器控制台是否存在跨域或资源路径错误。

## 页面路由

| 路由 | 页面 |
| --- | --- |
| `/login`、`/register`、`/forgot-password` | 登录、注册、找回密码 |
| `/statistics` | 数据统计首页 |
| `/plugin/list`、`/plugin/:id`、`/plugin/create` | 插件列表、详情和创建 |
| `/plugin/ai-list`、`/plugin/ai-create` | AI 插件列表和生成工作台 |
| `/workflow/list`、`/workflow/edit`、`/workflow/edit/:id` | 工作流列表、新建和编辑 |
| `/workflow/log` | 工作流执行日志 |
| `/settings` | 基础信息配置 |
| `/user/profile` | 个人信息 |
| `/theme/studio` | 主题中心 |

根路径 `/` 会重定向到 `/statistics`。登录成功后 Token 保存在浏览器 `localStorage`，请求拦截器自动添加 `Authorization: Bearer ...`；后端返回 401 时会清理本地登录状态并跳回登录页。

## API 地址与反向代理

- 开发环境：Axios 基地址为 `http://localhost:8080`。
- 生产环境：Axios 基地址为 `/api`，由 Nginx 将 `/api/` 转发到后端并去掉 `/api` 前缀。
- NapCat WebSocket：默认路径为 `/ws/bot`，Nginx 需要开启 Upgrade/Connection 转发。
- AI 生成和编译使用 SSE，代理配置必须关闭缓冲并设置足够长的读取超时。

生产部署配置位于 `deploy.config.js`，默认端口 80、构建目录 `dist`、后端代理 `http://localhost:8080`。修改域名、端口或后端地址后再执行部署脚本。

## Linux 一键部署

`deploy.sh` 适用于 Linux，能够检查 Node.js、安装依赖、构建项目、生成 Nginx 配置并启动 Nginx：

```bash
chmod +x deploy.sh
./deploy.sh install       # 仅安装依赖
./deploy.sh build         # 安装依赖并构建
./deploy.sh prod          # 构建 + Nginx 配置 + 启动
./deploy.sh status        # 查看 Nginx 状态
./deploy.sh logs          # 查看前端访问/错误日志
./deploy.sh restart       # 重启 Nginx
./deploy.sh stop          # 停止 Nginx
./deploy.sh help          # 查看全部命令和选项
```

也可以先在本地执行 `npm run build`，只上传 `dist/` 与部署脚本到服务器。脚本会生成 `/api/`、WebSocket 和 SSE 反向代理；使用前请确认当前用户具备 Nginx 配置和 systemd 操作权限。

Windows 开发环境直接使用 `npm run dev` 即可；`run.bat` 是针对本机目录的快捷脚本，如项目路径发生变化请先检查并修改其中的路径。

## 主题维护

- 页面样式放在 `src/styles/views/`，公共组件样式放在 `src/styles/components/`，统一由 `src/styles/app.css` 引入。
- 新增主题变量时，需要同步亮/暗色预设、主题 Token 引用，以及后端内置主题注册表。
- 自定义 CSS 可能导致页面不可操作，提供两个独立恢复入口：访问 `/?theme=reset`，或按 `Ctrl + Alt + Shift + R`。恢复操作会清理本地主题快照，并调用 `POST /theme/reset` 将当前亮/暗主题切回内置默认值，不会删除用户自定义主题。

## 常见问题

### 页面打开但接口全部失败

确认后端已启动并监听 8080；若端口或地址不同，修改 Axios 基地址或配置反向代理，并检查浏览器 Network 面板。

### 刷新页面出现 404

生产环境必须配置 SPA fallback，将未知路径回退到 `index.html`。项目生成的 Nginx 配置已使用 `try_files $uri $uri/ /index.html`。

### AI 生成内容不完整或一直等待

检查后端 AI Key、模型和网络连通性，并确认 Nginx 对 `/ai-plugin/generate`、`/ai-plugin/compile` 关闭代理缓冲且读取超时不少于 300 秒。

### WebSocket 连接不上

确认后端 `napcat.ws.server.enable=true`、路径为 `/ws/bot`，代理层已转发 WebSocket Upgrade，并检查 Token 与 Bot 配置一致。
