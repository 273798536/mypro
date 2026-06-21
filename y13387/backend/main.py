from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import random
import math

from database import SessionLocal, init_db, DriftCase, ReplayRun, FeatureSnapshot, MaterialMapping, ManualJudgment, TimelineEvent
from schemas import (
    DriftCaseBase, DriftCaseOut,
    ReplayRunOut, ReplayRunDetail,
    FeatureSnapshotOut,
    MaterialMappingIn, MaterialMappingOut,
    ManualJudgmentIn, ManualJudgmentOut,
    TimelineEventOut,
    TriggerRerunIn, ConfirmLateIn, ExportRunIn, RunCompareOut
)

app = FastAPI(title="漂移监控异常回放 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    init_db()
    db = next(get_db())
    _seed_sample_data(db)
    db.close()


# ============ 工具函数 ============

def _log_timeline(db: Session, case_id: int, run_id: Optional[int], event_type: str,
                  operator: str, description: str, meta: dict = None):
    evt = TimelineEvent(
        case_id=case_id, run_id=run_id, event_type=event_type,
        operator=operator, description=description, meta=meta
    )
    db.add(evt)


def _gen_dist(seed: int, drift: bool = False):
    random.seed(seed)
    n = 20
    base = [random.gauss(50, 10) for _ in range(n)]
    if drift:
        base = [x + random.uniform(15, 25) for x in base]
    buckets = [0] * 10
    for v in base:
        idx = min(9, max(0, int(v // 10)))
        buckets[idx] += 1
    labels = [f"{i * 10}-{i * 10 + 9}" for i in range(10)]
    return {"labels": labels, "values": buckets}


def _ks_test(ref_vals, cur_vals):
    ref_cum, cur_cum = [], []
    rs, cs = sum(ref_vals) or 1, sum(cur_vals) or 1
    ra, ca = 0, 0
    for r, c in zip(ref_vals, cur_vals):
        ra += r / rs
        ca += c / cs
        ref_cum.append(ra)
        cur_cum.append(ca)
    return max(abs(a - b) for a, b in zip(ref_cum, cur_cum))


# ============ 种子样例数据 ============

def _seed_sample_data(db: Session):
    if db.query(DriftCase).count() > 0:
        return

    case = DriftCase(
        case_no="DRIFT-2026-0618-001",
        title="用户风险评分模型 - 近7天特征分布偏移",
        model_name="risk_score_v2"
    )
    db.add(case)
    db.flush()

    # 第一轮 run v1 - 正常完成
    run1 = ReplayRun(
        case_id=case.id, run_version=1, model_version="risk_score_v2.3.1",
        status="completed", trigger_source="scheduled", triggered_by="system",
        drift_score=0.08, threshold=0.15, is_drift=False,
        final_conclusion="所有特征分布稳定，未检测到显著漂移。KS 最大 0.08 < 阈值 0.15。",
        started_at=datetime.utcnow() - timedelta(hours=48),
        finished_at=datetime.utcnow() - timedelta(hours=47, minutes=50),
    )
    db.add(run1)
    db.flush()

    feature_names_v1 = ["age_dist", "income_level", "credit_util", "trans_freq", "addr_change"]
    for i, fname in enumerate(feature_names_v1):
        ref = _gen_dist(100 + i, drift=False)
        cur = _gen_dist(200 + i, drift=False)
        db.add(FeatureSnapshot(
            run_id=run1.id, feature_name=fname,
            reference_dist=ref, current_dist=cur,
            ks_statistic=_ks_test(ref["values"], cur["values"]),
            was_late=False
        ))

    # 第二轮 run v2 - 特征迟到，进入 pending_confirm
    run2 = ReplayRun(
        case_id=case.id, run_version=2, model_version="risk_score_v2.3.1",
        status="pending_confirm", trigger_source="scheduled", triggered_by="system",
        drift_score=None, threshold=0.15, is_drift=None,
        final_conclusion=None,
        feature_late_reason="核心特征 addr_change（地址变更频率）距预期到港时间已延迟 6 小时 23 分，上游数据管道日志显示 ETL 任务异常中断，目前仍在重试队列中。其余 4 项特征已到齐。",
        confirm_next_step="方案A：等待 addr_change 到港后自动触发补跑（建议，不丢失精度）。方案B：勾选【跳过迟到特征】立即回放（仅在紧急复核时使用，精度会受影响）。",
        started_at=datetime.utcnow() - timedelta(hours=6),
    )
    db.add(run2)
    db.flush()

    for i, fname in enumerate(feature_names_v1):
        late = (fname == "addr_change")
        ref = _gen_dist(100 + i, drift=False)
        cur = _gen_dist(500 + i, drift=(i >= 3))
        snap = FeatureSnapshot(
            run_id=run2.id, feature_name=fname,
            reference_dist=ref, current_dist=cur,
            ks_statistic=_ks_test(ref["values"], cur["values"]) if not late else None,
            was_late=late
        )
        if late:
            snap.current_dist = {"labels": ref["labels"], "values": [0] * 10, "_note": "数据未到港"}
        db.add(snap)

    # v1 的人工判词（模型版本没变，保留）
    db.add(ManualJudgment(
        run_id=run1.id, judge_name="林晓（算法）",
        judgment="confirmed", reason="与业务侧核对过，本周无客群变化，v1 结论可信。",
        before_status="completed", after_status="completed",
        preserved=True, prev_run_id=None
    ))

    # 时间线
    _log_timeline(db, case.id, run1.id, "run_started", "system",
                  f"启动回放 RUN#v1（模型 risk_score_v2.3.1，调度触发）")
    _log_timeline(db, case.id, run1.id, "run_completed", "system",
                  f"RUN#v1 完成：漂移分 0.08，结论【无漂移】", {"drift_score": 0.08})
    _log_timeline(db, case.id, run1.id, "judgment_added", "林晓（算法）",
                  "算法组确认 v1 结论，附业务侧客群核对说明")
    _log_timeline(db, case.id, run2.id, "run_started", "system",
                  f"启动回放 RUN#v2（模型 risk_score_v2.3.1，调度触发）")
    _log_timeline(db, case.id, run2.id, "status_changed", "system",
                  f"RUN#v2 状态变更：running → pending_confirm（特征迟到）",
                  {"from": "running", "to": "pending_confirm", "late_features": ["addr_change"]})

    # 另一案件（用于复核人对比演示 - 模型升级）
    case2 = DriftCase(
        case_no="DRIFT-2026-0620-017",
        title="营销推荐模型 - 用户兴趣分桶偏移",
        model_name="rec_interest_v3"
    )
    db.add(case2)
    db.flush()

    run_a = ReplayRun(
        case_id=case2.id, run_version=1, model_version="rec_interest_v3.0.5",
        status="completed", trigger_source="manual", triggered_by="许工（算法）",
        drift_score=0.22, threshold=0.15, is_drift=True,
        final_conclusion="interest_sports 与 interest_food 两个分桶 KS>0.2，判定漂移。",
        started_at=datetime.utcnow() - timedelta(days=2),
        finished_at=datetime.utcnow() - timedelta(days=2) + timedelta(minutes=12),
    )
    run_b = ReplayRun(
        case_id=case2.id, run_version=2, model_version="rec_interest_v3.1.0",
        status="completed", trigger_source="manual", triggered_by="许工（算法）",
        drift_score=0.18, threshold=0.15, is_drift=True,
        final_conclusion="升级至 v3.1.0 后，sports 分桶 KS 回落至 0.17，food 仍偏高。",
        started_at=datetime.utcnow() - timedelta(hours=20),
        finished_at=datetime.utcnow() - timedelta(hours=19, minutes=48),
    )
    db.add_all([run_a, run_b])
    db.flush()

    # v1 的人工判词 - 升级模型后 preserved 仍 = True，不会被盖
    db.add(ManualJudgment(
        run_id=run_a.id, judge_name="王磊（复核）",
        judgment="adjusted", reason="v3.0.5 漂移判断准确，当时已通知下游降权。老判词不随模型升级消失。",
        before_status="completed", after_status="completed",
        preserved=True, prev_run_id=None,
        created_at=datetime.utcnow() - timedelta(days=1)
    ))
    db.add(ManualJudgment(
        run_id=run_b.id, judge_name="王磊（复核）",
        judgment="confirmed", reason="v3.1.0 修复了部分偏差，已跟踪 food 分桶后续走势。",
        before_status="completed", after_status="completed",
        preserved=True, prev_run_id=run_a.id
    ))

    for ri, r in enumerate([run_a, run_b]):
        for i, fn in enumerate(["interest_sports", "interest_food", "interest_travel", "interest_tech"]):
            ref = _gen_dist(300 + ri * 10 + i, False)
            cur = _gen_dist(400 + ri * 10 + i, drift=(i in [0, 1]))
            db.add(FeatureSnapshot(
                run_id=r.id, feature_name=fn,
                reference_dist=ref, current_dist=cur,
                ks_statistic=_ks_test(ref["values"], cur["values"]),
                was_late=False
            ))

    # 名称不一致的材料关联到 run_b
    db.add(MaterialMapping(
        run_id=run_b.id,
        material_name_raw="【附件】体育类目召回量下滑说明_vfinal(最终版)(1).xlsx",
        material_name_standard="体育类目召回量下滑说明.xlsx",
        matched_evidence="材料第 3 页：2026-06-18 体育召回量从 210w 降至 164w，与 interest_sports 分桶偏移时间完全吻合。",
        linked_conclusion="佐证 RUN#v2（v3.1.0）中 sports 分桶的漂移结论，建议保留此材料在复核档案。",
        uploaded_by="许工（算法）"
    ))

    _log_timeline(db, case2.id, run_a.id, "run_started", "许工（算法）",
                  "RUN#v1 启动（v3.0.5，人工触发）")
    _log_timeline(db, case2.id, run_a.id, "run_completed", "system",
                  "RUN#v1 完成：漂移分 0.22，判定【漂移】")
    _log_timeline(db, case2.id, run_a.id, "judgment_added", "王磊（复核）",
                  "复核人对 v3.0.5 判词做了调整说明，下游已降权")
    _log_timeline(db, case2.id, run_b.id, "run_started", "许工（算法）",
                  "RUN#v2 启动（v3.1.0 新模型，人工触发）")
    _log_timeline(db, case2.id, run_b.id, "material_linked", "许工（算法）",
                  "关联材料【体育类目召回量下滑说明】到 v2 结论")
    _log_timeline(db, case2.id, run_b.id, "run_completed", "system",
                  "RUN#v2 完成：漂移分 0.18，sports 分桶改善")
    _log_timeline(db, case2.id, run_b.id, "judgment_added", "王磊（复核）",
                  "复核人确认 v3.1.0 结果，并保留 v3.0.5 历史判词（preserved=true）")

    db.commit()


# ============ Case 列表 / 详情 ============

@app.get("/api/cases", response_model=List[DriftCaseOut])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(DriftCase).order_by(DriftCase.updated_at.desc()).all()
    out = []
    for c in cases:
        runs = sorted(c.runs, key=lambda r: r.run_version)
        latest = runs[-1] if runs else None
        o = DriftCaseOut.model_validate(c)
        if latest:
            o.latest_run_id = latest.id
            o.latest_status = latest.status
        out.append(o)
    return out


@app.get("/api/cases/{case_id}", response_model=DriftCaseOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    c = db.query(DriftCase).get(case_id)
    if not c:
        raise HTTPException(404, "案件不存在")
    runs = sorted(c.runs, key=lambda r: r.run_version)
    latest = runs[-1] if runs else None
    o = DriftCaseOut.model_validate(c)
    if latest:
        o.latest_run_id = latest.id
        o.latest_status = latest.status
    return o


@app.get("/api/cases/{case_id}/runs", response_model=List[ReplayRunOut])
def list_case_runs(case_id: int, db: Session = Depends(get_db)):
    runs = db.query(ReplayRun).filter(ReplayRun.case_id == case_id).order_by(ReplayRun.run_version).all()
    return [ReplayRunOut.model_validate(r) for r in runs]


@app.get("/api/runs/{run_id}", response_model=ReplayRunDetail)
def get_run_detail(run_id: int, db: Session = Depends(get_db)):
    r = db.query(ReplayRun).get(run_id)
    if not r:
        raise HTTPException(404, "回放版本不存在")
    return ReplayRunDetail(
        **ReplayRunOut.model_validate(r).model_dump(),
        snapshots=[FeatureSnapshotOut.model_validate(s) for s in r.snapshots],
        materials=[MaterialMappingOut.model_validate(m) for m in r.materials],
        judgments=[ManualJudgmentOut.model_validate(j) for j in r.judgments],
    )


# ============ 重跑（关键：不覆盖旧版本） ============

@app.post("/api/runs/rerun", response_model=ReplayRunDetail)
def trigger_rerun(payload: TriggerRerunIn, db: Session = Depends(get_db)):
    """
    核心：触发一次新的回放，永不覆盖旧 run。
    - run_version = 历史最大值 + 1
    - 旧快照、旧判词全部保留（通过 run_id 隔离）
    - 状态变更会写 timeline
    """
    case = db.query(DriftCase).get(payload.case_id)
    if not case:
        raise HTTPException(404, "案件不存在")

    prev_runs = sorted(case.runs, key=lambda r: r.run_version)
    latest = prev_runs[-1] if prev_runs else None
    next_version = (latest.run_version + 1) if latest else 1
    model_version = payload.model_version or (latest.model_version if latest else (case.model_name + "_v1.0.0"))

    new_run = ReplayRun(
        case_id=case.id, run_version=next_version,
        model_version=model_version, status="running",
        trigger_source=payload.trigger_source, triggered_by=payload.triggered_by,
        threshold=(latest.threshold if latest else 0.15),
    )
    db.add(new_run)
    db.flush()

    _log_timeline(db, case.id, new_run.id, "rerun_triggered", payload.triggered_by,
                  f"触发重跑 RUN#v{next_version}（模型 {model_version}，来源：{payload.trigger_source}），"
                  f"旧版本 RUN#v{latest.run_version if latest else 0} 已归档不覆盖。",
                  {"prev_run_id": latest.id if latest else None, "next_version": next_version})

    # 模拟：5% 概率特征迟到，其余完成
    is_late_case = (next_version % 5 == 0)

    feature_names = [s.feature_name for s in latest.snapshots] if latest else ["f1", "f2", "f3"]
    seed_base = next_version * 100
    drift_happened = (next_version % 3 == 0)
    ks_list = []

    for i, fn in enumerate(feature_names):
        late = is_late_case and (i == len(feature_names) - 1)
        ref = _gen_dist(seed_base + i, drift=False)
        cur = _gen_dist(seed_base + 50 + i, drift=drift_happened)
        snap = FeatureSnapshot(
            run_id=new_run.id, feature_name=fn,
            reference_dist=ref, current_dist=cur if not late else {"labels": ref["labels"], "values": [0] * 10, "_note": "数据未到港"},
            ks_statistic=None if late else round(_ks_test(ref["values"], cur["values"]), 4),
            was_late=late, arrived_at=(datetime.utcnow() if not late else None)
        )
        db.add(snap)
        if not late:
            ks_list.append(snap.ks_statistic)

    db.flush()

    if is_late_case:
        new_run.status = "pending_confirm"
        new_run.feature_late_reason = f"特征 {feature_names[-1]} 未到港，当前已到齐 {len(feature_names) - 1}/{len(feature_names)}。"
        new_run.confirm_next_step = "请等待特征到港，或勾选【跳过迟到特征】立即回放。若等不及，可先查看已到齐特征的初步分布。"
        _log_timeline(db, case.id, new_run.id, "status_changed", "system",
                      f"RUN#v{next_version} → pending_confirm（特征 {feature_names[-1]} 迟到）",
                      {"from": "running", "to": "pending_confirm"})
    else:
        new_run.status = "completed"
        new_run.drift_score = round(max(ks_list), 4)
        new_run.is_drift = (new_run.drift_score > new_run.threshold)
        new_run.final_conclusion = (f"最大 KS={new_run.drift_score} {'超过' if new_run.is_drift else '低于'}阈值 {new_run.threshold}，"
                                    f"判定【{'漂移' if new_run.is_drift else '无漂移'}】。")
        new_run.finished_at = datetime.utcnow()
        _log_timeline(db, case.id, new_run.id, "run_completed", "system",
                      f"RUN#v{next_version} 完成：漂移分 {new_run.drift_score}，结论【{'漂移' if new_run.is_drift else '无漂移'}】",
                      {"drift_score": new_run.drift_score, "is_drift": new_run.is_drift})

    # 如果是新模型版本，明确把旧 run 的判词标记 preserved=True（本来就是默认，此处显式记录）
    if latest and latest.model_version != model_version:
        for j in latest.judgments:
            j.preserved = True
        _log_timeline(db, case.id, latest.id, "status_changed", "system",
                      f"检测到模型版本变更 {latest.model_version} → {model_version}，旧 RUN#v{latest.run_version} 的人工判词已锁保护（preserved=true，不被覆盖）")

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_run)
    return ReplayRunDetail(
        **ReplayRunOut.model_validate(new_run).model_dump(),
        snapshots=[FeatureSnapshotOut.model_validate(s) for s in new_run.snapshots],
        materials=[MaterialMappingOut.model_validate(m) for m in new_run.materials],
        judgments=[ManualJudgmentOut.model_validate(j) for j in new_run.judgments],
    )


# ============ 人工确认（特征迟到场景） ============

@app.post("/api/runs/confirm-late", response_model=ReplayRunDetail)
def confirm_late(payload: ConfirmLateIn, db: Session = Depends(get_db)):
    run = db.query(ReplayRun).get(payload.run_id)
    if not run or run.status != "pending_confirm":
        raise HTTPException(400, "状态不允许确认")

    before = run.status
    late_snaps = [s for s in run.snapshots if s.was_late]

    if payload.confirmed:
        # 等待特征到港，这里模拟立刻到达
        for s in late_snaps:
            s.was_late = False
            s.arrived_at = datetime.utcnow()
            ref = s.reference_dist
            s.current_dist = _gen_dist(run.run_version * 99 + hash(s.feature_name) % 1000, drift=True)
            s.ks_statistic = round(_ks_test(ref["values"], s.current_dist["values"]), 4)
        ks_list = [s.ks_statistic for s in run.snapshots if s.ks_statistic is not None]
        run.status = "completed"
        run.drift_score = round(max(ks_list), 4)
        run.is_drift = (run.drift_score > run.threshold)
        run.final_conclusion = (f"人工确认后补跑完成：最大 KS={run.drift_score}，"
                                f"判定【{'漂移' if run.is_drift else '无漂移'}】。")
        run.feature_late_reason = None
        run.confirm_next_step = None
        run.finished_at = datetime.utcnow()
        after = "completed"
        _log_timeline(db, run.case_id, run.id, "feature_arrived", payload.judge_name,
                      f"{payload.judge_name} 选择【等待特征到港】：{len(late_snaps)} 项迟到特征已补全并重算。")
    else:
        # 跳过迟到特征
        ks_list = [s.ks_statistic for s in run.snapshots if s.ks_statistic is not None]
        run.status = "completed"
        run.drift_score = round(max(ks_list), 4) if ks_list else 0.0
        run.is_drift = (run.drift_score > run.threshold)
        run.final_conclusion = (f"人工确认：已跳过 {len(late_snaps)} 项迟到特征。基于已到齐特征计算："
                                f"最大 KS={run.drift_score}，判定【{'漂移' if run.is_drift else '无漂移'}】。"
                                f"迟到特征：{', '.join(s.feature_name for s in late_snaps)}")
        run.feature_late_reason = None
        run.confirm_next_step = None
        run.finished_at = datetime.utcnow()
        after = "completed"
        _log_timeline(db, run.case_id, run.id, "status_changed", payload.judge_name,
                      f"{payload.judge_name} 选择【跳过迟到特征】立即完成。")

    _log_timeline(db, run.case_id, run.id, "status_changed", payload.judge_name,
                  f"RUN#v{run.run_version} 状态 {before} → {after}，原因：{payload.reason}" +
                  (f"，下一步：{payload.next_step}" if payload.next_step else ""),
                  {"from": before, "to": after, "reason": payload.reason, "next_step": payload.next_step})

    # 人工确认本身也算一次判词
    db.add(ManualJudgment(
        run_id=run.id, judge_name=payload.judge_name,
        judgment="confirmed" if payload.confirmed else "adjusted",
        reason=payload.reason + (f" | 下一步：{payload.next_step}" if payload.next_step else ""),
        before_status=before, after_status=after, preserved=True
    ))

    case = db.query(DriftCase).get(run.case_id)
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(run)
    return ReplayRunDetail(
        **ReplayRunOut.model_validate(run).model_dump(),
        snapshots=[FeatureSnapshotOut.model_validate(s) for s in run.snapshots],
        materials=[MaterialMappingOut.model_validate(m) for m in run.materials],
        judgments=[ManualJudgmentOut.model_validate(j) for j in run.judgments],
    )


# ============ 材料关联（名称不一致 → 结论） ============

@app.post("/api/runs/{run_id}/materials", response_model=MaterialMappingOut)
def link_material(run_id: int, payload: MaterialMappingIn, db: Session = Depends(get_db)):
    run = db.query(ReplayRun).get(run_id)
    if not run:
        raise HTTPException(404, "run 不存在")
    m = MaterialMapping(run_id=run_id, **payload.model_dump())
    db.add(m)
    db.flush()
    _log_timeline(db, run.case_id, run.id, "material_linked", payload.uploaded_by,
                  f"关联材料【{payload.material_name_standard}】→ 结论：{payload.linked_conclusion[:40]}...",
                  {"raw_name": payload.material_name_raw, "std_name": payload.material_name_standard})
    case = db.query(DriftCase).get(run.case_id)
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(m)
    return MaterialMappingOut.model_validate(m)


@app.get("/api/runs/{run_id}/materials", response_model=List[MaterialMappingOut])
def list_materials(run_id: int, db: Session = Depends(get_db)):
    items = db.query(MaterialMapping).filter(MaterialMapping.run_id == run_id).order_by(MaterialMapping.created_at.desc()).all()
    return [MaterialMappingOut.model_validate(m) for m in items]


# ============ 人工判词（改判可溯源） ============

@app.post("/api/judgments", response_model=ManualJudgmentOut)
def add_judgment(payload: ManualJudgmentIn, db: Session = Depends(get_db)):
    """
    新增/改判一条人工判词。
    - before_status/after_status 自动补
    - 写入 timeline
    - 旧判词永远保留（不 update，只 insert 新的）
    """
    run = db.query(ReplayRun).get(payload.run_id)
    if not run:
        raise HTTPException(404, "run 不存在")

    before_status = run.status
    if payload.judgment == "rejected":
        after_status = "rejected"
    elif payload.judgment == "adjusted":
        after_status = "completed"
    else:
        after_status = "completed" if before_status == "completed" else before_status

    # 找到该案件最近的上一个 run（同模型或不同模型都保留链）
    prev_runs = sorted(db.query(ReplayRun).filter(ReplayRun.case_id == run.case_id, ReplayRun.id < run.id).all(),
                       key=lambda r: r.id)
    prev_run_id = prev_runs[-1].id if prev_runs else None

    j = ManualJudgment(
        run_id=payload.run_id, judge_name=payload.judge_name,
        judgment=payload.judgment, reason=payload.reason,
        before_status=before_status, after_status=after_status,
        preserved=True, prev_run_id=prev_run_id
    )
    db.add(j)
    db.flush()

    run.status = after_status
    _log_timeline(db, run.case_id, run.id, "judgment_added", payload.judge_name,
                  f"[{payload.judgment.upper()}] {payload.reason[:60]}",
                  {"from": before_status, "to": after_status, "judgment": payload.judgment})

    case = db.query(DriftCase).get(run.case_id)
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(j)
    return ManualJudgmentOut.model_validate(j)


@app.get("/api/runs/{run_id}/judgments", response_model=List[ManualJudgmentOut])
def list_judgments(run_id: int, db: Session = Depends(get_db)):
    items = db.query(ManualJudgment).filter(ManualJudgment.run_id == run_id).order_by(ManualJudgment.created_at.desc()).all()
    return [ManualJudgmentOut.model_validate(j) for j in items]


# ============ 时间线 ============

@app.get("/api/cases/{case_id}/timeline", response_model=List[TimelineEventOut])
def get_timeline(case_id: int, db: Session = Depends(get_db)):
    items = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).order_by(TimelineEvent.created_at.asc()).all()
    return [TimelineEventOut.model_validate(e) for e in items]


# ============ 版本对比（复核人） ============

@app.get("/api/cases/{case_id}/compare", response_model=RunCompareOut)
def compare_runs(case_id: int, run_a: int, run_b: int, db: Session = Depends(get_db)):
    """
    复核人对照两次回放结果看差异：
    - 返回两个 run 的完整详情
    - 返回结构化 diff（状态、漂移分、结论、判词差异）
    - 旧判词 preserved=true 的即使模型变了也会出现
    """
    ra = db.query(ReplayRun).get(run_a)
    rb = db.query(ReplayRun).get(run_b)
    if not ra or not rb or ra.case_id != case_id or rb.case_id != case_id:
        raise HTTPException(400, "run 参数不合法")

    def to_detail(r):
        return ReplayRunDetail(
            **ReplayRunOut.model_validate(r).model_dump(),
            snapshots=[FeatureSnapshotOut.model_validate(s) for s in r.snapshots],
            materials=[MaterialMappingOut.model_validate(m) for m in r.materials],
            judgments=[ManualJudgmentOut.model_validate(j) for j in r.judgments],
        )

    status_diff = {
        "model_version": {"a": ra.model_version, "b": rb.model_version, "changed": ra.model_version != rb.model_version},
        "status": {"a": ra.status, "b": rb.status, "changed": ra.status != rb.status},
        "drift_score": {"a": ra.drift_score, "b": rb.drift_score,
                        "delta": round((rb.drift_score or 0) - (ra.drift_score or 0), 4) if ra.drift_score and rb.drift_score else None},
        "is_drift": {"a": ra.is_drift, "b": rb.is_drift, "changed": ra.is_drift != rb.is_drift},
        "final_conclusion": {"a": ra.final_conclusion, "b": rb.final_conclusion},
        "material_count": {"a": len(ra.materials), "b": len(rb.materials)},
    }

    judgment_diff = {
        "a_count": len(ra.judgments),
        "b_count": len(rb.judgments),
        "a_preserved": sum(1 for j in ra.judgments if j.preserved),
        "b_preserved": sum(1 for j in rb.judgments if j.preserved),
        "note": "即使模型版本升级，preserved=true 的旧判词仍保留在旧 run 中供复核追溯。",
        "prev_chain_a": [j.prev_run_id for j in ra.judgments],
        "prev_chain_b": [j.prev_run_id for j in rb.judgments],
    }

    return RunCompareOut(
        run_a=to_detail(ra),
        run_b=to_detail(rb),
        status_diff=status_diff,
        judgment_diff=judgment_diff,
    )


# ============ 导出 ============

@app.post("/api/runs/export")
def export_run(payload: ExportRunIn, db: Session = Depends(get_db)):
    """返回可下载的 JSON（复核人重新导出）。"""
    r = db.query(ReplayRun).get(payload.run_id)
    if not r:
        raise HTTPException(404, "run 不存在")
    _log_timeline(db, r.case_id, r.id, "exported", payload.exported_by,
                  f"{payload.exported_by} 重新导出 RUN#v{r.run_version} 归档（模型 {r.model_version}）")
    case = db.query(DriftCase).get(r.case_id)
    case.updated_at = datetime.utcnow()
    db.commit()

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": payload.exported_by,
        "case": {
            "case_no": case.case_no, "title": case.title, "model_name": case.model_name
        },
        "run": {
            "version": r.run_version, "model_version": r.model_version,
            "status": r.status, "drift_score": r.drift_score,
            "threshold": r.threshold, "is_drift": r.is_drift,
            "final_conclusion": r.final_conclusion,
            "trigger_source": r.trigger_source, "triggered_by": r.triggered_by,
            "started_at": r.started_at.isoformat(),
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        },
        "snapshots": [
            {"feature": s.feature_name, "ks": s.ks_statistic, "was_late": s.was_late,
             "ref": s.reference_dist, "cur": s.current_dist}
            for s in r.snapshots
        ],
        "materials": [
            {"raw": m.material_name_raw, "std": m.material_name_standard,
             "evidence": m.matched_evidence, "conclusion": m.linked_conclusion}
            for m in r.materials
        ],
        "judgments": [
            {"judge": j.judge_name, "judgment": j.judgment, "reason": j.reason,
             "preserved": j.preserved, "prev_run_id": j.prev_run_id}
            for j in r.judgments
        ],
        "timeline": [
            {"t": e.created_at.isoformat(), "type": e.event_type, "op": e.operator, "desc": e.description}
            for e in case.timeline if e.run_id == r.id
        ],
    }


@app.get("/api/health")
def health():
    return {"ok": True, "service": "drift-monitor-replay", "version": "2.0.0"}
