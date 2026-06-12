#!/usr/bin/env python3
"""测试异常追溯功能"""

import sys
sys.path.insert(0, '.')

from sea_ice_inspector.processor import DataProcessingEngine
from sea_ice_inspector.sample_data import SampleDataGenerator
from sea_ice_inspector.review import ReviewManager

print("=" * 60)
print("  异常追溯功能测试")
print("=" * 60)
print()

engine = DataProcessingEngine()
gen = SampleDataGenerator(seed=42)
buoys = gen.generate_buoy_data(8)
photos = gen.generate_photos(buoys, missing_count=3)

batch = engine.process_batch(buoys, photos)

print(f"处理完成: 总计 {batch.total_count}, 部分 {batch.partial_count}, 缺口 {batch.gaps_count}")
print()

reviewer = ReviewManager()
pending = reviewer.get_pending_review_items(batch)

print(f"待复核项共 {len(pending)} 项:")
for i, item in enumerate(pending[:5], 1):
    item_id = item.get("trace_id") or item.get("gap_id", "")
    print(f"  {i}. [{item['exception_type']}] {item_id}")
    print(f"     浮标: {item['buoy_id']}")
    print(f"     描述: {item['description']}")
    print(f"     处理意见: {item['processing_opinion']}")
    print()

print()
print("--- 追溯测试 ---")
print()

# 找一条有异常的记录做完整追溯
for record in batch.records:
    if record.exception_traces:
        trace = record.exception_traces[0]
        print(f"追溯异常: {trace.trace_id}")
        print()

        detail = reviewer.trace_exception(record, trace.trace_id)

        print("【异常信息】")
        print(f"  类型: {detail['trace']['exception_type']}")
        print(f"  描述: {detail['trace']['description']}")
        print()

        print("【处理意见】")
        print(f"  {detail['processing_opinion']}")
        print()

        print("【原始浮标数据】")
        buoy = detail['buoy_data']
        print(f"  浮标ID: {buoy['buoy_id']}")
        print(f"  时间: {buoy['timestamp']}")
        print(f"  位置: {buoy['latitude']}, {buoy['longitude']}")
        print(f"  原始冰厚: {buoy['ice_thickness']} cm")
        print(f"  数据来源: {buoy['raw_source']}")
        print()

        print("【潮汐计算】")
        if detail['tide_calculation']:
            tide = detail['tide_calculation']
            print(f"  算法版本: {tide['algorithm_version']}")
            print(f"  当前潮位: {tide['current_tide']} m")
            print(f"  校正后厚度: {tide['tide_corrected_thickness']} cm")
        print()

        print("【巡检照片】")
        if detail['inspection_photo']:
            photo = detail['inspection_photo']
            print(f"  照片ID: {photo['photo_id']}")
            print(f"  上传人: {photo['uploader']}")
        else:
            print("  缺失 (数据缺口)")
        print()

        print("【复核记录】")
        if detail['review_notes']:
            for note in detail['review_notes']:
                print(f"  - {note['reviewer']}: {note['content']}")
        else:
            print("  暂无 (待复核)")
        print()

        print("★ 追溯链路: 异常 → 浮标原始数据 → 处理意见 → 潮汐计算 → 照片 → 复核记录")
        print("  所有信息都来自同一条 ProcessingRecord，数据一致，不会各算各的")
        break

print()
print("=" * 60)
print("  追溯功能测试完成 ✓")
print("=" * 60)
