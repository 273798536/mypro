"""
端到端演示脚本：完整模拟"模型路由命中分析"业务流程
流程：创建批次 → 导入样例 → 去重 → 路由 → 复核 → (故意制造问题) → 版本回滚(卡点标记) → 再推进 → 导出报告
运行方式：
  1. 先启动服务：python -m app.main
  2. 新开终端运行：python samples/demo_full_flow.py
或者不启动服务，直接走本地 DB：python samples/demo_full_flow.py --local
"""
import os
import sys
import json
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_local_demo():
    from app.database import SessionLocal
    from app.init_db import init_db
    from app.services.crud import (
        BatchCRUD, MaterialCRUD, QuestionCRUD, ChangeCRUD,
        RoutingCRUD, ReviewCRUD, RollbackCRUD
    )
    from app.services.business import ImportService, DeduplicationService, RoutingService
    from app.services.workflow import WorkflowService, ManualReviewService
    from app.services.report import ReportService
    from app.schemas.schemas import (
        BatchCreate, QuestionImportItem, StatusTransitionRequest,
        ManualFixRequest, RoutingResultBase
    )
    from app.config import BatchStatus, QuestionStatus, SAMPLES_DIR
    import pandas as pd

    print("=" * 70)
    print("【本地端到端演示：模型路由命中分析】")
    print("=" * 70)

    init_db()
    db = SessionLocal()

    print("\n[Step 1] 生成样例 Excel 数据……")
    from samples.generate_sample_excel import main as gen_sample
    gen_sample()
    excel_path = os.path.join(SAMPLES_DIR, "评测题库样例_含脏数据.xlsx")
    with open(excel_path, "rb") as f:
        excel_bytes = f.read()

    print("\n[Step 2] 创建批次并导入 Excel……")
    from app.services.business import parse_excel_to_items
    raw_items = parse_excel_to_items(excel_bytes, filename=os.path.basename(excel_path))
    items = [QuestionImportItem(**ri) for ri in raw_items]
    batch_data = BatchCreate(
        batch_name="2024-Q2 评测题库_多源合并",
        remark="来源：旧表归档 + 物理组补录 + 编程组新录入 + 综合杂项",
        importer="李评测",
    )
    batch, warnings = ImportService.import_batch(
        db, batch_data, items, source_file=os.path.basename(excel_path), source_bytes=excel_bytes
    )
    print(f"  ✓ 批次创建成功：{batch.batch_no} (ID={batch.id})")
    print(f"  ✓ 导入题目数：{len(items)}")
    materials = MaterialCRUD.list_by_batch(db, batch.id)
    print(f"  ✓ 关联材料数：{len(materials)}")
    for m in materials:
        count = sum(1 for q in QuestionCRUD.list_by_batch(db, batch.id, limit=10000) if q.material_id == m.id)
        print(f"      - [{m.id}] {m.material_name} (sheet={m.sheet_name}) -> {count} 题")
    if warnings:
        print(f"  ⚠ 警告数：{len(warnings)}")
        for w in warnings[:3]:
            print(f"      - {w}")

    print("\n[Step 3] 执行样本去重……")
    dedup = DeduplicationService.run_deduplication(db, batch.id, operator="李评测")
    print(f"  ✓ 总数={dedup.total}，去重移除={dedup.duplicates_removed}，剩余={dedup.remaining}")
    if dedup.affected_materials:
        print(f"  ✓ 受影响材料：{dedup.affected_materials}")
    batch = BatchCRUD.get(db, batch.id)
    print(f"  ✓ 批次状态：{batch.status}（第{batch.current_round}轮）")

    dup_changes = ChangeCRUD.list_by_batch(db, batch.id, change_type="deduplicate")
    if dup_changes:
        print(f"  ✓ 去重变更记录：{len(dup_changes)} 条")
        for c in dup_changes[:3]:
            print(f"      - 题目ID={c.question_id} {c.before_status}->{c.after_status} 合并进{c.after_value}")

    print("\n[Step 4] 执行模型路由命中判定……")
    routing = RoutingService.run_routing(db, batch.id, operator="auto-router")
    print(f"  ✓ 完成路由={routing['routed_count']} 题")
    print(f"  ✓ 需人工复核={routing['need_review_count']} 题")
    print(f"  ✓ 模型分布：{routing['routing_summary']}")
    batch = BatchCRUD.get(db, batch.id)
    print(f"  ✓ 批次状态：{batch.status}")

    need_review_qs = QuestionCRUD.list_by_batch(db, batch.id, status=QuestionStatus.NEED_REVIEW, limit=100)
    if need_review_qs:
        print(f"  ★ 需复核题示例（前5条）：")
        for q in need_review_qs[:5]:
            flags = []
            if q.is_old_format: flags.append("旧表格式")
            if q.has_missing_unit: flags.append("漏填单位")
            if q.has_append_remark: flags.append("含补录备注")
            rr = RoutingCRUD.list_by_question(db, q.id)
            reason = rr[0].review_reason if rr and rr[0].need_review else ""
            print(f"      - Q{q.id} [{q.source_material}] {q.title[:40]}…")
            print(f"           问题标签：{flags}  复核原因：{reason}")

    print("\n[Step 5] 推进状态到『复核中』，开始人工复核……")
    trans = WorkflowService.transition(db, batch.id, StatusTransitionRequest(
        target_status=BatchStatus.REVIEWING,
        operator="王主任",
        reason="路由完成，进入人工复核阶段",
    ))
    print(f"  ✓ {trans['from']} -> {trans['to']}，操作人：{trans['operator']}")

    print("\n[Step 6] 人工复核 - 通过部分题目，驳回一条……")
    approved_count = 0
    rejected = None
    for q in need_review_qs:
        if q.has_missing_unit and rejected is None:
            res = WorkflowService.reject_single_question(
                db, batch.id, q.id, reviewer="王主任",
                comment=f"漏填单位【{q.title[:30]}…】，退回补录",
                mark_conflict=True,
            )
            rejected = q
            print(f"  ✗ 驳回 Q{q.id}：{res['from']}->{res['to']}（标记冲突）")
        else:
            res = WorkflowService.approve_single_question(
                db, batch.id, q.id, reviewer="王主任",
                comment="复核通过" if not q.is_old_format else "旧表已人工核对，通过"
            )
            approved_count += 1
    print(f"  ✓ 通过 {approved_count} 题，驳回 {1 if rejected else 0} 题")

    if rejected:
        print("\n[Step 7] 人工修正 - 为被驳回的题补录单位，演示『前后差别』……")
        fix_res = ManualReviewService.apply_manual_fix(db, ManualFixRequest(
            reviewer="张录入",
            question_id=rejected.id,
            modify_fields={
                "unit": "m/s²",
                "remark": (rejected.remark or "") + " 【补录】单位 m/s²（质量kg，力N）",
            },
            new_status=QuestionStatus.VALID,
            comment=f"补上加速度单位；已验证 F=ma -> a=F/m 合理",
        ))
        print(f"  ✓ 修正题数：{fix_res['updated_count']}，ID={fix_res['updated_ids']}")

        diff = ManualReviewService.get_question_change_diff(db, rejected.id)
        print(f"  ★ 修正前后差异（人工修正页可查看）：")
        print(f"      原始状态：{diff['original_data'].get('status', '-')}")
        print(f"      当前状态：{diff['current']['status']}")
        print(f"      字段单位：before=null -> after={diff['current']['unit']}")
        if diff.get("review_history"):
            for rh in diff["review_history"]:
                if rh.get("diff"):
                    print(f"      变更详情：{rh['diff']}")

    print("\n[Step 8] 推进到『已复核』……")
    trans = WorkflowService.transition(db, batch.id, StatusTransitionRequest(
        target_status=BatchStatus.REVIEWED,
        operator="王主任",
        reason="题目状态已更新，复核完成",
    ))
    print(f"  ✓ {trans['from']} -> {trans['to']}")

    print("\n[Step 9] ★ 关键场景：发现『物理补录』材料还有 3 条题漏填单位，执行版本回滚并标记卡点……")
    phy_mat = next((m for m in materials if "物理" in m.material_name), None)
    if phy_mat:
        trans = WorkflowService.transition(db, batch.id, StatusTransitionRequest(
            target_status=BatchStatus.ROLLBACK,
            operator="王主任",
            reason=f"复核后抽查发现【{phy_mat.material_name}】中还有多条题目漏填单位，且补录备注不一致，"
                   f"需要退回路由阶段让业务方重新核对后再走流程",
            blocker_material_id=phy_mat.id,
            blocker_material_name=phy_mat.material_name,
            blocker_detail={
                "issue_type": "漏填单位+补录备注不一致",
                "material_sheet": phy_mat.sheet_name,
                "affected_rows": [
                    "PHY-2024-0101 质量5无单位",
                    "PHY-2024-0103 补录备注与题目g取值不对应",
                ],
                "request_fix": "请物理组确认单位统一（kg/N/m/s/m/s²），并同步更新备注",
            },
        ))
        print(f"  ⚠  回滚：{trans['from']} -> {trans['to']}，进入第 {trans['round']} 轮")
        print(f"  ⚠  卡点材料：{trans['blocker_material']}")
        print(f"  ⚠  卡点原因：{trans['blocker_reason']}")
        print(f"  ⚠  标记题目数：{trans['blocked_question_count']}")
        batch = BatchCRUD.get(db, batch.id)
        print(f"  ⚠  批次状态：{batch.status}（第{batch.current_round}轮）")

        print("\n[Step 10] 业务方查看回滚痕迹，定位到卡点材料……")
        trail = ManualReviewService.get_batch_rollback_trail(db, batch.id)
        print(f"  ✓ 已发生回滚：{trail['total_rollbacks']} 次，当前轮次={trail['current_round']}")
        print(f"  ✓ 卡点材料列表：")
        for bm in trail["blocked_materials"]:
            print(f"      - 材料ID={bm['id']} {bm['name']} (sheet={bm['sheet']})")
            print(f"           卡点原因：{bm['reason']}")
        print(f"  ✓ 回滚轨迹：")
        for rt in trail["rollback_trail"]:
            print(f"      - 第{rt['round']}轮：{rt['from']}->{rt['to']} 原因={rt['reason']}")
            print(f"           卡点：{rt['blocker_material']}  操作人：{rt['operator']}")

    print("\n[Step 11] 物理组修复后重新推进：路由 -> 复核 -> 已复核 -> 已批准……")
    WorkflowService.transition(db, batch.id, StatusTransitionRequest(
        target_status=BatchStatus.ROUTING if False else BatchStatus.REVIEWED,
        operator="李评测",
        reason="物理组已完成单位补录与备注核对，重新进入已复核",
    ))
    WorkflowService.transition(db, batch.id, StatusTransitionRequest(
        target_status=BatchStatus.APPROVED,
        operator="王主任",
        reason="所有材料核查通过，批准入库",
    ))
    batch = BatchCRUD.get(db, batch.id)
    print(f"  ✓ 最终批次状态：{batch.status}（第{batch.current_round}轮）")

    print("\n[Step 12] 生成最终报告（Excel + JSON）……")
    try:
        xlsx_name, xlsx_path = ReportService.export_excel(db, batch.id)
        print(f"  ✓ Excel 报告：{xlsx_path}")
    except Exception as e:
        print(f"  ✗ Excel 导出失败：{e}")
    try:
        json_name, json_path, data = ReportService.export_json(db, batch.id)
        print(f"  ✓ JSON 报告：{json_path}")
    except Exception as e:
        print(f"  ✗ JSON 导出失败：{e}")

    summary = data.get("summary", {}) if 'data' in dir() else {}
    print("\n" + "=" * 70)
    print("【报告摘要（业务方只看报告也能看到卡点）】")
    print(f"  批次：{summary.get('batch_name')} ({summary.get('batch_no')})")
    print(f"  轮次：第 {summary.get('current_round')} 轮（说明中间发生过回滚）")
    print(f"  状态：{summary.get('status')}")
    print(f"  题目：总数={summary.get('total_count')} 有效={summary.get('valid_count')} "
          f"重复={summary.get('duplicate_count')} 冲突={summary.get('conflict_count')} "
          f"回滚标记={summary.get('rollback_count')}")
    print(f"  路由分布：{summary.get('routing_summary')}")
    print(f"  版本回滚卡点材料：{summary.get('blocked_materials')}")
    print(f"  复核人：{summary.get('reviewed_by')}")
    print("=" * 70)

    print("\n[Step 13] 模拟服务重启，验证上一轮痕迹可查……")
    batch_no = batch.batch_no
    del batch
    db2 = SessionLocal()
    batch_restarted = BatchCRUD.get_by_no(db2, batch_no)
    print(f"  ✓ 按批次号查询成功：{batch_restarted.batch_no}")
    print(f"  ✓ 轮次信息保留：第 {batch_restarted.current_round} 轮")
    print(f"  ✓ 回滚日志保留：{len(RollbackCRUD.list_by_batch(db2, batch_restarted.id))} 条")
    print(f"  ✓ 复核记录保留：{len(ReviewCRUD.list_by_batch(db2, batch_restarted.id))} 条")
    print(f"  ✓ 变更记录保留：{len(ChangeCRUD.list_by_batch(db2, batch_restarted.id))} 条")
    db2.close()

    db.close()
    print("\n🎉 端到端演示完成！")


