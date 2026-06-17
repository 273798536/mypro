# 少样本评测抽样器

MLOps 日常人工评测工具：从脏数据里抽一小批出来，标记异常、录入人工反馈、追溯处理链路，导出报告给非技术同事看。

---

## 0. 安装

```bash
cd fewshot-sampler
python3 -m pip install -r requirements.txt
python3 -m pip install -e .        # 可选，装完可以直接敲 fewshot-sampler
```

没装 `-e` 也能用，把下面命令里的 `fewshot-sampler` 换成 `python3 -m fewshot_sampler.cli`。

---

## 1. 启动 + 导入（一条命令搞定，不用手工整理数据）

**支持的文件：** `.csv` / `.xlsx` / `.xls`，格式乱、字段脏没关系，工具自己检测。

**样例数据在：** `sample_data/sales_dirty.csv`（已经混好了旧表、补录备注、漏填单位、重复、时间回滚等日常问题）

```bash
# 最简用法：从 csv 抽 50 条
fewshot-sampler run sample_data/sales_dirty.csv

# 常用参数版：抽 60 条，按"部门"分层，写个备注方便以后找
fewshot-sampler run sample_data/sales_dirty.csv \
    -n 60 \
    --stratify-by 部门 \
    --desc "Q2销售数据人工评测批次"
```

跑完终端会输出一个 **批次 ID**（形如 `Bxxxxxxxx`），后续步骤都靠它。

---

## 2. 查看异常

```bash
# 看所有批次
fewshot-sampler list

# 看某个批次的抽样明细（表格里直接能看到异常类型和评分）
fewshot-sampler list <批次ID>

# 只看有异常的，最多看 50 条
fewshot-sampler list <批次ID> -a -l 50
```

异常类型（工具自己识别的，别信，要人工复核）：

| 类型 | 说明 | 严重度参考 |
|------|------|-----------|
| 缺少单位 | 金额/数量/重量这类字段没写单位 | 中 |
| 补录备注 | 字段里含"补录/更正/后补"等字样，说明是事后补的 | 中 |
| 旧表结构 | 还在用 legacy_id、old_code 这类老系统字段 | 低 |
| 数值异常 | IQR 方法识别到的离群值 | 中高 |
| 格式不一致 | 数值字段里混了文字，没法当数字算 | 中高 |
| 重复记录 | 多行关键字段相同 | 高 |
| 长文本截断 | 字段过长，导出 Excel 时会截断，有单独说明页 | 低 |
| **版本回滚** | **时间/版本号倒序，系统怀疑是版本回滚产生的脏数据** | **极高（别当正常样例！）** |

---

## 3. 顺着一条异常往回查（验收路径）

**真正验收的时候，按下面这条线查，能看到人工反馈 + 处理意见 + 时间线就算顺：**

```bash
# 第1步：list 里找到一条有异常的记录ID（形如 abcdef123456）
fewshot-sampler list <批次ID> -a

# 第2步：trace 这条记录，看到完整追溯链
fewshot-sampler trace <批次ID> <记录ID>

# 如果该记录有多条异常，指定第几条（从0开始）
fewshot-sampler trace <批次ID> <记录ID> -i 1
```

追溯链会显示：
1. 抽样记录本身（来源文件、原始行号、抽样方式）
2. 异常详情（字段、原始值、严重程度、期望值）
3. **人工反馈（处理人、处理意见、处理结论）** ← 你要找的
4. **共享处理时间线（评测回放 + 安全拦截共用同一批记录）** ← 也是你要找的

---

## 4. 录入人工反馈

这是把"人判断过的结果"写入系统，后面 trace 和 export 都会用到。

```bash
# 标记为确认异常
fewshot-sampler feedback <批次ID> <记录ID> \
    -t confirmed \
    -c "确实是缺少单位，合同附件里写的是万元" \
    -r "已通知运营同事在源系统补录" \
    -u 张三

# 标记为误报（系统标错了，正常数据）
fewshot-sampler feedback <批次ID> <记录ID> \
    -t false \
    -c "这个字段就是不填单位的，之前的字段配置理解错了" \
    -u 李四

# 标记为已处理
fewshot-sampler feedback <批次ID> <记录ID> \
    -t resolved \
    -c "数据已在源表修正" \
    -r "覆盖更新，旧值在版本管理里有留存" \
    -u 王五
```

状态参数 `-t` 可选值：
- `pending` 待审核（默认）
- `confirmed` 确认异常
- `false` 误报
- `needinfo` 待补充信息
- `resolved` 已处理

---

## 5. 导出结果（转给不懂代码的同事看）

**推荐 xlsx 格式**，打开就是 5 个工作表，不用解释字段缩写：

```bash
fewshot-sampler export <批次ID> Q2评测报告.xlsx
```

Excel 里有什么（不用翻代码，看名字就懂）：

| Sheet 名 | 给谁看 | 内容 |
|----------|--------|------|
| 0-总览 | 所有人 | 一眼看抽样数、异常数、反馈完成度 |
| 1-抽样明细 | 业务同事 | 一行一条数据，最重要的业务字段都在，**异常行标红色** |
| 2-异常清单 | 处理数据的人 | 每条异常一行，**含"处理建议"列**（比如"补填金额单位"） |
| 3-人工反馈 | 负责人 | 谁、什么时候、判断了什么、怎么处理的 |
| 4-截断说明 | 所有人 | 长文本为什么被截断——**写的是人话，不是字段名缩写** |
| 5-处理时间线 | MLOps 内部 | **评测回放和安全拦截共用的记录**，两边不会各算各的 |

> **长文本截断的说明**：不会只写"xxx_desc 超过长度"，会告诉你是"描述/备注类字段，内容过长是正常业务情况"还是"换行过多疑似拼了多条记录"。

---

## 6. 其他命令

```bash
# 删除批次（操作不可恢复）
fewshot-sampler delete <批次ID>

# 指定存储目录（默认 ./.fewshot_storage，也可用环境变量 FEWSHOT_STORAGE）
fewshot-sampler -s /data/fewshot run data.csv
```

---

## 存储目录结构

默认 `./.fewshot_storage/`：

```
.fewshot_storage/
├── batches/
│   └── Bxxxxxxxx/            # 每批次一个目录
│       ├── meta.json         # 批次元信息
│       ├── records.json      # 抽样记录（完整数据）
│       ├── anomalies.jsonl   # 异常明细（一行一条，方便grep）
│       ├── playback_log.jsonl   # 评测回放日志
│       └── intercept_log.jsonl  # 安全拦截日志（和回放共用批次）
└── feedback/
    ├── feedback_index.jsonl  # 所有反馈的索引
    └── FB-xxxx.json          # 单条反馈详情
```

---

## 验收 Checklist（真正跑起来用这个）

1. ✅ `run` 命令能跑通，终端显示异常类型分布
2. ✅ 打开导出的 xlsx，**不用问任何人就能看懂每个 sheet**
3. ✅ 找一条有"版本回滚"的异常，`trace` 能看到标注"别当正常样例"
4. ✅ 用 `feedback` 录一条反馈，再 `trace` 同一条记录，**人工反馈出现在追溯链里**
5. ✅ 导出 xlsx 的"处理时间线"里能看到刚才 feedback 的操作（回放+拦截都有）
6. ✅ 找一条"长文本截断"，打开 xlsx 的"截断说明"sheet，**写的是人话不是缩写**
