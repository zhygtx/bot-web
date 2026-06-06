#!/bin/bash

cd "$(dirname "$0")"

CONFIG_FILE="./deploy.config.js"
if [ -f "$CONFIG_FILE" ]; then
    PORT=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | cut -d':' -f2 | tr -d ' ')
    [ -z "$PORT" ] && PORT=80

    DIST_DIR=$(grep -o '"distDir":[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    [ -z "$DIST_DIR" ] && DIST_DIR="dist"

    NGINX_SERVER_NAME=$(grep -o '"serverName":[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    [ -z "$NGINX_SERVER_NAME" ] && NGINX_SERVER_NAME="_"

    NGINX_GZIP=$(grep -o '"gzip":[[:space:]]*[a-z]*' "$CONFIG_FILE" | head -1 | cut -d':' -f2 | tr -d ' ')
    [ "$NGINX_GZIP" = "true" ] && NGINX_GZIP_ENABLED=true || NGINX_GZIP_ENABLED=false

    NGINX_GZIP_TYPES=$(grep -o '"gzipTypes":[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    [ -z "$NGINX_GZIP_TYPES" ] && NGINX_GZIP_TYPES="text/plain text/css application/json application/javascript text/xml application/xml"

    NGINX_CACHE=$(grep -o '"cacheEnabled":[[:space:]]*[a-z]*' "$CONFIG_FILE" | cut -d':' -f2 | tr -d ' ')
    [ "$NGINX_CACHE" = "true" ] && NGINX_CACHE_ENABLED=true || NGINX_CACHE_ENABLED=false

    # 提取 API 反向代理配置
    API_PROXY_ENABLED=$(grep -o '"enabled":[[:space:]]*[a-z]*' "$CONFIG_FILE" | tail -1 | cut -d':' -f2 | tr -d ' ')
    [ "$API_PROXY_ENABLED" = "true" ] && API_PROXY_ENABLED=true || API_PROXY_ENABLED=false

    API_PROXY_TARGET=$(grep -o '"target":[[:space:]]*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    [ -z "$API_PROXY_TARGET" ] && API_PROXY_TARGET="http://localhost:8080"
else
    PORT=80
    DIST_DIR="dist"
    NGINX_SERVER_NAME="_"
    NGINX_GZIP_ENABLED=true
    NGINX_GZIP_TYPES="text/plain text/css application/json application/javascript text/xml application/xml"
    NGINX_CACHE_ENABLED=true
    API_PROXY_ENABLED=true
    API_PROXY_TARGET="http://localhost:8080"
fi

NGINX_CONF_NAME="frontend-app"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONF_AVAILABLE="$NGINX_SITES_AVAILABLE/$NGINX_CONF_NAME"
NGINX_CONF_ENABLED="$NGINX_SITES_ENABLED/$NGINX_CONF_NAME"

SKIP_DEPENDENCIES=false
SKIP_BUILD=false

parse_args() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --skip-deps) SKIP_DEPENDENCIES=true ;;
            --skip-build) SKIP_BUILD=true ;;
            *) break ;;
        esac
        shift
    done
}

check_node_installed() {
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        echo "🔍 Node.js 版本: $node_version"
        local major=$(echo $node_version | sed -n 's/^v\([0-9]\+\)\.\([0-9]\+\).*/\1/p')
        local minor=$(echo $node_version | sed -n 's/^v\([0-9]\+\)\.\([0-9]\+\).*/\2/p')
        if [[ ($major -eq 20 && $minor -ge 19) || $major -eq 21 || ($major -eq 22 && $minor -ge 12) || $major -gt 22 ]]; then
            echo "✅ Node.js 版本符合要求"
            return 0
        else
            echo "⚠️  Node.js 版本不符合要求"
            echo "   当前版本: $node_version"
            echo "   要求版本: v20.19+ 或 v22.12+"
            return 2
        fi
    else
        echo "❌ Node.js 未安装"
        return 1
    fi
}

install_node() {
    local current_node_version=$(node --version 2>/dev/null || echo "未安装")
    [ "$current_node_version" != "未安装" ] && echo "📦 Node.js 当前版本: $current_node_version，正在升级..." || echo "📦 Node.js 未安装，正在安装..."
    
    local node_version="setup_20.x"
    if command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/$node_version | sudo -E bash -
        sudo apt-get update && sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/$node_version | sudo -E bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/$node_version | sudo -E bash -
        sudo dnf install -y nodejs
    else
        echo "❌ 错误: 未找到包管理器，请手动安装 Node.js"
        exit 1
    fi

    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "❌ Node.js 或 npm 安装失败"
        exit 1
    fi
    echo "✅ Node.js 安装成功: $(node --version)"
}

