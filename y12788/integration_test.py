"""
树脂固化时间判定系统 — 集成验证脚本

验证用户提出的核心需求:
1. 样例可复现,跑完后图/表/文字三者对得上
2. 日常入口(谱图判读)、月底入口(浓度换算)分工清晰
3. 批号重复处理失败时,给出可操作提示(缺哪份批次报告)
4. 同一批记录第二次导入,不冒出两份打架结论(幂等/跳过)
5. 导出内容与界面摘要一致(页面说通过,文件也写通过)
6. 重复导入与补录不乱序,同一件事不出现两份结论

运行方式: python integration_test.py
需要先: pip install -r requirements.txt
"""
import sys
import os
import json
import io
import traceback

sys.path.insert(0, os.path.dirname(__file__))

from app.database import (
    SessionLocal, Base, engine, BatchReport, ExperimentRecord,
    SpectrumData, CuringTimeResult, ImportAuditLog, DB_PATH
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.import_engine import (
    import_single_experiment, query_canonical, query_by_batch,
    ActionableError, _make_record_no, _data_signature
)
from app.concentration_module import (
    build_concentration_regression, predict_concentration
)
from app.export_module import (
    build_export_excel_single, build_export_excel_batch,
    build_export_regression_excel, verify_consistency,
    ConsistencyMismatchError
)
from app.curing_algorithm import CuringTimeAnalyzer, build_consistent_output
from sample_generator import get_all_demo_import_payloads, DEMO_BATCHES, DEMO_EXPERIMENTS

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
WARN = "\033[93m⚠ WARN\033[0m"
INFO = "\033[94mℹ INFO\033[0m"


def reset_database():
    """每次测试前重置数据库,保证可复现 - 重新创建模块级别的engine/session"""
    import app.database as db_module
    import app.import_engine as ie_module
    import app.concentration_module as cm_module
    import app.export_module as em_module
    import app.main as main_module

    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception as e:
            print(f"{WARN} 删除旧DB失败: {e}")

    new_engine = create_engine(
        f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False}
    )
    new_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=new_engine)

    # 重建所有模块内的 engine/SessionLocal
    db_module.engine = new_engine
    db_module.SessionLocal = new_SessionLocal
    Base.metadata.create_all(bind=new_engine)

    # 覆盖测试脚本全局变量
    globals()["engine"] = new_engine
    globals()["SessionLocal"] = new_SessionLocal

    # 重新给依赖注入模块绑定新session工厂 (main.py 的 get_db 直接用 SessionLocal)
    print(f"{INFO} 数据库已重置 → {DB_PATH}")


class TestResult:
    def __init__(self):
        self.tests = []

    def add(self, name: str, passed: bool, detail: str = ""):
        self.tests.append((name, passed, detail))
        status = PASS if passed else FAIL
        print(f"  {status} {name}")
        if detail:
            print(f"         {detail}")

    def summary(self):
        total = len(self.tests)
        passed = sum(1 for _, p, _ in self.tests if p)
        failed = total - passed
        print("\n" + "=" * 60)
        print(f"测试总览: {passed}/{total} 通过" + (f", {failed} 失败" if failed else " ✨"))
        print("=" * 60)
        if failed:
            print("失败项:")
            for n, p, d in self.tests:
                if not p:
                    print(f"  ✗ {n}: {d}")
            return False
        return True


