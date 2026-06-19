#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from kb_recall_replay.models import EvaluationResult, RecordStatus
from kb_recall_replay.replay import ReplayEngine
from kb_recall_replay.report import generate_report
from kb_recall_replay.store import Store

STORE_PATH = Path("test_demo_store.json")
REPORT_PATH = Path("test_demo_report.md")


def main() -> None:
    if STORE_PATH.exists():
        STORE_PATH.unlink()

    store = Store(str(STORE_PATH))
    engine = ReplayEngine(store)

    print("=" * 60)
    print("步骤1：导入旧材料")
    print("=" * 60)
    imported = engine.import_materials("demo_data/old_materials.json")
    print(f"  导入 {len(imported)} 条记录：")
    for rec in imported:
        print(f"    - {rec.name} (id={rec.id}, versions={len(rec.versions)}, aliases={rec.aliases})")

    print()
    print("=" * 60)
    print("步骤2：补一条名称不一致的材料（模糊匹配）")
    print("=" * 60)

    rec, merged = engine.add_record(
        name="RAG-召回率-阈值0.75-v2",
        evidence_path="evidence/rag_recall_075_v2.csv",
        aliases=["RAG召回率v2"],
        notes="v2版本更新数据，阈值从0.75调至0.80，名称与旧版略有不同。",
        screenshots=["screenshots/rag_v2_080.png"],
        values={
            "precision": 0.85,
            "recall": 0.78,
            "f1": 0.81,
            "threshold": 0.80,
        },
    )
    if merged:
        print(f"  模糊匹配到已有记录：{rec.name} (id={rec.id})")
        print(f"  已追加为新版本，当前版本数：{len(rec.versions)}")
        print(f"  别名列表：{rec.aliases}")
    else:
        print(f"  新建记录：{rec.name} (id={rec.id})")

    faq_rec = store.find_by_name("FAQ-语义匹配-误报集")
    if faq_rec:
        print()
        print("  再试一条完全不一致的名称（应新建）：")
        rec2, merged2 = engine.add_record(
            name="知识图谱-实体链接-误判集",
            evidence_path="evidence/kg_entity_link_error.csv",
            notes="知识图谱实体链接模块误判样本。",
            values={"precision": 0.88, "recall": 0.72},
        )
        if merged2:
            print(f"  模糊匹配到：{rec2.name}")
        else:
            print(f"  新建记录：{rec2.name} (id={rec2.id})")

    print()
    print("=" * 60)
    print("步骤3：评测（含重复评测检测）")
    print("=" * 60)

    rag_rec = store.find_by_name("RAG-召回率-阈值0.75")
    if rag_rec:
        ev1 = engine.evaluate(
            record_id=rag_rec.id,
            evaluator="小孟",
            result=EvaluationResult.FALSE_POSITIVE,
            score=0.72,
            impact_scope="长尾query影响约15%召回",
            source_line="rag_recall.py:L142-L158",
            evidence_ref="evidence/rag_recall_075.csv#L23",
        )
        print(f"  首次评测 {rag_rec.name}：{ev1.id} (duplicate={ev1.is_duplicate})")

        ev2 = engine.evaluate(
            record_id=rag_rec.id,
            evaluator="小孟",
            result=EvaluationResult.FALSE_POSITIVE,
            score=0.70,
            impact_scope="长尾query影响约15%召回",
            source_line="rag_recall.py:L142-L158",
            evidence_ref="evidence/rag_recall_075.csv#L23",
        )
        print(f"  重复评测 {rag_rec.name}：{ev2.id} (duplicate={ev2.is_duplicate}, duplicate_of={ev2.duplicate_of})")

    if faq_rec:
        ev3 = engine.evaluate(
            record_id=faq_rec.id,
            evaluator="小孟",
            result=EvaluationResult.CONFIRMED,
            score=0.65,
            impact_scope="FAQ匹配全量",
            source_line="faq_matcher.py:L88-L102",
            evidence_ref="evidence/faq_semantic_fp.csv#L7",
        )
        print(f"  评测 {faq_rec.name}：{ev3.id} (result={ev3.result.value})")

    intent_rec = store.find_by_name("意图识别-漏判-高温场景")
    if intent_rec:
        ev4 = engine.evaluate(
            record_id=intent_rec.id,
            evaluator="小李",
            result=EvaluationResult.FALSE_NEGATIVE,
            score=0.55,
            impact_scope="高温场景漏判率35%",
            source_line="intent_classifier.py:L201-L220",
            evidence_ref="evidence/intent_miss_high_temp.csv#L12",
        )
        print(f"  评测 {intent_rec.name}：{ev4.id} (result={ev4.result.value})")

    print()
    print("=" * 60)
    print("步骤4：添加灰度结果")
    print("=" * 60)

    if rag_rec:
        gray = engine.add_gray_result(
            record_id=rag_rec.id,
            sample_changes=[
                {
                    "description": "长尾query召回率下降",
                    "before": "recall=0.75",
                    "after": "recall=0.78",
                },
            ],
            threshold_changes=[
                {
                    "description": "召回阈值上调",
                    "before": "0.75",
                    "after": "0.80",
                },
            ],
            human_corrections=[
                {
                    "description": "小孟将3条漏判改为确认误判",
                    "original_result": "false_negative",
                    "corrected_result": "confirmed",
                    "operator": "小孟",
                },
            ],
        )
        print(f"  灰度结果已添加到 {rag_rec.name}：")
        print(f"    样本变化：{len(gray.sample_changes)} 项")
        print(f"    阈值变化：{len(gray.threshold_changes)} 项")
        print(f"    人工改判：{len(gray.human_corrections)} 项")

    print()
    print("=" * 60)
    print("步骤5：查看处理状态")
    print("=" * 60)

    for rec in store.list_all():
        print(f"  {rec.name} → {rec.status.value}")

    print()
    print("=" * 60)
    print("步骤6：生成 Markdown 报告")
    print("=" * 60)

    content = generate_report(store)
    REPORT_PATH.write_text(content, encoding="utf-8")
    print(f"  报告已写入 {REPORT_PATH}")

    print()
    print("=" * 60)
    print("验证：报告是否说清变化")
    print("=" * 60)

    checks = {
        "版本历史": "版本历史明细" in content,
        "灰度拆解-样本变化": "样本变化" in content,
        "灰度拆解-阈值变化": "阈值变化" in content,
        "灰度拆解-人工改判": "人工改判" in content,
        "重复评测追踪": "重复评测追踪" in content,
        "待补证据清单": "待补证据清单" in content,
        "证据链详情": "证据链" in content,
        "模糊匹配别名": "RAG-召回率-阈值0.75-v2" in content,
    }

    all_pass = True
    for label, ok in checks.items():
        status = "✅" if ok else "❌"
        print(f"  {status} {label}")
        if not ok:
            all_pass = False

    print()
    if all_pass:
        print("🎉 所有检查通过！报告完整说清了变化。")
    else:
        print("⚠️ 部分检查未通过，请检查报告内容。")

    if STORE_PATH.exists():
        STORE_PATH.unlink()

    print()
    print("--- 报告内容预览 ---")
    preview_lines = content.split("\n")[:80]
    print("\n".join(preview_lines))
    if len(content.split("\n")) > 80:
        print(f"\n... (共 {len(content.split(chr(10)))} 行)")


if __name__ == "__main__":
    main()
