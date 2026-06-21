# 联邦客户端任务追踪

联邦学习客户端任务的追踪、校验和问题排查工具。

## 三步操作

### 1. 安装依赖
```bash
pip install -e .
```

### 2. 运行追踪（内置灰度样本）
```bash
fed-tracker run-sample --clear-state
```
或使用自定义配置：
```bash
fed-tracker run config/gray/sample_gray_config.yaml
```

### 3. 坏材料来了该看哪里

| 问题类型 | 排查路径 |
|---------|---------|
| 坏行详情 | `.fed_tracker_state/task_records.json` → 搜索 `bad_record` 状态的记录 |
| 跳过原因 | `.fed_tracker_state/task_records.json` → 搜索 `skipped` 状态的 `notes` 字段 |
| 改判解释 | 运行时 CLI 输出的 "🔄 改判解释" 区块，或查看 `processing_history.json` |
| 历史备注 | `.fed_tracker_state/historical_notes.json` |
| 页面摘要 | `.fed_tracker_state/task_summary.json` 的 `page_summary` 字段 |
| 状态一致性 | 执行 `fed-tracker verify` 校验历史备注、当前状态、页面摘要是否对齐 |

## 常用命令

```bash
fed-tracker summary         # 查看当前任务摘要
fed-tracker verify          # 校验状态一致性（重启/重跑后必跑）
fed-tracker clear --force   # 清除历史状态
```

## 灰度样本说明

内置 `config/gray/sample_gray_config.yaml` 包含 9 条贴近现场的混合记录：

- **正常通过** × 4 条（上海、北京、武汉、西安）
- **配置跳过** × 1 条（广州，数据质量不达标）
- **晚到附件** × 2 条（深圳 185s、南京 210s，均超过 v2 阈值 120s）
- **版本别名** × 1 条（杭州，指向 213 天前的历史索引）
- **旧模型误判** × 1 条（成都，v1 放行、v2 改判，含完整解释链）

**注意**：版本别名、晚到附件等异常记录处理结果标记为 `bad_record`，不会显示为正常通过。
