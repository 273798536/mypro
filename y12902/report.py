import pandas as pd
import io
from datetime import datetime
from typing import Dict, List, Any, Optional
import database as db


def _level_label(rate: float) -> str:
    if rate >= 90:
        return "表现优秀"
    elif rate >= 80:
        return "表现良好"
    elif rate >= 60:
        return "基本达标"
    elif rate >= 40:
        return "有待提升"
    else:
        return "明显偏弱"


def generate_plain_report(prompt_version_id: int) -> Dict[str, Any]:
    """生成普通话解释版的报告摘要，可直接复制给同事"""
    pv = db.get_prompt_version(prompt_version_id)
    if not pv:
        return {}
    summary = db.get_prompt_version_summary(prompt_version_id)
    ratio = db.get_dataset_ratio(prompt_version_id)

    version_name = pv["version_name"]
    imported_at = pv["imported_at"]
    total = summary["total"]
    pass_rate = summary["pass_rate"]
    avg_score = summary["avg_score"]
    exception_cnt = summary["exception"]
    fail_cnt = summary["fail"]

    lines: List[str] = []
    lines.append(f"【评测结论摘要：{version_name}】")
    lines.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"提示词版本导入时间：{imported_at}")
    lines.append("")

    # 总体评价
    level = _level_label(pass_rate)
    lines.append(f"一、总体情况：")
    lines.append(
        f"  本次共评测 {total} 道题目，整体通过率为 {pass_rate}%，平均得分 {avg_score} 分，"
        f"{level}。其中，通过 {summary['pass']} 题，不通过 {fail_cnt} 题，"
        f"发生异常 {exception_cnt} 题，待评测 {summary['pending']} 题。"
    )

    # 分类偏科分析
    by_cat = summary["by_category"]
    if by_cat:
        lines.append("")
        lines.append(f"二、分类表现（按通过率排序）：")
        sorted_cats = sorted(by_cat.items(), key=lambda kv: kv[1]["pass_rate"], reverse=True)
        best = sorted_cats[0]
        worst = sorted_cats[-1]
        for cat, info in sorted_cats:
            lines.append(
                f"  · {cat}：共 {info['total']} 题，通过 {info['pass']} 题，"
                f"通过率 {info['pass_rate']}%，平均得分 {info['avg_score']}，{_level_label(info['pass_rate'])}；"
                f"其中异常 {info['exception']} 题。"
            )
        if len(sorted_cats) >= 2:
            lines.append("")
            lines.append(
                f"  → 表现最好的是【{best[0]}】（通过率 {best[1]['pass_rate']}%），"
                f"表现最弱的是【{worst[0]}】（通过率 {worst[1]['pass_rate']}%），"
                f"两者相差 {round(best[1]['pass_rate'] - worst[1]['pass_rate'], 2)} 个百分点，存在一定偏科。"
            )

    # 样本配比
    if ratio:
        lines.append("")
        lines.append(f"三、评测集样本配比：")
        biased = []
        for r in ratio:
            cat = r["category"]
            actual = r["actual_ratio"]
            exp = r["expected_ratio"]
            dev = r["deviation"]
            if exp is not None:
                tag = ""
                if dev is not None and abs(dev) > 10:
                    tag = "⚠️ 偏离较大"
                    biased.append(f"{cat}（实际 {actual}% vs 预期 {exp}%，差 {dev} 个百分点）")
                lines.append(
                    f"  · {cat}：实际占比 {actual}%，预期占比 {exp}%，差值 {dev} 个百分点 {tag}"
                )
            else:
                lines.append(f"  · {cat}：实际占比 {actual}%（未设置预期占比）")
        if biased:
            lines.append("")
            lines.append(f"  → 样本配比存在偏科的类别：{'；'.join(biased)}")

    # 难度分布
    by_diff = summary["by_difficulty"]
    if by_diff:
        lines.append("")
        lines.append(f"四、难度分布：")
        for diff, info in by_diff.items():
            rate = round(info["pass"] / info["total"] * 100, 2) if info["total"] else 0
            lines.append(
                f"  · {diff}：{info['total']} 题，通过 {info['pass']} 题，通过率 {rate}%"
            )

    # 建议
    lines.append("")
    lines.append(f"五、建议：")
    suggestions = []
    if exception_cnt > 0:
        suggestions.append(
            f"当前有 {exception_cnt} 道题发生了异常，请优先处理异常（可在『异常追溯』页签查看具体异常详情和处理意见）。"
        )
    if worst[1]["pass_rate"] < 60:
        suggestions.append(
            f"建议针对【{worst[0]}】类别补充相关训练样本，或在提示词中加入更明确的领域引导语。"
        )
    if pass_rate < 70:
        suggestions.append(
            f"整体通过率偏低，建议检查提示词模板的系统性引导是否充分，并参考通过率高的类别的成功范式。"
        )
    if biased:
        suggestions.append(
            f"评测集样本配比在 {len(biased)} 个类别上偏离预期较大，建议补充样本以平衡分布，避免评测结论失真。"
        )
    if not suggestions:
        suggestions.append("当前指标整体健康，可继续按此方向迭代。")
    for i, s in enumerate(suggestions, 1):
        lines.append(f"  {i}. {s}")

    plain_text = "\n".join(lines)
    return {
        "plain_text": plain_text,
        "version_name": version_name,
        "imported_at": imported_at,
        "summary": summary,
        "ratio": ratio,
    }


