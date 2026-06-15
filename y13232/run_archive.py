#!/usr/bin/env python3
"""
采样包素材清单归档 - 一键运行脚本
运行后自动生成最新报告到 output/最新报告.md
"""
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from sampling_archive.archiver import SamplingArchive


def main():
    data_dir = os.path.join(script_dir, "data")
    output_dir = os.path.join(script_dir, "output")

    archive = SamplingArchive(data_dir=data_dir, output_dir=output_dir)
    report_path = archive.run_full_report()

    print()
    print("报告已生成完成！")
    print(f"文件位置: {os.path.abspath(report_path)}")
    print()

    try:
        input("按回车键打开报告文件夹...")
        if sys.platform == "darwin":
            os.system(f'open "{os.path.abspath(output_dir)}"')
        elif sys.platform == "win32":
            os.startfile(os.path.abspath(output_dir))
        else:
            os.system(f'xdg-open "{os.path.abspath(output_dir)}"')
    except KeyboardInterrupt:
        pass
    except:
        pass


if __name__ == "__main__":
    main()
