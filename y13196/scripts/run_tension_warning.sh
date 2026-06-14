#!/usr/bin/env bash
#
# 滑轮组张力阈值预警 - 值班脚本调用示例
# 用法:
#   ./run_tension_warning.sh <铭牌数据文件>
#
# 退出码约定 (值班脚本可根据退出码发不同告警):
#   0 - 正常 / 未检出问题
#   2 - 加载失败（文件不存在/字段缺失/数据为空）
#   3 - 方向挂起待人工确认（方向符号疑似写反）
#   5 - 已检出预警点
#   10 - 已检出危险点

set -u

INPUT_FILE="${1:-}"
if [ -z "$INPUT_FILE" ]; then
  echo "[ERROR] 用法: $0 <铭牌数据文件路径>"
  exit 2
fi

OUTPUT_DIR="${OUTPUT_DIR:-./outputs}"
mkdir -p "$OUTPUT_DIR"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export PYTHONPATH="$WORKSPACE_ROOT:$PYTHONPATH"

LOG_FILE="$OUTPUT_DIR/tension_warning_run.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始处理: $INPUT_FILE" | tee -a "$LOG_FILE"

python3 -m tension_warning "$INPUT_FILE" --output-dir "$OUTPUT_DIR" 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

case "$EXIT_CODE" in
  0)  TAG="[正常]" ;;
  2)  TAG="[加载失败]" ;;
  3)  TAG="[方向挂起待确认]" ;;
  5)  TAG="[预警]" ;;
  10) TAG="[危险]" ;;
  *)  TAG="[未知码:$EXIT_CODE]" ;;
esac

echo "[$(date '+%Y-%m-%d %H:%M:%S')] $TAG 处理完成，退出码=$EXIT_CODE，输出目录=$OUTPUT_DIR" | tee -a "$LOG_FILE"

exit "$EXIT_CODE"
