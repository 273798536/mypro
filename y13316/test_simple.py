#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y13316')

print("Testing imports...")
try:
    from models import ReportData, JudgmentStatus, ChangeType
    print("✓ models imported")
except Exception as e:
    print(f"✗ models failed: {e}")
    sys.exit(1)

try:
    from engine import build_report_data, generate_detail_rows
    print("✓ engine imported")
except Exception as e:
    print(f"✗ engine failed: {e}")
    sys.exit(1)

try:
    from detectors import ThresholdDriftDetector, LateAttachmentLinker, BadDataDetector
    print("✓ detectors imported")
except Exception as e:
    print(f"✗ detectors failed: {e}")
    sys.exit(1)

try:
    from report_generator import MarkdownReportGenerator
    print("✓ report_generator imported")
except Exception as e:
    print(f"✗ report_generator failed: {e}")
    sys.exit(1)

try:
    from demo_data import generate_demo_data, generate_historical_outputs
    print("✓ demo_data imported")
except Exception as e:
    print(f"✗ demo_data failed: {e}")
    sys.exit(1)

print("\nTesting data generation...")
try:
    data = generate_demo_data()
    print(f"✓ generate_demo_data returned {len(data)} items")
except Exception as e:
    print(f"✗ generate_demo_data failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    hist_data = generate_historical_outputs()
    print(f"✓ generate_historical_outputs returned {len(hist_data)} items")
except Exception as e:
    print(f"✗ generate_historical_outputs failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ All imports and basic tests passed!")
