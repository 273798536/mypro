"""
排队窗口批量验算 · CLI 入口
================================
参数名和失败提示保持稳定，供日常脚本调用。

稳定参数名:
  --param-table-a, --param-table-b
  --window-config
  --output-dir
  --report-id-prefix
  --actor-name
  --temp-note

稳定错误码 (stderr 前缀):
  [VERIFY-E001] 参数行不存在
  [VERIFY-E002] 权重未变化
  [VERIFY-E003] 不支持的单位换算
  [VERIFY-E004] 证据不存在
  [VERIFY-E101] 缺少必要参数
  [VERIFY-E102] 参数表文件无法读取
  [VERIFY-E103] 窗口配置文件无法读取
  [VERIFY-E104] 验算过程异常
  [VERIFY-E105] 报告生成失败
"""

import argparse
import json
import sys
import os
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import Unit, VerificationReport
from src.param_table import ParamTableManager
from src.verifier import QueueWindowVerifier, QueueWindowConfig
from src.evidence import EvidenceTracker
from src.timeline import TimelineBuilder
from src.report_gen import ReportGenerator


ERR_MISSING_ARG = "[VERIFY-E101] 缺少必要参数: "
ERR_READ_PARAMS = "[VERIFY-E102] 参数表文件无法读取: "
ERR_READ_WINDOW = "[VERIFY-E103] 窗口配置文件无法读取: "
ERR_VERIFY = "[VERIFY-E104] 验算过程异常: "
ERR_REPORT = "[VERIFY-E105] 报告生成失败: "


def _safe_load_json(path: str, err_prefix: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"{err_prefix}文件不存在 path={path}", file=sys.stderr)
        sys.exit(102 if err_prefix == ERR_READ_PARAMS else 103)
    except json.JSONDecodeError as e:
        print(f"{err_prefix}JSON解析失败 path={path} err={e}", file=sys.stderr)
        sys.exit(102 if err_prefix == ERR_READ_PARAMS else 103)
    except Exception as e:
        print(f"{err_prefix}{e} path={path}", file=sys.stderr)
        sys.exit(102 if err_prefix == ERR_READ_PARAMS else 103)


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="queue_window_verify",
        description="排队窗口批量验算 - 对两组参数表进行窗口排队强度、等待时间与加权评分的批量验算，输出参数对照、判断变更、越界检测、证据追踪与时间线报告。",
    )
    p.add_argument(
        "--param-table-a", required=True, metavar="PATH",
        help="[稳定参数名] 基准参数表JSON路径（A组，对照用）",
    )
    p.add_argument(
        "--param-table-b", required=True, metavar="PATH",
        help="[稳定参数名] 新参数表JSON路径（B组，验算对象）",
    )
    p.add_argument(
        "--window-config", required=True, metavar="PATH",
        help="[稳定参数名] 排队窗口配置JSON路径（窗口与参数行的映射）",
    )
    p.add_argument(
        "--output-dir", default="output", metavar="DIR",
        help="[稳定参数名] 报告输出目录（默认: output）",
    )
    p.add_argument(
        "--report-id-prefix", default="QWV", metavar="STR",
        help="[稳定参数名] 报告编号前缀（默认: QWV）",
    )
    p.add_argument(
        "--actor-name", default="批量验算脚本", metavar="STR",
        help="[稳定参数名] 本次执行的操作人/脚本标识（默认: 批量验算脚本）",
    )
    p.add_argument(
        "--temp-note", action="append", default=[], metavar="TEXT",
        help="[稳定参数名] 社区公示前临时补注（可多次指定），格式: \"目标类型:目标ID:内容\"，如 \"ROW:ROW-0003:社区公示第3条修订\"",
    )
    return p


def _parse_temp_note(note_str: str):
    parts = note_str.split(":", 2)
    if len(parts) < 3:
        return None
    return parts[0], parts[1], parts[2]