install_dependencies() {
    [ "$SKIP_DEPENDENCIES" = true ] && echo "⏭️  跳过依赖检查" && return

    check_node_installed
    local node_check_result=$?
    [ $node_check_result -ne 0 ] && install_node && check_node_installed && [ $? -ne 0 ] && exit 1

    echo "📦 正在安装项目依赖..."
    npm install
    echo "✅ 项目依赖安装完成"
}

build_project() {
    [ "$SKIP_BUILD" = true ] && echo "⏭️  跳过项目构建" && return
    [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ] && [ -d "$DIST_DIR/assets" ] && echo "✅ 检测到 $DIST_DIR 已包含构建产物" && return

    echo "🏗️  正在构建项目..."
    npm run build
    [ $? -ne 0 ] && echo "❌ 构建失败" && exit 1
    echo "✅ 项目构建完成"
}

check_nginx_installed() {
    if command -v nginx &> /dev/null; then
        local version=$(nginx -v 2>&1 | grep -oP 'nginx/\K[0-9.]+')
        echo "✅ Nginx 已安装: $version"
        return 0
    else
        return 1
    fi
}

check_nginx_structure() {
    if [ -d "/etc/nginx/sites-available" ] && [ -d "/etc/nginx/sites-enabled" ]; then
        NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
        NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
        return 0
    elif [ -d "/etc/nginx/conf.d" ]; then
        NGINX_SITES_AVAILABLE="/etc/nginx/conf.d"
        NGINX_SITES_ENABLED="/etc/nginx/conf.d"
        return 1
    else
        return 2
    fi
}

install_nginx() {
    echo "📦 正在安装 Nginx..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y epel-release && sudo yum install -y nginx
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y nginx
    else
        echo "❌ 错误: 未找到包管理器，请手动安装 Nginx"
        exit 1
    fi

    [ ! command -v nginx &> /dev/null ] && echo "❌ Nginx 安装失败" && exit 1
    echo "✅ Nginx 安装成功"
}

generate_nginx_config() {
    local dist_path=$(cd "$DIST_DIR" && pwd)
    echo "📝 正在生成 Nginx 配置文件..."

    local gzip_config=""
    if [ "$NGINX_GZIP_ENABLED" = true ]; then
        gzip_config="# Gzip 压缩配置
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types $NGINX_GZIP_TYPES;"
    fi

    local cache_config=""
    if [ "$NGINX_CACHE_ENABLED" = true ]; then
        cache_config="# 静态资源缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
        try_files \$uri =404;
    }"
    fi

    cat > /tmp/frontend-app.conf << EOF
server {
    listen $PORT;
    server_name $NGINX_SERVER_NAME;
    root $dist_path;
    index index.html;

    access_log /var/log/nginx/frontend-access.log;
    error_log /var/log/nginx/frontend-error.log;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 100M;

$gzip_config

    location / {
        try_files \$uri \$uri/ /index.html;
    }

$cache_config

    # API 反向代理（末尾 / 会去掉 /api 前缀，请求 /api/user/info → 后端 /user/info）
    location /api/ {
        proxy_pass $API_PROXY_TARGET/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~ /\. {
        deny all;
    }
}
EOF
    echo "✅ Nginx 配置文件已生成"
}

configure_nginx() {
    check_nginx_installed || { echo "❌ Nginx 未安装" && exit 1; }
    check_nginx_structure
    local structure_type=$?

    generate_nginx_config
    echo "📦 正在配置 Nginx..."

    [ ! -d "$NGINX_SITES_ENABLED" ] && sudo mkdir -p "$NGINX_SITES_ENABLED"

    if [ $structure_type -eq 0 ]; then
        sudo cp /tmp/frontend-app.conf "$NGINX_CONF_AVAILABLE"
        [ -L "$NGINX_CONF_ENABLED" ] && sudo rm -f "$NGINX_CONF_ENABLED"
        sudo ln -s "$NGINX_CONF_AVAILABLE" "$NGINX_CONF_ENABLED"
        if ! grep -q "include.*sites-enabled" /etc/nginx/nginx.conf; then
            sudo sed -i '/http {/a \    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi
    else
        sudo cp /tmp/frontend-app.conf "$NGINX_SITES_ENABLED/frontend-app.conf"
    fi

    # 移除默认站点配置（避免 "Welcome to nginx!" 页面）
    if [ -f "/etc/nginx/sites-enabled/default" ] || [ -L "/etc/nginx/sites-enabled/default" ]; then
        echo "🧹 正在移除默认站点配置..."
        sudo rm -f /etc/nginx/sites-enabled/default
    fi

    echo "🔍 正在测试 Nginx 配置..."
    sudo nginx -t || { echo "❌ Nginx 配置测试失败" && exit 1; }
    echo "✅ Nginx 配置完成"
}

start_nginx() {
    echo "🚀 正在启动 Nginx..."
    if sudo systemctl is-active --quiet nginx; then
        echo "🔄 Nginx 已在运行，正在重新加载配置..."
        sudo systemctl reload nginx
    else
        sudo systemctl start nginx
        sudo systemctl enable nginx
    fi

    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx 启动成功"
        echo "🌐 访问地址: http://服务器IP:$PORT"
    else
        echo "❌ Nginx 启动失败"
        sudo journalctl -u nginx --no-pager -n 20
        exit 1
    fi
}

