import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from services.report_service import generate_report, write_report_to_file


def main():
    print("=" * 60)
    print("合成数据来源追踪 - 报告导出 CLI")
    print("=" * 60)

    action = sys.argv[1] if len(sys.argv) > 1 else "console"

    if action in ("console", "show"):
        result = generate_report()
        if not result.get("ok"):
            print(f"[ERROR] {result.get('error')}")
            print(result.get("traceback", ""))
            sys.exit(1)
        s = result["summary"]
        print(f"总数: {s['total']}   ready: {s['ready']}   needs_review: {s['needs_review']}   rejected: {s['rejected']}")
        if result.get("warnings"):
            print("\n[警告]")
            for w in result["warnings"]:
                print(f"  - {w}")
        print("\n详细 JSON:")
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif action in ("file", "save"):
        result = write_report_to_file()
        if not result.get("ok"):
            print(f"[ERROR] {result.get('error')}")
            print(result.get("traceback", ""))
            sys.exit(1)
        print(f"[OK] 文件已写入: {result['filepath']}")
        print(f"[OK] 下载URL:  {result['download_url']}")
        s = result["summary"]
        print(f"[OK] 分类统计: total={s['total']} ready={s['ready']} needs_review={s['needs_review']} rejected={s['rejected']}")
        if result.get("warnings"):
            print("\n[警告]")
            for w in result["warnings"]:
                print(f"  - {w}")

    else:
        print("用法: python3 export_report.py [console|file]")
        print("  console  在终端打印报告（默认）")
        print("  file     写入 data/reports/ 目录")
        sys.exit(2)


if __name__ == "__main__":
    main()
