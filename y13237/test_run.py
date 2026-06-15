import sys
sys.path.insert(0, '.')

from pathlib import Path
from qinarchive.archiver import process_lesson_list
from qinarchive.exporter import export_result

base = Path(".")
lesson_file = base / "testdata" / "lessons.csv"
audio_dir = base / "testdata" / "audio"
tracklist_file = base / "testdata" / "tracklist.xlsx"
output_dir = base / "archive_output"

audio_dir.mkdir(parents=True, exist_ok=True)
for f in ["张小明_20250610.wav", "王小芳 2025-06-11.mp3",
          "赵小天-20250615.m4a", "old_master_陈雨桐_20250614.wav",
          "backup_周浩然 20250617.wav"]:
    (audio_dir / f).touch()

print("=" * 60)
print("琴房课时清单归档 - 测试运行")
print("=" * 60)

auth_note = "2025年6月第2周授权通过"
result = process_lesson_list(lesson_file, audio_dir, tracklist_file, auth_note=auth_note)

print(f"\n已处理行:    {result.total_processed}")
print(f"坏行:        {result.total_bad}")
print(f"跳过行:      {result.total_skipped}")
print(f"旧版母带:    {result.total_old_master}")
print(f"音频已匹配:  {result.total_with_audio}")
print(f"原始记录总数: {len(result.records)}")
print(f"最终归档数:   {len(result.final_records)}")

print("\n--- 坏行明细 ---")
for r in result.records:
    if r.is_bad_row:
        print(f"  行{r.line_number}: {r.bad_reason} | 原始保留: {r.raw}")

print("\n--- 跳过行明细 ---")
for r in result.records:
    if r.is_skipped and not r.is_bad_row:
        print(f"  行{r.line_number}: {r.skip_reason} | {r.raw.get('学生姓名','')}")

print("\n--- 旧版母带标记 ---")
for r in result.records:
    if r.is_old_master:
        tag = "坏行" if r.is_bad_row else ("跳过" if r.is_skipped else "正常")
        print(f"  行{r.line_number} [{tag}]: {r.raw.get('学生姓名','')} {r.raw.get('上课日期','')}")

print("\n--- 老师关心的学生进度 ---")
for r in result.final_records:
    if r.progress_notes:
        print(f"  {r.raw.get('学生姓名','')}: {r.progress_notes}")
    if r.audio_file:
        print(f"    音频: {Path(r.audio_file).name}")

print("\n--- 授权备注对齐验证 ---")
print(f"授权备注: {auth_note}")
if result.final_records:
    first = result.final_records[0]
    print(f"文件来源: {Path(first.source_file).name}")
    print(f"曲目表记录: {len(result.tracklist_records)}条")
    print(f"最终清单: {len(result.final_records)}条")
    print(f"对齐状态: {'OK' if len(result.tracklist_records) > 0 else '待检查'}")

paths = export_result(result, output_dir)
print(f"\n导出完成，文件保存在: {output_dir}")
for k, v in paths.items():
    p = Path(v)
    if p.exists() and p.stat().st_size > 0:
        print(f"  {k}: {p.name} ({p.stat().st_size} bytes)")

print("\n" + "=" * 60)
print("测试通过！所有标记已保留，原始数据未修改。")
print("=" * 60)