stop_nginx() {
    echo "⏹️  正在停止 Nginx..."
    if sudo systemctl is-active --quiet nginx; then
        sudo systemctl stop nginx
        echo "✅ Nginx 已停止"
    else
        echo "ℹ️  Nginx 未在运行"
    fi
}

restart_nginx() {
    echo "🔄 正在重启 Nginx..."
    sudo systemctl restart nginx
    sudo systemctl is-active --quiet nginx && echo "✅ Nginx 重启成功" || { echo "❌ Nginx 重启失败" && exit 1; }
}

status_nginx() {
    echo "=== 📊 Nginx 状态 ==="
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx 正在运行"
        sudo systemctl status nginx --no-pager
    else
        echo "⏹️  Nginx 未运行"
    fi
}

deploy_with_nginx() {
    build_project
    [ ! -d "$DIST_DIR" ] && [ ! -f "$DIST_DIR/index.html" ] && { echo "❌ $DIST_DIR 目录不存在或缺少构建产物" && exit 1; }

    check_nginx_installed || {
        echo "⚠️  Nginx 未安装"
        read -p "是否自动安装 Nginx? (y/n): " -n 1 -r
        echo
        [ "$REPLY" != "y" ] && [ "$REPLY" != "Y" ] && { echo "❌ 部署取消" && exit 1; }
        install_nginx
    }

    configure_nginx
    start_nginx

    echo ""
    echo "🎉 部署完成！"
    echo "🌐 访问地址: http://服务器IP:$PORT"
}

main() {
    parse_args "$@"
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
        prod)
            echo "=== 🚀 启动前端服务器 ==="
            install_dependencies
            deploy_with_nginx
            ;;
        stop)
            echo "=== ⏹️  停止前端服务器 ==="
            stop_nginx
            ;;
        restart)
            echo "=== 🔄 重启前端服务器 ==="
            restart_nginx
            ;;
        status)
            status_nginx
            ;;
        logs)
            echo "=== 📋 前端访问日志 (最近20行) ==="
            sudo tail -n 20 /var/log/nginx/frontend-access.log
            echo ""
            echo "=== ❌ 前端错误日志 (最近20行) ==="
            sudo tail -n 20 /var/log/nginx/frontend-error.log
            ;;
        nginx-install)
            echo "=== 📦 安装 Nginx ==="
            install_nginx
            ;;
        nginx-config)
            echo "=== ⚙️  配置 Nginx ==="
            configure_nginx
            ;;
        nginx-start)
            echo "=== 🚀 启动 Nginx ==="
            start_nginx
            ;;
        nginx-stop)
            echo "=== ⏹️  停止 Nginx ==="
            stop_nginx
            ;;
        nginx-restart)
            echo "=== 🔄 重启 Nginx ==="
            restart_nginx
            ;;
        nginx-status)
            status_nginx
            ;;
        nginx-reload)
            echo "=== 🔄 重新加载 Nginx 配置 ==="
            sudo systemctl reload nginx
            echo "✅ Nginx 配置已重新加载"
            ;;
        help)
            echo "=== 📖 前端部署脚本 ==="
            echo "用法: $0 {命令} [选项]"
            echo ""
            echo "常用命令:"
            echo "  install         - 安装项目依赖"
            echo "  build           - 构建项目"
            echo "  prod            - 一键部署 (构建 + Nginx配置 + 启动)"
            echo "  stop            - 停止前端服务器"
            echo "  restart         - 重启前端服务器"
            echo "  status          - 查看服务器状态"
            echo "  logs            - 查看日志"
            echo ""
            echo "Nginx 命令:"
            echo "  nginx-install   - 安装 Nginx"
            echo "  nginx-config    - 配置 Nginx"
            echo "  nginx-start     - 启动 Nginx"
            echo "  nginx-stop      - 停止 Nginx"
            echo "  nginx-restart   - 重启 Nginx"
            echo "  nginx-status    - 查看 Nginx 状态"
            echo "  nginx-reload    - 重新加载配置"
            echo ""
            echo "选项:"
            echo "  --skip-deps     - 跳过依赖安装"
            echo "  --skip-build    - 跳过项目构建"
            echo ""
            echo "示例:"
            echo "  $0 prod              # 一键部署"
            echo "  $0 prod --skip-build # 跳过构建"
            echo "  $0 restart           # 重启服务器"
            ;;
        *)
            [ -z "$1" ] && { echo "❌ 未指定命令" && echo "💡 快速开始: $0 prod" && exit 1; }
            echo "❌ 未知命令: $1"
            echo "使用 '$0 help' 查看可用命令"
            exit 1
            ;;
    esac
}

main "$@"