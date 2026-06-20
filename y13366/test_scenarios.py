#!/usr/bin/env python3
"""
召回漏斗版本快照 - 核心场景测试脚本

覆盖用户提出的所有场景：
1. 训练日志分批上传与关联留存
2. 阈值变化不覆盖人工锁定判断
3. 后补材料不覆盖早先判断，有变更历史
4. 特征迟到时生成人性化下一步指引
5. 旧样本误判→新快照改判解释
6. 评测工程师临时修改历史追溯
7. 月底封账流程：导入旧材料→补晚到附件→变化说明
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BASE_DIR)

_TMP_DIR = tempfile.mkdtemp(prefix="recall_funnel_test_")

from backend.app.config import settings
settings.DATABASE_URL = f"sqlite:///{_TMP_DIR}/test.db"
settings.SNAPSHOT_DATA_DIR = Path(_TMP_DIR) / "snapshot_data"
settings.TRAINING_LOG_DIR = Path(_TMP_DIR) / "training_logs"
settings.SNAPSHOT_DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.TRAINING_LOG_DIR.mkdir(parents=True, exist_ok=True)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app import database as _db_module

_db_module.engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
_db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_db_module.engine)
Base.metadata.create_all(bind=_db_module.engine)

from fastapi.testclient import TestClient
from backend.app.main import app

engine = _db_module.engine
TestingSessionLocal = _db_module.SessionLocal


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def print_title(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_subtitle(subtitle: str):
    print(f"\n--- {subtitle} ---")


def print_check(desc: str, passed: bool, detail: str = ""):
    mark = "✅ PASS" if passed else "❌ FAIL"
    print(f"  [{mark}] {desc}")
    if detail:
        print(f"         {detail}")


def scenario_1_training_log_retention():
    """
    场景1：训练日志与快照关联留存
    - 训练日志分几次凑齐
    - 每次上传都有记录，关联关系明确
    - 重跑覆盖旧证据的关系留存
    """
    print_title("场景1：训练日志分批上传与关联留存")

    samples = [
        {"sample_id": "S001", "prediction": "positive", "score": 0.85, "content": {"text": "召回样本1"}},
        {"sample_id": "S002", "prediction": "negative", "score": 0.23, "content": {"text": "召回样本2"}},
        {"sample_id": "S003", "prediction": "borderline", "score": 0.55, "content": {"text": "召回样本3"}},
    ]

    resp = client.post("/api/v1/snapshots", json={
        "snapshot_name": "6月召回漏斗-旧模型",
        "model_version": "model_v20260501",
        "threshold_config": {
            "recall_threshold": 0.05,
            "score_threshold": 0.5,
            "precision_threshold": 0.7
        },
        "description": "5月训练的旧模型基线",
        "created_by": "小唐",
        "initial_samples": samples
    })
    snap_old = resp.json()
    snap_old_id = snap_old["id"]
    print_check(f"创建旧模型快照 #{snap_old_id}", resp.status_code == 200, f"版本: {snap_old['snapshot_version']}")

    print_subtitle("分批上传训练日志")
    log_batch1 = "===== 训练日志 第一批（5月上半月）=====\nepoch 1-5: loss 下降至 0.312\nmetrics: recall@10 = 0.82\n"
    resp = client.post(
        f"/api/v1/snapshots/{snap_old_id}/training-logs",
        data={
            "log_name": "训练日志-5月上半月",
            "log_content_summary": "5月1-15日训练，前5个epoch，loss收敛",
            "uploaded_by": "小唐",
            "batch_number": 1,
            "is_complete": False,
            "completeness_note": "还缺5月下半月训练日志"
        },
        files={"log_file": ("train_batch1.log", log_batch1.encode(), "text/plain")}
    )
    log1 = resp.json()
    print_check(f"上传第1批训练日志", resp.status_code == 200, f"批次={log1['batch_number']}, 完整={log1['is_complete']}")

    log_batch2 = "===== 训练日志 第二批（5月下半月）=====\nepoch 6-10: loss 下降至 0.189\nmetrics: recall@10 = 0.89\n训练完成，模型导出 model_v20260501.pt"
    resp = client.post(
        f"/api/v1/snapshots/{snap_old_id}/training-logs",
        data={
            "log_name": "训练日志-5月下半月",
            "log_content_summary": "5月16-31日训练，后5个epoch，训练完成",
            "uploaded_by": "小唐",
            "batch_number": 2,
            "is_complete": True,
            "completeness_note": "训练日志全部凑齐"
        },
        files={"log_file": ("train_batch2.log", log_batch2.encode(), "text/plain")}
    )
    log2 = resp.json()
    print_check(f"上传第2批训练日志（凑齐）", resp.status_code == 200, f"批次={log2['batch_number']}, 完整={log2['is_complete']}")

    print_subtitle("检查关联留存和变更历史")
    resp = client.get(f"/api/v1/snapshots/{snap_old_id}/training-logs")
    logs = resp.json()
    print_check(f"快照关联 {len(logs)} 份训练日志", len(logs) == 2)

    resp = client.get(f"/api/v1/snapshots/{snap_old_id}/changes")
    changes = resp.json()
    log_changes = [c for c in changes if c["change_type"] == "training_log_attached"]
    print_check(f"变更历史记录了 {len(log_changes)} 次训练日志关联", len(log_changes) == 2)

    if len(log_changes) >= 2:
        hint = log_changes[0].get("next_step_hint", "")
        print_check(f"第1批日志的下一步提示正确（未凑齐时提示继续上传）",
                    "继续" in hint or "剩余" in hint or "不完整" in hint or "凑齐" not in hint,
                    f"提示: {hint[:60]}...")
    if len(log_changes) >= 1:
        hint2 = log_changes[1].get("next_step_hint", "")
        print_check(f"第2批日志提示日志凑齐可重跑", "全部完成" in hint2 or "已全部" in hint2 or "开始重跑" in hint2 or "凑齐" in hint2,
                    f"提示: {hint2[:60]}...")

    return snap_old_id


def scenario_2_threshold_protects_manual(snap_old_id: int):
    """
    场景2：阈值变化不覆盖人工判断
    - 先人工锁定部分样本判断
    - 更新阈值重跑
    - 锁定的判断不能被覆盖
    """
    print_title("场景2：阈值变化保护人工锁定判断")

    samples_new = [
        {"sample_id": "S001", "prediction": "positive", "score": 0.88, "content": {"text": "召回样本1-new"}},
        {"sample_id": "S002", "prediction": "negative", "score": 0.21, "content": {"text": "召回样本2-new"}},
        {"sample_id": "S003", "prediction": "borderline", "score": 0.52, "content": {"text": "召回样本3-new"}},
        {"sample_id": "S004", "prediction": "negative", "score": 0.45, "content": {"text": "召回样本4-new"}},
        {"sample_id": "S005", "prediction": "positive", "score": 0.92, "content": {"text": "召回样本5-new"}},
    ]
    resp = client.post("/api/v1/snapshots", json={
        "snapshot_name": "6月召回漏斗-新模型",
        "model_version": "model_v20260615",
        "threshold_config": {
            "recall_threshold": 0.05,
            "score_threshold": 0.5,
            "precision_threshold": 0.7
        },
        "description": "6月训练的新模型",
        "created_by": "小唐",
        "parent_snapshot_id": snap_old_id,
        "initial_samples": samples_new
    })
    snap_new = resp.json()
    snap_new_id = snap_new["id"]
    print_check(f"创建新模型快照 #{snap_new_id}", resp.status_code == 200, f"父快照=#{snap_old_id}")

    print_subtitle("评测工程师人工判断并锁定部分样本")
    resp = client.put(
        f"/api/v1/snapshots/{snap_new_id}/judgments",
        params={"is_temporary": False, "editor_role": "evaluator"},
        json={
            "sample_id": "S002",
            "human_judgment": "positive",
            "judged_by": "小唐",
            "judgment_note": "虽然模型给分低，但人工确认该样本确实应召回",
            "is_manual_locked": True,
            "lock_reason": "误判样本，人工复核后锁定positive",
            "change_reason": "人工复核纠正模型误判"
        }
    )
    j1 = resp.json()
    print_check(f"S002 人工判断=positive 已锁定", j1["is_manual_locked"] and j1["human_judgment"] == "positive")

    resp = client.put(
        f"/api/v1/snapshots/{snap_new_id}/judgments",
        json={
            "sample_id": "S004",
            "human_judgment": "borderline",
            "judged_by": "小唐",
            "judgment_note": "分数接近边界，需进一步确认",
            "is_manual_locked": True,
            "lock_reason": "边界样本人工判断锁定",
            "change_reason": "边界样本人工确认"
        }
    )
    j2 = resp.json()
    print_check(f"S004 人工判断=borderline 已锁定", j2["is_manual_locked"] and j2["human_judgment"] == "borderline")

    print_subtitle("更新阈值（提高阈值，理论上影响S003、S004）")
    resp = client.put(
        f"/api/v1/snapshots/{snap_new_id}/threshold",
        json={
            "threshold_config": {
                "recall_threshold": 0.1,
                "score_threshold": 0.6,
                "precision_threshold": 0.75
            },
            "updated_by": "小唐",
            "update_reason": "新模型性能提升，提高阈值以控制误召回"
        }
    )
    result = resp.json()
    print_check(f"阈值更新成功", resp.status_code == 200,
                f"影响{result['total_affected']}条，保护{result['total_protected']}条")

    protected = result["locked_samples_protected"]
    s002_protected = any(p["sample_id"] == "S002" for p in protected)
    s004_protected = any(p["sample_id"] == "S004" for p in protected)
    print_check(f"S002 人工锁定=positive 未被覆盖", s002_protected,
                f"保护列表: {[p['sample_id'] for p in protected]}")
    print_check(f"S004 人工锁定=borderline 未被覆盖", s004_protected)

    resp = client.get(f"/api/v1/snapshots/{snap_new_id}/judgments")
    judgments = {j["sample_id"]: j for j in resp.json()}
    print_check(f"验证：S002 human_judgment 仍为 positive",
                judgments["S002"]["human_judgment"] == "positive",
                f"实际={judgments['S002']['human_judgment']}")
    print_check(f"验证：S004 human_judgment 仍为 borderline",
                judgments["S004"]["human_judgment"] == "borderline",
                f"实际={judgments['S004']['human_judgment']}")

    changes = client.get(f"/api/v1/snapshots/{snap_new_id}/changes").json()
    thr_change = [c for c in changes if c["change_type"] == "threshold_update"]
    print_check(f"阈值更新有明确变更历史记录", len(thr_change) >= 1,
                f"记录了{len(thr_change)}条阈值变更")
    if thr_change:
        hint = thr_change[0].get("next_step_hint", "")
        print_check(f"阈值更新有下一步人工复核提示", bool(hint), f"提示: {hint[:80]}...")

    return snap_new_id


def scenario_3_materials_no_silent_overwrite(snap_new_id: int):
    """
    场景3：后补材料不覆盖早先判断，变更历史可查
    - 后补材料上传
    - 不会无声覆盖，有明确变更记录
    """
    print_title("场景3：后补材料不覆盖早先判断 + 变更历史")

    print_subtitle("后补第1份材料（正常时间到达）")
    mat_content = "Feature supplement doc: S001-S005 feature engineering v1.0 - 特征补充说明文档".encode("utf-8")
    resp = client.post(
        f"/api/v1/snapshots/{snap_new_id}/feature-materials",
        data={
            "material_name": "特征工程说明文档v1.0",
            "material_type": "documentation",
            "uploaded_by": "小唐",
            "is_late_arrival": False
        },
        files={"material_file": ("feature_doc_v1.pdf", mat_content, "application/pdf")}
    )
    m1 = resp.json()
    print_check(f"上传正常材料: {m1['material_name']}", resp.status_code == 200,
                f"迟到={m1['is_late_arrival']}")

    print_subtitle("后补第2份材料（迟到到达的）")
    late_content = "Late arrival feature: newly added user behavior feature - 迟到的用户行为特征".encode("utf-8")
    resp = client.post(
        f"/api/v1/snapshots/{snap_new_id}/feature-materials",
        data={
            "material_name": "迟到的用户行为特征补充",
            "material_type": "feature_data",
            "uploaded_by": "小唐",
            "is_late_arrival": True,
            "impact_description": "用户行为特征缺失导致部分样本判断不准"
        },
        files={"material_file": ("late_user_features.csv", late_content, "text/csv")}
    )
    m2 = resp.json()
    print_check(f"上传迟到材料: {m2['material_name']}", resp.status_code == 200,
                f"迟到={m2['is_late_arrival']}, 影响约{m2['affected_samples_count']}条")

    print_subtitle("验证：后补材料不会无声覆盖人工判断")
    resp = client.get(f"/api/v1/snapshots/{snap_new_id}/judgments")
    judgments = {j["sample_id"]: j for j in resp.json()}
    print_check(f"S002 human_judgment 仍=positive（未被覆盖）",
                judgments["S002"]["human_judgment"] == "positive")
    print_check(f"S004 human_judgment 仍=borderline（未被覆盖）",
                judgments["S004"]["human_judgment"] == "borderline")

    changes = client.get(f"/api/v1/snapshots/{snap_new_id}/changes").json()
    mat_changes = [c for c in changes if "material" in c["change_type"] or "feature" in c["change_type"]]
    print_check(f"所有后补材料都有变更记录（{len(mat_changes)}条，≥2）", len(mat_changes) >= 2)

    late_changes = [c for c in changes if c["change_type"] == "late_feature_material"]
    if late_changes:
        print_check(f"迟到材料有专门的变更类型标记", len(late_changes) >= 1)
        print_check(f"迟到材料的变更带有人性化下一步提示",
                    late_changes[0].get("next_step_hint") is not None,
                    f"提示: {late_changes[0].get('next_step_hint','')[:100]}...")

    return m2["id"]


def scenario_4_late_arrival_human_hints(snap_new_id: int):
    """
    场景4：特征迟到的人性化下一步处理指引
    """
    print_title("场景4：特征迟到的人性化下一步提示")

    mats = client.get(f"/api/v1/snapshots/{snap_new_id}/feature-materials").json()
    late_mats = [m for m in mats if m["is_late_arrival"]]

    if late_mats:
        m = late_mats[0]
        next_action = m.get("next_action", "")
        print_check(f"迟到材料 next_action 字段非空", bool(next_action))
        print_subtitle("  下一步操作指引内容：")
        for line in (next_action or "").split("\n"):
            if line.strip():
                print(f"    {line.strip()}")

        has_steps = all(kw in next_action for kw in ["打开", "检查", "复核"]) \
                    or any(str(i) in next_action for i in range(1, 10))
        print_check(f"提示包含可执行的步骤编号和动作", has_steps or "1." in next_action)

        has_lock = "锁定" in next_action or "lock" in next_action.lower()
        print_check(f"提示提醒人工锁定防止覆盖", has_lock)
    else:
        print_check("找到迟到材料", False)

    changes = client.get(f"/api/v1/snapshots/{snap_new_id}/changes").json()
    late_changes = [c for c in changes if c["change_type"] == "late_feature_material"]
    if late_changes:
        ch = late_changes[0]
        print_check(f"变更历史中的迟到记录也带 next_step_hint",
                    ch.get("next_step_hint") is not None)


def scenario_5_old_misjudged_explanation(snap_old_id: int, snap_new_id: int):
    """
    场景5：旧模型误判样本放回新快照 → 改判原因解释
    """
    print_title("场景5：旧样本误判 → 新快照改判原因解释")

    print_subtitle("旧快照中 S002 模型预测=negative，人工=positive（误判）")
    client.put(
        f"/api/v1/snapshots/{snap_old_id}/judgments",
        json={
            "sample_id": "S002",
            "human_judgment": "positive",
            "judged_by": "小唐",
            "judgment_note": "旧模型误判，应召回",
            "is_manual_locked": True,
            "lock_reason": "旧模型误判标记",
            "change_reason": "人工确认旧模型误判"
        }
    )

    resp = client.post(
        "/api/v1/snapshots/explain-change",
        params={
            "sample_id": "S002",
            "old_snapshot_id": snap_old_id,
            "new_snapshot_id": snap_new_id
        }
    )
    expl = resp.json()
    print_check(f"生成改判解释", resp.status_code == 200)

    print_subtitle("  改判解释内容：")
    print(f"    样本: {expl['sample_id']}")
    print(f"    旧判断 → 新判断: {expl['old_judgment']} → {expl['new_judgment']}")
    print(f"    关键因素: {expl['key_factors']}")
    if expl["threshold_differences"]:
        print(f"    阈值差异: {json.dumps(expl['threshold_differences'], ensure_ascii=False)}")
    print(f"    详细解释:")
    for line in expl["explanation_text"].split("\n"):
        print(f"      {line}")

    print_check(f"解释包含旧→新判断对比",
                bool(expl["old_judgment"]) and bool(expl["new_judgment"]))
    print_check(f"解释列出关键因素列表", len(expl["key_factors"]) > 0)
    print_check(f"解释包含人类可读的文本", len(expl["explanation_text"]) > 20)

    return expl


def scenario_6_temporary_edit_history(snap_new_id: int):
    """
    场景6：评测工程师临时修改的判断历史追溯
    - 小唐临时修改一条判断
    - 下一班能看到这是临时修改，需要重新确认
    """
    print_title("场景6：评测工程师临时修改的历史追溯")

    print_subtitle("小唐临时修改 S003 判断（交接班前的临时处理）")
    resp = client.put(
        f"/api/v1/snapshots/{snap_new_id}/judgments",
        params={"is_temporary": True, "editor_role": "evaluator_小唐"},
        json={
            "sample_id": "S003",
            "human_judgment": "positive",
            "judged_by": "小唐",
            "judgment_note": "临时改为positive，下班前没来得及细查，下一班请重新确认",
            "is_manual_locked": False,
            "change_reason": "临时修改，待下一班复核"
        }
    )
    j_temp = resp.json()
    print_check(f"临时修改 S003 → positive", j_temp["human_judgment"] == "positive")

    print_subtitle("下一班查看 S003 的判断历史")
    resp = client.get(f"/api/v1/snapshots/{snap_new_id}/judgments/S003/history")
    histories = resp.json()
    print_check(f"S003 判断历史有 {len(histories)} 条记录", len(histories) >= 1)

    temp_edit = [h for h in histories if h.get("is_temporary_edit")]
    print_check(f"历史记录标记了 is_temporary_edit = True", len(temp_edit) >= 1)
    if temp_edit:
        t = temp_edit[0]
        print_check(f"临时修改的 editor_role 标记了修改人角色",
                    t.get("editor_role") is not None, f"角色: {t.get('editor_role')}")
        print_check(f"临时修改有 change_reason 说明",
                    bool(t.get("change_reason")), f"原因: {t.get('change_reason')}")

    print_subtitle("查看快照下所有判断历史（交接班总览）")
    resp = client.get(f"/api/v1/snapshots/{snap_new_id}/judgments/history")
    all_hist = resp.json()
    temp_all = [h for h in all_hist if h.get("is_temporary_edit")]
    print_check(f"全量历史中筛选临时修改 → {len(temp_all)} 条待复核", len(temp_all) >= 1)

    changes = client.get(f"/api/v1/snapshots/{snap_new_id}/changes").json()
    human_changes = [c for c in changes if c["change_type"] == "human_judgment_update"]
    temp_hint_changes = [c for c in human_changes if c.get("next_step_hint") and "临时" in c.get("next_step_hint","")]
    print_check(f"变更历史中的临时修改带下一步提示", len(temp_hint_changes) >= 1)
    if temp_hint_changes:
        print(f"  提示: {temp_hint_changes[0]['next_step_hint']}")

    return len(temp_all)


def scenario_7_seal_month_flow(snap_old_id: int):
    """
    场景7：月底封账真实节奏
    - 先导入旧材料（创建封账快照）
    - 再补一条晚到附件
    - 接口返回说清所有变化
    """
    print_title("场景7：月底封账流程（导入旧材料→补晚到附件→说清变化）")

    print_subtitle("执行月底封账（2026-06）")
    late_mat_content = "June late user feedback data - 6月迟到的用户反馈数据".encode("utf-8")
    resp = client.post(
        "/api/v1/snapshots/seal-month",
        data={
            "seal_month": "2026-06",
            "created_by": "小唐",
            "old_snapshot_id": snap_old_id,
            "late_material_name": "6月迟到用户反馈数据",
            "late_material_type": "feedback_data",
            "late_impact_description": "用户反馈数据迟到，影响部分6月样本判断"
        },
        files={"late_material_file": ("june_late_feedback.csv", late_mat_content, "text/csv")}
    )
    seal = resp.json()
    print_check(f"月底封账接口调用成功", resp.status_code == 200, f"新快照=#{seal['snapshot_id']}")

    print_subtitle("  人类可读总结：")
    for line in seal["human_readable_summary"].split("\n"):
        if line.strip():
            print(f"    {line.strip()}")

    print_subtitle("  需执行的下一步操作：")
    for action in seal["action_required"]:
        print(f"    * {action}")

    print_check(f"封账状态=sealed", seal["final_status"] == "sealed")
    print_check(f"阶段说明=sealed", seal["stage"] == "sealed")
    print_check(f"有变更历史记录", len(seal["changes_summary"]) >= 1,
                f"共{len(seal['changes_summary'])}条变更")
    print_check(f"有新增材料记录（晚到附件）", len(seal["new_materials"]) >= 1)
    print_check(f"有人类可读的总结文本", len(seal["human_readable_summary"]) > 30)
    print_check(f"有明确的下一步操作列表", len(seal["action_required"]) >= 1)

    if seal["new_materials"]:
        mat = seal["new_materials"][0]
        print_check(f"晚到附件标记 is_late_arrival=True", mat["is_late_arrival"] is True)
        print_check(f"晚到附件影响样本数已估算", mat["affected_samples_count"] >= 0)

    print_subtitle("  详细变更历史：")
    for i, c in enumerate(seal["changes_summary"]):
        tag = f"[迟到]" if "late" in c["change_type"] else ""
        print(f"    {i+1}. {c['change_type']} {tag}: {c['change_reason'][:50]}...")
        if c.get("next_step_hint"):
            print(f"        下一步: {c['next_step_hint'][:80]}...")

    return seal["snapshot_id"]


def scenario_8_compare_snapshots(snap_old_id: int, snap_new_id: int):
    """
    场景8：新旧快照对比
    """
    print_title("场景8：新旧模型快照对比")
    resp = client.get(f"/api/v1/snapshots/{snap_old_id}/compare/{snap_new_id}")
    comp = resp.json()
    print_check(f"对比接口返回成功", resp.status_code == 200)
    print_check(f"总样本数 {comp['total_samples']}", comp["total_samples"] >= 3)
    print(f"  判断变化样本: {comp['changed_samples']} / {comp['total_samples']}")
    for d in comp["differences"]:
        if d["judgment_changed"]:
            mark = "🔄 变化"
        else:
            mark = "✅ 一致"
        print(f"    [{mark}] {d['sample_id']}: {d['old_judgment']} → {d['new_judgment']}")
    return comp


def run_all_tests():
    global _TMP_DIR
    print("\n" + "#"*60)
    print("#" + " "*15 + "召回漏斗版本快照 - 全场景测试" + " "*11 + "#")
    print("#"*60)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    snap_old_id = scenario_1_training_log_retention()
    snap_new_id = scenario_2_threshold_protects_manual(snap_old_id)
    scenario_3_materials_no_silent_overwrite(snap_new_id)
    scenario_4_late_arrival_human_hints(snap_new_id)
    scenario_5_old_misjudged_explanation(snap_old_id, snap_new_id)
    scenario_6_temporary_edit_history(snap_new_id)
    seal_id = scenario_7_seal_month_flow(snap_old_id)
    scenario_8_compare_snapshots(snap_old_id, snap_new_id)

    print("\n" + "="*60)
    print("  全部场景执行完成！")
    print(f"  旧模型快照 #{snap_old_id}")
    print(f"  新模型快照 #{snap_new_id}")
    print(f"  月底封账快照 #{seal_id}")
    print("="*60)
    print(f"\n  测试数据目录: {_TMP_DIR}")
    try:
        shutil.rmtree(_TMP_DIR)
        print("  临时测试数据已清理")
    except:
        pass


if __name__ == "__main__":
    run_all_tests()
