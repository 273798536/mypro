import os
from typing import List, Dict

from models import (
    ReviewRecord, ReviewStatus, Issue, IssueType,
    compute_content_hash
)


REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")


def _severity_icon(severity: str) -> str:
    return {
        "error": "🔴",
        "warning": "🟡",
        "info": "🟢"
    }.get(severity, "⚪")


def _status_icon(status: ReviewStatus) -> str:
    return {
        ReviewStatus.PENDING: "⏳",
        ReviewStatus.PASSED: "✅",
        ReviewStatus.NEEDS_SUPPLEMENT: "⚠️",
        ReviewStatus.AMBIGUOUS: "❓"
    }.get(status, "•")


def group_issues_by_track(
    issues: List[Issue]
) -> Dict[str, List[Issue]]:
    buckets: Dict[str, List[Issue]] = {
        "track_specific": [],
        "package_wide": []
    }
    for iss in issues:
        if iss.related_track_no is not None:
            buckets["track_specific"].append(iss)
        else:
            buckets["package_wide"].append(iss)

    buckets["track_specific"].sort(key=lambda x: (x.related_track_no or 9999, x.issue_type.value))
    return buckets


def build_action_items(issues: List[Issue]) -> List[Dict]:
    must_supplement = [i for i in issues if i.severity == "error"]
    need_confirm = [i for i in issues if i.severity == "warning"]
    minor = [i for i in issues if i.severity == "info"]

    actions = []
    for i in must_supplement:
        actions.append({"level": "必须补", "issue": i})
    for i in need_confirm:
        actions.append({"level": "请确认", "issue": i})
    for i in minor:
        actions.append({"level": "小修正", "issue": i})
    return actions


def build_track_pass_info(record: ReviewRecord) -> List[Dict]:
    result = []
    track_errors: Dict[int, List[Issue]] = {}
    track_warnings: Dict[int, List[Issue]] = {}

    for iss in record.issues:
        no = iss.related_track_no
        if no is None:
            continue
        if iss.severity == "error":
            track_errors.setdefault(no, []).append(iss)
        elif iss.severity == "warning":
            track_warnings.setdefault(no, []).append(iss)

    for t in record.reference_tracklist:
        errs = track_errors.get(t.track_no, [])
        warns = track_warnings.get(t.track_no, [])
        if errs:
            tag = "🔴 不能放行"
        elif warns:
            tag = "🟡 有疑点需确认"
        else:
            tag = "✅ 可放行"
        result.append({
            "track": t,
            "tag": tag,
            "errors": errs,
            "warnings": warns,
            "ok": not errs
        })
    return result


