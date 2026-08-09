#!/bin/bash
set -e

echo "请输入你的 sudo 密码（输入时不会显示）:"
read -s SUDO_PASS
echo ""
echo "$SUDO_PASS" | sudo -S echo "sudo 认证成功"

echo ""
echo "=== 1. 停止所有 MySQL 进程 ==="
echo "$SUDO_PASS" | sudo -S systemctl stop mysql 2>/dev/null || true
echo "$SUDO_PASS" | sudo -S pkill -9 -f mysqld 2>/dev/null || true
sleep 2

echo "=== 2. 清理旧的数据目录 ==="
echo "$SUDO_PASS" | sudo -S rm -rf /var/lib/mysql/*
echo "$SUDO_PASS" | sudo -S rm -f /var/log/mysql/error.log

echo "=== 3. 重新初始化 MySQL 数据目录 ==="
echo "$SUDO_PASS" | sudo -S mysqld --initialize-insecure --user=mysql 2>&1
echo "   初始化完成"

echo "=== 4. 启动 MySQL ==="
echo "$SUDO_PASS" | sudo -S systemctl start mysql 2>&1
sleep 3

# 检查是否启动成功
if echo "$SUDO_PASS" | sudo -S systemctl is-active --quiet mysql 2>/dev/null; then
    echo "   MySQL 启动成功"
else
    echo "   MySQL 启动失败，查看日志:"
    echo "$SUDO_PASS" | sudo -S cat /var/log/mysql/error.log 2>/dev/null | tail -20
    exit 1
fi

echo "=== 5. 设置 root 密码 ==="
mysql -u root -e "
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '123456';
" 2>&1
echo "   密码已设置为: 123456"

echo "=== 6. 验证连接 ==="
mysql -u root -p123456 -e "SELECT 'MySQL 连接成功!' AS result;" 2>&1

echo ""
echo "=== 7. 创建项目数据库 ==="
mysql -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS mvc_mainnet DEFAULT CHARACTER SET utf8mb4;" 2>&1
mysql -u root -p123456 -e "SHOW DATABASES LIKE 'mvc_mainnet';" 2>&1

echo ""
echo "=== 全部完成! ==="

# 清理密码
unset SUDO_PASS
