"""命令行接口."""

import json
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from random import uniform
from typing import Optional

import click
import numpy as np
import pandas as pd

from .data_loader import (
    load_buoy_data,
    load_maintenance_notes,
    load_params,
    save_params,
)
from .report_generator import generate_report
from .sensitivity import rerun_with_adjusted_params


@click.group()
def cli() -> None:
    """海浪浮标报告导出系统."""
    pass


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
@click.option("--params", default=None, help="参数配置文件路径")
@click.option("--output-dir", default="./output", help="输出目录")
def export(data_dir: str, params: Optional[str], output_dir: str) -> None:
    """导出海浪浮标报告."""
    click.echo("🌊 开始导出海浪浮标报告...")

    buoys, buoy_conf = load_buoy_data(data_dir)
    notes, notes_conf = load_maintenance_notes(data_dir)
    calc_params = load_params(params)
    all_conf = buoy_conf + notes_conf

    if not buoys:
        click.echo(f"❌ 未在 {data_dir} 找到浮标数据，请先放样例: python3 -m buoy_report.cli sample")
        return

    click.echo(f"  加载 {len(buoys)} 条浮标数据，{len(notes)} 条维修备注")
    if all_conf:
        click.echo(f"  ⚠️  发现 {len(all_conf)} 项待确认事项")

    result = generate_report(buoys, notes, calc_params, all_conf, output_dir)

    click.echo(f"\n✅ 报告生成完成: {result.report_id}")
    click.echo(f"  HTML报告: {result.output_path}")
    click.echo(f"  Excel数据: {Path(result.output_path).with_suffix('')}_data.xlsx")
    click.echo(f"  API返回: {Path(result.output_path).with_suffix('')}_api_response.json")
    click.echo(f"  浮标记录: {result.buoy_count} | 异常: {result.anomaly_count} | 备注: {result.notes_count}")

    if result.needs_confirmation:
        click.echo(f"\n⚠️  需要人工确认 {len(result.confirmations)} 项：")
        for conf in result.confirmations:
            click.echo(f"  • 设备 {conf.device_id}: {conf.reason}")
            click.echo(f"    → 下一步: {conf.next_step}")

    click.echo(f"\n💡 调档复算: python3 -m buoy_report.cli rerun --adjustment '浪高阈值 -0.5m'")
    click.echo(f"💡 查看接口返回: python3 -m buoy_report.cli inspect {result.report_id}")


@cli.command()
@click.option("--output-dir", default="./data", help="示例数据输出目录")
def sample(output_dir: str) -> None:
    """放样例：生成模拟现场数据."""
    click.echo("📦 正在生成现场材料包...")
    os.makedirs(output_dir, exist_ok=True)

    _generate_buoy_csv(output_dir, "buoy_data_20260601.csv", days=3, seed=42)
    _generate_buoy_csv(output_dir, "buoy_data_20260604.csv", days=2, seed=123, start_day=3)
    _generate_buoy_csv(output_dir, "buoy_data_duplicate.csv", days=1, seed=42, duplicate=True)

    _generate_maintenance_notes(output_dir, "maintenance_notes_v1.json", version=1)
    _generate_maintenance_notes(output_dir, "maintenance_notes_v2.json", version=2)

    params_path = Path(output_dir) / "params_default.json"
    params = load_params()
    save_params(params, str(params_path))

    _generate_field_kit(output_dir)

    click.echo(f"\n✅ 现场材料包已生成: {output_dir}/")
    click.echo("  包含文件:")
    for f in sorted(Path(output_dir).iterdir()):
        if f.is_file():
            size = f.stat().st_size
            click.echo(f"    - {f.name} ({size} bytes)")

    click.echo(f"\n🚀 先跑这条: python3 -m buoy_report.cli export")
    click.echo(f"🔍 再看接口返回: python3 -m buoy_report.cli inspect <报告编号>")


