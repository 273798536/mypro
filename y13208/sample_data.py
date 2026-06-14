"""
真实场景测试数据（社区公示前的旧材料）
- 包含：曲目表（有后补备注、旧版本截图）
- 录音文件（有文件名对不上的、有时码偏半拍的）
"""

# 曲目表：模拟从 Excel/CSV 导入的行
TRACKLIST_OLD_MATERIAL = [
    {
        "track_no": 1,
        "track_title": "序曲·黎明",
        "expected_filename": "01_序曲_黎明.wav",
        "duration": "03:15.00",
        "source_line_no": 2,
        "notes": "初版通过，需等编曲第3次改稿",
        "version_screenshot_path": "screenshots/v1_track01.png"
    },
    {
        "track_no": 2,
        "track_title": "第一幕·重逢",
        "expected_filename": "02_第一幕_重逢.wav",
        "duration": "04:28.50",
        "source_line_no": 3,
        "notes": "",
        "version_screenshot_path": ""
    },
    {
        "track_no": 3,
        "track_title": "间奏·夜雨",
        "expected_filename": "03_间奏_夜雨.wav",
        "duration": "02:56.00",
        "source_line_no": 4,
        "notes": "录音棚时码显示02:56.50，偏了半拍，待阿蓝确认",
        "version_screenshot_path": "screenshots/v1_track03_offbeat.png"
    },
    {
        "track_no": 4,
        "track_title": "第二幕·山海",
        "expected_filename": "04_第二幕_山海.wav",
        "duration": "05:12.25",
        "source_line_no": 5,
        "notes": "结尾需加钟声采样，已同步至后期",
        "version_screenshot_path": "screenshots/v2_track04.png"
    },
    {
        "track_no": 5,
        "track_title": "终曲·归途",
        "expected_filename": "05_终曲_归途.wav",
        "duration": "04:45.00",
        "source_line_no": 6,
        "notes": "",
        "version_screenshot_path": ""
    }
]

# 录音文件清单：模拟从录音棚导出/扫描得到的文件列表
RECORDING_FILES_OLD_MATERIAL = [
    {
        "filename": "01_序曲_黎明.wav",
        "file_path": "stems/01_序曲_黎明.wav",
        "file_hash": "md5_a1b2c3d4",
        "timecode": "03:15.00",
        "duration": "03:15.00"
    },
    {
        "filename": "02_第一幕_重逄.wav",
        "file_path": "stems/02_第一幕_重逄.wav",
        "file_hash": "md5_e5f6g7h8",
        "timecode": "04:28.50",
        "duration": "04:28.50"
    },
    {
        "filename": "03_间奏_夜雨_rev2.wav",
        "file_path": "stems/03_间奏_夜雨_rev2.wav",
        "file_hash": "md5_i9j0k1l2",
        "timecode": "02:56.50",
        "duration": "02:56.50"
    },
    {
        "filename": "04_第二幕_山河_final.wav",
        "file_path": "stems/04_第二幕_山河_final.wav",
        "file_hash": "md5_m3n4o5p6",
        "timecode": "05:12.25",
        "duration": "05:12.25"
    },
    {
        "filename": "05_终曲_归途.wav",
        "file_path": "stems/05_终曲_归途.wav",
        "file_hash": "md5_q7r8s9t0",
        "timecode": "04:45.00",
        "duration": "04:45.00"
    }
]

# 后补备注：阿蓝后来手工补在曲目表边上的
SUPPLEMENTARY_REMARKS = [
    {
        "anomaly_target": "#3 间奏·夜雨（半拍）",
        "content": "经阿蓝与录音棚核对：当时因节拍器切换延迟，确实有半拍偏差，但不影响现场演出节奏，可接受。",
        "source": "曲目表纸质版第3条边注（6月10日）",
        "attachment_path": "screenshots/paper_note_track03.jpg"
    }
]

# 授权备注：用户说"我会把一条授权备注补进来，看它是否能把文件、曲目表和最后清单重新对齐"
LICENSE_REMARK_EXAMPLE = (
    "【演出统筹阿蓝授权】曲目#3 间奏·夜雨的时码偏差0.5秒由录音棚确认系节拍器切换延迟所致，"
    "不影响现场演出节奏，现授权豁免此异常。文件「03_间奏_夜雨_rev2.wav」、"
    "曲目表第3条、最终清单第3项以此对齐。"
)
