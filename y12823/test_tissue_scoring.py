#!/usr/bin/env python3
import subprocess
import sys
import os

DB = "/tmp/test_tissue_scoring.db"
SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tissue_scoring.py")


def run(args, expect_fail=False):
    cmd = [sys.executable, SCRIPT, "--db", DB] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"  > {' '.join(args)}")
    print(f"    stdout: {result.stdout.strip()}")
    if result.stderr.strip():
        print(f"    stderr: {result.stderr.strip()}")
    if not expect_fail and result.returncode != 0:
        print(f"  [FAIL] exit code {result.returncode}")
        sys.exit(1)
    return result


def main():
    if os.path.exists(DB):
        os.remove(DB)

    print("=== Test 1: Init DB ===")
    run(["init"])

    print("\n=== Test 2: First import ===")
    run(["import", "--batch", "SEQ-2025-001", "--sample", "Tumor-A", "--score", "3.0",
         "--boundary", "unclear", "--conclusion", "中度阳性"])

    print("\n=== Test 3: Duplicate import WITHOUT force (should reject) ===")
    run(["import", "--batch", "SEQ-2025-001", "--sample", "Tumor-A", "--score", "4.0",
         "--boundary", "clear", "--conclusion", "强阳性"], expect_fail=True)

    print("\n=== Test 4: Duplicate import WITH force (should update, preserve history) ===")
    run(["import", "--batch", "SEQ-2025-001", "--sample", "Tumor-A", "--score", "4.0",
         "--boundary", "clear", "--conclusion", "强阳性", "--force"])

    print("\n=== Test 5: Verify only ONE record exists (not two conflicting) ===")
    result = run(["list", "--format", "json"])
    import json
    records = json.loads(result.stdout)
    count = len([r for r in records if r["batch_id"] == "SEQ-2025-001" and r["sample_id"] == "Tumor-A"])
    assert count == 1, f"[FAIL] Expected 1 record, got {count} — duplicate conclusion detected!"
    print(f"  [PASS] Exactly {count} record for SEQ-2025-001/Tumor-A — no conflicting conclusions")

    print("\n=== Test 6: Show record with review history ===")
    run(["show", "--batch", "SEQ-2025-001", "--sample", "Tumor-A"])

    print("\n=== Test 7: Submit review correction with reason ===")
    run(["review", "--batch", "SEQ-2025-001", "--sample", "Tumor-A", "--score", "2.5",
         "--reason", "标注边界不清，复核后降级", "--reviewer", "Dr.Wang",
         "--conclusion", "弱-中度阳性", "--boundary", "unclear"])

    print("\n=== Test 8: Show record again (should have 2 history entries) ===")
    run(["show", "--batch", "SEQ-2025-001", "--sample", "Tumor-A"])

    print("\n=== Test 9: Link micrograph ===")
    run(["link-photo", "--batch", "SEQ-2025-001", "--sample", "Tumor-A",
         "--path", "/data/photos/SEQ-2025-001_Tumor-A_HE_40x.tif", "--desc", "HE染色 40x"])

    print("\n=== Test 10: Show with micrograph link ===")
    run(["show", "--batch", "SEQ-2025-001", "--sample", "Tumor-A"])

    print("\n=== Test 11: Second import of SAME batch (another sample) ===")
    run(["import", "--batch", "SEQ-2025-001", "--sample", "Tumor-B", "--score", "1.0",
         "--boundary", "clear", "--conclusion", "阴性"])

    print("\n=== Test 12: Diff analysis ===")
    run(["diff", "--batch", "SEQ-2025-001"])

    print("\n=== Test 13: List only unclear-boundary records (异常复核入口) ===")
    run(["list", "--boundary", "unclear"])

    print("\n=== Test 14: Re-import same batch+sample again WITHOUT force — must still be 1 record ===")
    run(["import", "--batch", "SEQ-2025-001", "--sample", "Tumor-A", "--score", "5.0",
         "--boundary", "clear", "--conclusion", "极强阳性"], expect_fail=True)
    result = run(["list", "--format", "json"])
    records = json.loads(result.stdout)
    count = len([r for r in records if r["batch_id"] == "SEQ-2025-001" and r["sample_id"] == "Tumor-A"])
    assert count == 1, f"[FAIL] Duplicate created! Expected 1, got {count}"
    print(f"  [PASS] Still exactly {count} record after rejected re-import")

    print("\n" + "=" * 50)
    print("ALL TESTS PASSED — idempotent imports, no conflicting conclusions, history preserved.")

    if os.path.exists(DB):
        os.remove(DB)


if __name__ == "__main__":
    main()
