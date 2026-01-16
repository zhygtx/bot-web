#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")"

# 读取配置文件
CONFIG_FILE="./deploy.config.js"
if [ -f "$CONFIG_FILE" ]; then
    # 提取端口值
    PORT=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | cut -d':' -f2 | tr -d ' ')
    if [ -z "$PORT" ] || [ "$PORT" -eq 0 ]; then
        PORT=3000  # 默认端口，避免与后端8080冲突
    fi
    
    # 提取日志文件名
    LOG_FILE=$(grep -o '"logFile":[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    if [ -z "$LOG_FILE" ]; then
        LOG_FILE="frontend.log"  # 默认日志文件
    fi
    
    # 提取 dist 目录
    DIST_DIR=$(grep -o '"distDir":[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    if [ -z "$DIST_DIR" ]; then
        DIST_DIR="dist"  # 默认输出目录
    fi
    
    # 提取日志轮转配置
    LOG_MAX_SIZE=$(grep -o '"logMaxSize":[[:space:]]*[0-9]*' "$CONFIG_FILE" | cut -d':' -f2 | tr -d ' ')
    if [ -z "$LOG_MAX_SIZE" ] || [ "$LOG_MAX_SIZE" -eq 0 ]; then
        LOG_MAX_SIZE=104857600  # 默认100MB
    fi
    
    LOG_BACKUP_COUNT=$(grep -o '"logBackupCount":[[:space:]]*[0-9]*' "$CONFIG_FILE" | cut -d':' -f2 | tr -d ' ')
    if [ -z "$LOG_BACKUP_COUNT" ] || [ "$LOG_BACKUP_COUNT" -eq 0 ]; then
        LOG_BACKUP_COUNT=5  # 默认保留5个备份
    fi
else
    # 默认值
    DIST_DIR="dist"
    LOG_FILE="frontend.log"
    PORT=3000  # 默认端口，避免与后端8080冲突
    LOG_MAX_SIZE=104857600  # 100MB
    LOG_BACKUP_COUNT=5  # 保留5个备份
fi

SERVER_PID_FILE="server.pid"

# 命令行参数
SKIP_DEPENDENCIES=false
SKIP_BUILD=false

# 解析命令行参数
parse_args() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --skip-deps)
                SKIP_DEPENDENCIES=true
                ;;
            --skip-build)
                SKIP_BUILD=true
                ;;
            *)
                break
                ;;
        esac
        shift
    done
}

# 检查 Node.js 是否已安装且版本符合要求
check_node_installed() {
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        echo "🔍 Node.js 版本: $node_version"
        
        # 提取主版本号和次版本号（如 v20.19.1 -> 主版本20，次版本19）
        local major=$(echo $node_version | sed -n 's/^v\([0-9]\+\)\.\([0-9]\+\).*/\1/p')
        local minor=$(echo $node_version | sed -n 's/^v\([0-9]\+\)\.\([0-9]\+\).*/\2/p')
        
        # Vite 7 要求 Node.js 20.19+ 或 22.12+
        if [[ ($major -eq 20 && $minor -ge 19) || $major -eq 21 || ($major -eq 22 && $minor -ge 12) || $major -gt 22 ]]; then
            echo "✅ Node.js 版本符合要求"
            return 0
        else
            echo "⚠️  Node.js 版本不符合要求"
            echo "   当前版本: $node_version"
            echo "   要求版本: v20.19+ 或 v22.12+"
            return 2  # 返回2表示已安装但版本不符合
        fi
    else
        echo "❌ Node.js 未安装"
        return 1  # 返回1表示未安装
    fi
}

# 检查 npm 是否已安装
check_npm_installed() {
    if command -v npm &> /dev/null; then
        echo "✅ npm 已安装: $(npm --version)"
        return 0
    else
        return 1
    fi
}