def run(params_a_path: str, params_b_path: str, window_config_path: str,
        output_dir: str, report_id_prefix: str, actor_name: str,
        temp_notes) -> dict:
    pa = ParamTableManager("A组(基准)")
    pb = ParamTableManager("B组(验算)")

    data_a = _safe_load_json(params_a_path, ERR_READ_PARAMS)
    data_b = _safe_load_json(params_b_path, ERR_READ_PARAMS)
    if "version" in data_a:
        pa.version = data_a["version"]
    if "version" in data_b:
        pb.version = data_b["version"]
    for row_data in data_a.get("rows", []):
        from src.models import ParamRow
        r = ParamRow(**row_data)
        pa.rows[r.row_id] = r
        if r.row_number > pa._row_counter:
            pa._row_counter = r.row_number
    for row_data in data_b.get("rows", []):
        from src.models import ParamRow
        r = ParamRow(**row_data)
        pb.rows[r.row_id] = r
        if r.row_number > pb._row_counter:
            pb._row_counter = r.row_number

    weight_diffs = pa.diff_weights(pb)

    for ns in temp_notes:
        parsed = _parse_temp_note(ns)
        if parsed:
            ttype, tid, content = parsed
            pb.add_note(ttype, tid, content, actor_name, is_temporary=True)

    win_data = _safe_load_json(window_config_path, ERR_READ_WINDOW)
    window_configs = [QueueWindowConfig(**w) for w in win_data.get("windows", [])]

    try:
        verifier = QueueWindowVerifier(pa, pb)
        for cfg in window_configs:
            verifier.verify_window(cfg)
    except ValueError as e:
        print(f"{ERR_VERIFY}{e}", file=sys.stderr)
        sys.exit(104)
    except Exception as e:
        print(f"{ERR_VERIFY}{type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(104)

    tracker = EvidenceTracker()
    tracker.auto_create_from_verdicts(verifier.window_verdicts)
    tracker.link_evidence_to_verdicts(verifier.window_verdicts)

    from src.models import WeightChange as WCM
    real_wc = [
        WCM(
            row_id=r[0].row_id, param_name=r[0].param_name,
            old_weight=r[2], new_weight=r[3], changed_by=actor_name,
            changed_at=datetime.now(),
            reason="参数表A与参数表B权重对比差异",
        )
        for r in weight_diffs
    ]

    tb = TimelineBuilder()
    tb.add_param_initial(pa, actor_name)
    tb.add_param_initial(pb, actor_name)
    tb.add_weight_changes(real_wc)
    tb.add_notes(pb.notes)
    tb.add_judgment_changes(verifier.judgments)
    tb.add_evidence_events(tracker.list_evidences())

    ts_short = datetime.now().strftime("%Y%m%d-%H%M%S")
    report_id = f"{report_id_prefix}-{ts_short}-{uuid.uuid4().hex[:6]}"

    report = VerificationReport(
        report_id=report_id,
        generated_at=datetime.now(),
        param_table_version_a=pa.version,
        param_table_version_b=pb.version,
        param_rows=pb.list_rows(),
        weight_changes=real_wc + [w for w in pb.weight_changes if isinstance(w, WCM)],
        notes=pa.notes + pb.notes,
        judgments=verifier.judgments,
        extrapolation_issues=verifier.extrapolation_issues,
        evidences=tracker.list_evidences(),
        timeline=tb.sorted_events(),
        window_verdicts=verifier.window_verdicts,
    )

    tb.add_verification_run(report_id, actor_name, report.summary_counts())
    report.timeline = tb.sorted_events()

    try:
        rg = ReportGenerator(output_dir=output_dir)
        paths = rg.generate_all(report)
    except Exception as e:
        print(f"{ERR_REPORT}{type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(105)

    counts = report.summary_counts()
    print(f"[排队窗口批量验算] 完成 report_id={report_id}")
    print(f"  参数: A={pa.version}  B={pb.version}")
    print(f"  窗口: 已处理={counts['windows_handled']}  "
          f"需补证={counts['windows_need_evidence']}  "
          f"待跟进={counts['windows_todo']}")
    print(f"  判断: 变更={counts['judgment_changes']}项  "
          f"越界={counts['extrapolation_issues']}处")
    print(f"  证据: 待补={counts['evidences_pending']}  "
          f"已提={counts['evidences_provided']}")
    print(f"  报告:")
    for k, v in paths.items():
        print(f"    {k.upper():>8}: {os.path.abspath(v)}")
    return {"report_id": report_id, "paths": paths, "counts": counts}


def main():
    parser = build_arg_parser()
    args = parser.parse_args()
    run(
        params_a_path=args.param_table_a,
        params_b_path=args.param_table_b,
        window_config_path=args.window_config,
        output_dir=args.output_dir,
        report_id_prefix=args.report_id_prefix,
        actor_name=args.actor_name,
        temp_notes=args.temp_note,
    )


if __name__ == "__main__":
    import src
    main()
