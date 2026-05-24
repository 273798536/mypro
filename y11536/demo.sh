#!/bin/bash
set -e

echo "========================================"
echo "企业培训签到多源导入巡检 CLI - 演示脚本"
echo "========================================"
echo ""

echo "[1/8] 安装依赖..."
npm install --silent
echo "✓ 依赖安装完成"
echo ""

echo "[2/8] 编译项目..."
npm run build --silent
echo "✓ 编译完成"
echo ""

echo "[3/8] 初始化工作目录..."
npx ts-node src/cli.ts init
echo ""

echo "[4/8] 导入报名表数据..."
npx ts-node src/cli.ts import -f test-data/01_registration.csv -t registration -o HRBP_李
echo ""

echo "[5/8] 导入签到二维码数据..."
npx ts-node src/cli.ts import -f test-data/02_qrcode.csv -t qrcode -o HRBP_李
echo ""

echo "[6/8] 导入课后作业数据..."
npx ts-node src/cli.ts import -f test-data/03_homework.csv -t homework -o HRBP_李
echo ""

echo "[7/8] 导入外部回执数据（含异常）..."
npx ts-node src/cli.ts import -f test-data/04_external_receipt.csv -t external_receipt -o HRBP_李
echo ""

echo "[8/8] 运行一致性检查..."
npx ts-node src/cli.ts check -o HRBP_李
echo ""

echo "========================================"
echo "演示步骤完成！"
echo "========================================"
echo ""
echo "可用后续命令："
echo "  npx ts-node src/cli.ts list              # 查看所有记录"
echo "  npx ts-node src/cli.ts report            # 生成巡检报告"
echo "  npx ts-node src/cli.ts history -r <ID>   # 查看记录历史"
echo "  npx ts-node src/cli.ts fix -r <ID> -s confirmed -R '人工核实无误'"
echo "  npx ts-node src/cli.ts freeze -r <ID> -R '导出前锁定'"
echo "  npx ts-node src/cli.ts export            # 导出所有数据"
echo ""
