import csv
from pathlib import Path
from typing import List
from .models import LessonRecord, ArchiveResult


def export_to_csv(records: List[LessonRecord], output_path: Path) -> None:
    if not records:
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            f.write("")
        return
    all_dicts = [r.to_dict() for r in records]
    fieldnames_set: set = set()
    for d in all_dicts:
        fieldnames_set.update(d.keys())
    base_fields = ["_source_file", "_line_number", "_is_bad_row", "_bad_reason",
                   "_is_skipped", "_skip_reason", "_is_old_master", "_auth_note",
                   "_audio_file", "_progress_notes", "_processed_at"]
    other = [f for f in fieldnames_set if f not in base_fields]
    meta = [f for f in base_fields if f in fieldnames_set]
    fieldnames = sorted(other) + meta
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, restval="")
        writer.writeheader()
        for d in all_dicts:
            writer.writerow(d)


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
