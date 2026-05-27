#!/bin/bash
cd "$(dirname "$0")"

if [ ! -f "private_placement.db" ]; then
    echo "初始化数据库..."
    python3 init_db.py
fi

echo "启动服务器..."
python3 app.py
