# AB实验版本快照

> 让离线指标和线上口径的差异别藏在训练日志后面。

---

## 1. 启动（第一次跑）

把小林丢过来的三份材料按下面规则命名，放到 `snapshot_workspace/raw_materials/` 下：

```
snapshot_workspace/raw_materials/
├── v0910_training_log.txt     # 训练日志
├── v0910_normal_record.txt    # 一条正常记录（样本表，TSV）
├── v0910_verbal_note.txt      # 临时口头说明
├── v0917_training_log.txt     # （当前版同样命名，版本号不同）
├── v0917_normal_record.txt
└── v0917_verbal_note.txt
```

然后启动一次完整快照对比：

```bash
python3 ab-snapshot start --old v0910 --new v0917 --open
```

---

## 2. 重跑（材料更新后）

材料改了，想重新出报告：

```bash
# 直接基于已保存快照重跑对比（快，不会重读原始文件）
python3 ab-snapshot rerun --old v0910 --new v0917

# 重新从原始材料构建快照再对比（小林又改了某份txt时用）
python3 ab-snapshot rerun --old v0910 --new v0917 --rebuild --open
```

---

## 3. 查看截图说明

```bash
# 查看已有的截图说明（自动打开浏览器）
python3 ab-snapshot view --old v0910 --new v0917

# 或者用快照ID
python3 ab-snapshot view --snapshot-id v0910__vs__v0917

# 列出所有生成过的快照和报告
python3 ab-snapshot view --list

# 只打印文件路径不打开浏览器
python3 ab-snapshot view --old v0910 --new v0917 --no-browser
```

复核人截图说明分四块：✅已处理（无变化） / 🚨需重点复核（指标/阈值/样本异动+特征迟到） / ✏️人工改判 / 📋待补材料

---

### 输入文件格式速查（normal_record TSV）

| sample_id | f_age | f_city | latency_ms | is_feature_late | evidence_refs       | label | prediction |
|-----------|-------|--------|------------|-----------------|---------------------|-------|------------|
| S001      | 32    | bj     | 120        | 0               | s3://ev/S001.parquet | 1     | 0.92       |

`metric`/`manual_adjustment` 也用TSV，字段参考示例目录即可。
