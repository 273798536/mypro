"""生成贴近现场的样例数据"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data import SampleDataLoader, create_field_sample_data


def main():
    dataset = create_field_sample_data()
    loader = SampleDataLoader()
    loader.save_to_json(dataset, "field_samples.json")
    print(f"已生成 {len(dataset.records)} 条样例数据")
    print("-" * 50)
    for record in dataset.records:
        flags = []
        if record.boundary_flag:
            flags.append("边界样本")
        if record.is_duplicate:
            flags.append("重复样本")
        if record.supplementary_note:
            flags.append("有补录说明")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        print(f"{record.sample_id}: {record.graph.metadata.get('description', '')}{flag_str}")
    print("-" * 50)

    duplicates = dataset.find_duplicates()
    if duplicates:
        print(f"检测到 {len(duplicates)} 组重复样本：")
        for r1, r2 in duplicates:
            print(f"  {r1.sample_id} <-> {r2.sample_id} (checksum: {r1.checksum})")


if __name__ == "__main__":
    main()
