import json
import os
from typing import Optional
from .models import Sample, SampleClassification


def load_sample_from_directory(sample_dir: str) -> Optional[Sample]:
    meta_path = os.path.join(sample_dir, "meta.json")
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    sample = Sample.from_dict(data)
    sample.melody_midi_path = data.get(
        "melody_midi_path",
        os.path.join(sample_dir, "melody.mid"),
    )
    chords_path = os.path.join(sample_dir, "accompaniment_chords.json")
    if os.path.exists(chords_path):
        with open(chords_path, "r", encoding="utf-8") as f:
            chords_data = json.load(f)
        from .chord_parser import build_chord_analyses

        melody_chroma = data.get("melody_chroma", [])
        sample.chord_analyses = build_chord_analyses(melody_chroma, chords_data)
    versions_dir = os.path.join(sample_dir, "versions")
    if os.path.isdir(versions_dir):
        from .models import VersionRecord

        version_files = sorted(
            [
                f
                for f in os.listdir(versions_dir)
                if f.endswith(".json") and f.startswith("v")
            ]
        )
        for vf in version_files:
            with open(os.path.join(versions_dir, vf), "r", encoding="utf-8") as f:
                vdata = json.load(f)
            sample.version_records.append(VersionRecord.from_dict(vdata))
        if sample.version_records:
            for v in sample.version_records[:-1]:
                v.is_latest = False
            sample.version_records[-1].is_latest = True
    return sample


def load_samples_from_root(root_dir: str) -> list:
    samples = []
    if not os.path.isdir(root_dir):
        return samples
    for entry in sorted(os.listdir(root_dir)):
        entry_path = os.path.join(root_dir, entry)
        if os.path.isdir(entry_path):
            sample = load_sample_from_directory(entry_path)
            if sample is not None:
                if not sample.sample_id or sample.sample_id == entry:
                    sample.sample_id = entry
                samples.append(sample)
    return samples


def filter_by_classification(
    samples: list, classification: SampleClassification
) -> list:
    return [s for s in samples if s.classification == classification]


def filter_normal(samples: list) -> list:
    return filter_by_classification(samples, SampleClassification.NORMAL)


def filter_boundary(samples: list) -> list:
    return filter_by_classification(samples, SampleClassification.BOUNDARY)


def filter_bad(samples: list) -> list:
    return filter_by_classification(samples, SampleClassification.BAD)


def filter_with_conflicts(samples: list) -> list:
    return [s for s in samples if s.conflicts]


def filter_conclusion_inconsistent(samples: list) -> list:
    return [s for s in samples if not s.conclusion_consistent]


def get_sample_by_id(samples: list, sample_id: str) -> Optional[Sample]:
    for s in samples:
        if s.sample_id == sample_id:
            return s
    return None


def save_sample(sample: Sample, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    meta_path = os.path.join(output_dir, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(sample.to_dict(), f, ensure_ascii=False, indent=2)


def save_audit_results(samples: list, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    summary = {
        "total": len(samples),
        "normal": len(filter_normal(samples)),
        "boundary": len(filter_boundary(samples)),
        "bad": len(filter_bad(samples)),
        "with_conflicts": len(filter_with_conflicts(samples)),
        "conclusion_inconsistent": len(filter_conclusion_inconsistent(samples)),
        "samples": [s.to_dict() for s in samples],
    }
    result_path = os.path.join(output_dir, "audit_result.json")
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    for sample in samples:
        sample_dir = os.path.join(output_dir, sample.sample_id)
        save_sample(sample, sample_dir)
    return result_path
