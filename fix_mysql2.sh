#!/bin/bash

echo "=== 步骤 1: 停止 MySQL ==="
sudo systemctl stop mysql 2>/dev/null || true
sudo pkill -9 -f mysqld 2>/dev/null || true
sleep 2
echo "完成"

echo ""
echo "=== 步骤 2: 清理旧数据目录 ==="
sudo rm -rf /var/lib/mysql/*
sudo rm -f /var/log/mysql/error.log
echo "完成"

echo ""
echo "=== 步骤 3: 重新初始化 MySQL ==="
sudo mysqld --initialize-insecure --user=mysql
echo "完成"

echo ""
echo "=== 步骤 4: 启动 MySQL ==="
sudo systemctl start mysql
sleep 3
echo "完成"

echo ""
echo "=== 步骤 5: 设置 root 密码 ==="
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '123456';"
echo "完成"

echo ""
echo "=== 步骤 6: 验证连接 ==="
mysql -u root -p123456 -e "SELECT 'MySQL 连接成功!' AS result;"
echo "完成"

echo ""
echo "=== 步骤 7: 创建数据库 ==="
mysql -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS mvc_mainnet DEFAULT CHARACTER SET utf8mb4;"
mysql -u root -p123456 -e "SHOW DATABASES LIKE 'mvc_mainnet';"
echo "完成"

echo ""
echo "=== 全部完成! ==="