@cli.command()
@click.argument("report_id")
@click.option("--output-dir", default="./output", help="报告目录")
@click.option("--full", is_flag=True, help="显示完整返回")
def inspect(report_id: str, output_dir: str, full: bool) -> None:
    """查看接口返回."""
    api_file = Path(output_dir) / f"{report_id}_api_response.json"

    if not api_file.exists():
        click.echo(f"❌ 找不到报告 {report_id} 的接口返回")
        click.echo(f"   查找路径: {api_file}")
        return

    with open(api_file) as f:
        data = json.load(f)

    click.echo(f"📄 报告 {report_id} 接口返回:")
    click.echo(f"  状态: {data['code']} - {data['message']}")
    click.echo(f"  生成时间: {data['data']['generated_at']}")
    click.echo(f"  统计: {json.dumps(data['data']['stats'], ensure_ascii=False)}")

    if data["data"]["needs_confirmation"]:
        click.echo(f"\n⚠️  待确认 ({len(data['data']['confirmations'])} 项):")
        for c in data["data"]["confirmations"]:
            click.echo(f"  • [{c['request_id']}] {c['device_id']}: {c['reason']}")
            click.echo(f"    下一步: {c['next_step']}")

    click.echo(f"\n📐 参数:")
    for k, v in data["data"]["params"].items():
        click.echo(f"  {k}: {v}")

    click.echo(f"\n⚠️  异常摘要 ({len(data['data']['anomalies'])} 条):")
    for a in data["data"]["anomalies"][:5]:
        click.echo(f"  • {a['device_id']} {a['timestamp'][5:16]} {a['metric']}={a['value']:.2f} [{a['severity']}]")

    if data["data"]["boundary_samples"]:
        click.echo(f"\n🔍 边界样本 ({len(data['data']['boundary_samples'])} 条):")
        for b in data["data"]["boundary_samples"][:3]:
            click.echo(f"  • {b['device_id']} {b['metric']}={b['value']:.2f} 距阈值{b['distance']:.3f}")

    if full:
        click.echo(f"\n📋 完整返回:")
        click.echo(json.dumps(data, indent=2, ensure_ascii=False))

    html_path = Path(output_dir) / f"{report_id}.html"
    if html_path.exists():
        click.echo(f"\n💡 HTML报告: {html_path}")


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
@click.option("--params", default=None, help="基础参数配置文件")
@click.option("--adjustment", required=True, help="调档选项，如 '浪高阈值 -0.5m'")
@click.option("--output-dir", default="./output", help="输出目录")
@click.option("--list", "list_adjustments", is_flag=True, help="列出所有可用调档选项")
def rerun(
    data_dir: str,
    params: Optional[str],
    adjustment: str,
    output_dir: str,
    list_adjustments: bool,
) -> None:
    """调档复算：参数调一档后重新导出."""
    if list_adjustments:
        click.echo("📋 可用调档选项:")
        for opt in [
            "浪高阈值 -0.5m", "浪高阈值 +0.5m",
            "风速阈值 +2m/s", "风速阈值 -2m/s",
            "异常检测敏感度 +0.5σ", "异常检测敏感度 -0.5σ",
            "水温上限 -3°C", "水温上限 +3°C",
        ]:
            click.echo(f"  • {opt}")
        return

    click.echo(f"🔄 调档复算: {adjustment}")

    buoys, buoy_conf = load_buoy_data(data_dir)
    notes, notes_conf = load_maintenance_notes(data_dir)
    base_params = load_params(params)
    all_conf = buoy_conf + notes_conf

    try:
        new_params, changed = rerun_with_adjusted_params(buoys, notes, base_params, adjustment)
    except ValueError as e:
        click.echo(f"❌ {e}")
        return

    click.echo(f"  参数变化: {base_params.param_id} → {new_params.param_id}")
    click.echo(f"  变化样本数: {len(changed)}")

    if changed:
        click.echo(f"\n  变化详情:")
        for c in changed[:10]:
            ts = c["timestamp"].strftime("%m-%d %H:%M")
            click.echo(
                f"    {c['device_id']} {ts} {c['metric']}={c['value']:.2f}: {c['change_type']}"
            )

    new_params_path = Path(output_dir) / f"params_{adjustment.replace(' ', '_')}.json"
    os.makedirs(output_dir, exist_ok=True)
    save_params(new_params, str(new_params_path))

    result = generate_report(buoys, notes, new_params, all_conf, output_dir)

    click.echo(f"\n✅ 调档后报告已生成: {result.report_id}")
    click.echo(f"  参数配置: {new_params_path}")
    click.echo(f"  HTML报告: {result.output_path}")
    click.echo(f"  API返回: {Path(result.output_path).with_suffix('')}_api_response.json")


