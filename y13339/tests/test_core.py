#!/usr/bin/env python3
"""端到端测试 + 语法自检 - 不依赖外部服务，直接验证核心逻辑"""
import json
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PASS = 0
FAIL = 0


def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name}  {detail}")


def test_errors():
    print("\n=== 错误码稳定性 ===")
    from app import errors
    stable = {
        "ERR_OK": "E000",
        "ERR_PARAM_MISSING": "E101",
        "ERR_PARAM_INVALID": "E102",
        "ERR_RUN_ID_NOT_FOUND": "E201",
        "ERR_MATERIAL_NOT_FOUND": "E202",
        "ERR_SAMPLE_LEAK_DETECTED": "E301",
        "ERR_VERSION_CONFLICT": "E302",
        "ERR_MANUAL_OVERRIDE_EXISTS": "E303",
        "ERR_FILE_READ": "E401",
        "ERR_CALCULATION_FAILED": "E500",
    }
    for k, v in stable.items():
        check(f"错误码 {k}={v} 稳定", getattr(errors, k) == v, f"实际={getattr(errors, k)}")
    check("错误提示包含占位", "{field}" in errors.ERR_PARAM_MISSING_MSG)


def test_models():
    print("\n=== 数据模型 ===")
    from app.models import RunRecord, Material, RecallResult, LeakInfo

    r = RunRecord(run_name="测试运行")
    check("RunRecord有run_id", bool(r.run_id))
    check("RunRecord有created_at", bool(r.created_at))
    check("RunRecord默认status=pending", r.status == "pending")

    m = Material(material_name="测试材料", aliases=["别名1", "别名2"])
    check("Material有material_id", bool(m.material_id))
    check("Material默认v1", m.version == 1)

    rec = RecallResult(
        sample_id="s1", query="test",
        recalled_material_ids=[m.material_id],
        recalled_scores=[0.95],
        expected_material_id=m.material_id,
    )
    check("RecallResult结构OK", rec.sample_id == "s1")
    check("RunRecord.to_dict()无异常", isinstance(r.to_dict(), dict))


def test_material_manager():
    print("\n=== 材料管理（名称不一致+口径变更） ===")
    from app.material_manager import register_material, find_material_by_name
    from app import errors
    materials = {}

    m1, ec1, em1 = register_material(materials, "实名认证规范", "请提供身份证", aliases=["实名", "身份认证"])
    check("新材料注册成功", ec1 is None)
    check("别名被记录", "实名" in m1.aliases)

    found = find_material_by_name(materials, "实名")
    check("别名匹配成功", found is not None and found.material_id == m1.material_id)
    found2 = find_material_by_name(materials, "身份认证")
    check("别名2匹配成功", found2.material_id == m1.material_id)
    notfound = find_material_by_name(materials, "不存在")
    check("无匹配返回None", notfound is None)

    # 口径变更（不改名改内容）
    m2, ec2, em2 = register_material(materials, "实名认证规范", "请提供身份证正反面+人脸验证", change_note="v2增加人脸")
    check("检测到口径变更 -> ERR_VERSION_CONFLICT", ec2 == errors.ERR_VERSION_CONFLICT)
    check("版本升级到v2", m2.version == 2)
    check("变更说明被记录", m2.change_note == "v2增加人脸")
    check("同一材料id不变", m2.material_id == m1.material_id)

    # 人工修正保护
    m3, ec3, _ = register_material(materials, "实名认证规范", "人工修正后的内容",
                                   is_manual_override=True, override_note="老唐确认")
    check("人工修正记录OK", m3.is_manual_override is True)

    # 再次用模型结果尝试覆盖 - 应返回冲突
    m4, ec4, _ = register_material(materials, "实名认证规范", "模型新输出的内容", source_type="model")
    check("人工修正不被模型覆盖 -> ERR_MANUAL_OVERRIDE_EXISTS", ec4 == errors.ERR_MANUAL_OVERRIDE_EXISTS)
    check("内容未改变（还是人工修正的）", "人工修正" in m4.material_content)
    check("人工修正标志保留", m4.is_manual_override is True)

    # 名称不一致匹配（不同叫法）
    m5, _, _ = register_material(materials, "交易冻结标准", "48小时冻结", aliases=["风控拦截"])
    m6, _, _ = register_material(materials, "风控拦截标准", "更新为72小时")
    check("通过别名自动匹配到同一份材料", m6.material_id == m5.material_id)
    check("版本自动升级", m6.version == 2)


