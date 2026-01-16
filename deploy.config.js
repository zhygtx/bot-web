// 前端部署配置文件
// 端口设置为3000，避免与后端8080端口冲突
module.exports = {
  port: 3000,             // 前端服务端口
  logFile: 'frontend.log', // 日志文件名称
  distDir: 'dist',         // 构建输出目录
  
  // 日志轮转配置
  logMaxSize: 104857600,  // 日志最大大小（字节），默认100MB
  logBackupCount: 5       // 保留的备份文件数量，默认5个
};
