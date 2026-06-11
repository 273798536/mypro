import json
import os
from typing import Optional
from .models import Sample, SampleClassification


class SampleLoadError(Exception):
    pass


def _resolve_midi_path(sample_dir: str, midi_path_from_meta: str) -> str:
    if not midi_path_from_meta:
        return os.path.join(sample_dir, "melody.mid")
    if os.path.isabs(midi_path_from_meta):
        return midi_path_from_meta
    return os.path.join(sample_dir, midi_path_from_meta)


def _build_chord_analyses_for_sample(
    sample: Sample,
    sample_dir: str,
    chords_data: list,
    melody_chroma: list,
) -> None:
    midi_path = sample.melody_midi_path
    midi_exists = midi_path and os.path.exists(midi_path)

    if midi_exists:
        try:
            from .midi_processor import build_chord_analyses_from_midi

            sample.chord_analyses = build_chord_analyses_from_midi(
                midi_path, chords_data
            )
            sample.meta = sample.meta or {}
            sample.meta["_midi_processed"] = True
            sample.meta["_midi_path"] = midi_path
            return
        except Exception as e:
            sample.meta = sample.meta or {}
            sample.meta["_midi_error"] = str(e)
            sample.meta["_midi_processed"] = False

    from .chord_parser import build_chord_analyses

    sample.chord_analyses = build_chord_analyses(melody_chroma, chords_data)
    if not midi_exists:
        sample.meta = sample.meta or {}
        sample.meta["_midi_missing"] = True
        sample.meta["_midi_path"] = midi_path


def load_sample_from_directory(sample_dir: str) -> Optional[Sample]:
    if not os.path.isdir(sample_dir):
        return None

    meta_path = os.path.join(sample_dir, "meta.json")
    if not os.path.exists(meta_path):
        return None

    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        raise SampleLoadError(f"读取 meta.json 失败: {e}") from e

    sample = Sample.from_dict(data)
    midi_path_from_meta = data.get("melody_midi_path", "")
    sample.melody_midi_path = _resolve_midi_path(sample_dir, midi_path_from_meta)

    chords_path = os.path.join(sample_dir, "accompaniment_chords.json")
    if os.path.exists(chords_path):
        try:
            with open(chords_path, "r", encoding="utf-8") as f:
                chords_data = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            raise SampleLoadError(f"读取 accompaniment_chords.json 失败: {e}") from e

        melody_chroma = data.get("melody_chroma", [])
        _build_chord_analyses_for_sample(sample, sample_dir, chords_data, melody_chroma)

    versions_dir = os.path.join(sample_dir, "versions")
    if os.path.isdir(versions_dir):
        from .models import VersionRecord

        try:
            version_files = sorted(
                [
                    f
                    for f in os.listdir(versions_dir)
                    if f.endswith(".json") and f.startswith("v")
                ]
            )
        except OSError as e:
            raise SampleLoadError(f"读取版本目录失败: {e}") from e

        for vf in version_files:
            vpath = os.path.join(versions_dir, vf)
            try:
                with open(vpath, "r", encoding="utf-8") as f:
                    vdata = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                raise SampleLoadError(f"读取版本文件 {vf} 失败: {e}") from e
            sample.version_records.append(VersionRecord.from_dict(vdata))

        if sample.version_records:
            for v in sample.version_records[:-1]:
                v.is_latest = False
            sample.version_records[-1].is_latest = True

    return sample


def load_samples_from_root(root_dir: str) -> list:
    samples = []
    errors = []
    if not os.path.isdir(root_dir):
        return samples
    for entry in sorted(os.listdir(root_dir)):
        entry_path = os.path.join(root_dir, entry)
        if not os.path.isdir(entry_path):
            continue
        try:
            sample = load_sample_from_directory(entry_path)
        except SampleLoadError as e:
            errors.append((entry, str(e)))
            continue
        except Exception as e:
            errors.append((entry, f"未知错误: {e}"))
            continue
        if sample is not None:
            if not sample.sample_id or sample.sample_id == entry:
                sample.sample_id = entry
            samples.append(sample)
    if errors:
        print(f"[!] 警告: {len(errors)} 个样本加载失败:")
        for entry, err in errors:
            print(f"    - {entry}: {err}")
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
