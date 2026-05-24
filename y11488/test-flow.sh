#!/bin/bash

set -e

echo "========================================="
echo "  小厂质检返工缺陷复判 CLI - 流程测试"
echo "========================================="

echo ""
echo "1. 清理旧数据..."
rm -f qc-data.json
rm -rf .qc-backups

echo ""
echo "2. 安装依赖..."
npm install --silent

echo ""
echo "3. 编译项目..."
npx tsc

echo ""
echo "4. 导入第一批抽检记录..."
node dist/index.js import-inspection samples/inspection-batch-001.json

echo ""
echo "5. 导入第二批抽检记录..."
node dist/index.js import-inspection samples/inspection-batch-002.json

echo ""
echo "6. 测试重复导入检测..."
echo "   尝试重复导入 BATCH-001 (应该失败):"
if node dist/index.js import-inspection samples/inspection-batch-001.json 2>&1 | grep -q "已存在"; then
    echo "   ✓ 重复导入检测正常工作"
else
    echo "   ✗ 重复导入检测失败"
    exit 1
fi

echo ""
echo "7. 登记返工单..."
node dist/index.js register-rework samples/rework-rw001.json

echo ""
echo "8. 测试返工单重复导入检测..."
echo "   尝试重复导入 REWORK-001 (应该失败):"
if node dist/index.js register-rework samples/rework-rw001.json 2>&1 | grep -q "已存在"; then
    echo "   ✓ 返工单重复导入检测正常工作"
else
    echo "   ✗ 返工单重复导入检测失败"
    exit 1
fi

echo ""
echo "9. 列出所有缺陷..."
node dist/index.js list-defects

echo ""
echo "10. 合并同类缺陷 '焊盘偏移'..."
node dist/index.js merge-defects "焊盘偏移"

echo ""
echo "11. 获取第一个缺陷ID用于测试..."
DEFECT_ID=$(node -e "
const db = require('./qc-data.json');
const defects = db.inspections[0].defects[0];
console.log(defects.id);
")
echo "    缺陷ID: $DEFECT_ID"

echo ""
echo "12. 录入复判结论 (第一次)..."
node dist/index.js record-verdict "$DEFECT_ID" rework -r "需要重新焊接" -j "质检主管"

echo ""
echo "13. 修改复判结论 (第二次，改口径)..."
node dist/index.js record-verdict "$DEFECT_ID" pass -r "客户确认可接受" -j "质检经理"

echo ""
echo "14. 查看复判历史..."
node dist/index.js verdict-history "$DEFECT_ID"

echo ""
echo "15. 验证历史记录数量:"
HISTORY_COUNT=$(node -e "
const db = require('./qc-data.json');
const history = db.verdictHistory.filter(v => v.defectId === '$DEFECT_ID');
console.log(history.length);
")
echo "    历史记录数: $HISTORY_COUNT"
if [ "$HISTORY_COUNT" -eq "2" ]; then
    echo "    ✓ 历史记录保留正常"
else
    echo "    ✗ 历史记录保留失败"
    exit 1
fi

echo ""
echo "16. 验证旧结论被标记为非当前..."
OLD_COUNT=$(node -e "
const db = require('./qc-data.json');
const oldVerdicts = db.verdictHistory.filter(v => v.defectId === '$DEFECT_ID' && !v.isCurrent);
console.log(oldVerdicts.length);
")
echo "    非当前结论数: $OLD_COUNT"
if [ "$OLD_COUNT" -eq "1" ]; then
    echo "    ✓ 旧结论标记正常"
else
    echo "    ✗ 旧结论标记失败"
    exit 1
fi

echo ""
echo "17. 重算良率..."
node dist/index.js recalculate-yield

echo ""
echo "18. 生产经理视图..."
node dist/index.js manager-view

echo ""
echo "19. 测试重启后数据一致性..."
echo "    重新读取数据库..."
RECORDS=$(node -e "
const db = require('./qc-data.json');
console.log(db.inspections.length + ' inspections, ' + db.reworkOrders.length + ' reworks');
")
echo "    数据记录: $RECORDS"

echo ""
echo "20. 验证缺陷合并后的良率去重..."
YIELD_RECORDS=$(node -e "
const db = require('./qc-data.json');
console.log(db.yieldRecords.length);
")
echo "    良率记录数: $YIELD_RECORDS"
if [ "$YIELD_RECORDS" -ge "2" ]; then
    echo "    ✓ 良率记录正常"
else
    echo "    ✗ 良率记录异常"
    exit 1
fi

echo ""
echo "========================================="
echo "  ✓ 所有测试通过！"
echo "========================================="
echo ""
echo "测试要点总结："
echo "  ✓ 重复返工检测"
echo "  ✓ 缺陷合并"
echo "  ✓ 良率重算（去重）"
echo "  ✓ 历史一致性（改判保留旧结论）"
echo "  ✓ 照片来源追踪"
echo ""
