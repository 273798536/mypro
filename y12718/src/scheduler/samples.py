from __future__ import annotations

from pathlib import Path


SAMPLE_DRAFT_CSV = """raw_line
张伟,2026-06-10,早班,8h,# 周一上午值班
李娜,2026-06-10,中班,6h
王强,2026-06-10,晚班,8h
# 这一行是纯备注,应忽略
赵磊 2026-06-11 早班 4小时 (临时替班)
陈静,2026-06-11,中班,8
刘洋,2026-06-11,晚班


2026-06-12,早班,孙悦,8h
2026-06-12,中班,周杰,6h
2026-06-12,晚班,吴敏,8h
张伟,2026-06-10,早班,8h  # 重复,会被去重
李娜,2026-06-12,早班,4h  // 补录
"""

SAMPLE_DRAFT_MD = """# 6月排班草稿（助教随手写的）

| 姓名 | 日期 | 班次 | 工时 | 备注 |
|------|------|------|------|------|
| 张伟 | 2026-06-13 | 早班 | 8h | 正常值班 |
| 李娜 | 2026-06-13 | 中班 | 6h | |
| 王强 | 2026-06-13 | 晚班 | 8h | 连排,注意休息 |
| 赵磊 | 2026-06-14 | 早班 | 8h | |
| 陈静 | 2026-06-14 | 中班 | 6h | |
| 刘洋 | 2026-06-14 | 晚班 | 8h | |

零散记录：
孙悦 2026-06-15 全天 10小时
周杰,2026-06-15,早班,4h
吴敏,2026-06-15,晚班,8h
"""

SAMPLE_DRAFT_TXT = """助教排班零散记录
====================

张伟 2026-06-16 早班 8小时
李娜 2026-06-16 中班
王强 2026-06-16 晚班 8h - 这个是备注
赵磊 2026-06-17 早班 4h（临时加的）

空行、分割线都会被忽略
--------------------
陈静 2026-06-17 中班 8小时
刘洋 2026-06-17 晚班 8h

以下是有问题的行（会生成解析告警）：
???????? 不认识的内容
2026-06-18
"""


def generate_samples(input_dir: Path, force: bool = False) -> list[Path]:
    """首次使用时在 input_dir 生成示例材料，方便助教理解格式。"""
    input_dir = Path(input_dir)
    input_dir.mkdir(parents=True, exist_ok=True)

    generated: list[Path] = []
    samples = {
        "drafts.csv": SAMPLE_DRAFT_CSV,
        "drafts.md": SAMPLE_DRAFT_MD,
        "drafts.txt": SAMPLE_DRAFT_TXT,
    }
    for name, content in samples.items():
        p = input_dir / name
        if not p.exists() or force:
            p.write_text(content, encoding="utf-8")
            generated.append(p)
    return generated


def is_first_run(output_dir: Path) -> bool:
    return not (Path(output_dir) / "project_state.json").exists()
