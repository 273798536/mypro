#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_NODE="$ROOT_DIR/node-v20.12.2-darwin-x64/bin"
LOCAL_NODE="/Users/mac/.local/bin"
HOMEBREW_NODE="/opt/homebrew/bin"

detect_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "$PROJECT_NODE/node" ] && [ -e "$PROJECT_NODE/npm" ]; then
    export PATH="$PROJECT_NODE:$PATH"
    return 0
  fi
  if [ -x "$LOCAL_NODE/node" ] && [ -x "$LOCAL_NODE/npm" ]; then
    export PATH="$LOCAL_NODE:$PATH"
    return 0
  fi
  if [ -x "$HOMEBREW_NODE/node" ] && [ -x "$HOMEBREW_NODE/npm" ]; then
    export PATH="$HOMEBREW_NODE:$PATH"
    return 0
  fi
  echo "[ERROR] 未找到 node/npm。请先安装 Node.js 20+，或将 node/npm 放入 $PROJECT_NODE/"
  exit 1
}

detect_node

export NO_UPDATE_NOTIFIER=1
export DO_NOT_TRACK=1
export DISABLE_IPC=1

if [ $# -eq 0 ]; then
  echo "用法: ./run.sh <command>"
  echo "  可用命令: install | check | lint | dev | client:dev | server:dev | build"
  exit 1
fi

cd "$ROOT_DIR"
exec npm run "$@"