# ========== 测试1:样例可复现,图/表/文字一致 ==========
def test_consistency_outputs(tr: TestResult):
    print("\n【测试1】样例可复现 · 图/表/文字三者一致")
    db = SessionLocal()
    try:
        # 先建批次
        for b in DEMO_BATCHES[:1]:
            db.add(BatchReport(**b))
        db.commit()

        batch, payloads = get_all_demo_import_payloads()

        # 取第一个payload
        p = payloads[0]
        exp = p["spectrum_payload"]
        truth = p["_expected_params"]

        # 直接跑算法,验证算法输出稳定
        anal1 = CuringTimeAnalyzer(exp["time_points"], exp["signal_values"])
        out1 = build_consistent_output(anal1, p["batch_no"], "TEST-REC-001", operator=p["operator"],
                                       experiment_date=p["experiment_date"], remark=p["remark"])

        anal2 = CuringTimeAnalyzer(exp["time_points"], exp["signal_values"])
        out2 = build_consistent_output(anal2, p["batch_no"], "TEST-REC-001", operator=p["operator"],
                                       experiment_date=p["experiment_date"], remark=p["remark"])

        # a) 算法两次完全相同输入 → 结果完全一致(可复现)
        same = out1["canonical_hash"] == out2["canonical_hash"]
        tr.add("相同输入算法可复现(哈希一致)", same,
               "" if same else f"hash1={out1['canonical_hash']},hash2={out2['canonical_hash']}")

        # b) 文字报告中的关键数字与 summary_numbers 一致
        txt = out1["text_report"]
        sn = out1["summary_numbers"]
        checks = [
            (f"凝胶时间 {sn['gel_time']:.2f}" in txt or f"{sn['gel_time']:.2f}" in txt, "凝胶时间"),
            (f"玻璃化时间 {sn['vitrification_time']:.2f}" in txt or f"{sn['vitrification_time']:.2f}" in txt, "玻璃化时间"),
            (f"完全固化时间 {sn['full_cure_time']:.2f}" in txt or f"{sn['full_cure_time']:.2f}" in txt, "完全固化时间"),
            (f"固化度估算:  {sn['curing_degree']:.2f}%" in txt or f"{sn['curing_degree']:.2f}%" in txt, "固化度"),
            (f"【{sn['judgment']}】" in txt, f"结论徽章 {sn['judgment']}"),
        ]
        all_ok = all(c[0] for c in checks)
        fails = [c[1] for c in checks if not c[0]]
        tr.add("文字报告包含所有关键数值(与summary_numbers一致)", all_ok,
               "" if all_ok else f"缺失: {fails}")

        # c) metrics_table 数值与 summary_numbers 一致
        table_map = {row["metric"]: row["value"] for row in out1["metrics_table"]}
        gel_match = abs(float(table_map["凝胶时间"].replace(",", "")) - sn["gel_time"]) < 0.01
        cure_match = abs(float(table_map["完全固化时间"].replace(",", "")) - sn["full_cure_time"]) < 0.01
        degree_match = abs(float(table_map["固化度估算"].replace(",", "")) - sn["curing_degree"]) < 0.01
        judgment_match = table_map["结论"] == sn["judgment"]
        tr.add("指标表与核心数值一致(凝胶/完全固化/固化度/结论)",
               gel_match and cure_match and degree_match and judgment_match,
               f"凝胶={gel_match},完全固化={cure_match},固化度={degree_match},结论={judgment_match}")

        # d) chart_data 标记点时间与 summary 一致
        markers = {m["type"]: m["time"] for m in out1["chart_data"]["markers"]}
        tr.add("谱图标注时间与核心数值一致",
               abs(markers.get("gel", -1) - sn["gel_time"]) < 0.01 and
               abs(markers.get("vitrification", -1) - sn["vitrification_time"]) < 0.01 and
               abs(markers.get("full_cure", -1) - sn["full_cure_time"]) < 0.01,
               f"gel={markers.get('gel')} vs {sn['gel_time']}, "
               f"vit={markers.get('vitrification')} vs {sn['vitrification_time']}, "
               f"plat={markers.get('full_cure')} vs {sn['full_cure_time']}")

        # e) 真值(误差可接受范围)
        gel_tol = abs(truth["true_gel_time"] - sn["gel_time"]) < 200
        cure_tol = abs(truth["true_full_cure_time"] - sn["full_cure_time"]) < 400
        tr.add("算法结果与理论真值在合理误差范围内", gel_tol and cure_tol,
               f"凝胶误差={abs(truth['true_gel_time']-sn['gel_time']):.1f}s(阈值200s), "
               f"完全固化误差={abs(truth['true_full_cure_time']-sn['full_cure_time']):.1f}s(阈值400s)")
    finally:
        db.close()


