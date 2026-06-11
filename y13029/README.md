# 券商适当性风险预警系统（本地版）

**适用对象**：风控小林  
**交付承诺**：`导入 → 确认/撤回 → 报告` 四个接口全部接入同一份 SQLite 本地数据；同一批材料跑两遍、补备注后，历史记录和 Markdown 报告一定能对上。  
**关键修复（2026-06-09 收尾版）**：第二次导入后新冒出来的 `conflict`（双口径冲突）会在 `finalize` 步骤自动收尾，不会再卡在中间状态。

---

## 一、小林「照着抄」的核心流程

> 只要按顺序执行下面 9 条命令，结果一定可靠。任何一步 `ok=false` 停下来看 error 字段即可。

```bash
cd /Users/mac/pro/solo/workspaces/y13029

# 0. 清场（第一次做或重跑演示时用）
rm -rf data reports

# 1. 初始化数据库（表结构自动迁移）
python3 warning.py init
# 期望: {"ok": true, "message": "数据库已初始化/迁移完成", ...}

# 2. 第一次导入托管回执（含双口径冲突 + RMB币种错 + NOT_A_NUMBER坏数据）
python3 warning.py import sample_materials/托管回执_20260609_batch01.csv --batch-id 20260609-01
# 期望: import_round=1，new_warnings≈12，new_conflicts≈2，bad_data>=1

# 3. 导入晚到附件（同批次）
python3 warning.py import sample_materials/托管回执_晚到附件_20260609_batch01.csv --batch-id 20260609-01
# 期望: import_round=2，新增 黄十三(R5)、刘十四(R4) 两条预警

# 4. 先看一眼当前状态（可选：列出郑十的币种错 + 所有冲突）
python3 warning.py list --status pending_confirm
python3 warning.py conflicts --batch-id 20260609-01

# 5. 人工确认币种错误（原因 + 下一步必填，卡住坏币种就是靠这一步）
#    先从第4步的 list 结果里找到「郑十 INV008」那条 pending_confirm 预警的 ID，替换下方 <ID郑十>
python3 warning.py confirm <ID郑十> --operator 小林 \
    --reason currency_mismatch \
    --note "原因: CSV里币种字段写的RMB非规范写法; 下一步: 已核对晚到附件，实际应为CNY，放行" \
    --conclusion "币种写错(RMB→CNY): 人工复核后通过，投资者R5与激进型产品匹配"

# 6. 关联晚到附件并确认结论（黄十三那笔）
#    先从 list 中找到黄十三的预警ID替换 <ID黄十三>
python3 warning.py link-attachment <ID黄十三> \
    --attachment "晚到附件_托管回执_晚到附件_20260609_batch01.csv:行1-私募基金申购确认单" \
    --conclusion "附件已核验，客户签署高风险告知书，确认通过" \
    --operator 小林

# 7. 同一批材料跑第二遍导入（README必须验证的关键场景）
python3 warning.py import sample_materials/托管回执_20260609_batch01.csv --batch-id 20260609-01
# 期望: import_round=3，skipped_duplicates=12（SHA1指纹全重复，新预警数=0），
#      但可能会基于新的数据重新生成第二轮 conflict（ID 3/4）—— 这是 bug 的历史遗留，下一步 finalize 会自动解决

# 8. 给任意一条预警补备注（历史记录对齐）
python3 warning.py remark 1 "小林备注：本批次已完成第2轮导入、人工确认、附件关联，进入收尾" --operator 小林

# 9. ⭐ 收尾关键 —— 自动解决所有冲突 + 批量确认 + 一致性检查
python3 warning.py finalize 20260609-01 --operator 小林
# 期望: resolve_all 下 resolved_count >= 冲突总数（含第二轮新冒出的 ID 3/4），
#      check 下 clean=true，pending=0，conflict=0，open_conflicts=0

# 10. 导出前一致性检查（独立于 finalize，用于双重校验）
python3 warning.py check 20260609-01
# 期望: clean=true，issues=[]

# 11. 生成 Markdown 报告（clean=false 会被拒绝，需先回到第9步）
python3 warning.py report 20260609-01
# 期望: report_path 指向 reports/warning_report_20260609-01_CLEAN_*.md
```

不想一条条敲的话，直接跑：

```bash
rm -rf data reports && python3 run_demo.py
```

---

## 二、常用命令速查

### 查看类

| 命令 | 用途 | 等价操作 |
|---|---|---|
| `python3 warning.py list --batch-id 20260609-01` | 本批次所有预警（含状态/来源行号/轮次） | 打开数据库查 risk_warnings |
| `python3 warning.py list --status conflict` | 所有还卡在冲突状态的预警 | |
| `python3 warning.py conflicts --batch-id 20260609-01` | 双口径冲突列表（含 ✅resolved / ❌未解决） | |
| `python3 warning.py history <warning_id>` | 单条预警的全生命周期操作历史 | 审计算账用 |
| `python3 warning.py bad-data` | 坏数据（带原始文件名+行号+字段） | 不阻塞主流程 |
| `python3 warning.py rounds 20260609-01` | 查看每一轮导入的回执/预警/坏数据/冲突计数 | 定位重复导入问题 |
| `python3 warning.py batches` | 所有批次的一致性概览（是否clean） | |
| `python3 warning.py list-reports` | 列 reports/ 下的报告 | |

### 操作类

