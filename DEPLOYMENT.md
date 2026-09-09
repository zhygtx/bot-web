# GeneralBot Web 前端部署指南

> **项目状态：持续更新中**：部署脚本、Nginx 模板和前后端接口会持续更新。正式发布前请先在测试环境完成构建、登录、API、WebSocket 和 SSE 验证。

## 一、部署架构

推荐使用 Nginx 托管 Vue 构建产物，并将动态请求转发到 Spring Boot 后端：

```text
浏览器
  ├── /              -> Nginx -> web/dist/index.html
  ├── /api/          -> Nginx -> GeneralBot 后端 :8080
  ├── /ws/           -> Nginx -> NapCat WebSocket
  └── /ai-plugin/*   -> Nginx -> 后端 SSE 接口
```

后端部署方法请查看 [后端项目介绍与使用方法](../demo/README.md)。

## 二、服务器要求

- Linux 服务器，具备 sudo 权限。
- Nginx；脚本可以尝试自动安装。
- Node.js 20.19+ 或 22.12+、npm 10+（服务器构建时需要）。
- 后端已启动并监听 `127.0.0.1:8080` 或 `deploy.config.js` 中指定的地址。
- 防火墙放行前端端口（默认 80 或自定义端口）。

## 三、方式 A：本地构建后上传（推荐）

在开发机执行：

```bash
cd web
npm ci                    # 有 package-lock.json 时优先使用
npm run build
```

将以下内容上传到服务器同一目录，例如 `/opt/generalbot/web`：

- `dist/`
- `deploy.sh`
- `deploy.config.js`

然后部署：

```bash
cd /opt/generalbot/web
chmod +x deploy.sh
./deploy.sh prod --skip-build
```

如果当前脚本版本不识别 `--skip-build` 的位置，请运行 `./deploy.sh help`，按照脚本帮助调整参数顺序。

## 四、方式 B：服务器构建并部署

上传完整前端源码（不要上传 `node_modules/` 和旧 `dist/`），然后执行：

```bash
cd /opt/generalbot/web
chmod +x deploy.sh
./deploy.sh prod
```

脚本会依次检查 Node.js、安装 npm 依赖、执行 `npm run build`、生成 Nginx 配置并启动/重载 Nginx。

## 五、deploy.config.js 配置

默认配置位于 `web/deploy.config.js`：

```js
module.exports = {
  port: 80,
  distDir: 'dist',
  nginx: {
    enabled: true,
    serverName: '_',
    gzip: true,
    cacheEnabled: true,
    apiProxy: {
      enabled: true,
      target: 'http://localhost:8080'
    },
    wsProxy: {
      enabled: true,
      path: '/ws/',
      readTimeout: '86400s'
    }
  }
}
```

常见修改：

- 有域名时将 `serverName` 改为域名。
- 后端不在本机时修改 `apiProxy.target`。
- 前端不使用 80 端口时修改 `port`，并同步防火墙和访问地址。
- 后端 WebSocket 路径变化时同步检查 `wsProxy.path` 与后端 `napcat.ws.server.url`。

## 六、常用运维命令

```bash
./deploy.sh install       # 安装依赖
./deploy.sh build         # 安装依赖并构建
./deploy.sh prod          # 一键部署
./deploy.sh status        # 查看 Nginx 状态
./deploy.sh logs          # 查看访问日志和错误日志
./deploy.sh restart       # 重启 Nginx
./deploy.sh stop          # 停止 Nginx
./deploy.sh nginx-config  # 重新生成并安装 Nginx 配置
./deploy.sh nginx-reload  # 仅重载配置
./deploy.sh help          # 查看脚本完整帮助
```

部署完成后，默认访问：

```text
http://服务器IP/
```

如果设置了自定义端口，则使用 `http://服务器IP:端口/`；如果配置了域名，则通过域名访问。

## 七、Nginx 必须满足的规则

### SPA 路由回退

所有前端深层路由都要回退到 `index.html`，否则刷新 `/workflow/list` 等页面会出现 404：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### API 代理

生产前端请求 `/api/...`。Nginx 需要将其转发到后端，并确认是否按现有脚本配置去掉 `/api` 前缀，避免出现重复路径。

### WebSocket 代理

NapCat 连接需要 HTTP Upgrade：

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### SSE 代理

AI 生成和编译是流式接口，建议关闭缓冲并延长超时：

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 300s;
```

## 八、发布检查清单

1. `npm run build` 成功，且 `dist/index.html` 存在。
2. Nginx 配置检查通过：`sudo nginx -t`。
3. 首页、登录、注册和忘记密码页面可访问。
4. 登录后 `/api/` 请求返回业务响应而不是 404/502。
5. 刷新统计、插件、工作流深层路由不会 404。
6. NapCat WebSocket 能保持连接并显示在线状态。
7. AI SSE 能持续输出，长时间请求不会被代理提前关闭。
8. 错误日志和磁盘空间已纳入监控。

## 九、故障排查

### 502 Bad Gateway

检查后端是否运行、端口是否正确，以及 `deploy.config.js` 中的 `apiProxy.target` 是否可从 Nginx 主机访问。

### 页面刷新 404

检查 SPA fallback；不要只配置静态文件目录而遗漏 `try_files`。

### WebSocket 连接失败

检查后端 `/ws/bot`、Nginx Upgrade 头、反向代理路径和 Bot Token；必要时查看浏览器控制台与 Nginx error log。

### AI 请求超时

检查后端 AI 服务商和模型配置、服务器网络、Nginx `proxy_buffering` 及 `proxy_read_timeout`。

### 静态资源未更新

重新执行 `npm run build` 并确认上传了完整 `dist/`；若启用了长期缓存，可清理浏览器缓存或更新资源版本。
