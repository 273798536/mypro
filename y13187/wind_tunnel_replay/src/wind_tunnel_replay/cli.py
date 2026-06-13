from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import click
import yaml

from .anomaly import AnomalyDetector
from .parser import LogParser
from .report import ReportBuilder
from .replay import ParamReplay


EXIT_OK = 0
EXIT_WARN = 2
EXIT_ERR = 3
EXIT_NOINPUT = 4


def _load_config(path: Path | None) -> dict:
    if path and path.exists():
        with path.open("r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    default = Path(__file__).resolve().parents[2] / "config" / "default.yaml"
    if default.exists():
        with default.open("r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    return {}


@click.group(help="风洞烟线参数回放：日志解析、参数复核、异常溯源、单页报告")
def main() -> None:
    pass


@main.command("run", help="执行一次回放并生成报告")
@click.option("-i", "--input", "input_path", type=click.Path(exists=True, path_type=Path), required=True, help="传感器日志文件路径（.log / .txt）")
@click.option("-c", "--config", "config_path", type=click.Path(path_type=Path), default=None, help="自定义配置文件（YAML），默认使用 config/default.yaml")
@click.option("-o", "--output-dir", "output_dir", type=click.Path(path_type=Path), default=None, help="输出目录，默认 outputs/")
@click.option("--id", "run_id_prefix", default="", help="指定运行编号前缀，便于日常脚本稳定识别产物")
@click.option("--json-summary/--no-json-summary", default=True, help="在 stdout 输出 JSON 摘要（便于脚本消费）")
def run(input_path: Path, config_path: Path | None, output_dir: Path | None, run_id_prefix: str, json_summary: bool) -> None:
    cfg = _load_config(config_path)
    replay_cfg = cfg.get("replay", {})
    thresholds_cfg = cfg.get("thresholds", {})
    parser_cfg = cfg.get("parser", {})
    anomaly_cfg = cfg.get("anomaly", {})

    out_root = output_dir or (Path.cwd() / replay_cfg.get("output_dir", "outputs"))
    out_root.mkdir(parents=True, exist_ok=True)

    parser = LogParser(parser_cfg)
    try:
        entries = parser.parse_file(input_path)
    except Exception as exc:
        click.echo(f"[WIND_TUNNEL_ERROR] parse_failed: {exc}", err=True)
        sys.exit(EXIT_NOINPUT)

    detector = AnomalyDetector(anomaly_cfg, thresholds_cfg)
    anomalies = detector.analyze(entries)

    replay = ParamReplay(replay_cfg, thresholds_cfg)
    result = replay.build_result(entries, anomalies)
    if run_id_prefix:
        result.run_id = f"{run_id_prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    builder = ReportBuilder(replay.stable_names)
    report_path = out_root / f"replay_{result.run_id}.html"
    builder.build(result, report_path)

    json_path = out_root / f"replay_{result.run_id}.json"
    with json_path.open("w", encoding="utf-8") as fh:
        json.dump({
            "run_id": result.run_id,
            "generated_at": result.generated_at.isoformat(),
            "conclusion": result.conclusion,
            "input": str(input_path),
            "report": str(report_path),
            "meta": result.meta,
            "anomalies": [a.to_dict() for a in result.anomalies],
            "final_params": {
                name: {"final_value": p.final_value, "baseline_value": p.baseline_value, "samples": len(p.values)}
                for name, p in result.param_versions.items()
            },
        }, fh, ensure_ascii=False, indent=2)

    errors = [a for a in result.anomalies if a.level == "error"]
    warns = [a for a in result.anomalies if a.level == "warning"]

    if json_summary:
        click.echo(json.dumps({
            "event": "wind_tunnel_replay_finish",
            "run_id": result.run_id,
            "exit": "error" if errors else ("warn" if warns else "ok"),
            "errors": len(errors),
            "warnings": len(warns),
            "report": str(report_path),
            "summary_json": str(json_path),
            "conclusion": result.conclusion,
            "stable_params_missing": [n for n in replay.stable_names if not result.param_versions[n].values],
        }, ensure_ascii=False))

    click.echo(f"报告已生成: {report_path}", err=True)
    click.echo(f"摘要 JSON: {json_path}", err=True)

    if errors:
        sys.exit(EXIT_ERR)
    if warns:
        sys.exit(EXIT_WARN)
    sys.exit(EXIT_OK)


@main.command("check-config", help="检查配置中的稳定参数名 / 阈值（供日常脚本自检）")
@click.option("-c", "--config", "config_path", type=click.Path(path_type=Path), default=None)
def check_config(config_path: Path | None) -> None:
    cfg = _load_config(config_path)
    replay_cfg = cfg.get("replay", {})
    thresholds_cfg = cfg.get("thresholds", {})
    stable = replay_cfg.get("stable_param_names", [])
    out = {
        "stable_param_names": stable,
        "stable_param_count": len(stable),
        "thresholds": thresholds_cfg,
        "require_all_params": replay_cfg.get("require_all_params", True),
    }
    click.echo(json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(EXIT_OK)


@main.command("explain-exit", help="解释脚本退出码（便于项目经理查阅）")
def explain_exit() -> None:
    click.echo("退出码说明：")
    click.echo(f"  {EXIT_OK}  通过，无错误无告警")
    click.echo(f"  {EXIT_WARN}  通过但有告警，需人工复核异常清单")
    click.echo(f"  {EXIT_ERR}  失败，存在错误（如安全阈值篡改 / 缺失参数）")
    click.echo(f"  {EXIT_NOINPUT}  输入文件无法解析或不存在")
    sys.exit(EXIT_OK)


if __name__ == "__main__":
    main()
