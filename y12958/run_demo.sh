#!/usr/bin/env bash
cd "$(dirname "$0")"

PY=${PY:-python3}
DB=invlock.db

section() { printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"; }

section "0. 从空目录开始：清掉旧的复盘库"
rm -f "$DB"
"$PY" invlock.py init

section "1. 日常入口(一)：导入脏的 MySQL 慢查询日志（含缺字段/噪声/同指纹复发）"
"$PY" invlock.py import slow-log samples/slow_query.log

section "2. 日常入口(二)：导入迁移脚本 batch_001（按内容哈希去重）"
"$PY" invlock.py import migration samples/migration_001.sql --batch batch_001

section "3. schema 对比：导入迁移前/后快照并 diff"
"$PY" invlock.py import schema samples/schema_before.sql --label pre
"$PY" invlock.py import schema samples/schema_after.sql --label post
"$PY" invlock.py diff --before pre --after post

section "4. 记录迁移前的备份（回滚锚点）"
"$PY" invlock.py record backup --batch batch_001 --label backup_001 \
  --remark "mysqldump inventory_db taken before batch_001"

SQ_ID=$("$PY" -c "import sqlite3;c=sqlite3.connect('$DB');print(c.execute('SELECT id FROM slow_query WHERE is_lock_wait=1 ORDER BY lock_time_sec DESC LIMIT 1').fetchone()[0])")
BK_ID=$("$PY" -c "import sqlite3;c=sqlite3.connect('$DB');print(c.execute(\"SELECT id FROM backup_record WHERE backup_label='backup_001'\").fetchone()[0])")
MIG_ID=$("$PY" -c "import sqlite3;c=sqlite3.connect('$DB');print(c.execute(\"SELECT id FROM migration_script WHERE batch_label='batch_001'\").fetchone()[0])")
printf '  代表性锁等待 slow_query=#%s (锁等待最长那条)  backup=#%s  migration=#%s\n' "$SQ_ID" "$BK_ID" "$MIG_ID"

section "5. 落库结论：把锁等待根因与 batch_001 的缓解措施关联到同一 subject"
"$PY" invlock.py review conclude --kind lockwait --slowquery "$SQ_ID" \
  --backup "$BK_ID" --migration "$MIG_ID" \
  --text "根因: stock 表 (warehouse_id, sku) 缺唯一约束, 并发 UPDATE 互加行锁; batch_001 已加 uq_stock_warehouse_sku 缓解, 持续观察."

section "6. 幂等自查(一)：二次导入同一份迁移脚本 batch_001 —— 不得新增第二份"
"$PY" invlock.py import migration samples/migration_001.sql --batch batch_001

section "7. 幂等自查(二)：二次导入同一份慢日志 —— 不得新增 slow_query 行"
"$PY" invlock.py import slow-log samples/slow_query.log

section "8. 幂等自查(三)：对同一 subject 再下相同结论 —— 仅 reaffirm，不产生第二份"
"$PY" invlock.py review conclude --kind lockwait --slowquery "$SQ_ID" \
  --backup "$BK_ID" --migration "$MIG_ID" \
  --text "根因: stock 表 (warehouse_id, sku) 缺唯一约束, 并发 UPDATE 互加行锁; batch_001 已加 uq_stock_warehouse_sku 缓解, 持续观察."

section "9. 重复结论拦截：对同一 subject 下互相打架的结论（不加 --force，应被拒绝）"
"$PY" invlock.py review conclude --kind lockwait --slowquery "$SQ_ID" \
  --text "另一个互相打架的结论"
echo "  (退出码 $? = 拒绝创建第二份结论，符合预期)"

section "10. 追溯：从结论点回到原始行号/来源备注"
CONC_ID=$("$PY" -c "import sqlite3;c=sqlite3.connect('$DB');print(c.execute('SELECT id FROM review_conclusion LIMIT 1').fetchone()[0])")
"$PY" invlock.py trace conclusion --id "$CONC_ID"
section "10b. 追溯：从某条 slow_query 看同指纹兄弟行（同一件事不重复下结论）"
"$PY" invlock.py trace slowquery --id "$SQ_ID"

section "11. 月底/课前复盘：回滚记录是否能解释清楚"
"$PY" invlock.py review rollback --batch batch_001

section "12. 审计前自查：有无重复/互相打架的结论、链路是否完整"
"$PY" invlock.py audit

section "13. 全局状态"
"$PY" invlock.py status

printf '\n\033[1;32m复盘库已就绪，可交给审计组。再次运行本脚本会从空目录重建，结论仍唯一。\033[0m\n'