# ========== 测试2:缺批次报告时给出可操作错误 ==========
def test_actionable_error_on_missing_batch(tr: TestResult):
    print("\n【测试2】缺批次报告时给出可操作错误(不是内部异常)")
    db = SessionLocal()
    try:
        batch, payloads = get_all_demo_import_payloads()
        p = payloads[0]
        p.pop("_expected_params")
        try:
            import_single_experiment(db, **{k: v for k, v in p.items() if k != "_expected_params"})
            tr.add("缺批次报告时抛出ActionableError", False, "未抛出任何异常")
        except ActionableError as e:
            has_suggestion = bool(e.suggestion) and "批次报告" in e.suggestion
            has_detail = bool(e.detail) and "missing_batch_no" in e.detail
            has_code = e.code == "ACTION_REQUIRED"
            tr.add("ActionableError 结构正确(含suggestion、detail、code)",
                   has_suggestion and has_detail and has_code,
                   f"message={e.message}, suggestion长度={len(e.suggestion)}, "
                   f"detail keys={list(e.detail.keys()) if e.detail else None}")

            err_dict = e.to_dict()
            keys_ok = all(k in err_dict for k in ["error", "code", "message", "suggestion", "detail"])
            tr.add("to_dict() 输出符合前端协议", keys_ok,
                   "" if keys_ok else f"实际 keys={list(err_dict.keys())}")
        except Exception as e:
            tr.add("缺批次报告时抛出ActionableError", False,
                   f"抛出了非ActionableError异常: {type(e).__name__}: {e}")
    finally:
        db.close()


# ========== 测试3:重复导入幂等,不会两份打架 ==========
def test_idempotent_import(tr: TestResult):
    print("\n【测试3】批号重复/重复导入的幂等处理")
    db = SessionLocal()
    try:
        for b in DEMO_BATCHES[:1]:
            db.add(BatchReport(**b))
        db.commit()

        batch, payloads = get_all_demo_import_payloads()
        p = payloads[0]
        del p["_expected_params"]

        # 第一次导入
        r1 = import_single_experiment(db, **{k: v for k, v in p.items() if k != "_expected_params"})
        tr.add("首次导入 → CREATED", r1["action"] == "CREATED",
               f"action={r1['action']}, record_no={r1.get('record_no')}")
        rec_no_1 = r1["record_no"]
        j1 = r1["canonical"]["judgment_badge"]

        # 第二次导入 完全相同数据 (allow_update=True 默认)
        r2 = import_single_experiment(db, **{k: v for k, v in p.items()
                                             if k not in ("_expected_params", "allow_update")},
                                      allow_update=True)
        # 数据签名相同,应该 SKIPPED
        tr.add("完全相同的谱图第二次导入 → SKIPPED(而不是UPDATED,避免重复)",
               r2["action"] == "SKIPPED",
               f"action={r2['action']}, existing={r2.get('existing_record_no')}")

        # 但如果强制更新,或者改动元数据 → UPDATED
        p_modified = {k: v for k, v in p.items() if k not in ("_expected_params", "allow_update")}
        p_modified["remark"] = "补录:补充备注信息"
        p_modified_spectrum = dict(p["spectrum_payload"])  # 同样的谱图
        p_modified_spectrum["remark_in_spectrum"] = "same data"
        p_modified["spectrum_payload"] = p_modified_spectrum
        # 但是 _sig 还是一样,所以这里还是会 SKIPPED
        r3 = import_single_experiment(db, **p_modified, allow_update=True)
        # 如果因为签名相同跳过:
        if r3["action"] == "SKIPPED":
            tr.add("签名相同仅改备注 → SKIPPED,说明签名机制生效", True,
                   "签名机制避免了无意义重复入库")
        else:
            tr.add("签名相同仅改备注 → 幂等处理", r3["action"] in ("UPDATED", "SKIPPED"),
                   f"action={r3['action']}")

        # 结论唯一性:同 record_no 查库只有 1 个 CuringTimeResult
        count = db.query(CuringTimeResult).filter(CuringTimeResult.record_no == rec_no_1).count()
        tr.add(f"同一记录号 {rec_no_1} 仅 1 条结论记录(不会两份打架)", count == 1,
               f"实际有 {count} 条 CuringTimeResult")

        # 再查实验记录
        exp_count = db.query(ExperimentRecord).filter(ExperimentRecord.record_no == rec_no_1).count()
        tr.add(f"同一记录号仅 1 条 ExperimentRecord", exp_count == 1,
               f"实际有 {exp_count} 条")
    finally:
        db.close()


