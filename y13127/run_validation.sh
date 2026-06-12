#!/bin/bash
set -e

WORKDIR="/Users/mac/pro/solo/workspaces/y13127"
BACKEND_DIR="$WORKDIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
REPORT="$WORKDIR/validation_report.txt"

echo "==========================================" > "$REPORT"
echo "  后端验证报告 - $(date)" >> "$REPORT"
echo "==========================================" >> "$REPORT"
echo "" >> "$REPORT"

# ========== 步骤 1: Python 语法检查 ==========
echo "【步骤 1】Python 语法检查 (python3 -m py_compile)" >> "$REPORT"
echo "------------------------------------------" >> "$REPORT"

STEP1_PASS=true
for f in "$BACKEND_DIR/database.py" "$BACKEND_DIR/schemas.py" "$BACKEND_DIR/services.py" "$BACKEND_DIR/excel_io.py" "$BACKEND_DIR/main.py"; do
    fname=$(basename "$f")
    echo -n "  $fname: " >> "$REPORT"
    if python3 -m py_compile "$f" 2>/tmp/pyerr_$$; then
        echo "✅ 成功" >> "$REPORT"
    else
        echo "❌ 失败" >> "$REPORT"
        echo "     错误信息: $(cat /tmp/pyerr_$$)" >> "$REPORT"
        STEP1_PASS=false
    fi
done
rm -f /tmp/pyerr_$$

if [ "$STEP1_PASS" = true ]; then
    STEP1_RESULT="✅ 全部通过"
else
    STEP1_RESULT="❌ 存在失败"
fi
echo "" >> "$REPORT"
echo "步骤 1 结果: $STEP1_RESULT" >> "$REPORT"
echo "" >> "$REPORT"

# ========== 步骤 2: 创建 venv 并安装依赖 ==========
echo "【步骤 2】创建 venv 并安装 requirements.txt 依赖" >> "$REPORT"
echo "------------------------------------------" >> "$REPORT"

STEP2_PASS=true
VENV_CREATED=false

if [ -d "$VENV_DIR" ]; then
    echo "  venv 目录已存在，跳过创建" >> "$REPORT"
else
    echo -n "  创建 venv: " >> "$REPORT"
    if python3 -m venv "$VENV_DIR" 2>/tmp/venverr_$$; then
        echo "✅ 成功" >> "$REPORT"
        VENV_CREATED=true
    else
        echo "❌ 失败" >> "$REPORT"
        echo "     错误信息: $(cat /tmp/venverr_$$)" >> "$REPORT"
        STEP2_PASS=false
    fi
    rm -f /tmp/venverr_$$
fi

if [ "$STEP2_PASS" = true ]; then
    PIP="$VENV_DIR/bin/pip"
    echo -n "  安装依赖: " >> "$REPORT"
    if "$PIP" install -r "$BACKEND_DIR/requirements.txt" >/tmp/pipout_$$ 2>/tmp/piperr_$$; then
        echo "✅ 成功" >> "$REPORT"
        echo "  已安装包列表:" >> "$REPORT"
        "$PIP" list --format=columns 2>/dev/null | head -30 >> "$REPORT" || true
    else
        echo "❌ 失败" >> "$REPORT"
        echo "     错误信息: $(tail -20 /tmp/piperr_$$)" >> "$REPORT"
        STEP2_PASS=false
    fi
    rm -f /tmp/pipout_$$ /tmp/piperr_$$
fi

if [ "$STEP2_PASS" = true ]; then
    STEP2_RESULT="✅ 成功"
else
    STEP2_RESULT="❌ 失败"
fi
echo "" >> "$REPORT"
echo "步骤 2 结果: $STEP2_RESULT" >> "$REPORT"
echo "" >> "$REPORT"

# ========== 步骤 3: 验证数据库初始化 ==========
echo "【步骤 3】验证数据库初始化" >> "$REPORT"
echo "------------------------------------------" >> "$REPORT"

STEP3_PASS=true
PYTHON_BIN="$VENV_DIR/bin/python3"

if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="python3"
    echo "  (使用系统 python3)" >> "$REPORT"
fi

echo -n "  执行 init_db(): " >> "$REPORT"

if cd "$WORKDIR" && "$PYTHON_BIN" -c "
import sys
sys.path.insert(0, 'backend')
from database import init_db
init_db()
print('DB init OK')
" >/tmp/dbout_$$ 2>/tmp/dberr_$$; then
    echo "✅ 成功" >> "$REPORT"
    echo "     输出: $(cat /tmp/dbout_$$)" >> "$REPORT"
    DB_PATH="$BACKEND_DIR/data/bayesian_prior.db"
    if [ -f "$DB_PATH" ]; then
        echo "     数据库文件: $DB_PATH ($(du -h "$DB_PATH" | cut -f1))" >> "$REPORT"
    fi
else
    echo "❌ 失败" >> "$REPORT"
    echo "     stdout: $(cat /tmp/dbout_$$)" >> "$REPORT"
    echo "     stderr: $(cat /tmp/dberr_$$)" >> "$REPORT"
    STEP3_PASS=false
fi
rm -f /tmp/dbout_$$ /tmp/dberr_$$

if [ "$STEP3_PASS" = true ]; then
    STEP3_RESULT="✅ 成功"
else
    STEP3_RESULT="❌ 失败"
fi
echo "" >> "$REPORT"
echo "步骤 3 结果: $STEP3_RESULT" >> "$REPORT"
echo "" >> "$REPORT"

# ========== 最终汇总 ==========
echo "==========================================" >> "$REPORT"
echo "  验证结果汇总" >> "$REPORT"
echo "==========================================" >> "$REPORT"
echo "  步骤 1 - 语法检查:       $STEP1_RESULT" >> "$REPORT"
echo "  步骤 2 - venv+依赖安装:  $STEP2_RESULT" >> "$REPORT"
echo "  步骤 3 - 数据库初始化:   $STEP3_RESULT" >> "$REPORT"
echo "" >> "$REPORT"

if [ "$STEP1_PASS" = true ] && [ "$STEP2_PASS" = true ] && [ "$STEP3_PASS" = true ]; then
    echo "  🎉 全部验证通过！" >> "$REPORT"
else
    echo "  ⚠️  部分步骤失败，请检查上方详情" >> "$REPORT"
fi
echo "==========================================" >> "$REPORT"

cat "$REPORT"
