# 琴房课时清单归档

## 三样事

### 1. 放样例

```bash
# 安装
pip install -e .

# 完整归档（带音频、曲目表、授权备注）
qinarchive archive testdata/lessons.csv \
  -a testdata/audio \
  -t testdata/tracklist.xlsx \
  -n "2025年6月第2周授权通过" \
  --show-all
```

### 2. 重跑

```bash
# 重新导出（不改原始数据，只重跑标记逻辑）
qinarchive export testdata/lessons.csv \
  -a testdata/audio \
  -t testdata/tracklist.xlsx \
  -n "授权备注V2"

# 筛选查看
qinarchive list testdata/lessons.csv -f bad
qinarchive list testdata/lessons.csv -f old_master
qinarchive list testdata/lessons.csv -f final
```

### 3. 查看截图说明

打开 `screenshot_guide.html` 看各标记含义：
- 🔴 坏行 - 数据缺字段，原始保留不修改
- 🟡 跳过 - 备注写了作废/取消
- 🟣 旧版母带 - 文件名/备注含旧版/master/backup等
- ✅ 已处理 - 正常归档，带进度备注给老师看

---

## 排班同事走一遍

| 场景 | 数据行 | 操作 |
|------|--------|------|
| 正常记录 | 张小明 2025-06-10 | `qinarchive list testdata/lessons.csv -f final` |
| 补录记录 | 赵小天 2025-06-15 (备注: 补录6月8日) | 导出 final_archive.csv 可见标记 |
| 异常记录 | 行4(缺学生名)、行8(取消) | `qinarchive list testdata/lessons.csv -f bad` 看坏行 |

输出目录 `./archive_output/` 下7个CSV，全带原始来源和标记列。