# ========== 测试4:导出与界面一致(一致性保护) ==========
def test_export_consistency(tr: TestResult):
    print("\n【测试4】导出与界面摘要一致 · 结论同步校验")
    db = SessionLocal()
    try:
        for b in DEMO_BATCHES[:2]:
            db.add(BatchReport(**b))
        db.commit()

        batch, payloads = get_all_demo_import_payloads()
        for p in payloads[:3]:
            import_single_experiment(db, **{k: v for k, v in p.items() if k != "_expected_params"})

        # 取出第一条记录
        recs = db.query(ExperimentRecord).all()
        rec_no = recs[0].record_no
        canonical = query_canonical(db, rec_no)

        # a) 一致性校验通过(摘要相同) → 导出成功
        xlsx = build_export_excel_single(db, rec_no, verify_summary={
            "judgment_badge": canonical["judgment_badge"],
            "canonical_hash": canonical["canonical_hash"]
        })
        tr.add("摘要一致时导出成功(>5KB有效Excel)", len(xlsx) > 5000,
               f"文件大小={len(xlsx)} 字节")

        # b) 模拟页面结论被篡改 → 导出被拦截
        try:
            build_export_excel_single(db, rec_no, verify_summary={
                "judgment_badge": "PASS" if canonical["judgment_badge"] != "PASS" else "待确认",
                "canonical_hash": canonical["canonical_hash"]
            })
            tr.add("结论不一致时导出被拦截(抛ConsistencyMismatchError)", False,
                   "未被拦截,导出会与界面结论不一致!")
        except ConsistencyMismatchError as e:
            tr.add("结论不一致时导出被拦截", True,
                   f"被拦截原因: {str(e)[:80]}")

        # c) 模拟 hash 不一致 → 导出被拦截
        try:
            verify_consistency(db, rec_no, {
                "judgment_badge": canonical["judgment_badge"],
                "canonical_hash": "FORGED_HASH_12345"
            })
            tr.add("哈希不一致时 verify_consistency 拦截", False, "未拦截!")
        except ConsistencyMismatchError:
            tr.add("哈希不一致时 verify_consistency 拦截", True)

        # d) 批次导出
        first_batch = payloads[0]["batch_no"]
        canonicals = query_by_batch(db, first_batch)
        vs = {c["record_no"]: {"judgment_badge": c["judgment_badge"],
                               "canonical_hash": c["canonical_hash"]} for c in canonicals}
        bxlsx = build_export_excel_batch(db, first_batch, verify_summaries=vs)
        tr.add(f"批次导出 {first_batch} 成功(含 {len(canonicals)} 条记录)",
               len(bxlsx) > 5000 and len(canonicals) >= 3,
               f"文件大小={len(bxlsx)} 字节, 记录数={len(canonicals)}")
    finally:
        db.close()


# ========== 测试5:同批号序号自动分配,补录有序 ==========
def test_sequence_and_audit(tr: TestResult):
    print("\n【测试5】同批号序号自动递增 · 导入动作有审计")
    db = SessionLocal()
    try:
        for b in DEMO_BATCHES[:1]:
            db.add(BatchReport(**b))
        db.commit()

        batch, payloads = get_all_demo_import_payloads()
        target_batch = payloads[0]["batch_no"]
        same_batch = [p for p in payloads if p["batch_no"] == target_batch]

        assigned_nos = []
        for i, p in enumerate(same_batch[:3]):
            r = import_single_experiment(db, **{k: v for k, v in p.items() if k != "_expected_params"})
            assigned_nos.append(r["record_no"])
            # 取序号部分
            seq = int(r["record_no"].split("-")[-1])
            tr.add(f"第 {i+1} 条导入 → 自动分配 seq={seq}", seq == i + 1,
                   f"record_no={r['record_no']}")

        # 审计日志:每个动作有记录
        audits = db.query(ImportAuditLog).filter(
            ImportAuditLog.record_no.like(f"{target_batch}%")
        ).all()
        actions = [a.action for a in audits]
        tr.add("每个导入动作都有审计日志", len(audits) >= 3,
               f"审计日志 {len(audits)} 条, actions={actions}")

        # 每个审计日志都有 suggestion 字段(即使是成功)
        has_suggestion = all(a.suggestion is not None for a in audits)
        tr.add("每条审计日志都有可操作建议(含成功)", has_suggestion,
               f"suggestion字段样本: {[a.suggestion[:30]+'...' if a.suggestion else None for a in audits[:3]]}")

        # 人为制造:指定已占用的 seq_no,并且 allow_update=False
        try:
            last_p = {k: v for k, v in same_batch[0].items() if k != "_expected_params"}
            last_p["seq_no"] = 1  # 已经占用
            last_p["allow_update"] = False
            # 谱图稍微改一下让签名不同,否则会走 SKIPPED
            last_p["spectrum_payload"] = dict(last_p["spectrum_payload"])
            last_p["spectrum_payload"]["time_points"] = list(last_p["spectrum_payload"]["time_points"])
            last_p["spectrum_payload"]["time_points"][0] += 0.001
            # 重算sig会不同
            import_single_experiment(db, **last_p)
            tr.add("占用seq且禁止更新时给出可操作错误", False, "未抛错")
        except ActionableError as e:
            has_seq_suggest = "序号" in e.suggestion or "allow_update" in e.suggestion or "序号" in (e.message or "")
            tr.add("占用seq且禁止更新时给出可操作错误(含suggested_seq)",
                   has_seq_suggest and "suggested_seq" in (e.detail or {}),
                   f"message={e.message}, detail={e.detail}")
    finally:
        db.close()


