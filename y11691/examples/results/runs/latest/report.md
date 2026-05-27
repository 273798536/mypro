# 线性规划求解报告

- **版本**: v1.0-errors
- **描述**: 测试：含错误数据的方案 - 验证自动修正
- **求解状态**: 求解出错
- **求解时间**: 0.157 秒
- **生成时间**: 2026-05-27 14:31:03.361464

## 数据校验结果

共发现 2 个问题：

### 🔴 需要人工确认

- **逻辑一致性**: 产品 P2 的最大需求小于最小需求
  - 字段: `order_demands.P2`
  - 详情: {'min': 50.0, 'max': 30.0}

### 🟡 已自动修正

- **数值修正**: 产品 P1 的最小需求为负，已修正为0
  - 字段: `order_demands.P1.min_demand`
  - 修正详情: {'old_value': -10.0, 'new_value': 0.0}


## 求解结果说明

❌ **求解出错**

- 求解器异常: Pulp: Error while executing /Users/mac/Library/Python/3.9/lib/python/site-packages/pulp/apis/../solverdir/cbc/osx/i64/cbc


## 数据来源

1. **销售部** (文件: 订单.xlsx) - 录入时有误

