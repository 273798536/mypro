import argparse
import sys
import os
import json

from models import (
    ReviewStatus, IssueType,
    TrackItem, ContractScan, AudioFile,
    compute_file_hash, compute_content_hash
)
from review_engine import (
    ReviewStore, now_iso, parse_filename,
)
from report_generator import generate_markdown_report, save_report


def cmd_list(args, store: ReviewStore):
    pkgs = store.list_packages()
    if not pkgs:
        print("（暂无任何采样包复核记录）")
        return
    print(f"共 {len(pkgs)} 个采样包复核记录：")
    for idx, pkg in enumerate(pkgs, 1):
        rec = store.get_record(pkg)
        if rec:
            print(f"  {idx}. [{rec.status.value}] {pkg}（编号 {rec.record_id}，更新于 {rec.updated_at}）")


def cmd_submit(args, store: ReviewStore):
    package_name = args.package
    tracklist_path = args.tracklist
    contract_paths = args.contracts or []
    audio_paths = args.audios or []

    if not tracklist_path:
        print("[错误] 必须提供 --tracklist 曲目表 JSON 文件路径")
        sys.exit(1)

    try:
        with open(tracklist_path, "r", encoding="utf-8") as f:
            tl_data = json.load(f)
    except Exception as e:
        print(f"[错误] 读取曲目表失败：{e}")
        sys.exit(1)

    reference_tracklist = []
    for item in tl_data.get("tracks", []):
        reference_tracklist.append(TrackItem(
            track_no=int(item["track_no"]),
            title=item["title"],
            aliases=list(item.get("aliases", []) or []),
            duration=item.get("duration"),
            iswc=item.get("iswc"),
        ))

    contracts = []
    for cp in contract_paths:
        cid = os.path.splitext(os.path.basename(cp))[0]
        fhash = compute_file_hash(cp)
        raw_text = ""
        ct_tracks = []
        if os.path.exists(cp + ".tracks.json"):
            try:
                with open(cp + ".tracks.json", "r", encoding="utf-8") as f:
                    ctd = json.load(f)
                for item in ctd.get("tracks", []):
                    ct_tracks.append(TrackItem(
                        track_no=int(item["track_no"]),
                        title=item["title"],
                        aliases=list(item.get("aliases", []) or []),
                        duration=item.get("duration"),
                        iswc=item.get("iswc"),
                    ))
            except Exception:
                pass
        contracts.append(ContractScan(
            contract_id=args.contract_id or cid,
            file_path=cp,
            file_hash=fhash,
            submitted_at=now_iso(),
            tracks=ct_tracks,
            raw_text=raw_text,
        ))

    audios = []
    for ap in audio_paths:
        fhash = compute_file_hash(ap)
        p_no, p_title = parse_filename(os.path.basename(ap))
        audios.append(AudioFile(
            file_path=ap,
            file_name=os.path.basename(ap),
            file_hash=fhash,
            submitted_at=now_iso(),
            parsed_title=p_title,
            parsed_track_no=p_no,
        ))

    rec, stats = store.create_or_update(
        package_name=package_name,
        reference_tracklist=reference_tracklist,
        contract_scans=contracts,
        audio_files=audios,
    )

    if stats["is_new"]:
        print(f"[新建] 已创建采样包「{package_name}」的复核记录（编号 {rec.record_id}）")
    else:
        print(f"[更新] 已追加到采样包「{package_name}」的复核记录（第 {rec.submission_count} 次提交）")
    print(f"    本次新增合同扫描件：{stats['contracts_added']} 份")
    print(f"    本次新增音频文件：{stats['audios_added']} 个")
    print(f"    当前状态：{rec.status.value}")
    print(f"    当前问题：{len(rec.issues)} 项")
    for iss in rec.issues:
        print(f"      - [{iss.severity}] {iss.human_reason}")

    if args.report:
        rpath = save_report(rec)
        print(f"\n[已生成报告] {rpath}")


def cmd_remark(args, store: ReviewStore):
    package_name = args.package
    rec = store.get_record(package_name)
    if rec is None:
        print(f"[错误] 未找到采样包「{package_name}」的记录")
        sys.exit(1)

    override_keys = []
    if args.resolve_issues:
        for iss in rec.issues:
            k = compute_content_hash(iss.issue_type.value + "|" + iss.description)
            if args.resolve_all or (str(iss.related_track_no or "") in args.resolve_issues
                                    or iss.issue_type.value in args.resolve_issues):
                override_keys.append(k)

    rec = store.add_remark(
        package_name=package_name,
        author=args.author or "老许",
        content=args.content,
        override_issue_keys=override_keys if override_keys else None,
    )

    print(f"[已备注] {package_name}")
    if rec.remarks:
        r = rec.remarks[-1]
        print(f"    时间：{r.added_at}")
        print(f"    作者：{r.author}")
        print(f"    内容：{r.content}")
        if r.judgment_deltas:
            print(f"    判断变更：")
            for d in r.judgment_deltas:
                print(f"      - {d}")
    print(f"    当前状态：{rec.status.value}")

    if args.report:
        rpath = save_report(rec)
        print(f"\n[已生成报告] {rpath}")


