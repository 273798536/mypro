import json
import os
from datetime import datetime
from typing import Dict, Any, List
import pandas as pd

from .analysis import build_ui_summary, check_consistency


EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)


def _ensure_exports_dir() -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    return ts


def export_audit_report(dataset,
                        replay_rows: List[Dict[str, Any]],
                        replay_stats: Dict[str, Any],
                        correction_flow: List[Dict[str, Any]],
                        correction_stats: Dict[str, Any],
                        gray_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    导出完整审计报告到 Excel（多 Sheet）+ 评审摘要 JSON
    返回：导出结果信息 {xlsx_path, json_path, summary, consistency}
    """
    ts = _ensure_exports_dir()
    xlsx_path = os.path.join(EXPORTS_DIR, f"audit_report_{ts}.xlsx")
    json_path = os.path.join(EXPORTS_DIR, f"review_summary_{ts}.json")

    ui_summary = build_ui_summary(gray_analysis, replay_stats, correction_stats)

    # ---------- Sheet1: 摘要与判定 ----------
    summary_df = pd.DataFrame([
        {"项目": k, "数值/内容": v} for k, v in ui_summary["metrics"].items()
    ] + [
        {"项目": "审计结论", "数值/内容": ui_summary["audit_verdict"]},
        {"项目": "摘要文字", "数值/内容": ui_summary["summary_text"]},
    ])

    # ---------- Sheet2: 评测回放明细 ----------
    replay_df = pd.DataFrame([
        {
            "记录ID": r["record_id"], "工具名": r["tool_name"],
            "工具分类": r["tool_category"], "标注员": r["annotator"],
            "原状态": r["original_status"], "重放状态": r["replay_status"],
            "结论是否变化": "是" if r["status_changed"] else "否",
            "问题条数": r["issue_count"],
            "问题类型": ",".join(r["issue_types"]) if r["issue_types"] else "-",
            "原摘要": r["original_summary"],
            "重放摘要": r["replay_summary"],
        } for r in replay_rows
    ])

    # ---------- Sheet3: 脏数据前后对比 ----------
    dirty_before = correction_stats["dirty_before"]
    dirty_after = correction_stats["dirty_after"]
    fixed_rate = correction_stats["dirty_fixed_rate"]
    dirty_df = pd.DataFrame([
        {
            "脏数据类型": k,
            "清洗前数量": dirty_before.get(k, 0),
            "清洗后数量": dirty_after.get(k, 0),
            "修复率(%)": fixed_rate.get(k, 0),
        } for k in dirty_before.keys()
    ])

    # ---------- Sheet4: 修正流水 ----------
    correction_df = pd.DataFrame([
        {
            "时间": f.get("time", ""),
            "操作人": f.get("corrector", ""),
            "记录ID": f.get("record_id", ""),
            "工具名": f.get("tool_name", ""),
            "字段": f.get("field", ""),
            "动作": f.get("action", ""),
            "详情": f.get("detail", ""),
        } for f in correction_flow
    ])

    # ---------- Sheet5: 灰度对比 ----------
    batch_rows = []
    for b in gray_analysis["by_batch"]:
        batch_rows.append({
            "灰度批次": b["gray_batch"],
            "记录数": b["total"],
            "通过数": b["pass"],
            "通过率(%)": b["pass_rate"],
            "对比非灰度差值(%)": b["delta_vs_non_gray"],
            "包含记录": ",".join(b["record_ids"]),
        })
    batch_rows.append({
        "灰度批次": "非灰度总体",
        "记录数": replay_stats["total"] - gray_analysis["gray_record_count"],
        "通过数": replay_stats["by_replay_status"]["通过"] - sum(
            b["pass"] for b in gray_analysis["by_batch"]
        ),
        "通过率(%)": gray_analysis["non_gray_pass_rate"],
        "对比非灰度差值(%)": 0,
        "包含记录": "-",
    })
    gray_df = pd.DataFrame(batch_rows)

    # ---------- Sheet6: 来源材料引用链 ----------
    source_rows = []
    for s in gray_analysis["source_chains"]:
        for idx, mat in enumerate(s["source_chain"]) or [{"material_id": "-"}]:
            source_rows.append({
                "记录ID": s["record_id"],
                "工具名": s["tool_name"],
                "原结论": s["conclusion"],
                "可溯源": "是" if s["can_trace"] else "否",
                "来源序号": idx + 1 if s["can_trace"] else "-",
                "材料ID": mat.get("material_id", "-") if isinstance(mat, dict) else "-",
                "材料标题": mat.get("title", "-") if isinstance(mat, dict) else "-",
                "材料链接": mat.get("url", "-") if isinstance(mat, dict) else "-",
                "材料片段": mat.get("snippet", "") if isinstance(mat, dict) else "",
            })
    source_df = pd.DataFrame(source_rows)

    # ---------- Sheet7: 评审分类 ----------
    review_direct = []
    review_need_review = []
    for rec in dataset.records:
        cat = rec.get("review_category")
        row = {
            "记录ID": rec["record_id"], "工具名": rec["tool_name"],
            "标注员": rec.get("annotator", ""),
            "风险标签": ",".join(rec.get("risk_tags", [])),
            "原状态": rec.get("original_audit_status", ""),
            "灰度标记": "是" if rec.get("gray_flag") else "否",
        }
        if cat == "直接可用":
            review_direct.append(row)
        else:
            review_need_review.append(row)
    review_direct_df = pd.DataFrame(review_direct)
    review_need_df = pd.DataFrame(review_need_review)

    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="00_摘要与判定", index=False)
        replay_df.to_excel(writer, sheet_name="01_评测回放明细", index=False)
        dirty_df.to_excel(writer, sheet_name="02_脏数据清洗对比", index=False)
        correction_df.to_excel(writer, sheet_name="03_修正流水", index=False)
        gray_df.to_excel(writer, sheet_name="04_灰度批次对比", index=False)
        source_df.to_excel(writer, sheet_name="05_来源材料引用链", index=False)
        review_direct_df.to_excel(writer, sheet_name="06_评审_直接可用", index=False)
        review_need_df.to_excel(writer, sheet_name="07_评审_需工程师复核", index=False)

    review_json = {
        "export_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary_text": ui_summary["summary_text"],
        "audit_verdict": ui_summary["audit_verdict"],
        "metrics": ui_summary["metrics"],
        "direct_use_count": len(review_direct),
        "need_engineer_review_count": len(review_need_review),
        "direct_use_records": review_direct,
        "need_engineer_review_records": review_need_review,
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(review_json, f, ensure_ascii=False, indent=2)

    exported_summary = {
        "summary_text": review_json["summary_text"],
        "audit_verdict": review_json["audit_verdict"],
        "metrics": review_json["metrics"],
    }
    consistency = check_consistency(ui_summary, exported_summary)

    return {
        "xlsx_path": os.path.abspath(xlsx_path),
        "json_path": os.path.abspath(json_path),
        "ui_summary": ui_summary,
        "consistency": consistency,
        "direct_use_count": len(review_direct),
        "need_review_count": len(review_need_review),
    }