# 检查 serve 是否已安装
check_serve_installed() {
    # 1. 检查全局安装的 serve
    if command -v serve &> /dev/null; then
        local version=$(serve --version 2>&1)
        if [ $? -eq 0 ]; then
            echo "✅ serve 已安装: $version"
            return 0
        fi
    fi
    
    # 2. 尝试通过 npx 检查，设置 5 秒超时
    echo "⏳ 正在检查 serve (通过 npx)..."
    if timeout 5 npx serve --version &> /dev/null; then
        echo "✅ serve 可通过 npx 使用"
        return 0
    else
        return 1
    fi
}

# 安装或升级 Node.js 和 npm
install_node() {
    local current_node_version=$(node --version 2>/dev/null || echo "未安装")
    
    if [ "$current_node_version" != "未安装" ]; then
        echo "📦 Node.js 当前版本: $current_node_version，正在升级..."
    else
        echo "📦 Node.js 未安装，正在安装..."
    fi

    # 安装 Node.js 20 LTS（v20.19+）以满足 Vite 7 要求
    local node_version="setup_20.x"
    
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        echo "📦 使用 apt-get 安装 Node.js 20 LTS..."
        curl -fsSL https://deb.nodesource.com/$node_version | sudo -E bash -
        sudo apt-get update
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        echo "📦 使用 yum 安装 Node.js 20 LTS..."
        curl -fsSL https://rpm.nodesource.com/$node_version | sudo -E bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        # Fedora
        echo "📦 使用 dnf 安装 Node.js 20 LTS..."
        curl -fsSL https://rpm.nodesource.com/$node_version | sudo -E bash -
        sudo dnf install -y nodejs
    else
        echo "❌ 错误: 未找到包管理器，无法自动安装 Node.js"
        echo "请手动安装 Node.js v20.19+ 或 v22.12+: https://nodejs.org/"
        exit 1
    fi

    # 验证安装
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "❌ 错误: Node.js 或 npm 安装失败"
        exit 1
    fi
    
    local new_node_version=$(node --version)
    echo "✅ Node.js 安装/升级成功，版本: $new_node_version"
}

# 安装 serve
install_serve() {
    echo "📦 正在安装 serve..."
    npm install -g serve
}

# 检查并安装依赖
install_dependencies() {
    if [ "$SKIP_DEPENDENCIES" = true ]; then
        echo "⏭️  跳过依赖检查和安装"
        return
    fi
    
    echo "🔍 正在检查 Node.js 和 npm..."
    
    # 检查 Node.js 版本
    check_node_installed
    local node_check_result=$?
    
    if [ $node_check_result -ne 0 ]; then
        # 如果未安装或版本不符合要求，安装或升级 Node.js
        install_node
        
        # 验证安装/升级后的版本
        check_node_installed
        if [ $? -ne 0 ]; then
            echo "❌ Node.js 安装/升级后版本仍不符合要求"
            exit 1
        fi
    fi
    
    echo "🔍 正在检查 npm..."
    if ! check_npm_installed; then
        echo "📦 npm 未安装或版本不匹配，正在重新安装..."
        install_node
    fi
    
    echo "🔍 正在检查 serve..."
    if ! check_serve_installed; then
        install_serve
    fi
    
    echo "📦 正在安装项目依赖..."
    npm install
    echo "✅ 项目依赖安装完成"
}

# 构建项目
build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        echo "⏭️  跳过项目构建"
        return
    fi
    
    # 检查 dist 目录是否存在且包含构建产物
    if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ] && [ -d "$DIST_DIR/assets" ]; then
        echo "✅ 检测到 $DIST_DIR 目录已包含构建产物，自动跳过构建"
        return
    fi
    
    echo "🏗️  正在构建项目..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败，请检查错误信息"
        echo "💡 提示：如果您已经上传了构建好的 $DIST_DIR 目录，"
        echo "💡 可以使用 ./deploy.sh prod --skip-build 跳过构建步骤"
        exit 1
    fi
    
    echo "✅ 项目构建完成，输出到 $DIST_DIR 目录"
}

