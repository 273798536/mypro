"""测试：修复后，不传 batch_id 时重复运行同目录，CREATE TABLE 应该被跳过而不是失败。"""
import os
import sys
import tempfile
import shutil

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from db_migration_replayer.config import Config, set_config
from db_migration_replayer.metadb import init_db
from db_migration_replayer.migration import MigrationExecutor


def main():
    tmpdir = tempfile.mkdtemp(prefix="test_replay_fix_")
    print(f"测试目录: {tmpdir}")
    print("=" * 70)

    input_dir = os.path.join(tmpdir, "input")
    output_dir = os.path.join(tmpdir, "output")
    target_db = os.path.join(tmpdir, "target.db")
    sample_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "samples",
        "migrations",
    )

    shutil.copytree(sample_dir, input_dir)

    cfg = Config(
        input_dir=input_dir, output_dir=output_dir, operator="test_user"
    )
    cfg.ensure_dirs()
    set_config(cfg)
    init_db()

    print("\n[测试 1] 第一次运行（自动生成 batch_id）...")
    exec1 = MigrationExecutor(target_db, input_dir)
    results1 = exec1.execute_batch()  # 不传 batch_id，自动生成
    print(f"批次 ID: {exec1.batch_id}")
    success1 = sum(1 for r in results1 if r.status == "success")
    failed1 = sum(1 for r in results1 if r.status == "failed")
    skipped1 = sum(1 for r in results1 if r.status == "skipped")
    print(f"结果: 成功 {success1}, 失败 {failed1}, 跳过 {skipped1}")
    for r in results1:
        print(f"  {r.migration_name}: {r.status}")
    assert success1 == 6, f"第一次应该全部成功，实际成功 {success1}"
    assert failed1 == 0, f"第一次不应该有失败，实际 {failed1}"
    print("  ✓ 通过")

    print("\n[测试 2] 第二次运行（不传 batch_id，自动生成 NEW batch_id）...")
    exec2 = MigrationExecutor(target_db, input_dir)
    results2 = exec2.execute_batch()  # 自动生成新的 batch_id
    print(f"新批次 ID: {exec2.batch_id}")
    success2 = sum(1 for r in results2 if r.status == "success")
    failed2 = sum(1 for r in results2 if r.status == "failed")
    skipped2 = sum(1 for r in results2 if r.status == "skipped")
    print(f"结果: 成功 {success2}, 失败 {failed2}, 跳过 {skipped2}")
    for r in results2:
        reason = f" ({r.skipped_reason})" if r.skipped_reason else ""
        print(f"  {r.migration_name}: {r.status}{reason}")

    assert skipped2 == 6, (
        f"第二次应该全部跳过（修复前会 CREATE TABLE failed），实际跳过 {skipped2}"
    )
    assert failed2 == 0, f"修复后不应该有失败，实际 {failed2}"
    assert success2 == 0, f"修复后不应该有新成功，实际 {success2}"
    assert exec1.batch_id != exec2.batch_id, "两次的 batch_id 应该不同"
    print("  ✓ 通过 - CREATE TABLE 类迁移全部被跳过，没有 failed")

    print("\n[测试 3] 检查跳过原因是否区分了批次...")
    skipped_different_batch = sum(
        1 for r in results2 if r.skipped_reason and "already succeeded in batch" in r.skipped_reason
    )
    assert skipped_different_batch == 6, f"应该显示'已在其他批次成功'的原因"
    print(f"  {skipped_different_batch} 个迁移显示'已在其他批次成功'")
    print("  ✓ 通过")

    print("\n" + "=" * 70)
    print("✅ 修复验证通过！")
    print("问题：之前不传 batch_id 会重跑，CREATE TABLE 会 failed")
    print("修复后：按迁移名全局去重，跨 batch 也能正确识别已执行过的脚本")
    print("=" * 70)


if __name__ == "__main__":
    main()
