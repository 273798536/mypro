#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "==> 重启数据库（确保种子干净）"
rm -f data/conflicts.db data/conflicts.db-shm data/conflicts.db-wal

echo "==> 启动后端..."
node ./node_modules/.bin/tsx api/server.ts > /tmp/backend.log 2>&1 &
SERVER_PID=$!
echo "    server pid=$SERVER_PID，等端口 3001 起来..."

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "    后端启动 OK"
    break
  fi
  sleep 1
done

if ! curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "!!! 后端启动失败，日志："
  cat /tmp/backend.log
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo
echo "==> 运行 Python 验证脚本"
python3 test_verify.py
TEST_RC=$?

echo
echo "==> 关闭后端"
kill $SERVER_PID 2>/dev/null || true
wait 2>/dev/null || true

echo
echo "==> 测试脚本退出码: $TEST_RC"
exit $TEST_RC