FRIENDLY_COLUMNS = {
    "question_id": "题目ID",
    "question_text": "题目内容",
    "category": "题目分类",
    "difficulty": "题目难度",
    "knowledge_point": "知识点",
    "reference_answer": "参考答案",
    "score": "得分",
    "is_pass": "是否通过",
    "eval_status": "评测状态",
    "exception_type": "异常类型",
    "exception_detail": "异常详情",
    "model_output": "模型输出内容",
    "latency_ms": "耗时(毫秒)",
    "pass_rate": "通过率(%)",
    "total": "题目总数",
    "pass": "通过题数",
    "fail": "不通过题数",
    "exception": "异常题数",
    "avg_score": "平均得分",
    "expected_ratio": "预期占比(%)",
    "actual_count": "实际题目数",
    "actual_ratio": "实际占比(%)",
    "deviation": "偏离程度(百分点)",
    "version_name": "提示词版本",
    "imported_at": "导入时间",
    "created_at": "创建时间",
    "updated_at": "更新时间",
}


def _translate(value: Any) -> Any:
    if isinstance(value, bool):
        return "通过" if value else "不通过"
    if value is None:
        return ""
    return value


def _friendly_df(df: pd.DataFrame) -> pd.DataFrame:
    rename = {c: FRIENDLY_COLUMNS.get(c, c) for c in df.columns}
    df = df.rename(columns=rename)
    for col in df.columns:
        if col in ("是否通过",):
            df[col] = df[col].map(
                lambda x: "通过" if x in (1, "1", True, "通过", "是")
                else ("不通过" if x in (0, "0", False, "不通过", "否", "") else x)
            )
    return df


