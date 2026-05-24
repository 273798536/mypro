# 数据导入目录

## 支持的数据源

| 数据类型 | 文件名模式 | 必填字段 |
|---------|-----------|---------|
| 波次单 | wave_*.csv | waveNo, orderNo, skuCode, skuName, planQty, storeCode, storeName |
| 拣货差异 | pick_diff_*.csv | waveNo, orderNo, skuCode, pickQty, diffQty, diffType |
| 复核扫描 | review_scan_*.csv | waveNo, orderNo, skuCode, reviewQty, isException |
| 客服备注 | customer_note_*.csv | waveNo, orderNo, noteType, noteContent, isUrgent |