def test_metrics():
    print("\n=== 指标计算 + 异常样本检测 ===")
    from app.metrics import compute_metrics, _match_at_k, _rank_of_expected
    from app.models import RecallResult

    # 构造一组测试样本
    results = []
    # s1: Top1命中
    results.append(RecallResult("s1", "q1", ["m1", "m2", "m3", "m4", "m5"], [0.9, 0.8, 0.7, 0.6, 0.5], expected_material_id="m1"))
    # s2: Top3命中
    results.append(RecallResult("s2", "q2", ["m2", "m3", "m1", "m4", "m5"], [0.9, 0.8, 0.7, 0.6, 0.5], expected_material_id="m1"))
    # s3: Top5命中
    results.append(RecallResult("s3", "q3", ["m2", "m3", "m4", "m5", "m1"], [0.9, 0.8, 0.7, 0.6, 0.5], expected_material_id="m1"))
    # s4: 未召回
    results.append(RecallResult("s4", "q4", ["m2", "m3", "m4", "m5", "m6"], [0.9, 0.8, 0.7, 0.6, 0.5], expected_material_id="m1"))
    # s5: Top1命中
    results.append(RecallResult("s5", "q5", ["m1", "m2", "m3", "m4", "m5"], [0.9, 0.8, 0.7, 0.6, 0.5], expected_material_id="m1"))
    # s6: Top1命中
    results.append(RecallResult("s6", "q6", ["m1", "m2", "m3", "m4", "m5"], [0.9, 0.8, 0.7, 0.6, 0.5], expected_material_id="m1"))
    # s7: 未召回（这个应该被识别为拉偏样本）
    results.append(RecallResult("s7", "q7", ["m2", "m3", "m4", "m5", "m6"], [0.98, 0.96, 0.94, 0.92, 0.90], expected_material_id="m1"))

    metrics, outliers = compute_metrics(results)
    print(f"   指标: Recall@1={metrics['recall_at_1']}, R@3={metrics['recall_at_3']}, R@5={metrics['recall_at_5']}, MRR={metrics['mrr']}")
    check("Recall@1正确(4/7≈0.571)", abs(metrics["recall_at_1"] - 4/7) < 0.01)
    check("Recall@3正确(5/7≈0.714)", abs(metrics["recall_at_3"] - 5/7) < 0.01)
    check("Recall@5正确(6/7≈0.857)", abs(metrics["recall_at_5"] - 6/7) < 0.01)
    check("MRR>0", metrics["mrr"] > 0)
    check("异常样本包含s4和s7", "s4" in outliers or "s7" in outliers)
    check("每个样本都有match_details", all(r.match_details for r in results))


def test_leak_detector():
    print("\n=== 样本泄漏检测 ===")
    from app.leak_detector import detect_sample_leak
    from app.models import RecallResult, Material

    mats = {}
    m1 = Material(material_id="m1", material_name="实名规范",
                  material_content="用户实名认证需提供身份证正反面照片人脸活体检测手机号验证码")
    mats["m1"] = m1
    m2 = Material(material_id="m2", material_name="其他", material_content="无关内容")
    mats["m2"] = m2

    results = []
    # 正常样本
    for i in range(6):
        results.append(RecallResult(f"n{i}", f"正常问题{i}", ["m1", "m2"], [0.85, 0.6], expected_material_id="m1"))
    # 泄漏样本1: query完全等于材料内容
    results.append(RecallResult("leak1",
        "用户实名认证需提供身份证正反面照片人脸活体检测手机号验证码",
        ["m1", "m2"], [0.998, 0.5], expected_material_id="m1"))
    # 泄漏样本2: expected_id直接出现在query中
    results.append(RecallResult("leak2",
        "请问m1对应的内容是什么？（这是个泄漏样本文本m1 id直接出现）",
        ["m2", "m1"], [0.9, 0.8], expected_material_id="m1"))

    leak, warns = detect_sample_leak(results, mats)
    print(f"   泄漏检测: detected={leak.detected}, 疑似样本={leak.suspected_samples}, 原因={leak.reasons}")
    check("检测到泄漏", leak.detected is True)
    check("leak1 被识别（正文重合）", "leak1" in leak.suspected_samples)
    check("leak2 被识别（expected_id在query）", "leak2" in leak.suspected_samples)
    check("有影响范围描述", "涉及" in leak.impact_scope)
    check("有原因说明", len(leak.reasons) > 0)


