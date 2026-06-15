import csv
from pathlib import Path
from typing import List
from .models import LessonRecord, ArchiveResult


def export_to_csv(records: List[LessonRecord], output_path: Path) -> None:
    if not records:
        return
    fieldnames = list(records[0].to_dict().keys())
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            writer.writerow(rec.to_dict())


def export_result(result: ArchiveResult, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = {}

    paths["all"] = output_dir / "all_records.csv"
    export_to_csv(result.records, paths["all"])

    paths["bad"] = output_dir / "bad_records.csv"
    export_to_csv([r for r in result.records if r.is_bad_row], paths["bad"])

    paths["skipped"] = output_dir / "skipped_records.csv"
    export_to_csv([r for r in result.records if r.is_skipped and not r.is_bad_row], paths["skipped"])

    paths["old_master"] = output_dir / "old_master_records.csv"
    export_to_csv([r for r in result.records if r.is_old_master], paths["old_master"])

    paths["final"] = output_dir / "final_archive.csv"
    export_to_csv(result.final_records, paths["final"])

    paths["progress"] = output_dir / "progress_summary.csv"
    export_to_csv(
        [r for r in result.final_records if r.progress_notes],
        paths["progress"]
    )

    return {k: str(v) for k, v in paths.items()}
