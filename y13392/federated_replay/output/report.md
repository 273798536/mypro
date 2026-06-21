# 联邦客户端异常回放报告

生成时间: 2026-06-21T16:53:42.792081

## 概览

| 类别 | 数量 | 状态 |
| --- | --- | --- |
| 正常回放 | 5 | ✅ 已完成 |
| 特征迟到 | 3 | ⚠️ 已隔离 |
| 失败重试 | 2 | ❌ 见失败队列 |
| 误判对比 | 2 | 🔍 见下文 |

## 特征迟到记录（已单独拎出，未混入正常结果）

| ID | 来源 | 迟到秒数 | 卡在哪 | 状态 |
| --- | --- | --- | --- | --- |
| L001 | federated_client_C | 1800s | 特征对齐阶段-等待客户端C上传超过5分钟 | ⚠️ 迟到 |
| L002 | federated_client_D | 1800s | PSI求交阶段-对端响应超时 | ⚠️ 迟到 |
| L003 | federated_client_B | 2400s | 特征拼接阶段-缺失用户画像特征集 | ⚠️ 迟到 |

## 失败队列（保留原始来源，重跑不覆盖旧证据）

最新重跑目录: `/Users/mac/pro/solo/workspaces/y13392/federated_replay/samples/failed_queue/attempt_003 (重跑证据保留在: /Users/mac/pro/solo/workspaces/y13392/federated_replay/samples/failed_queue/attempt_004)`

| ID | 来源 | 失败原因 | 状态 |
| --- | --- | --- | --- |
| F001 | federated_client_E | 客户端证书过期-TLS握手失败 | ❌ 失败 |
| F002 | federated_client_A | 特征schema不匹配-期望128维实际只收到96维 | ❌ 失败 |

## 旧模型误判样本改判解释

### 样本 M001

- 真实标签: 1
- 旧模型预测: 0 ❌
- 新模型预测: 1 ✅
- 改判原因:
  - 旧模型缺失特征: user_age, user_city_level
  - 模型版本差异: v1.2.3 → v2.0.0 新增风控特征树
  - 阈值调整: 判负阈值从0.6调整为0.45

### 样本 M002

- 真实标签: 0
- 旧模型预测: 1 ❌
- 新模型预测: 0 ✅
- 改判原因:
  - 旧模型缺失特征: device_fingerprint_hash
  - 模型版本差异: v1.2.3 → v2.0.0 设备异常特征权重下调50%
  - 阈值调整: 判正阈值从0.7调整为0.8

## 文件位置（小许接班用）

- 样例目录: `/Users/mac/pro/solo/workspaces/y13392/federated_replay/samples`
- 迟到隔离: `/Users/mac/pro/solo/workspaces/y13392/federated_replay/output/late_records`
- 失败队列: `/Users/mac/pro/solo/workspaces/y13392/federated_replay/samples/failed_queue`
- 回放结果: `/Users/mac/pro/solo/workspaces/y13392/federated_replay/output/results`
- 本报告: `/Users/mac/pro/solo/workspaces/y13392/federated_replay/output/report.md`