def build_export_workbook(prompt_version_id: int) -> bytes:
    """生成多 Sheet 的 Excel，列名友好，适合不懂代码的同事查看"""
    pv = db.get_prompt_version(prompt_version_id)
    if not pv:
        raise ValueError("提示词版本不存在")
    report = generate_plain_report(prompt_version_id)
    summary = report["summary"]
    ratio = report["ratio"]
    records = db.list_eval_records(prompt_version_id=prompt_version_id)
    exceptions = db.list_eval_records(prompt_version_id=prompt_version_id, only_exception=True)
    fails = db.list_eval_records(prompt_version_id=prompt_version_id, only_fail=True)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        # Sheet 1: 报告摘要（含普通话解释）
        summary_lines = report["plain_text"].split("\n")
        pd.DataFrame({"报告内容": summary_lines}).to_excel(
            writer, sheet_name="1_评测结论摘要", index=False
        )

        # Sheet 2: 总体指标
        overview = pd.DataFrame([{
            "提示词版本": pv["version_name"],
            "导入时间": pv["imported_at"],
            "题目总数": summary["total"],
            "通过题数": summary["pass"],
            "不通过题数": summary["fail"],
            "异常题数": summary["exception"],
            "待评测题数": summary["pending"],
            "整体通过率(%)": summary["pass_rate"],
            "平均得分": summary["avg_score"],
        }])
        overview.to_excel(writer, sheet_name="2_总体指标", index=False)

        # Sheet 3: 分类表现
        if summary["by_category"]:
            cat_rows = []
            for cat, info in summary["by_category"].items():
                cat_rows.append({
                    "题目分类": cat,
                    "题目总数": info["total"],
                    "通过题数": info["pass"],
                    "不通过题数": info["fail"],
                    "异常题数": info["exception"],
                    "通过率(%)": info["pass_rate"],
                    "平均得分": info["avg_score"],
                })
            pd.DataFrame(cat_rows).to_excel(writer, sheet_name="3_分类表现", index=False)

        # Sheet 4: 样本配比（偏科原因说明）
        if ratio:
            ratio_rows = []
            for r in ratio:
                dev = r["deviation"]
                reason = ""
                if dev is not None:
                    if dev > 10:
                        reason = f"实际占比比预期多了 {dev} 个百分点，该类别样本偏多"
                    elif dev < -10:
                        reason = f"实际占比比预期少了 {abs(dev)} 个百分点，该类别样本不足"
                    else:
                        reason = "占比符合预期"
                ratio_rows.append({
                    "题目分类": r["category"],
                    "实际题目数": r["actual_count"] or 0,
                    "实际占比(%)": r["actual_ratio"] or 0,
                    "预期占比(%)": r["expected_ratio"] if r["expected_ratio"] is not None else "(未设置)",
                    "偏离程度(百分点)": dev if dev is not None else "(未设置预期)",
                    "偏科原因说明": reason,
                })
            pd.DataFrame(ratio_rows).to_excel(writer, sheet_name="4_样本配比_偏科原因", index=False)

        # Sheet 5: 难度分布
        if summary["by_difficulty"]:
            diff_rows = []
            for diff, info in summary["by_difficulty"].items():
                rate = round(info["pass"] / info["total"] * 100, 2) if info["total"] else 0
                diff_rows.append({
                    "难度等级": diff,
                    "题目总数": info["total"],
                    "通过题数": info["pass"],
                    "不通过题数": info["fail"],
                    "通过率(%)": rate,
                })
            pd.DataFrame(diff_rows).to_excel(writer, sheet_name="5_难度分布", index=False)

        # Sheet 6: 全部评测明细
        if records:
            detail_cols = [
                "question_id", "question_text", "category", "difficulty",
                "knowledge_point", "score", "is_pass", "eval_status",
                "exception_type", "exception_detail", "latency_ms",
                "reference_answer", "model_output", "created_at", "updated_at"
            ]
            detail_df = pd.DataFrame(records)
            existing = [c for c in detail_cols if c in detail_df.columns]
            detail_df = detail_df[existing]
            for c in existing:
                detail_df[c] = detail_df[c].map(_translate)
            _friendly_df(detail_df).to_excel(writer, sheet_name="6_全部评测明细", index=False)

        # Sheet 7: 异常明细（附处理意见列，方便业务方填回）
        if exceptions:
            exc_cols = [
                "question_id", "question_text", "category", "difficulty",
                "exception_type", "exception_detail", "model_output",
                "score", "is_pass", "created_at"
            ]
            exc_df = pd.DataFrame(exceptions)
            existing = [c for c in exc_cols if c in exc_df.columns]
            exc_df = exc_df[existing]
            exc_df["处理意见（请填写）"] = ""
            exc_df["处理人（请填写）"] = ""
            for c in existing:
                exc_df[c] = exc_df[c].map(_translate)
            _friendly_df(exc_df).to_excel(writer, sheet_name="7_异常明细_请处理", index=False)

        # Sheet 8: 不通过明细
        if fails:
            fail_cols = [
                "question_id", "question_text", "category", "difficulty",
                "knowledge_point", "reference_answer", "model_output",
                "score", "exception_type", "created_at"
            ]
            fail_df = pd.DataFrame(fails)
            existing = [c for c in fail_cols if c in fail_df.columns]
            fail_df = fail_df[existing]
            for c in existing:
                fail_df[c] = fail_df[c].map(_translate)
            _friendly_df(fail_df).to_excel(writer, sheet_name="8_不通过明细", index=False)

        # 调整列宽
        workbook = writer.book
        wrap_format = workbook.add_format({"text_wrap": True, "valign": "top"})
        for sheet_name in writer.sheets:
            ws = writer.sheets[sheet_name]
            ws.set_column(0, 20, 22, wrap_format)
            ws.set_row(0, 30, workbook.add_format({"bold": True, "bg_color": "#DDEBF7"}))

    return output.getvalue()


def build_exception_trace_data(eval_record_id: int) -> Dict[str, Any]:
    """构建异常追溯链路的数据：异常 → 评测题库 → 处理意见"""
    detail = db.get_eval_record_detail(eval_record_id)
    if not detail:
        return {}
    return {
        "eval_record": detail,
        "question": {
            "question_id": detail.get("question_id"),
            "question_text": detail.get("question_text"),
            "category": detail.get("category"),
            "difficulty": detail.get("difficulty"),
            "knowledge_point": detail.get("knowledge_point"),
            "reference_answer": detail.get("reference_answer"),
            "source": detail.get("source"),
            "tags": detail.get("tags"),
        },
        "prompt_version": {
            "version_name": detail.get("version_name"),
            "prompt_content": detail.get("prompt_content"),
            "description": detail.get("description"),
        },
        "treatment_notes": detail.get("treatment_notes", []),
    }