def generate_markdown_report(record: ReviewRecord) -> str:
    lines: List[str] = []

    lines.append(f"# 采样包素材版本复核清单")
    lines.append("")
    lines.append(f"> 采样包名称：**{record.package_name}**")
    lines.append(f"> 记录编号：`{record.record_id}`")
    lines.append(f"> 创建时间：{record.created_at}")
    lines.append(f"> 最近更新：{record.updated_at}")
    lines.append(f"> 累计提交次数：{record.submission_count} 次")
    lines.append(f"> 总体状态：{_status_icon(record.status)} **{record.status.value}**")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 一、一句话结论（录音师老许请看这里）")
    lines.append("")
    if record.status == ReviewStatus.PASSED:
        lines.append("> 🎉 **本包材料齐全，可以直接交接给演出/发行同事。**")
    elif record.status == ReviewStatus.NEEDS_SUPPLEMENT:
        must_count = len([i for i in record.issues if i.severity == "error"])
        lines.append(f"> ⚠️ **还有 {must_count} 项必须补的材料，补完才能交接。** 请先处理下方【必须补】清单。")
    elif record.status == ReviewStatus.AMBIGUOUS:
        warn_count = len([i for i in record.issues if i.severity == "warning"])
        lines.append(f"> ❓ **没有硬伤，但有 {warn_count} 项存疑的地方需要人工确认。** 确认清楚后可以放行。")
    else:
        lines.append("> ⏳ 复核进行中，请等待最新结果。")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 二、曲目逐条过审清单（可交接版）")
    lines.append("")
    lines.append("| 编号 | 曲目名称 | 别名 | 复核结论 | 问题摘要 |")
    lines.append("| ---: | --- | --- | --- | --- |")

    track_infos = build_track_pass_info(record)
    for info in track_infos:
        t = info["track"]
        aliases_str = "、".join(t.aliases) if t.aliases else "—"
        if len(aliases_str) > 30:
            aliases_str = aliases_str[:28] + "…"
        problems = []
        for i in info["errors"]:
            problems.append(f"[必须补] {i.human_reason}")
        for i in info["warnings"]:
            problems.append(f"[请确认] {i.human_reason}")
        prob_str = "；".join(problems) if problems else "无异常"
        if len(prob_str) > 50:
            prob_str = prob_str[:48] + "…"
        lines.append(f"| {t.track_no} | {t.title} | {aliases_str} | {info['tag']} | {prob_str} |")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 三、需要处理的问题（按优先级）")
    lines.append("")

    groups = group_issues_by_track(record.issues)
    actions = build_action_items(record.issues)

    if not actions:
        lines.append("> 👍 没有需要处理的问题，所有材料一致。")
        lines.append("")
    else:
        for act in actions:
            level = act["level"]
            i: Issue = act["issue"]
            icon = _severity_icon(i.severity)
            track_hint = ""
            if i.related_track_no is not None:
                track_hint = f"（第 {i.related_track_no} 首）"
            lines.append(f"### {icon} {level}{track_hint}：{i.issue_type.value}")
            lines.append("")
            lines.append(f"**人话解释：** {i.human_reason}")
            lines.append("")
            lines.append(f"**技术细节：** {i.description}")
            lines.append("")
            if i.resolution_hint:
                lines.append(f"**怎么处理：** {i.resolution_hint}")
                lines.append("")
            lines.append("---")
            lines.append("")

    lines.append("## 四、已收到的材料清单")
    lines.append("")
    lines.append(f"### 4.1 合同扫描件（共 {len(record.contract_scans)} 份）")
    lines.append("")
    if record.contract_scans:
        for idx, c in enumerate(record.contract_scans, 1):
            track_nos = sorted([t.track_no for t in c.tracks])
            track_str = "、".join(str(n) for n in track_nos) if track_nos else "未提取到曲目"
            lines.append(f"{idx}. `{os.path.basename(c.file_path)}`（合同号 {c.contract_id}，覆盖曲目：{track_str}，提交时间 {c.submitted_at}）")
    else:
        lines.append("_未收到任何合同扫描件_")
    lines.append("")

    lines.append(f"### 4.2 音频文件（共 {len(record.audio_files)} 个）")
    lines.append("")
    if record.audio_files:
        lines.append("| 文件名 | 识别编号 | 识别曲名 |")
        lines.append("| --- | ---: | --- |")
        for af in record.audio_files:
            no_str = str(af.parsed_track_no) if af.parsed_track_no is not None else "未识别"
            title_str = af.parsed_title or "未识别"
            lines.append(f"| `{af.file_name}` | {no_str} | {title_str} |")
    else:
        lines.append("_未收到任何音频文件_")
    lines.append("")

    lines.append("### 4.3 参考曲目表")
    lines.append("")
    if record.reference_tracklist:
        lines.append("| 编号 | 曲名 | 别名 | 时长 | ISWC |")
        lines.append("| ---: | --- | --- | --- | --- |")
        for t in record.reference_tracklist:
            ali = "、".join(t.aliases) if t.aliases else "—"
            dur = t.duration or "—"
            iswc = t.iswc or "—"
            lines.append(f"| {t.track_no} | {t.title} | {ali} | {dur} | {iswc} |")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 五、备注与判断变更记录")
    lines.append("")
    if record.remarks:
        for r in record.remarks:
            lines.append(f"### 📝 {r.added_at} —— {r.author} 备注")
            lines.append("")
            lines.append(f"> {r.content}")
            lines.append("")
            if r.judgment_deltas:
                lines.append("**备注改变了哪些判断：**")
                lines.append("")
                for d in r.judgment_deltas:
                    lines.append(f"- {d}")
                lines.append("")
    else:
        lines.append("_暂无备注_")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 六、状态流转历史（防扯皮用）")
    lines.append("")
    if record.status_history:
        lines.append("| 时间 | 原状态 | 新状态 | 触发原因 | 涉及问题数 |")
        lines.append("| --- | --- | --- | --- | ---: |")
        for h in record.status_history:
            old_s = h.old_status.value if h.old_status else "（无）"
            lines.append(f"| {h.changed_at} | {old_s} | {h.new_status.value} | {h.trigger} | {len(h.changed_issues)} |")
    else:
        lines.append("_暂无流转记录_")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("_本报告由「采样包素材版本复核」工具自动生成。如有疑问请对照以上记录核对。_")
    return "\n".join(lines)


def save_report(record: ReviewRecord, reports_dir: str = REPORTS_DIR) -> str:
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir, exist_ok=True)
    safe_name = "".join(c if c.isalnum() or c in "-_." else "_" for c in record.package_name)
    fname = f"REVIEW_{safe_name}_{record.record_id}.md"
    fpath = os.path.join(reports_dir, fname)
    content = generate_markdown_report(record)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    return fpath
