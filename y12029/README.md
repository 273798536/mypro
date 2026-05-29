# 航运燃油附加费系统

## 快速开始
```bash
pip install -r requirements.txt
python app.py
python seed_data.py
./acceptance.sh
```

## 准备运输订单

**三要素必须对齐**：

| 要素 | 在哪录入 | 必填字段 |
|------|----------|----------|
| 箱型 | `POST /api/container-types` | `code`, `name`, `teu` |
| 航线费率 | `POST /api/route-rates` | `route_code`, `version`, `effective_date`, `expiry_date`, `bunker_rate` |
| 运输订单 | `POST /api/transport-orders` | `order_no`, `container_code`, `route_code`, `sailing_date` |

**计算公式**：`总金额 = TEU × 燃油费率(USD/TEU)`

## 复现报价过期

**场景1：开航日不在有效期内**
- 航线费率有效期：2026-04-01 至 2026-06-30
- 订单开航日：2026-07-10
- 系统自动检测并标注来源：`航线费率表(EUROPE V1)`

**场景2：改单追溯 + 强制旧版本**
```bash
curl -X POST /api/surcharge/calculate \
  -d '{"order_no": "SH202605002", "route_rate_version": "V1"}'
```
- 系统会指出：开航日 2026-02-10 不在 V1 有效期 2026-01-01 至 2026-03-31 内
- 同时列出该航线所有历史版本供参考

## API 速查

| 操作 | 接口 |
|------|------|
| 计算附加费 | `POST /api/surcharge/calculate` |
| 查询详情 | `GET /api/surcharge/{id}` |
| 复核 | `POST /api/surcharge/{id}/review?comment=&approved=&reviewer=` |
| 导出CSV | `GET /api/surcharge/export[?status=]` |
| 看所有数据 | `GET /api/container-types` `/api/route-rates` `/api/transport-orders` |

## 差异说明示例（不是"处理失败"，是"卡在哪"）

```json
{
  "type": "quote_expired",
  "message": "报价过期：开航日期 2026-02-10 不在报价有效期 2026-01-01 至 2026-03-31 内",
  "source_material": "航线费率表(PACIFIC V1)",
  "detail": {
    "sailing_date": "2026-02-10",
    "effective_date": "2026-01-01",
    "expiry_date": "2026-03-31",
    "version": "V1",
    "all_versions": [{"version": "V2", "effective": "2026-04-01", "expiry": "2026-06-30"}]
  }
}
```
