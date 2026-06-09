#!/usr/bin/env python3
import argparse
import os
import sys
import hashlib
import json
from pathlib import Path
from typing import Optional

from yield_ledger.processor import YieldLedgerProcessor
from yield_ledger.exporter import FriendlyExporter


BATCH_SIGNATURE_FILE = ".batch_signature.json"


def compute_batch_signature(input_dir: Path) -> str:
    hasher = hashlib.sha256()
    for f in sorted(input_dir.rglob("*")):
        if f.is_file():
            hasher.update(str(f.relative_to(input_dir)).encode())
            hasher.update(str(f.stat().st_mtime).encode())
            hasher.update(str(f.stat().st_size).encode())
    return hasher.hexdigest()


def load_previous_signature(output_dir: Path) -> Optional[dict]:
    sig_file = output_dir / BATCH_SIGNATURE_FILE
    if sig_file.exists():
        try:
            return json.loads(sig_file.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save_signature(output_dir: Path, signature: str, timestamp: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    sig_file = output_dir / BATCH_SIGNATURE_FILE
    sig_file.write_text(
        json.dumps({"signature": signature, "timestamp": timestamp}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="有机反应收率台账整理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "-i", "--input-dir",
        required=True,
        help="输入目录（含旧试剂台账、补录批次报告等 Excel/CSV 文件）",
    )
    parser.add_argument(
        "-o", "--output-dir",
        required=True,
        help="输出目录（整理后的台账、异常报告等将生成在此）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制重新处理，即使输入未变化也覆盖输出",
    )
    parser.add_argument(
        "--strict-ph",
        action="store_true",
        help="启用严格 pH 判定（默认启用；关闭请用 --no-strict-ph）",
        default=True,
    )
    parser.add_argument(
        "--no-strict-ph",
        action="store_false",
        dest="strict_ph",
        help="关闭严格 pH 判定模式",
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not input_dir.is_dir():
        print(f"[错误] 输入目录不存在：{input_dir}", file=sys.stderr)
        return 2

    output_dir.mkdir(parents=True, exist_ok=True)

    current_sig = compute_batch_signature(input_dir)
    prev = load_previous_signature(output_dir)

    if not args.force and prev and prev.get("signature") == current_sig:
        print(f"[提示] 输入目录内容未变化，跳过重复处理。")
        print(f"       上次处理时间：{prev.get('timestamp', '未知')}")
        print(f"       如需强制重跑，请追加 --force 参数。")
        return 0

    print(f"[信息] 开始处理输入目录：{input_dir}")
    print(f"[信息] 输出目录：{output_dir}")
    print(f"[信息] pH 严格模式：{'开' if args.strict_ph else '关'}")

    from datetime import datetime

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    processor = YieldLedgerProcessor(input_dir, strict_ph=args.strict_ph)
    result = processor.run()

    exporter = FriendlyExporter(output_dir)
    exporter.export_all(result, timestamp=timestamp)

    save_signature(output_dir, current_sig, timestamp)

    print("-" * 50)
    print(f"[完成] 共处理 {result.total_records} 条记录")
    print(f"       正常记录：{result.normal_count}")
    print(f"       异常记录：{result.abnormal_count}")
    print(f"       pH 越界：{result.ph_out_of_range_count}")
    print(f"       空白对照缺失：{result.blank_missing_count}")
    print(f"[完成] 输出文件已写入：{output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
