#!/usr/bin/env bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="$PROJECT_DIR/data/tidal_sampling.db"

echo "正在重置数据库..."

if [ -f "$DB_PATH" ]; then
  rm -f "$DB_PATH"
  rm -f "${DB_PATH}-wal"
  rm -f "${DB_PATH}-shm"
  echo "已删除旧数据库文件"
fi

echo "数据库已重置，下次启动时将自动创建新数据库并填充种子数据"
echo ""
echo "重启开发服务器以加载新数据库："
echo "  npm run dev"
