from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path

from .models import (
    Channel,
    ChannelList,
    ConsoleSnapshot,
    MonitorSetting,
    MusicianFeedback,
    TraceRecord,
)


def _make_trace(source: str) -> TraceRecord:
    return TraceRecord(
        source=source,
        imported_at=datetime.now().isoformat(),
    )


def import_channel_list(path: str) -> ChannelList:
    p = Path(path)
    trace = _make_trace(str(p.resolve()))

    if p.suffix == ".json":
        data = json.loads(p.read_text(encoding="utf-8"))
        channels = []
        for item in data.get("channels", []):
            channels.append(
                Channel(
                    ch_number=item["ch_number"],
                    name=item["name"],
                    source_type=item.get("source_type", "unknown"),
                    bus_assignment=item.get("bus_assignment", ""),
                    phantom_power=item.get("phantom_power", False),
                    gain_db=item.get("gain_db", 0.0),
                )
            )
        return ChannelList(
            channels=channels,
            trace=trace,
            event_name=data.get("event_name", ""),
            timestamp=data.get("timestamp", ""),
        )

    channels = []
    with open(p, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            channels.append(
                Channel(
                    ch_number=int(row["ch_number"]),
                    name=row["name"],
                    source_type=row.get("source_type", "unknown"),
                    bus_assignment=row.get("bus_assignment", ""),
                    phantom_power=row.get("phantom_power", "").lower() in ("true", "1", "yes"),
                    gain_db=float(row.get("gain_db", 0)),
                )
            )
    return ChannelList(
        channels=channels,
        trace=trace,
        event_name="",
        timestamp="",
    )


def import_console_snapshot(path: str) -> ConsoleSnapshot:
    p = Path(path)
    trace = _make_trace(str(p.resolve()))

    if p.suffix == ".json":
        data = json.loads(p.read_text(encoding="utf-8"))
        settings = []
        for item in data.get("monitor_settings", []):
            settings.append(
                MonitorSetting(
                    musician=item["musician"],
                    bus=item["bus"],
                    channels=item["channels"],
                    level_db=item.get("level_db", 0.0),
                    eq_high_hz=item.get("eq_high_hz"),
                    eq_mid_hz=item.get("eq_mid_hz"),
                    eq_low_hz=item.get("eq_low_hz"),
                )
            )
        return ConsoleSnapshot(
            snapshot_name=data.get("snapshot_name", p.stem),
            monitor_settings=settings,
            trace=trace,
            timestamp=data.get("timestamp", ""),
            scene_label=data.get("scene_label", ""),
        )

    settings = []
    with open(p, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ch_str = row.get("channels", "")
            channels = []
            if ch_str:
                channels = [int(c.strip()) for c in ch_str.split("|") if c.strip()]
            settings.append(
                MonitorSetting(
                    musician=row["musician"],
                    bus=row["bus"],
                    channels=channels,
                    level_db=float(row.get("level_db", 0)),
                    eq_high_hz=float(row["eq_high_hz"]) if row.get("eq_high_hz") else None,
                    eq_mid_hz=float(row["eq_mid_hz"]) if row.get("eq_mid_hz") else None,
                    eq_low_hz=float(row["eq_low_hz"]) if row.get("eq_low_hz") else None,
                )
            )
    return ConsoleSnapshot(
        snapshot_name=p.stem,
        monitor_settings=settings,
        trace=trace,
        timestamp="",
        scene_label="",
    )


def import_musician_feedbacks(path: str) -> list[MusicianFeedback]:
    p = Path(path)

    if p.suffix == ".json":
        data = json.loads(p.read_text(encoding="utf-8"))
        feedbacks = []
        for item in data.get("feedbacks", []):
            feedbacks.append(
                MusicianFeedback(
                    musician=item["musician"],
                    timestamp=item["timestamp"],
                    issue=item["issue"],
                    channel_ref=item.get("channel_ref"),
                    bus_ref=item.get("bus_ref"),
                    severity=item.get("severity", "medium"),
                )
            )
        return feedbacks

    feedbacks = []
    with open(p, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ch_ref = row.get("channel_ref")
            feedbacks.append(
                MusicianFeedback(
                    musician=row["musician"],
                    timestamp=row["timestamp"],
                    issue=row["issue"],
                    channel_ref=int(ch_ref) if ch_ref and ch_ref.strip() else None,
                    bus_ref=row.get("bus_ref") or None,
                    severity=row.get("severity", "medium"),
                )
            )
    return feedbacks
