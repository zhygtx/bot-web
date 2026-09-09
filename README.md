# GeneralBot Web 前端

GeneralBot Web 是项目的 Vue 3 管理控制台，为 Bot、插件、工作流、AI 插件、主题和运行统计提供可视化操作入口。

> **项目状态：持续更新中**
>
> 前端仍在持续开发、更新和优化。页面路由、接口调用、主题变量和交互细节可能随版本调整；部署前请重新安装依赖并执行一次生产构建。

## 功能概览

- **数据统计**：查看 Bot 在线状态、插件/工作流资源数量、执行趋势和 Top 工作流。
- **插件管理**：浏览插件、创建插件、编辑详情、维护版本和发布状态。
- **AI 生成插件**：通过对话描述需求，查看文件树与代码差异，进行代码生成、审查和编译。
- **工作流管理**：使用节点编辑器创建流程，配置触发器、参数映射、连线和执行策略。
- **执行日志**：查看工作流运行状态、节点追踪和大文本输出。
- **基础信息配置**：维护 Bot 和 NapCat 相关信息。
- **主题中心**：编辑亮色/暗色主题、颜色、CSS，并实时预览。
- **个人中心**：查看和修改账号资料、密码及邮箱相关信息。

## 技术栈

- Vue 3 `<script setup>`、Vite 7、Vue Router 4、Pinia 3
- Element Plus、`@element-plus/icons-vue`
- Axios、ECharts、Highlight.js、diff
- CSS 变量主题系统，支持亮暗色切换和运行时主题编辑

## 环境要求

- Node.js 20.19+ 或 22.12+，建议使用 LTS 版本。
- npm 10+。
- 已启动且可访问的 GeneralBot 后端；开发环境默认是 `http://localhost:8080`。

## 本地开发

```bash
cd web
npm install
npm run dev
```

Vite 默认监听 `0.0.0.0:5173`，浏览器访问 `http://localhost:5173`。

当前请求配置位于 `src/utils/request.js`：

- 开发环境基地址固定为 `http://localhost:8080`。
- 生产构建基地址为 `/api`，由反向代理转发到后端。
- 登录成功后 Token 写入浏览器 `localStorage`，请求自动添加 `Authorization: Bearer <token>`。
- 后端返回 401 时会清理本地登录信息并跳转到登录页。

如果后端端口不同，请同步修改请求基地址或在代理层提供一致的访问地址。

## 页面路由

- `/login`、`/register`、`/forgot-password`：登录、注册和找回密码。
- `/statistics`：统计首页。
- `/plugin/list`、`/plugin/create`、`/plugin/:id`：插件列表、创建和详情。
- `/plugin/ai-list`、`/plugin/ai-create`：AI 插件列表和生成工作台。
- `/workflow/list`：工作流列表。
- `/workflow/edit`、`/workflow/edit/:id`：新建和编辑工作流。
- `/workflow/log`：执行日志。
- `/settings`：基础信息配置。
- `/user/profile`：个人信息。
- `/theme/studio`：主题中心。

根路径 `/` 会重定向到 `/statistics`。

## 构建与预览

```bash
npm run build       # 生成 dist/
npm run preview     # 本地预览构建产物
```

上线前建议检查：

1. `dist/index.html` 和 `dist/assets/` 是否生成。
2. 浏览器 Network 面板中的 API 是否指向正确后端。
3. 刷新深层路由（如 `/workflow/list`）是否仍能回退到 `index.html`。
4. AI SSE 和 NapCat WebSocket 是否能穿过反向代理。

## 生产部署

推荐使用项目内的 `deploy.sh`：

```bash
chmod +x deploy.sh
./deploy.sh install       # 安装依赖
./deploy.sh build         # 安装依赖并构建
./deploy.sh prod          # 构建、生成 Nginx 配置并启动
./deploy.sh status        # 查看 Nginx 状态
./deploy.sh logs          # 查看前端访问/错误日志
./deploy.sh restart       # 重启 Nginx
./deploy.sh stop          # 停止 Nginx
./deploy.sh help          # 查看完整帮助
```

部署脚本读取 `deploy.config.js`，当前默认值为：

- 前端端口：80。
- 构建目录：`dist`。
- 后端代理：`http://localhost:8080`。
- API 代理前缀：`/api/`。
- WebSocket 路径前缀：`/ws/`。
- 开启 Gzip 和静态资源缓存。

修改域名、端口或后端地址时，请先编辑 `deploy.config.js` 再执行 `./deploy.sh prod`。如果服务器已经提前构建，也可以上传 `dist/`、`deploy.sh` 和配置文件后使用 `--skip-build`（具体选项以脚本帮助为准）。

## 反向代理要求

生产环境必须同时处理以下请求：

- `/api/`：转发到 Spring Boot 后端，并按当前 Nginx 配置去除 `/api` 前缀。
- `/ws/`：开启 `Upgrade` 和 `Connection: upgrade`，支持 NapCat 长连接。
- `/ai-plugin/generate`、`/ai-plugin/compile`：关闭代理缓冲，读取超时建议不少于 300 秒，以免 SSE 流式输出被截断。
- `/`：使用 SPA fallback，将未知前端路由回退到 `/index.html`。

## 主题维护

- 页面样式放在 `src/styles/views/`，公共组件样式放在 `src/styles/components/`。
- 新增样式后在 `src/styles/app.css` 中统一引入，组件内不使用 `<style scoped>`。
- 新增主题变量时同步更新亮色预设、暗色预设、`themeTokenReference.js` 以及后端内置主题注册表。
- CSS 编辑器和样式参考弹窗使用 Highlight.js 展示代码。

### 主题紧急恢复

自定义 CSS 导致页面不可操作时，可以：

- 访问 `/?theme=reset`；或
- 按下 `Ctrl + Alt + Shift + R`。

前端会清除本地主题快照，并调用 `POST /theme/reset` 将亮色/暗色当前主题切换回内置默认值，不会删除用户创建的主题。

## 常见问题

### 页面能打开但接口全部失败

确认后端监听 8080，检查浏览器 Network 面板中的请求地址和 CORS 错误；生产环境确认 Nginx `/api/` 代理目标正确。

### 刷新页面出现 404

这是 SPA 路由没有配置 fallback。Nginx 应使用 `try_files $uri $uri/ /index.html`；其他 Web 服务器也要配置等价规则。

### AI 生成一直等待或内容不完整

确认后端 AI Key、模型和网络连接有效，并检查代理是否关闭 SSE 缓冲、是否设置了足够的读取超时。

### WebSocket 连接失败

确认后端 `napcat.ws.server.enable=true`、端点为 `/ws/bot`，代理已开启 WebSocket Upgrade，并核对 Bot Token。

## 相关开源项目

- [bot-web](https://github.com/zhygtx/bot-web)：本前端项目的独立仓库入口，可在该仓库查看前端最新提交、发布和构建说明。
- [GeneralBot](https://github.com/zhygtx/GeneralBot)：AI 转写的单人 Python 项目版，与当前 Vue 管理控制台是两个独立项目。
- [generalbot-api](https://github.com/zhygtx/generalbot-api)：后端使用的 GeneralBot API 配套项目。
- [napcat-spring-boot-starter](https://github.com/zhygtx/napcat-spring-boot-starter)：后端 NapCat 接入所使用的 Spring Boot 启动器。

项目仍在持续更新和优化，相关仓库的接口、依赖版本和部署方式可能独立变化；跨仓库升级时请同时检查版本兼容性。
