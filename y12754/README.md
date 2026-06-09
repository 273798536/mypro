# 危化品领用审计工具

本地数据库 + Flask 轻量服务，用于危化品领用登记、自动审计、异常留痕、安全备注补录、配平计算联动、审计报告导出。

## 一、从空目录跑通流程

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务（首次启动会自动建库并灌入示例试剂）
python3 app.py

# 3. 另开一个终端，跑完整演示
chmod +x run_demo.sh
./run_demo.sh

# 4. 查看单个 curl 示例
cat curl_examples.sh
bash curl_examples.sh
```

服务默认监听 `http://localhost:5001`，数据库文件 `chemical_audit.db` 自动生成在项目目录下。

## 二、核心设计（对应质检工程师要求）

| 需求 | 实现 |
|---|---|
| pH/浓度越界后返工留痕 | 每次审计、补备注、配平计算都写入 `audit_logs`，报告「六、审计操作日志」完整还原来龙去脉 |
| 用本地数据库 | SQLite 单文件 `chemical_audit.db`，无需额外部署 |
| curl/脚本示例 | `curl_examples.sh`、`run_demo.sh` 两个脚本 |
| 异常不是一次性判断 | 安全备注补录后自动触发 `run_audit_on_remark` 重新审计，符合关键词自动闭环 |
| 补录后配平跟着更新 | `add_safety_remark` → `calculate_balance` 每次都会生成新版本配平（`version` 递增） |
| 报告里有普通话解释 | 报告「四、普通话说明」整段文字质检工程师可直接复制下发 |
| 异常不塞一个红数字 | 按「需要补充材料 / 需要修改口径」分类列出，每条写清下一步 |
| 人工备注保留原话 | 报告「五、人工安全备注」逐字呈现备注文本，不做润色 |
| 课题组看报告懂为什么被拦 | 每条异常同时给出填写值、标准范围、偏离程度、具体建议 |

## 三、API 速查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET  | `/api/reagents` | 试剂列表 |
| POST | `/api/requisitions` | 登记领用（自动触发首次审计） |
| GET  | `/api/requisitions` | 领用列表（含未闭环异常数） |
| GET  | `/api/requisitions/<id>` | 领用详情（异常/备注/配平/日志） |
| POST | `/api/requisitions/<id>/audit` | 手动触发重新审计 |
| POST | `/api/requisitions/<id>/remarks` | 补录安全备注（自动重审计+重配平） |
| GET  | `/api/requisitions/<id>/report` | 导出纯文本审计报告 |
| GET  | `/api/requisitions/<id>/report?format=json` | 导出 JSON 报告（含普通话解释字段） |

## 四、数据模型

- `reagents`：试剂字典（浓度、pH 标准范围）
- `requisitions`：领用登记主表
- `anomalies`：审计异常（字段 `action_type` 区分「补材料 / 改口径」，`is_resolved` 标记闭环状态）
- `safety_remarks`：人工安全备注（`remark_text` 原封不动存储）
- `audit_logs`：每一步操作留痕
- `balance_calculations`：配平计算历史（每次补备注都会 +1 版本）

## 五、重置数据库

需要清空重来时直接删除 `chemical_audit.db`，再启动 `python3 app.py` 即可自动重建。
