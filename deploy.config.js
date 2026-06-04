// 前端部署配置文件
module.exports = {
  port: 80,                // 前端服务端口（Nginx 默认端口）
  logFile: 'frontend.log', // 日志文件名称
  distDir: 'dist',         // 构建输出目录

  // 日志轮转配置
  logMaxSize: 104857600,   // 日志最大大小（字节），默认100MB
  logBackupCount: 5,       // 保留的备份文件数量，默认5个

  // Nginx 配置
  nginx: {
    enabled: true,         // 是否使用 Nginx 部署
    serverName: '_',       // 服务器名称，'_' 表示匹配所有域名，可替换为你的域名
    gzip: true,            // 是否启用 gzip 压缩
    gzipTypes: 'text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml',
    cacheEnabled: true,    // 是否启用静态资源缓存
    apiProxy: {
      enabled: true,       // 是否启用 API 反向代理
      target: 'http://localhost:8080'  // 后端地址
    }
  }
};