def _generate_buoy_csv(
    output_dir: str,
    filename: str,
    days: int = 3,
    seed: int = 42,
    start_day: int = 0,
    duplicate: bool = False,
) -> None:
    """生成模拟浮标数据."""
    np.random.seed(seed)
    device_ids = ["BUOY-001", "BUOY-002", "BUOY-003"]
    locations = {
        "BUOY-001": (121.5, 31.2),
        "BUOY-002": (121.8, 31.5),
        "BUOY-003": (122.1, 31.0),
    }

    base_date = datetime(2026, 6, 1) + timedelta(days=start_day)
    records = []

    for day in range(days):
        for device in device_ids:
            for hour in [0, 6, 12, 18]:
                ts = base_date + timedelta(days=day, hours=hour)
                lon, lat = locations[device]

                if duplicate and day == 0 and device == "BUOY-001" and hour == 12:
                    ts = base_date + timedelta(hours=12)

                wave_height = max(0.5, np.random.normal(2.5, 1.2))
                if day == 1 and device == "BUOY-002":
                    wave_height = 4.2
                if day == 2 and device == "BUOY-003" and hour == 12:
                    wave_height = 6.8

                wave_period = np.random.normal(10, 2)
                if day == 0 and device == "BUOY-001" and hour == 6:
                    wave_period = 28.5

                water_temp = np.random.normal(20, 3)
                if day == 1 and device == "BUOY-001":
                    water_temp = 36.2

                wind_speed = np.random.normal(12, 5)
                if day == 2 and device == "BUOY-002" and hour == 18:
                    wind_speed = 22.5

                records.append(
                    {
                        "device_id": device,
                        "timestamp": ts.isoformat(),
                        "longitude": lon + uniform(-0.01, 0.01),
                        "latitude": lat + uniform(-0.01, 0.01),
                        "wave_height": round(wave_height, 2),
                        "wave_period": round(wave_period, 1),
                        "wave_direction": np.random.randint(0, 360),
                        "water_temperature": round(water_temp, 1),
                        "wind_speed": round(wind_speed, 1),
                        "wind_direction": np.random.randint(0, 360),
                        "air_pressure": round(np.random.normal(1013, 5), 1),
                    }
                )

    df = pd.DataFrame(records)
    df.to_csv(Path(output_dir) / filename, index=False)


def _generate_maintenance_notes(output_dir: str, filename: str, version: int = 1) -> None:
    """生成模拟维修备注."""
    notes = []

    if version == 1:
        notes = [
            {
                "note_id": "NOTE-001",
                "device_id": "BUOY-001",
                "timestamp": "2026-06-02T10:00:00",
                "content": "6月1日晚浪高突增，疑似传感器漂移，建议校准",
                "author": "张工",
            },
            {
                "note_id": "NOTE-002",
                "device_id": "BUOY-002",
                "timestamp": "2026-06-02T14:30:00",
                "content": "水温传感器读数偏高，已通知运维",
                "author": "李工",
            },
        ]
    else:
        notes = [
            {
                "note_id": "NOTE-001",
                "device_id": "BUOY-001",
                "timestamp": "2026-06-02T10:00:00",
                "content": "6月1日晚浪高突增，经核实为真实数据，非传感器漂移",
                "author": "张工",
                "version": 2,
                "is_original": False,
            },
            {
                "note_id": "NOTE-003",
                "device_id": "BUOY-003",
                "timestamp": "2026-06-03T09:15:00",
                "content": "设备浮体有轻微倾斜，已安排修复计划",
                "author": "王工",
            },
        ]

    import json
    with open(Path(output_dir) / filename, "w") as f:
        json.dump(notes, f, indent=2, ensure_ascii=False)


def _generate_field_kit(output_dir: str) -> None:
    """生成现场材料包说明."""
    kit_dir = Path(output_dir) / "field_kit"
    os.makedirs(kit_dir, exist_ok=True)

    (kit_dir / "现场检测记录表_20260601.pdf").write_bytes(b"%PDF-1.4 placeholder")
    (kit_dir / "传感器校准证书.pdf").write_bytes(b"%PDF-1.4 placeholder")
    (kit_dir / "照片_20260601_1423.jpg").write_bytes(b"\xff\xd8\xff\xe0 placeholder")
    (kit_dir / "照片_20260602_0915.jpg").write_bytes(b"\xff\xd8\xff\xe0 placeholder")

    manifest = {
        "materials": [
            {"name": "现场检测记录表_20260601.pdf", "type": "检测报告", "date": "2026-06-01"},
            {"name": "传感器校准证书.pdf", "type": "校准证书", "date": "2026-05-15"},
            {"name": "照片_20260601_1423.jpg", "type": "现场照片", "date": "2026-06-01"},
            {"name": "照片_20260602_0915.jpg", "type": "现场照片", "date": "2026-06-02"},
        ],
        "notes": "本材料包与数据文件一并导出，供人工复核使用",
    }

    with open(kit_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    cli()