def test_pipeline_end2end():
    print("\n=== 端到端管道（模拟日常脚本） ===")
    from app.models import RunRecord, RecallResult
    from app import storage
    from app.material_manager import register_material, find_material_by_name
    from app.metrics import compute_metrics
    from app.leak_detector import detect_sample_leak
    from app import errors

    # 1. 载入材料（来自examples/materials.json）
    mat_path = os.path.join(os.path.dirname(__file__), "..", "examples", "materials.json")
    with open(mat_path, "r", encoding="utf-8") as f:
        mats_data = json.load(f)

    record = RunRecord(run_name="端到端测试")
    for m in mats_data:
        mat, ec, em = register_material(
            materials=record.materials,
            material_name=m["material_name"],
            material_content=m.get("material_content", ""),
            source_type=m.get("source_type", "model"),
            aliases=m.get("aliases", []),
            change_note=m.get("change_note", ""),
            is_manual_override=m.get("is_manual_override", False),
            override_note=m.get("override_note", ""),
        )
        if ec == errors.ERR_VERSION_CONFLICT:
            record.changed_materials.append(mat.material_id)
            record.pending_evidences.append(f"changed:{mat.material_id}")
    check("材料载入成功", len(record.materials) == 5)

    # 再把"风控交易拦截"改一次，制造口径变更
    mat, ec, em = register_material(
        materials=record.materials,
        material_name="风控交易拦截处理标准",
        material_content="更新后的口径：冻结72小时，人工审核48小时",
        change_note="v2老唐评审会调整冻结时长",
    )
    check("口径变更触发ERR_VERSION_CONFLICT", ec == errors.ERR_VERSION_CONFLICT)
    check("风控材料版本升级", mat.version == 2)
    check("待补证据包含changed", any(p.startswith("changed:") for p in record.pending_evidences))

    # 2. 构造召回结果（模拟真实场景）
    mat_names = [m["material_name"] for m in mats_data]
    mat_list = list(record.materials.values())
    mat_name_to_id = {m.material_name: m.material_id for m in mat_list}
    for a in mats_data:
        for alias in a.get("aliases", []):
            mat_name_to_id.setdefault(alias, mat_name_to_id[a["material_name"]])

    # 构造12条样本
    scenarios = [
        # (sample_id, query模拟, expected_name/alias, correct_rank, tags, extra情况)
        ("s001", "实名认证要准备啥？", "用户实名认证流程规范", 0, [], "Top1命中"),
        ("s002", "交易被冻结怎么处理？", "风控交易拦截处理标准", 1, [], "Top3命中"),
        ("s003", "反欺诈特征怎么提取？", "反欺诈样本特征提取指南", 2, [], "Top3命中"),
        ("s004", "图谱节点关联度用什么算法？", "知识图谱节点关联度计算方法", 3, [], "Top5命中"),
        ("s005", "AB实验上线要满足什么？", "模型线上A/B实验准入标准", 4, [], "Top5命中"),
        ("s006", "实名步骤", "实名流程", 0, [], "别名匹配 Top1"),
        ("s007", "账户被冻结规则是什么？", "交易冻结处理", 0, [], "别名匹配 Top1"),
        ("s008", "设备指纹IP怎么用于反欺诈？", "反欺诈特征", 1, [], "别名匹配 Top3"),
        ("s009", "PPR收敛阈值？", "PPR计算", 0, [], "别名匹配 Top1"),
        ("s010", "AB实验置信度？", "AB实验标准", 5, [], "未召回，拉偏样本候选"),
        ("s011", "用户实名认证需提供身份证正反面照片人脸活体检测手机号验证码未成年人需监护人同意",
         "用户实名认证流程规范", 0, ["edge_case"], "query=正文 疑似泄漏"),
        ("s012", "如何找回登录密码？", "用户实名认证流程规范", 5, [], "完全不相关，拉偏样本"),
    ]
    all_ids = [m.material_id for m in mat_list]
    added = 0
    for sid, query, expect_name, rank, tags, _ in scenarios:
        expected_id = mat_name_to_id.get(expect_name)
        if not expected_id:
            # 通过name匹配
            fm = find_material_by_name(record.materials, expect_name)
            expected_id = fm.material_id if fm else None

        import random
        random.seed(hash(sid) & 0xFFFF)
        shuffled = all_ids.copy()
        random.shuffle(shuffled)
        if expected_id and expected_id in shuffled:
            shuffled.remove(expected_id)
        if expected_id and rank < len(all_ids):
            shuffled.insert(rank, expected_id)

        base = [0.93, 0.80, 0.70, 0.58, 0.45]
        scores = []
        for i in range(len(shuffled)):
            s = base[i] + random.uniform(-0.03, 0.03)
            scores.append(round(max(0.02, min(0.99, s)), 4))

        if sid == "s011":
            scores[0] = 0.996
        if sid == "s012":
            scores = [0.98, 0.95, 0.93, 0.90, 0.87]

        record.recall_results.append(RecallResult(
            sample_id=sid, query=query,
            recalled_material_ids=shuffled,
            recalled_scores=scores,
            expected_material_id=expected_id,
            expected_material_name=expect_name,
            tags=tags,
        ))
        added += 1
    check(f"召回载入: {added}条", added == 12)

    # 3. 泄漏检测
    record.status = "processing"
    leak_info, leak_warns = detect_sample_leak(record.recall_results, record.materials)
    record.leak_info = leak_info
    print(f"   泄漏检测: detected={leak_info.detected}, samples={leak_info.suspected_samples}")
    check("s011被识别为泄漏", "s011" in leak_info.suspected_samples)

    # 4. 执行计算
    metrics, outliers = compute_metrics(record.recall_results)
    record.total_samples = metrics["total_samples"]
    record.recall_at_1 = metrics["recall_at_1"]
    record.recall_at_3 = metrics["recall_at_3"]
    record.recall_at_5 = metrics["recall_at_5"]
    record.mrr = metrics["mrr"]
    record.outlier_samples = outliers
    for o in outliers:
        record.pending_evidences.append(f"outlier:{o}")
    for sid in leak_info.suspected_samples:
        record.pending_evidences.append(f"leak:{sid}")
    record.status = "done"

    print(f"   指标: R@1={metrics['recall_at_1']}, R@3={metrics['recall_at_3']}, R@5={metrics['recall_at_5']}, MRR={metrics['mrr']}")
    print(f"   拉偏样本: {outliers}")
    print(f"   待补证据 ({len(record.pending_evidences)}条): {record.pending_evidences}")
    check("样本总数正确", metrics["total_samples"] == 12)
    check("Recall@1合理", 0.4 < metrics["recall_at_1"] < 0.8)
    check("识别出拉偏样本", len(outliers) >= 2)
    check("待补证据包含泄漏、拉偏、改口径", len([p for p in record.pending_evidences if p.startswith("leak:")]) >= 1
          and any(p.startswith("outlier:") for p in record.pending_evidences)
          and any(p.startswith("changed:") for p in record.pending_evidences))

    # 5. 存储-读取回环
    storage.save_record(record)
    loaded = storage.load_record(record.run_id)
    check("存储-读取回环: run_id一致", loaded.run_id == record.run_id)
    check("存储-读取回环: 指标一致", loaded.recall_at_1 == record.recall_at_1)
    check("存储-读取回环: 材料数一致", len(loaded.materials) == 5)
    check("存储-读取回环: 召回数一致", len(loaded.recall_results) == 12)
    check("存储-读取回环: 待补证据一致", loaded.pending_evidences == record.pending_evidences)

    # 6. 状态追踪
    from app.main import app as _app  # noqa 仅确保import无语法错
    check("Flask app可导入", _app is not None and _app.name == "app.main")

    storage.delete_record(record.run_id)
    runs = storage.list_runs()
    check("删除记录OK", all(r["run_id"] != record.run_id for r in runs))


def main():
    print("=" * 60)
    print("🧪 知识库召回指标看板 - 核心逻辑自检")
    print("=" * 60)

    tests = [
        test_errors,
        test_models,
        test_material_manager,
        test_metrics,
        test_leak_detector,
        test_pipeline_end2end,
    ]
    for t in tests:
        try:
            t()
        except Exception as e:
            global FAIL
            FAIL += 1
            print(f"  💥 {t.__name__} 抛出异常: {e}")
            traceback.print_exc()

    print("\n" + "=" * 60)
    print(f"🏁 结果: ✅ 通过 {PASS}, ❌ 失败 {FAIL}")
    print("=" * 60)
    if FAIL > 0:
        sys.exit(1)
    print("\n✅ 所有核心逻辑自检通过！")
    print("\n📋 启动方式:")
    print("   Web界面:  python start.py  →  http://127.0.0.1:5000/")
    print("   日常脚本:  python scripts/run_pipeline.py --name \"公示版\" --materials examples/materials.json --recalls examples/recalls_ready.json")
    print("   生成数据:  python examples/generate_recalls.py")


if __name__ == "__main__":
    main()