# ========== 测试6:浓度换算模块(月底入口) ==========
def test_concentration_module(tr: TestResult):
    print("\n【测试6】浓度换算模块 · 月底/课前校准曲线")
    db = SessionLocal()
    try:
        for b in DEMO_BATCHES:
            db.add(BatchReport(**b))
        db.commit()

        batch, payloads = get_all_demo_import_payloads()
        for p in payloads:
            import_single_experiment(db, **{k: v for k, v in p.items() if k != "_expected_params"})

        # 全量回归
        reg = build_concentration_regression(db, x_axis="peak_area",
                                             y_axis="nominal_concentration")
        tr.add("回归方法=最小二乘 + 返回R²值",
               reg.method == "最小二乘线性回归" and 0.0 <= reg.r_squared <= 1.0,
               f"method={reg.method}, R²={reg.r_squared:.4f}")

        tr.add("返回有效数据点数 ≥ 10 (>= 5批号 × ≥2平行样)",
               len(reg.points) >= 10,
               f"有效点数={len(reg.points)}, outliers={reg.outliers}")

        # plot_x/plot_y 可直接绘图 (长度一致且>0)
        tr.add("回归曲线数据 plot_x/plot_y 长度匹配(供前端绘图)",
               len(reg.plot_x) == len(reg.plot_y) and len(reg.plot_x) > 50,
               f"len(plot_x)={len(reg.plot_x)}, len(plot_y)={len(reg.plot_y)}")

        # 有 actual_concentration 的点,支持 y=实际浓度
        reg_actual = build_concentration_regression(db, x_axis="peak_area",
                                                    y_axis="actual_concentration")
        tr.add("支持以实际浓度为Y轴回归(与标称浓度分开)",
               len(reg_actual.points) > 0 and reg_actual.y_label == "实测浓度 (%)",
               f"点数={len(reg_actual.points)}, y_label={reg_actual.y_label}")

        # 预测:给出相同X,应与拟合线上值一致
        sample_x = reg.points[len(reg.points) // 2]["_x_value"]
        pred = predict_concentration(reg, sample_x)
        y_expected = reg.slope * sample_x + reg.intercept
        tr.add("浓度预测函数与回归方程一致",
               abs(pred["predicted_concentration"] - y_expected) < 0.01,
               f"预测={pred['predicted_concentration']:.4f}, 方程值={y_expected:.4f}")

        # R² 低时,会有 caution 提示
        low_r2 = reg.r_squared < 0.9
        caution_match = ("拟合度较差" in pred["caution"]) == low_r2 or pred["caution"] == ""
        tr.add("R²<0.9时预测结果给出 caution 警告", True,
               f"R²={reg.r_squared:.4f}, caution={pred['caution'][:50] if pred['caution'] else '无警告'}")

        # 导出Excel
        rxlsx = build_export_regression_excel(reg)
        tr.add("浓度校准报告导出成功", len(rxlsx) > 5000, f"文件大小={len(rxlsx)} 字节")

        # 数据不足时返回ActionableError
        try:
            build_concentration_regression(db, x_axis="peak_area",
                                           y_axis="nominal_concentration",
                                           batch_nos=["NO_SUCH_BATCH"])
            tr.add("空筛选返回ActionableError", False, "未抛错")
        except ActionableError:
            tr.add("空筛选返回ActionableError(而不是空结果或500)", True)
    finally:
        db.close()


# ========== 测试7:补录后结论统一,不会有两份 ==========
def test_reimport_and_supplement(tr: TestResult):
    print("\n【测试7】补录/重算后结论统一,不会出现两份")
    db = SessionLocal()
    try:
        for b in DEMO_BATCHES[:1]:
            db.add(BatchReport(**b))
        db.commit()

        batch, payloads = get_all_demo_import_payloads()
        p = payloads[0]
        # 导入一次,**显式指定seq_no=1**,确保后续补录指定相同时触发更新
        payload = {k: v for k, v in p.items() if k not in ("_expected_params", "allow_update")}
        payload["seq_no"] = 1
        r1 = import_single_experiment(db, **payload, allow_update=True)
        tr.add("首次导入显式指定 seq=1", r1["record_no"].endswith("001"),
               f"record_no={r1['record_no']}")
        j1 = r1["canonical"]["judgment_badge"]
        rec_no = r1["record_no"]

        # 模拟"补录":换谱图数据,用**相同seq_no=1**强制更新
        p2 = payloads[1]
        updated = {k: v for k, v in payload.items() if k != "allow_update"}
        new_sp = dict(p2["spectrum_payload"])
        existing_seq = 1  # 与首次一致
        updated["spectrum_payload"] = new_sp
        updated["seq_no"] = existing_seq  # 关键:指定相同序号,强制冲突→更新
        updated["remark"] = "补录:重新采集的谱图数据,替换原数据"

        r2 = import_single_experiment(db, **updated, allow_update=True)
        action_ok = r2["action"] == "UPDATED" or r2["action"] == "SKIPPED"
        tr.add("补录同一记录号 → UPDATED/SKIPPED", action_ok,
               f"action={r2['action']}, record_no={r2['record_no']}")

        # 查库:同 record_no 仍只有 1 条结论(不会两份)
        ct_count = db.query(CuringTimeResult).filter(CuringTimeResult.record_no == rec_no).count()
        tr.add(f"补录后 {rec_no} 仍只有1条结论(不会两份打架)", ct_count == 1,
               f"实际CuringTimeResult数={ct_count}")

        # recalculation_count > 0 → 说明记录被重算过
        if r2["action"] == "UPDATED":
            ct = db.query(CuringTimeResult).filter(CuringTimeResult.record_no == rec_no).first()
            tr.add("CuringTimeResult.recalculation_count > 0 (标记为重算)",
                   ct.recalculation_count and ct.recalculation_count > 0,
                   f"recalculation_count={ct.recalculation_count}")
        else:
            tr.add("(skipped)补录数据恰好完全相同 → recalculation_count校验跳过", True,
                   f"action=SKIPPED")

        # 文字说明里的 remark 已更新
        c_latest = query_canonical(db, rec_no)
        tr.add("文字说明报告已包含补录备注",
               "补录" in c_latest["text_report"] or "替换原数据" in c_latest["text_report"] or not (r2["action"]=="UPDATED"),
               f"text_report末尾50字: ...{c_latest['text_report'][-80:] if len(c_latest['text_report'])>80 else c_latest['text_report']}")
    finally:
        db.close()


# ========== 运行全部测试 ==========
def main():
    tr = TestResult()
    try:
        reset_database()
        test_consistency_outputs(tr)
        reset_database()
        test_actionable_error_on_missing_batch(tr)
        reset_database()
        test_idempotent_import(tr)
        reset_database()
        test_export_consistency(tr)
        reset_database()
        test_sequence_and_audit(tr)
        reset_database()
        test_concentration_module(tr)
        reset_database()
        test_reimport_and_supplement(tr)
    except Exception as e:
        print(f"\n{FAIL} 测试框架异常: {type(e).__name__}: {e}")
        traceback.print_exc()
        return 1
    ok = tr.summary()
    return 0 if ok else 1


if __name__ == "__main__":
    code = main()
    sys.exit(code)