def cmd_status(args, store: ReviewStore):
    package_name = args.package
    rec = store.get_record(package_name)
    if rec is None:
        print(f"[错误] 未找到采样包「{package_name}」的记录")
        sys.exit(1)
    print(f"采样包：{rec.package_name}")
    print(f"编号：{rec.record_id}")
    print(f"状态：{rec.status.value}")
    print(f"提交次数：{rec.submission_count}")
    print(f"创建：{rec.created_at}")
    print(f"更新：{rec.updated_at}")
    print(f"合同扫描件：{len(rec.contract_scans)} 份")
    print(f"音频文件：{len(rec.audio_files)} 个")
    print(f"曲目数：{len(rec.reference_tracklist)}")
    print(f"问题数：{len(rec.issues)}")
    if rec.issues:
        for i in rec.issues:
            print(f"  - [{i.severity}] {i.issue_type.value}：{i.human_reason}")
    if rec.remarks:
        print(f"备注数：{len(rec.remarks)}")
        for r in rec.remarks:
            print(f"  - [{r.added_at}] {r.author}：{r.content}")
    if rec.status_history:
        print(f"状态流转：")
        for h in rec.status_history:
            old = h.old_status.value if h.old_status else "（无）"
            print(f"  - [{h.changed_at}] {old} → {h.new_status.value}（{h.trigger}）")


def cmd_report(args, store: ReviewStore):
    package_name = args.package
    rec = store.get_record(package_name)
    if rec is None:
        print(f"[错误] 未找到采样包「{package_name}」的记录")
        sys.exit(1)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(generate_markdown_report(rec))
        print(f"[已生成报告] {args.output}")
    else:
        rpath = save_report(rec)
        print(f"[已生成报告] {rpath}")
        if args.view:
            print(generate_markdown_report(rec))


def build_parser():
    p = argparse.ArgumentParser(
        prog="sample_review",
        description="采样包素材版本复核工具 —— 合同扫描件、文件名、曲目表三方对账"
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list", help="列出所有采样包复核记录")
    p_list.set_defaults(func=cmd_list)

    p_submit = sub.add_parser("submit", help="提交或追加复核材料（曲目表 + 合同扫描件 + 音频文件）")
    p_submit.add_argument("package", help="采样包名称（同一名多次提交会自动去重合并）")
    p_submit.add_argument("--tracklist", required=True, help="参考曲目表 JSON 文件路径")
    p_submit.add_argument("--contracts", nargs="*", default=[], help="合同扫描件文件路径（可多个）")
    p_submit.add_argument("--contract-id", help="合同编号（若不指定则用文件名）")
    p_submit.add_argument("--audios", nargs="*", default=[], help="音频文件路径（可多个）")
    p_submit.add_argument("--report", action="store_true", help="提交后立即生成 Markdown 报告")
    p_submit.set_defaults(func=cmd_submit)

    p_remark = sub.add_parser("remark", help="追加一条备注，可同时标记某些问题已确认")
    p_remark.add_argument("package", help="采样包名称")
    p_remark.add_argument("content", help="备注内容")
    p_remark.add_argument("--author", default="老许", help="备注人（默认：老许）")
    p_remark.add_argument("--resolve-issues", nargs="*", default=[],
                          help="要一并确认的问题：写曲目编号（如 1 3）或问题类型（如 合同曲目对不上）")
    p_remark.add_argument("--resolve-all", action="store_true",
                          help="把当前所有问题都视作已确认")
    p_remark.add_argument("--report", action="store_true", help="备注后立即生成 Markdown 报告")
    p_remark.set_defaults(func=cmd_remark)

    p_status = sub.add_parser("status", help="查看某个采样包的复核状态")
    p_status.add_argument("package", help="采样包名称")
    p_status.set_defaults(func=cmd_status)

    p_report = sub.add_parser("report", help="生成 Markdown 复核清单")
    p_report.add_argument("package", help="采样包名称")
    p_report.add_argument("--output", help="输出文件路径（不指定则写入 reports/ 目录）")
    p_report.add_argument("--view", action="store_true", help="同时把报告内容打印到终端")
    p_report.set_defaults(func=cmd_report)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    store = ReviewStore()
    args.func(args, store)


if __name__ == "__main__":
    main()
