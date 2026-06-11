#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y12344

echo "========================================"
echo "开始执行所有命令"
echo "========================================"

# 命令1: 安装包
echo ""
echo "命令1: python3 -m pip install -e ."
echo "----------------------------------------"
python3 -m pip install -e . 2>&1 | tee cmd1_output.txt
echo "返回码: $?"

# 命令2: 生成示例数据
echo ""
echo "命令2: python3 -m projectile_estimator.cli template data --with-anomalies"
echo "----------------------------------------"
python3 -m projectile_estimator.cli template data --with-anomalies 2>&1 | tee cmd2_output.txt
echo "返回码: $?"

# 命令3: 异常检测
echo ""
echo "命令3: 异常检测"
echo "----------------------------------------"
python3 -m projectile_estimator.cli check \
  -t examples/trajectory_normal.csv \
  -a examples/angle_with_overflow.csv \
  -w examples/wind_with_missing.csv 2>&1 | tee cmd3_output.txt
echo "返回码: $?"

# 命令4: 完整分析
echo ""
echo "命令4: 完整分析"
echo "----------------------------------------"
mkdir -p reports/test_fix
python3 -m projectile_estimator.cli analyze \
  -t examples/trajectory_normal.csv \
  -a examples/angle_with_overflow.csv \
  -w examples/wind_with_missing.csv \
  -f txt -f html \
  -o reports/test_fix 2>&1 | tee cmd4_output.txt
echo "返回码: $?"

# 命令5: 复现角度越界
echo ""
echo "命令5: 复现角度越界"
echo "----------------------------------------"
python3 -m projectile_estimator.cli reproduce-angle-overflow \
  -a examples/angle_with_overflow.csv \
  -t examples/trajectory_normal.csv 2>&1 | tee cmd5_output.txt
echo "返回码: $?"

# 命令6: 检查报告文件
echo ""
echo "命令6: ls -la reports/test_fix/"
echo "----------------------------------------"
ls -la reports/test_fix/ 2>&1 | tee cmd6_output.txt
echo "返回码: $?"

# 读取报告前60行
echo ""
echo "读取 reports/test_fix/analysis_report.txt 前60行"
echo "----------------------------------------"
head -60 reports/test_fix/analysis_report.txt 2>&1 | tee report_head.txt

echo ""
echo "========================================"
echo "所有命令执行完成！"
echo "========================================"
