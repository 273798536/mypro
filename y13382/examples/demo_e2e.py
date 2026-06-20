"""
端到端演示：模型压缩异常回放系统
==================================

场景（完全贴合需求）：
- 小许手里的材料断断续续，旧日志里混了坏数据（分隔符、NULL、异常栈）
- 以前靠训练日志硬拼主线，这次让系统把边界样本和结论连起来
- S-001 是旧模型误判的样本，这次放回去看能不能解释改判
- 注册版本别名"旧模型日志_20240115"，并冻结，防止重跑覆盖
- 最后验证：别名目标文件被篡改时立刻露怯
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from model_compression_replay import (
    ReplayPipeline,
    SampleSpec,
    SampleVerdict,
)


def main() -> None:
    print("=" * 70)
    print("【模型压缩异常回放系统】 端到端演示")
    print("=" * 70)

    work_dir = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(work_dir, "old_training.log")
    report_path = os.path.join(work_dir, "replay_report.md")

    assert os.path.exists(log_path), f"示例日志不存在: {log_path}"

    pipe = ReplayPipeline()

    # =============================================================
    # ① 注册版本别名 → 指向旧文件，冻结！防止重跑覆盖旧证据
    # =============================================================
    print("\n[Step 1] 注册版本别名 '旧模型日志_20240115'，并冻结")
    va = pipe.register_alias(
        alias="旧模型日志_20240115",
        target_path=log_path,
        description="2024-01-15 跑的旧4bit量化实验，当时误判了S-001",
        freeze=True,
        verify_now=True,
    )
    print(f"  ✓ 别名 {va.alias} → {va.target_path}")
    print(f"  ✓ 冻结状态: {va.is_frozen}, SHA256前16位: {va.target_hash[:16] if va.target_hash else 'N/A'}")

    # =============================================================
    # ② 自定义边界值（可选演示：用户可以覆盖默认）
    # =============================================================
    from model_compression_replay import BoundaryValue
    pipe.override_boundary("accuracy_drop_percent", BoundaryValue(
        metric_name="accuracy_drop_percent",
        upper=0.02,  # 收紧到2%
        inclusive_upper=True,
        expected_behavior="掉点超过2%必须回退到8bit并补蒸馏轮次",
        associated_conclusion_id="CONCL-ACC-TIGHT",
    ))
    print("\n[Step 2] 覆盖默认边界值：accuracy_drop_percent阈值收紧到≤2%")

    # =============================================================
    # ③ 声明要回放的4个样本
    #    S-001: 旧模型误判为ANOMALY（这次新系统应该改判）
    #    S-002: 正常压缩样本
    #    S-003: 真正异常的样本（KL/掉点都爆了）
    #    S-004: 边界样本（指标卡阈值附近）
    # =============================================================
    print("\n[Step 3] 声明4个回放样本（包括1个旧模型误判样本）")
    specs = [
        SampleSpec(
            sample_id="S-001",
            input_ref="user-item#48291（旧模型误判案例）",
            line_numbers=[5, 6],  # 日志第5、6行
            version_alias="旧模型日志_20240115",
            prev_verdict=SampleVerdict.ANOMALY,   # ← 旧模型判错了！
            prev_reason="旧系统看到KL>某阈值就打异常，未结合精度影响",
        ),
        SampleSpec(
            sample_id="S-002",
            input_ref="user-item#51024（正常样本）",
            line_numbers=[7],
            version_alias="旧模型日志_20240115",
            prev_verdict=SampleVerdict.COMPRESSED,
            prev_reason="压缩比2x, 精度掉点小",
        ),
        SampleSpec(
            sample_id="S-003",
            input_ref="user-item#33917（真正异常样本）",
            line_numbers=[9, 10],
            version_alias="旧模型日志_20240115",
            prev_verdict=SampleVerdict.ANOMALY,
            prev_reason="KL严重越界+精度掉点4.85%",
        ),
        SampleSpec(
            sample_id="S-004",
            input_ref="user-item#60002（边界样本）",
            line_numbers=[14],
            version_alias="旧模型日志_20240115",
            prev_verdict=SampleVerdict.NORMAL,
            prev_reason="旧系统未设置边界预警",
        ),
    ]
    for s in specs:
        print(f"  • {s.sample_id}: 旧判定={s.prev_verdict}, 日志行={s.line_numbers}")

    # =============================================================
    # ④ 一键跑回放 + 生成报告
    # =============================================================
    print("\n[Step 4] 执行回放主流程 → 生成Markdown报告")
    result = pipe.run(
        log_source="旧模型日志_20240115",
        sample_specs=specs,
        report_path=report_path,
        log_is_alias=True,
    )

    print(f"  ✓ Run ID: {result.run_id}")
    print(f"  ✓ 概览统计: {result.summary()}")
    print(f"  ✓ 报告已生成: {result.report_path}")

    # =============================================================
    # ⑤ 打印改判说明（S-001应该从ANOMALY改判为COMPRESSED或BOUNDARY）
    # =============================================================
    print("\n[Step 5] === S-001 改判说明（旧模型误判样本） ===")
    s001 = next(s for s in result.samples if s.sample_id == "S-001")
    from model_compression_replay import SampleReplayer, CompressionMetrics
    tmp_replayer = SampleReplayer(CompressionMetrics())
    print(tmp_replayer.explain_change_detail(s001))

    # =============================================================
    # ⑥ 打印结论清单
    # =============================================================
    print("\n[Step 6] === 系统生成的结论（每条都关联样本+日志+指标） ===")
    for idx, c in enumerate(result.conclusions, 1):
        print(f"{idx}. [{c.severity}] {c.title}")
        print(f"   关联样本: {c.evidence_sample_ids}")
        print(f"   关联日志行: {c.evidence_log_refs}")
        print(f"   关联指标: {c.evidence_metric_names}")
        print()

    # =============================================================
    # ⑦ 【关键测试】篡改别名指向的文件 → 会不会露怯？
    # =============================================================
    print("[Step 7] 【鲁棒性测试】偷偷篡改旧日志文件内容，看版本别名哈希校验会不会露怯")
    with tempfile.NamedTemporaryFile("w", suffix=".log", delete=False, encoding="utf-8") as ftmp:
        with open(log_path, "r", encoding="utf-8") as forig:
            content = forig.read()
        # 偷偷改一行 → 让Hash变了
        ftmp.write(content.replace("S-001", "S-001-HACKED"))
        tmp_path = ftmp.name
    try:
        # 临时把别名指向改了的文件（不走update因为冻结了，直接hack内部）
        pipe.aliases._aliases["旧模型日志_20240115"].target_path = tmp_path
        pipe.aliases._aliases["旧模型日志_20240115"].is_frozen = False
        verify_result = pipe.aliases.verify("旧模型日志_20240115")
        print(f"  校验结果 exists={verify_result['exists']}, matches={verify_result['matches']}")
        if not verify_result["matches"]:
            print("  ✓ 成功检测到篡改！乱材料露怯了，系统已记录。")
        else:
            print("  ✗ 居然没检测出来？有bug！")

        # 再试resolve()，应该直接抛异常
        try:
            pipe.aliases.resolve("旧模型日志_20240115", verify=True)
            print("  ✗ resolve()居然让篡改文件过了？有bug！")
        except ValueError as e:
            print(f"  ✓ resolve()按预期抛异常：{type(e).__name__}: {str(e)[:80]}...")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # =============================================================
    # ⑧ 坏数据清单（系统把日志里的乱材料都挑出来了）
    # =============================================================
    print("\n[Step 8] 坏数据清单（从断断续续的材料里自动挑出）")
    for e in result.bad_data_rows:
        print(f"  L{e.line_number}: {e.corrupt_reason} → {e.excerpt(60)}")

    # =============================================================
    # 结束
    # =============================================================
    print("\n" + "=" * 70)
    print("✅ 演示完成！")
    print(f"   📄 Markdown报告: {report_path}")
    print(f"   小许现在可以把报告 + 原始训练日志 old_training.log 一起对给别人看。")
    print("=" * 70)


if __name__ == "__main__":
    main()
