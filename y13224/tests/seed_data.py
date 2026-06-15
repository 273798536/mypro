REHEARSAL_SCREENSHOTS = [
    {
        "file_name": "排练群_20260610_鼓组A段.jpg",
        "sender": "林姐",
        "sent_at": "2026-06-10T19:03:00",
        "is_late": False,
        "parsed_text": "鼓组A段：底鼓4拍 军鼓2拍 踩镲4拍——林姐拍的白板",
        "beats": [
            {
                "beat_index": 1,
                "beat_type": "底鼓",
                "expected_count": 4,
                "actual_count": 4,
                "beat_label": "A段底鼓",
                "allocations": [
                    {"performer": "小陈", "allocated_count": 4, "allocation_source": "白板拍照"}
                ]
            },
            {
                "beat_index": 2,
                "beat_type": "军鼓",
                "expected_count": 2,
                "actual_count": 3,
                "beat_label": "A段军鼓",
                "allocations": [
                    {"performer": "小陈", "allocated_count": 2, "allocation_source": "白板拍照"}
                ]
            },
            {
                "beat_index": 3,
                "beat_type": "踩镲",
                "expected_count": 4,
                "actual_count": 4,
                "beat_label": "A段踩镲",
                "allocations": [
                    {"performer": "小王", "allocated_count": 4, "allocation_source": "白板拍照"}
                ]
            }
        ]
    },
    {
        "file_name": "排练群_20260610_鼓组B段.jpg",
        "sender": "小陈",
        "sent_at": "2026-06-10T19:07:00",
        "is_late": False,
        "parsed_text": "B段：底鼓8拍 军鼓4拍 通鼓2拍——小陈手抄谱拍的",
        "beats": [
            {
                "beat_index": 1,
                "beat_type": "底鼓",
                "expected_count": 8,
                "actual_count": 8,
                "beat_label": "B段底鼓",
                "allocations": [
                    {"performer": "小陈", "allocated_count": 8, "allocation_source": "手抄谱"}
                ]
            },
            {
                "beat_index": 2,
                "beat_type": "军鼓",
                "expected_count": 4,
                "actual_count": 4,
                "beat_label": "B段军鼓",
                "allocations": [
                    {"performer": "小陈", "allocated_count": 4, "allocation_source": "手抄谱"}
                ]
            },
            {
                "beat_index": 3,
                "beat_type": "通鼓",
                "expected_count": 2,
                "actual_count": 2,
                "beat_label": "B段通鼓",
                "allocations": [
                    {"performer": "小王", "allocated_count": 2, "allocation_source": "手抄谱"}
                ]
            }
        ]
    },
    {
        "file_name": "排练群_20260610_鼓组C段_晚到.jpg",
        "sender": "小王",
        "sent_at": "2026-06-10T19:22:00",
        "is_late": True,
        "parsed_text": "C段：吊镲2拍 通鼓3拍——小王下班后补发的，比约定时间晚了15分钟",
        "beats": [
            {
                "beat_index": 1,
                "beat_type": "吊镲",
                "expected_count": 2,
                "actual_count": 2,
                "beat_label": "C段吊镲",
                "allocations": [
                    {"performer": "小王", "allocated_count": 2, "allocation_source": "微信群补发"}
                ]
            },
            {
                "beat_index": 2,
                "beat_type": "通鼓",
                "expected_count": 3,
                "actual_count": 3,
                "beat_label": "C段通鼓",
                "allocations": [
                    {"performer": "小王", "allocated_count": 3, "allocation_source": "微信群补发"}
                ]
            }
        ]
    },
    {
        "file_name": "排练群_20260610_鼓组过门_旧版母带.jpg",
        "sender": "林姐",
        "sent_at": "2026-06-10T19:05:00",
        "is_late": False,
        "parsed_text": "过门段：底鼓6拍——林姐对照旧版母带标注的，群里说"旧版母带这里底鼓是6拍"",
        "beats": [
            {
                "beat_index": 1,
                "beat_type": "底鼓",
                "expected_count": 6,
                "actual_count": 5,
                "beat_label": "过门底鼓",
                "legacy_master": {
                    "version": "1.2",
                    "label": "2024春季汇演母带",
                    "screenshot_original_statement": "旧版母带这里底鼓是6拍"
                },
                "allocations": [
                    {"performer": "小陈", "allocated_count": 6, "allocation_source": "旧版母带对照"}
                ]
            }
        ]
    }
]