| 命令 | 用途 |
|---|---|
| `confirm <id>` | 单条确认（币种错误/晚到附件/其他原因，`--note`必填说明下一步） |
| `confirm-batch <batch_id>` | 批量确认所有 pending_confirm 和 imported |
| `withdraw <id> --reason "..."` | 撤回已确认 |
| `remark <id> "备注文本"` | 任意状态加备注（保留历史） |
| `resolve-conflict <cid> --keep 1,3 --resolution "..."` | 手动挑保留ID解决冲突 |
| `resolve-all <batch_id>` | 按口径优先级自动解冲突 |
| **`finalize <batch_id>`** | ⭐ **收尾三步骤：resolve-all → confirm-batch → check** |
| `check <batch_id>` | 导出前一致性检查 |

---

## 三、口径优先级 & 冲突自动解决规则

`finalize` / `resolve-all` 默认保留优先级（前→后，命中第一个就留）：

```
口径A-申购金额  >  口径A-交易流水  >  口径B-净资产变动  >  口径A-份额变动  >  口径B-收入实现  >  口径C-其他
```

同组冲突中，按此优先级最高的那条「保留并自动确认」，其他的「标记为双口径撤回」。  
需要调整优先级时：

```bash
python3 warning.py finalize 20260609-01 \
  --calibre-order "口径B-净资产变动,口径A-申购金额,..."
```

---

## 四、小林收尾验收清单（核心检查点）

每跑一批材料，按下面 ✅❌ 打勾，**全打勾才能把报告发给合规**：

### 🧪 导入阶段
- [ ] `import` 返回 `ok=true`，且 `new_warnings + skipped_duplicates` ≈ 原始 CSV 行数
- [ ] `rounds <batch_id>` 显示每一轮 import_round 都有记录（跑了 N 遍 → N 轮）
- [ ] 同一批材料跑第二遍时，`skipped_duplicates == 第一轮回执条数`（SHA1 去重生效）
- [ ] `bad-data` 里每条都有 `file + row + field + raw_value`（原始行可定位，不算导入失败）

### ⚖️ 双口径冲突
- [ ] `conflicts <batch_id>` 每个冲突记录都有 `import_round`（能追溯是哪轮产生的）
- [ ] **所有冲突的 `resolved=true`**（即便是第二轮新冒出来的 ID 3/4）
- [ ] 冲突对应的所有预警状态不是 `confirmed` 就是 `withdrawn`，没有残留 `conflict`

### ✅ 确认/撤回
- [ ] `list --status pending_confirm` **结果为 0**（币种错等人工卡点全处理了）
- [ ] 币种错误那条 confirm 记录里，`note` 字段明确写了「原因 + 下一步」
- [ ] 晚到附件那条 `late_attachment_ref` 非空，`conclusion` 写清了核验结论
- [ ] `list` 里状态分布 = `confirmed + withdrawn == total`（无 imported/conflict/pending）

### 📑 历史 & 报告
- [ ] 任意一条补过备注的预警，`history` 里能看到 remark 一条动作
- [ ] 撤回过的预警，`conclusion` 前缀是 `[已撤回(原因:...)]`
- [ ] `check <batch_id>` 返回 `clean=true`，`issues=[]`
- [ ] `report <batch_id>` 返回 ok，文件名带 `_CLEAN_`（而不是 `_UNCLOSED_`）
- [ ] 报告第二节的「批次一致性」一行显示 `✅ PASS`
- [ ] 报告第六节「⚠️ 未闭环问题」标题后直接是「(无)」，没有任何预警或冲突列出来
- [ ] 报告第三节的冲突表，每行前面都是 `✅`，没有 `❌`
- [ ] 打开报告随便抽 3 条预警，和 `list` / `history` 输出对照，状态、结论、备注**完全一致**

### 🔗 关键链路验证（本次修复的核心场景）
- [ ] 同一批材料 **第二次导入后产生的新冲突（如 ID 3/4）**，在 `finalize` 后也被标为 `resolved=true`
- [ ] 第二次导入对应的预警 11/12/14/18，最终状态不再是 `conflict`，而是 `confirmed` 或 `withdrawn`
- [ ] `finalize` 输出中的 `resolve_all.resolved_count` 等于本批次所有冲突总数（而不是只处理第一轮的 2 个）

---

## 五、数据落地位置

| 路径 | 内容 | 备份建议 |
|---|---|---|
| `data/risk_warnings.db` | 全部 SQLite 数据（5张业务表+1张历史+1张导入元表） | 每批完成后拷走改名 |
| `reports/warning_report_<batch_id>_CLEAN_<time>.md` | 已闭环的正式报告 | 直接发给合规 |
| `reports/warning_report_<batch_id>_UNCLOSED_<time>.md` | 未闭环草稿（只做调试，不要归档） | |

---

## 六、还剩什么风险（明确告知，不藏）

1. **SHA1 指纹去重只按「原始CSV全文字段」匹配**  
   → 如果同事手动改了同一行里哪怕一个空格/换行，指纹就变，会被当成新回执重新入库。  
   → 应对：发现同一回执重复入库时，用 `withdraw` + 备注「SHA1 未命中，手动撤回重复」，然后再 `finalize --force`。

2. **口径优先级是硬编码的默认顺序**  
   → 如果某一批特殊业务需要「口径B优先」，必须手动传 `--calibre-order`，否则会留错那条。  
   → 应对：特殊批次先单独跑 `resolve-all --calibre-order "..."`，再 `finalize`。

3. **币种校验目前只认 CNY/USD/HKD/EUR/JPY/GBP**  
   → 合法币种扩充要改 `app/models.py` 里的 `VALID_CURRENCIES`。

4. **`finalize --force` 会让一致性检查的告警失效**  
   → 不推荐日常用，仅当「客户催交报告 + 已知残留项是可接受的」情况下用，且必须在报告补备注里说明。

5. **报告生成只走 Markdown**  
   → 需要 PDF/HTML 时单独用 `pandoc reports/*.md -o out.pdf` 再转，不内置避免引入新依赖。
