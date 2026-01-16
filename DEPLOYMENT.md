# 前端项目部署指南

## 部署方式一：本地构建，服务器启动（推荐）

### 1. 本地构建

在本地开发环境执行以下命令：

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 准备部署文件

将以下文件和文件夹上传到服务器的同一目录（如 `/opt/web`）：

- `dist/`：构建产物文件夹
- `deploy.sh`：部署脚本
- `package.json`：项目依赖配置
- `vite.config.js`：Vite 构建配置
- `index.html`：项目入口文件
- `deploy.config.js`：部署脚本配置（可选，如需自定义配置）

### 3. 服务器部署

在服务器上执行以下命令：

```bash
# 赋予脚本执行权限
chmod +x deploy.sh

# 启动生产服务器（会自动检查依赖）
./deploy.sh prod
```

## 部署方式二：服务器构建和启动

### 1. 准备部署文件

将整个项目代码上传到服务器（除了 `node_modules/` 和 `dist/`）。

### 2. 服务器部署

在服务器上执行以下命令：

```bash
# 赋予脚本执行权限
chmod +x deploy.sh

# 启动生产服务器（会自动安装依赖和构建）
./deploy.sh prod
```

## 配置说明

### 自定义端口

修改 `deploy.config.js` 文件：

```javascript
module.exports = {
  port: 3000,             // 前端服务端口
  logFile: 'frontend.log', // 日志文件名
  distDir: 'dist'         // 构建产物目录
}
```

### 日志轮转配置

```javascript
module.exports = {
  logMaxSize: 104857600,  // 日志最大大小（100MB）
  logBackupCount: 5       // 保留备份数量
}
```

## 常用命令

```bash
# 查看服务器状态
./deploy.sh status

# 停止服务器
./deploy.sh stop

# 重启服务器
./deploy.sh restart

# 查看日志
./deploy.sh logs

# 仅安装依赖
./deploy.sh install

# 仅构建项目
./deploy.sh build
```

## 访问方式

部署成功后，通过以下地址访问前端服务：