# 检查进程是否运行
is_server_running() {
    if [ -f "$SERVER_PID_FILE" ]; then
        local pid=$(cat "$SERVER_PID_FILE")
        if [ ! -z "$pid" ] && [ -d "/proc/$pid" ]; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# 检查并安装 lsof
ensure_lsof_installed() {
    if ! command -v lsof &> /dev/null; then
        echo "📦 lsof 命令未找到，正在安装..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y lsof
        elif command -v yum &> /dev/null; then
            sudo yum install -y lsof
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y lsof
        else
            echo "❌ 错误: 未找到包管理器，无法自动安装 lsof"
            exit 1
        fi

        # 验证安装
        if ! command -v lsof &> /dev/null; then
            echo "❌ 错误: lsof 安装失败"
            exit 1
        fi
        echo "✅ lsof 安装成功"
    fi
}

# 日志轮转函数
log_rotate() {
    if [ ! -f "$LOG_FILE" ]; then
        return  # 日志文件不存在，不需要轮转
    fi
    
    # 获取当前日志文件大小（字节）
    local log_size=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
    
    # 检查日志大小是否超过阈值
    if [ "$log_size" -lt "$LOG_MAX_SIZE" ]; then
        return  # 日志大小未超过阈值，不需要轮转
    fi
    
    echo "📋 正在执行日志轮转..."
    
    # 获取当前日期（格式：YYYY-MM-DD）
    local current_date=$(date +"%Y-%m-%d")
    
    # 计算需要保留的最大备份数
    local max_backup=$LOG_BACKUP_COUNT
    
    # 移除最旧的备份（如果超过保留数量）
    if [ -f "${LOG_FILE}.${max_backup}.${current_date}" ]; then
        rm -f "${LOG_FILE}.${max_backup}.${current_date}"
    fi
    
    # 将现有的备份文件从n-1到1依次重命名
    local i=$((max_backup - 1))
    while [ $i -ge 1 ]; do
        if [ -f "${LOG_FILE}.${i}.${current_date}" ]; then
            local next_i=$((i + 1))
            mv "${LOG_FILE}.${i}.${current_date}" "${LOG_FILE}.${next_i}.${current_date}"
        fi
        i=$((i - 1))
    done
    
    # 将当前日志文件重命名为备份文件
    mv "$LOG_FILE" "${LOG_FILE}.1.${current_date}"
    
    echo "✅ 日志轮转完成，已保存为 ${LOG_FILE}.1.${current_date}"
    echo "📋 当前日志文件已重新创建"
}

# 终止占用端口的进程
kill_port_process() {
    ensure_lsof_installed

    local port=$1
    local pid=$(lsof -t -i:$port)
    if [ ! -z "$pid" ]; then
        echo "🔌 发现端口 $port 被进程 $pid 占用，正在终止..."
        kill -9 $pid
        echo "✅ 端口 $port 的占用进程已终止"
    else
        echo "🔌 端口 $port 未被占用"
    fi
}

# 启动服务器
start_server() {
    # 构建项目（如果需要）
    build_project

    # 再次检查 dist 目录，确保有构建产物
    if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
        echo "❌ 错误：$DIST_DIR 目录不存在或缺少构建产物"
        echo "💡 请确保已上传构建好的 $DIST_DIR 目录，或运行 ./deploy.sh build 进行构建"
        exit 1
    fi

    if is_server_running; then
        echo "🚀 服务器已在运行中 (PID: $(cat $SERVER_PID_FILE))"
        echo "🌐 访问地址: http://服务器IP:$PORT"
    else
        echo "🔌 正在清理端口 $PORT..."
        kill_port_process $PORT

        # 执行日志轮转
        log_rotate

        echo "🚀 正在启动服务器，监听端口: $PORT..."
        # 使用 serve 启动服务器，默认监听所有网卡
        nohup npx serve -s $DIST_DIR -l $PORT > "$LOG_FILE" 2>&1 &
        echo $! > "$SERVER_PID_FILE"
        echo "✅ 服务器已启动，PID: $(cat $SERVER_PID_FILE)"
        echo "🌐 访问地址: http://服务器IP:$PORT"
    fi
}

# 停止服务器
stop_server() {
    if is_server_running; then
        pid=$(cat "$SERVER_PID_FILE")
        kill "$pid"
        rm -f "$SERVER_PID_FILE"
        echo "⏹️  服务器已停止 (PID: $pid)"
    else
        echo "⏹️  服务器未运行"
    fi
    # 清理端口占用
    kill_port_process $PORT
}

# 主执行逻辑
main() {
    # 解析命令行参数
    parse_args "$@"
    
    # 移除已处理的参数
    shift $((OPTIND - 1))
    
    case "$1" in
        install)
            echo "=== 📦 安装项目依赖 ==="
            install_dependencies
            echo "✅ 依赖安装完成"
            ;;
        build)
            echo "=== 🏗️  构建项目 ==="
            install_dependencies
            build_project
            ;;
        start)
            echo "=== 🚀 启动开发服务器 ==="
            install_dependencies
            start_server
            ;;
        prod)
            echo "=== 🚀 启动生产服务器 ==="
            install_dependencies
            start_server
            ;;
        stop)
            echo "=== ⏹️  停止服务器 ==="
            stop_server
            ;;
        restart)
            echo "=== 🔄 重启服务器 ==="
            $0 stop
            sleep 2
            $0 prod "$@"
            ;;
        status)
            if is_server_running; then
                echo "✅ 服务器正在运行 (PID: $(cat $SERVER_PID_FILE))"
                echo "🌐 访问地址: http://localhost:$PORT"
                # 显示最后5行日志
                if [ -f "$LOG_FILE" ]; then
                    echo "📋 最近日志:"
                    tail -5 "$LOG_FILE"
                fi
            else
                echo "⏹️  服务器未运行"
            fi
            ;;
        logs)
            if [ -f "$LOG_FILE" ]; then
                echo "=== 📋 最近的日志 (最后20行) ==="
                tail -n 20 "$LOG_FILE"
            else
                echo "📋 日志文件不存在: $LOG_FILE"
            fi
            ;;
        help)
            echo "=== 📖 部署脚本帮助 ==="
            echo "用法: $0 {install|build|start|prod|stop|restart|status|logs|help} [选项]"
            echo ""
            echo "命令说明:"
            echo "  install     - 安装项目依赖 (包括 Node.js, npm, serve)"
            echo "  build       - 构建项目到 $DIST_DIR 目录"
            echo "  start       - 启动开发服务器 (构建并启动)"
            echo "  prod        - 启动生产服务器 (构建并启动)"
            echo "  stop        - 停止运行的服务器"
            echo "  restart     - 重启服务器"
            echo "  status      - 查看服务器状态"
            echo "  logs        - 查看最近日志"
            echo "  help        - 显示此帮助信息"
            echo ""
            echo "选项:"
            echo "  --skip-deps - 跳过依赖检查和安装"
            echo "  --skip-build - 跳过项目构建"
            echo ""
            echo "配置:"
            echo "  当前配置:"
            echo "  - 端口: $PORT"
            echo "  - 输出目录: $DIST_DIR"
            echo "  - 日志文件: $LOG_FILE"
            echo "  - 日志最大大小: $LOG_MAX_SIZE 字节（约 $((LOG_MAX_SIZE / 1024 / 1024)) MB）"
            echo "  - 日志备份数量: $LOG_BACKUP_COUNT"
            ;;
        *)
            if [ -z "$1" ]; then
                echo "❌ 未指定命令，使用 'help' 查看可用选项"
                echo "示例: ./deploy.sh help"
            else
                echo "❌ 未知命令: $1"
                echo "使用 './deploy.sh help' 查看可用命令"
            fi
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"