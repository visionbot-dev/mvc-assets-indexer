#!/bin/bash
set -e

echo "=== 1. 停止 MySQL ==="
sudo systemctl stop mysql 2>/dev/null || true
sudo pkill -f mysqld 2>/dev/null || true
sudo pkill -f mysqld_safe 2>/dev/null || true
sleep 2

echo "=== 2. 以跳过认证模式启动 MySQL ==="
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
sudo mysqld --skip-grant-tables --skip-networking --user=mysql --daemonize
sleep 2

echo "=== 3. 重置 root 密码 ==="
mysql -u root -e "
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';
"
echo "  密码已重置为: 123456"

echo "=== 4. 重启 MySQL 正常模式 ==="
sudo pkill -f mysqld 2>/dev/null || true
sleep 2
sudo systemctl start mysql
sleep 2

echo "=== 5. 验证连接 ==="
mysql -u root -p123456 -e "SELECT 'MySQL 连接成功!' AS result;"

echo ""
echo "=== 6. 创建数据库 ==="
mysql -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS mvc_mainnet DEFAULT CHARACTER SET utf8mb4; SHOW DATABASES LIKE 'mvc_mainnet';"

echo ""
echo "=== 全部完成 ==="