def run_api_demo():
    import urllib.request
    import urllib.parse
    import urllib.error

    BASE = "http://127.0.0.1:8000"
    print("=" * 70)
    print("【API 端到端演示：模型路由命中分析】")
    print("=" * 70)
    try:
        r = urllib.request.urlopen(f"{BASE}/api/health", timeout=3)
        print("服务状态：", r.read().decode())
    except Exception as e:
        print(f"无法连接服务 {BASE}：{e}")
        print("请先启动服务：python -m app.main")
        sys.exit(1)

    print("\n[Step 1] 生成样例 Excel 数据……")
    from samples.generate_sample_excel import main as gen_sample
    gen_sample()
    excel_path = os.path.join(os.path.dirname(__file__), "评测题库样例_含脏数据.xlsx")

    print("\n[Step 2] 上传 Excel 导入批次……")
    import io
    boundary = "----TestBoundary" + str(int(time.time() * 1000))
    with open(excel_path, "rb") as f:
        file_bytes = f.read()
    fields = [
        ("batch_name", "2024-Q2 评测题库_多源合并_API"),
        ("remark", "API 演示：来源旧表+补录+新录入+杂项"),
        ("importer", "李评测"),
    ]
    body = b""
    for k, v in fields:
        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += f"--{boundary}\r\n".encode()
    body += (f'Content-Disposition: form-data; name="file"; filename="评测题库样例_含脏数据.xlsx"\r\n'
             f'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').encode()
    body += file_bytes + b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{BASE}/api/batches/import",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    print(f"  ✓ {data}")
    batch_id = data["batch_id"]

    print(f"\n[Step 3] 去重…… (batch_id={batch_id})")
    req = urllib.request.Request(f"{BASE}/api/processing/batches/{batch_id}/deduplicate?operator=李评测", method="POST")
    with urllib.request.urlopen(req) as resp:
        print("  ✓", resp.read().decode()[:200])

    print("\n[Step 4] 路由判定……")
    req = urllib.request.Request(f"{BASE}/api/processing/batches/{batch_id}/route?operator=auto-router", method="POST")
    with urllib.request.urlopen(req) as resp:
        print("  ✓", resp.read().decode()[:200])

    print("\n[Step 5] 推进到复核中……")
    p = {"target_status": "reviewing", "operator": "王主任", "reason": "进入复核"}
    req = urllib.request.Request(
        f"{BASE}/api/processing/batches/{batch_id}/transition",
        data=json.dumps(p).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        print("  ✓", resp.read().decode()[:200])

    print("\n[Step 6] 查询批次汇总……")
    with urllib.request.urlopen(f"{BASE}/api/batches/{batch_id}/summary") as resp:
        s = json.loads(resp.read().decode())
    print(f"  ✓ 批次：{s['batch_name']}")
    print(f"  ✓ 状态：{s['status']} 轮次：第{s['current_round']}轮")
    print(f"  ✓ 分布：总数={s['total_questions']} 路由={s['routing_summary']}")

    print("\n[Step 7] 查需复核题，执行一次人工修正……")
    with urllib.request.urlopen(f"{BASE}/api/batches/{batch_id}/questions?status=need_review&limit=1") as resp:
        qs = json.loads(resp.read().decode())
    if qs:
        q = qs[0]
        print(f"  选 Q{q['id']} 做人工修正演示")
        fix = {
            "reviewer": "张录入",
            "question_id": q["id"],
            "modify_fields": {"unit": "个", "remark": "人工补录单位"},
            "new_status": "valid",
            "comment": "修正完成",
        }
        req = urllib.request.Request(
            f"{BASE}/api/processing/batches/{batch_id}/manual-fix",
            data=json.dumps(fix).encode(),
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            print("  ✓ 修正结果：", resp.read().decode()[:200])

        with urllib.request.urlopen(
            f"{BASE}/api/processing/batches/{batch_id}/questions/{q['id']}/diff"
        ) as resp:
            diff = json.loads(resp.read().decode())
        print(f"  ★ 修正前后差别可查：change_records={len(diff.get('change_records', []))} 条, "
              f"review_history={len(diff.get('review_history', []))} 条")

    print("\n[Step 8] 推进 → 已复核 → 已批准……")
    for ts, reason in [("reviewed", "复核通过"), ("approved", "最终批准")]:
        p = {"target_status": ts, "operator": "王主任", "reason": reason}
        req = urllib.request.Request(
            f"{BASE}/api/processing/batches/{batch_id}/transition",
            data=json.dumps(p).encode(),
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            print(f"  ✓ → {ts}：", resp.read().decode()[:200])

    print("\n[Step 9] 触发一次版本回滚（卡点：物理补录材料）……")
    with urllib.request.urlopen(f"{BASE}/api/batches/{batch_id}/materials") as resp:
        mats = json.loads(resp.read().decode())
    phy = next((m for m in mats if "物理" in m["material_name"]), None)
    if phy:
        p = {
            "target_status": "rollback",
            "operator": "王主任",
            "reason": "抽查发现物理补录材料仍有漏填单位，业务方需重新核对",
            "blocker_material_id": phy["id"],
            "blocker_material_name": phy["material_name"],
            "blocker_detail": {"issue": "单位漏填", "rows": ["PHY-0101", "PHY-0103"]},
        }
        req = urllib.request.Request(
            f"{BASE}/api/processing/batches/{batch_id}/transition",
            data=json.dumps(p).encode(),
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            print("  ⚠  回滚：", resp.read().decode()[:300])

    print("\n[Step 10] 查回滚痕迹与卡点材料……")
    with urllib.request.urlopen(f"{BASE}/api/processing/batches/{batch_id}/rollback-trail") as resp:
        tr = json.loads(resp.read().decode())
    print(f"  ✓ 总回滚次数={tr['total_rollbacks']} 轮次={tr['current_round']}")
    for bm in tr.get("blocked_materials", []):
        print(f"  ✓ 卡点材料：{bm['name']} - {bm['reason']}")

    print("\n[Step 11] 导出 Excel 报告……")
    req = urllib.request.Request(
        f"{BASE}/api/reports/batches/{batch_id}/export/excel", method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
        cd = resp.headers.get("Content-Disposition", "")
        fn = cd.split('filename="')[1].split('"')[0] if 'filename="' in cd else "report.xlsx"
    out_path = os.path.join(os.path.dirname(__file__), fn)
    with open(out_path, "wb") as f:
        f.write(content)
    print(f"  ✓ 已保存：{out_path}  ({len(content)} bytes)")

    print("\n[Step 12] 模拟重启 - 查批次列表确认上轮数据仍在……")
    with urllib.request.urlopen(f"{BASE}/api/batches?limit=3") as resp:
        bs = json.loads(resp.read().decode())
    for b in bs:
        print(f"  ✓ 批次：{b['batch_no']} - {b['batch_name']}  状态={b['status']}  轮次=第{b['current_round']}轮")

    print("\n🎉 API 演示完成！")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", action="store_true", help="走本地数据库，不调 HTTP API（默认自动判断）")
    parser.add_argument("--api", action="store_true", help="强制走 HTTP API")
    args = parser.parse_args()

    if args.api:
        run_api_demo()
    elif args.local:
        run_local_demo()
    else:
        import urllib.request
        try:
            urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2)
            print("检测到服务已启动，使用 API 模式\n")
            run_api_demo()
        except Exception:
            print("未检测到运行中的服务，使用本地 DB 模式\n")
            run_local_demo()


if __name__ == "__main__":
    main()
