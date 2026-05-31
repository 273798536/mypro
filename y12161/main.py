from __future__ import annotations

import json

from peak_recognizer import batch_recognize
from sample_data import get_all_sample_records, make_composition_library


def main() -> None:
    records = get_all_sample_records()
    library = make_composition_library()

    print(f"载入 {len(records)} 条光谱记录，{len(library)} 条成分库条目\n")

    for entry in library:
        ref_str = ", ".join(f"{wl:.0f}nm/{ab:.2f}" for wl, ab in entry.reference_peaks)
        print(f"  成分库 [{entry.entry_id}] {entry.compound_name}: 参考峰 {ref_str}")

    print()

    batch_result = batch_recognize(records, library)

    print(batch_result.summary())

    print("\n===== 各记录溯源链 =====")
    for group_name, group in [
        ("正常", batch_result.normal),
        ("边界值", batch_result.boundary),
        ("坏输入", batch_result.bad_input),
    ]:
        for r in group:
            if r.provenance:
                print()
                print(r.provenance.summary())

    print("\n===== 结构化输出 (JSON) =====")
    output = {
        "normal": [r.to_dict() for r in batch_result.normal],
        "boundary": [r.to_dict() for r in batch_result.boundary],
        "bad_input": [r.to_dict() for r in batch_result.bad_input],
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
