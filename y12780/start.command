#!/bin/bash
# 矿石品位滴定核对系统 - 启动脚本
# 依赖：无需安装任何依赖，纯前端页面
# 启动方式：直接在浏览器打开 index.html

cd "$(dirname "$0")"

echo "=============================================="
echo "  矿石品位滴定核对系统"
echo "=============================================="
echo ""
echo "项目目录: $(pwd)"
echo ""
echo "【依赖检查】"
echo "  ✓ 无需 npm install，无需 pip install"
echo "  ✓ 仅需现代浏览器（Chrome / Edge / Safari / Firefox）"
echo "  ✓ Chart.js 通过 CDN 加载（首次使用需联网）"
echo ""
echo "【项目结构】"
echo "  index.html          — 主页面入口"
echo "  css/style.css       — 样式文件"
echo "  js/data.js          — 样例数据（3条典型记录）"
echo "  js/app.js           — 应用逻辑"
echo ""
echo "【样例数据说明】"
echo "  REC-2026-001  铁矿石-Fe-017   ✓ 可直接用（顺利记录）"
echo "  REC-2026-002  铜矿石-Cu-042   ⚠ 待复核（有涂改、RSD超标）"
echo "  REC-2026-003  锰矿石-Mn-009   ✗ 异常（坏数据+批号重复）"
echo ""
echo "【启动方法】"

if command -v open &> /dev/null; then
    echo "  正在使用 macOS open 命令打开..."
    open "index.html"
elif command -v xdg-open &> /dev/null; then
    echo "  正在使用 Linux xdg-open 命令打开..."
    xdg-open "index.html"
elif command -v start &> /dev/null; then
    echo "  正在使用 Windows start 命令打开..."
    start "" "index.html"
else
    echo "  请手动在浏览器中打开: $(pwd)/index.html"
fi

echo ""
echo "【功能导航】"
echo "  1. 列表页：状态筛选、搜索、查看每条记录的状态标识"
echo "  2. 详情页：点击『查看核对』进入"
echo "     - 左侧：滴定谱图（Chart.js 渲染）+ 标注说明"
echo "     - 右侧：总览卡片 / 原始数据 / 试剂台账 / 异常留痕"
echo "     - 底部：文字说明 + 来源追溯（原始行号、图片名、备注）"
echo "  3. 报告导出：右上角『导出核对报告』，纯文本格式"
echo ""
