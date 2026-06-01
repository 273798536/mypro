const sampleData = {
    normal: {
        name: "正常对照组",
        description: "标准实验条件下的完整数据",
        errors: [],
        metadata: {
            sampleId: "EXP-2024-001",
            date: "2024-01-15",
            operator: "张老师",
            sampleType: "纯净水",
            initialTemp: 22.5
        },
        parameters: {
            frequency: 2.45,
            speed: 6,
            power: 800,
            duration: 120
        },
        temperaturePoints: [
            { id: "T001", time: 0, x: -15, y: -15, temp: 22.5, source: "红外测温" },
            { id: "T002", time: 0, x: 0, y: -15, temp: 22.3, source: "红外测温" },
            { id: "T003", time: 0, x: 15, y: -15, temp: 22.4, source: "红外测温" },
            { id: "T004", time: 0, x: -15, y: 0, temp: 22.6, source: "红外测温" },
            { id: "T005", time: 0, x: 0, y: 0, temp: 22.5, source: "红外测温" },
            { id: "T006", time: 0, x: 15, y: 0, temp: 22.3, source: "红外测温" },
            { id: "T007", time: 0, x: -15, y: 15, temp: 22.4, source: "红外测温" },
            { id: "T008", time: 0, x: 0, y: 15, temp: 22.5, source: "红外测温" },
            { id: "T009", time: 0, x: 15, y: 15, temp: 22.4, source: "红外测温" },
            { id: "T010", time: 30, x: -15, y: -15, temp: 45.2, source: "红外测温" },
            { id: "T011", time: 30, x: 0, y: -15, temp: 52.8, source: "红外测温" },
            { id: "T012", time: 30, x: 15, y: -15, temp: 44.9, source: "红外测温" },
            { id: "T013", time: 30, x: -15, y: 0, temp: 58.3, source: "红外测温" },
            { id: "T014", time: 30, x: 0, y: 0, temp: 72.5, source: "红外测温" },
            { id: "T015", time: 30, x: 15, y: 0, temp: 57.9, source: "红外测温" },
            { id: "T016", time: 30, x: -15, y: 15, temp: 45.1, source: "红外测温" },
            { id: "T017", time: 30, x: 0, y: 15, temp: 53.2, source: "红外测温" },
            { id: "T018", time: 30, x: 15, y: 15, temp: 44.8, source: "红外测温" },
            { id: "T019", time: 60, x: -15, y: -15, temp: 62.4, source: "红外测温" },
            { id: "T020", time: 60, x: 0, y: -15, temp: 71.5, source: "红外测温" },
            { id: "T021", time: 60, x: 15, y: -15, temp: 61.8, source: "红外测温" },
            { id: "T022", time: 60, x: -15, y: 0, temp: 78.9, source: "红外测温" },
            { id: "T023", time: 60, x: 0, y: 0, temp: 95.2, source: "红外测温" },
            { id: "T024", time: 60, x: 15, y: 0, temp: 78.4, source: "红外测温" },
            { id: "T025", time: 60, x: -15, y: 15, temp: 62.1, source: "红外测温" },
            { id: "T026", time: 60, x: 0, y: 15, temp: 71.8, source: "红外测温" },
            { id: "T027", time: 60, x: 15, y: 15, temp: 61.5, source: "红外测温" },
            { id: "T028", time: 90, x: -15, y: -15, temp: 75.8, source: "红外测温" },
            { id: "T029", time: 90, x: 0, y: -15, temp: 85.2, source: "红外测温" },
            { id: "T030", time: 90, x: 15, y: -15, temp: 75.3, source: "红外测温" },
            { id: "T031", time: 90, x: -15, y: 0, temp: 92.1, source: "红外测温" },
            { id: "T032", time: 90, x: 0, y: 0, temp: 99.8, source: "红外测温" },
            { id: "T033", time: 90, x: 15, y: 0, temp: 91.8, source: "红外测温" },
            { id: "T034", time: 90, x: -15, y: 15, temp: 75.5, source: "红外测温" },
            { id: "T035", time: 90, x: 0, y: 15, temp: 85.5, source: "红外测温" },
            { id: "T036", time: 90, x: 15, y: 15, temp: 75.1, source: "红外测温" },
            { id: "T037", time: 120, x: -15, y: -15, temp: 85.2, source: "红外测温" },
            { id: "T038", time: 120, x: 0, y: -15, temp: 93.8, source: "红外测温" },
            { id: "T039", time: 120, x: 15, y: -15, temp: 84.9, source: "红外测温" },
            { id: "T040", time: 120, x: -15, y: 0, temp: 98.5, source: "红外测温" },
            { id: "T041", time: 120, x: 0, y: 0, temp: 100.0, source: "红外测温" },
            { id: "T042", time: 120, x: 15, y: 0, temp: 98.2, source: "红外测温" },
            { id: "T043", time: 120, x: -15, y: 15, temp: 85.0, source: "红外测温" },
            { id: "T044", time: 120, x: 0, y: 15, temp: 94.1, source: "红外测温" },
            { id: "T045", time: 120, x: 15, y: 15, temp: 84.7, source: "红外测温" }
        ],
        turntablePositions: [
            { time: 0, angle: 0, note: "起始位置" },
            { time: 10, angle: 36, note: "1/10圈" },
            { time: 20, angle: 72, note: "1/5圈" },
            { time: 30, angle: 108, note: "3/10圈" },
            { time: 40, angle: 144, note: "2/5圈" },
            { time: 50, angle: 180, note: "半圈" },
            { time: 60, angle: 216, note: "3/5圈" },
            { time: 70, angle: 252, note: "7/10圈" },
            { time: 80, angle: 288, note: "4/5圈" },
            { time: 90, angle: 324, note: "9/10圈" },
            { time: 100, angle: 360, note: "1圈" },
            { time: 110, angle: 396, note: "1又1/10圈" },
            { time: 120, angle: 432, note: "实验结束" }
        ],
        notes: "正常对照实验，数据采集完整，无明显异常。驻波图形清晰，可用于教学演示。"
    },
    
    position_error: {
        name: "位置错标案例",
        description: "温度测量点坐标记录错误",
        errors: [{
            type: "position_mismatch",
            severity: "high",
            description: "检测到3个温度点坐标与预期位置不符，可能是测量时记录错误",
            affectedPoints: ["T014", "T023", "T032"],
            suggestion: "建议：1) 检查红外测温仪的定位校准；2) 重新测量疑似点；3) 使用网格定位板辅助测量；4) 在数据表格中标注可疑数据，避免影响分析结果。"
        }],
        metadata: {
            sampleId: "EXP-2024-002",
            date: "2024-01-16",
            operator: "李同学",
            sampleType: "纯净水",
            initialTemp: 23.1
        },
        parameters: {
            frequency: 2.45,
            speed: 6,
            power: 800,
            duration: 120
        },
        temperaturePoints: [
            { id: "T001", time: 0, x: -15, y: -15, temp: 23.1, source: "红外测温" },
            { id: "T002", time: 0, x: 0, y: -15, temp: 22.9, source: "红外测温" },
            { id: "T003", time: 0, x: 15, y: -15, temp: 23.0, source: "红外测温" },
            { id: "T004", time: 0, x: -15, y: 0, temp: 23.2, source: "红外测温" },
            { id: "T005", time: 0, x: 0, y: 0, temp: 23.1, source: "红外测温" },
            { id: "T006", time: 0, x: 15, y: 0, temp: 22.9, source: "红外测温" },
            { id: "T007", time: 0, x: -15, y: 15, temp: 23.0, source: "红外测温" },
            { id: "T008", time: 0, x: 0, y: 15, temp: 23.1, source: "红外测温" },
            { id: "T009", time: 0, x: 15, y: 15, temp: 23.0, source: "红外测温" },
            { id: "T010", time: 30, x: -15, y: -15, temp: 44.8, source: "红外测温" },
            { id: "T011", time: 30, x: 0, y: -15, temp: 51.5, source: "红外测温" },
            { id: "T012", time: 30, x: 15, y: -15, temp: 44.5, source: "红外测温" },
            { id: "T013", time: 30, x: -15, y: 0, temp: 57.2, source: "红外测温" },
            { id: "T014", time: 30, x: 25, y: 25, temp: 35.2, source: "红外测温", flagged: true, flagReason: "坐标异常" },
            { id: "T015", time: 30, x: 15, y: 0, temp: 56.8, source: "红外测温" },
            { id: "T016", time: 30, x: -15, y: 15, temp: 44.7, source: "红外测温" },
            { id: "T017", time: 30, x: 0, y: 15, temp: 51.8, source: "红外测温" },
            { id: "T018", time: 30, x: 15, y: 15, temp: 44.4, source: "红外测温" },
            { id: "T019", time: 60, x: -15, y: -15, temp: 61.8, source: "红外测温" },
            { id: "T020", time: 60, x: 0, y: -15, temp: 70.2, source: "红外测温" },
            { id: "T021", time: 60, x: 15, y: -15, temp: 61.2, source: "红外测温" },
            { id: "T022", time: 60, x: -15, y: 0, temp: 77.5, source: "红外测温" },
            { id: "T023", time: 60, x: -30, y: -30, temp: 28.5, source: "红外测温", flagged: true, flagReason: "坐标异常" },
            { id: "T024", time: 60, x: 15, y: 0, temp: 77.0, source: "红外测温" },
            { id: "T025", time: 60, x: -15, y: 15, temp: 61.5, source: "红外测温" },
            { id: "T026", time: 60, x: 0, y: 15, temp: 70.5, source: "红外测温" },
            { id: "T027", time: 60, x: 15, y: 15, temp: 61.0, source: "红外测温" },
            { id: "T028", time: 90, x: -15, y: -15, temp: 75.0, source: "红外测温" },
            { id: "T029", time: 90, x: 0, y: -15, temp: 83.8, source: "红外测温" },
            { id: "T030", time: 90, x: 15, y: -15, temp: 74.5, source: "红外测温" },
            { id: "T031", time: 90, x: -15, y: 0, temp: 90.8, source: "红外测温" },
            { id: "T032", time: 90, x: 10, y: -5, temp: 88.5, source: "红外测温", flagged: true, flagReason: "坐标偏移" },
            { id: "T033", time: 90, x: 15, y: 0, temp: 90.5, source: "红外测温" },
            { id: "T034", time: 90, x: -15, y: 15, temp: 74.7, source: "红外测温" },
            { id: "T035", time: 90, x: 0, y: 15, temp: 84.1, source: "红外测温" },
            { id: "T036", time: 90, x: 15, y: 15, temp: 74.3, source: "红外测温" },
            { id: "T037", time: 120, x: -15, y: -15, temp: 84.5, source: "红外测温" },
            { id: "T038", time: 120, x: 0, y: -15, temp: 92.5, source: "红外测温" },
            { id: "T039", time: 120, x: 15, y: -15, temp: 84.2, source: "红外测温" },
            { id: "T040", time: 120, x: -15, y: 0, temp: 97.2, source: "红外测温" },
            { id: "T041", time: 120, x: 0, y: 0, temp: 99.5, source: "红外测温" },
            { id: "T042", time: 120, x: 15, y: 0, temp: 96.8, source: "红外测温" },
            { id: "T043", time: 120, x: -15, y: 15, temp: 84.3, source: "红外测温" },
            { id: "T044", time: 120, x: 0, y: 15, temp: 92.8, source: "红外测温" },
            { id: "T045", time: 120, x: 15, y: 15, temp: 84.0, source: "红外测温" }
        ],
        turntablePositions: [
            { time: 0, angle: 0, note: "起始位置" },
            { time: 10, angle: 36, note: "1/10圈" },
            { time: 20, angle: 72, note: "1/5圈" },
            { time: 30, angle: 108, note: "3/10圈" },
            { time: 40, angle: 144, note: "2/5圈" },
            { time: 50, angle: 180, note: "半圈" },
            { time: 60, angle: 216, note: "3/5圈" },
            { time: 70, angle: 252, note: "7/10圈" },
            { time: 80, angle: 288, note: "4/5圈" },
            { time: 90, angle: 324, note: "9/10圈" },
            { time: 100, angle: 360, note: "1圈" },
            { time: 110, angle: 396, note: "1又1/10圈" },
            { time: 120, angle: 432, note: "实验结束" }
        ],
        notes: "注意：此数据集包含位置错标的模拟数据，用于教学演示如何识别和处理数据异常。"
    },
    
    time_gap: {
        name: "时间缺口案例",
        description: "数据采集存在时间间隔缺失",
        errors: [{
            type: "time_gap",
            severity: "medium",
            description: "检测到时间轴上存在数据缺口，40-50秒区间缺少完整的温度测量数据",
            affectedRange: [40, 50],
            suggestion: "建议：1) 检查数据采集软件的定时设置；2) 确认实验过程中是否有暂停；3) 使用插值算法估算缺失数据（本系统已自动处理）；4) 在报告中标注数据缺口位置。"
        }],
        metadata: {
            sampleId: "EXP-2024-003",
            date: "2024-01-17",
            operator: "王同学",
            sampleType: "纯净水",
            initialTemp: 22.8
        },
        parameters: {
            frequency: 2.45,
            speed: 6,
            power: 800,
            duration: 120
        },
        temperaturePoints: [
            { id: "T001", time: 0, x: -15, y: -15, temp: 22.8, source: "红外测温" },
            { id: "T002", time: 0, x: 0, y: -15, temp: 22.6, source: "红外测温" },
            { id: "T003", time: 0, x: 15, y: -15, temp: 22.7, source: "红外测温" },
            { id: "T004", time: 0, x: -15, y: 0, temp: 22.9, source: "红外测温" },
            { id: "T005", time: 0, x: 0, y: 0, temp: 22.8, source: "红外测温" },
            { id: "T006", time: 0, x: 15, y: 0, temp: 22.6, source: "红外测温" },
            { id: "T007", time: 0, x: -15, y: 15, temp: 22.7, source: "红外测温" },
            { id: "T008", time: 0, x: 0, y: 15, temp: 22.8, source: "红外测温" },
            { id: "T009", time: 0, x: 15, y: 15, temp: 22.7, source: "红外测温" },
            { id: "T010", time: 30, x: -15, y: -15, temp: 46.0, source: "红外测温" },
            { id: "T011", time: 30, x: 0, y: -15, temp: 53.5, source: "红外测温" },
            { id: "T012", time: 30, x: 15, y: -15, temp: 45.7, source: "红外测温" },
            { id: "T013", time: 30, x: -15, y: 0, temp: 59.0, source: "红外测温" },
            { id: "T014", time: 30, x: 0, y: 0, temp: 73.2, source: "红外测温" },
            { id: "T015", time: 30, x: 15, y: 0, temp: 58.6, source: "红外测温" },
            { id: "T016", time: 30, x: -15, y: 15, temp: 45.8, source: "红外测温" },
            { id: "T017", time: 30, x: 0, y: 15, temp: 53.8, source: "红外测温" },
            { id: "T018", time: 30, x: 15, y: 15, temp: 45.5, source: "红外测温" },
            { id: "T019", time: 60, x: -15, y: -15, temp: 63.2, source: "红外测温" },
            { id: "T020", time: 60, x: 0, y: -15, temp: 72.3, source: "红外测温" },
            { id: "T021", time: 60, x: 15, y: -15, temp: 62.6, source: "红外测温" },
            { id: "T022", time: 60, x: -15, y: 0, temp: 79.8, source: "红外测温" },
            { id: "T023", time: 60, x: 0, y: 0, temp: 96.0, source: "红外测温" },
            { id: "T024", time: 60, x: 15, y: 0, temp: 79.3, source: "红外测温" },
            { id: "T025", time: 60, x: -15, y: 15, temp: 62.9, source: "红外测温" },
            { id: "T026", time: 60, x: 0, y: 15, temp: 72.6, source: "红外测温" },
            { id: "T027", time: 60, x: 15, y: 15, temp: 62.3, source: "红外测温" },
            { id: "T028", time: 90, x: -15, y: -15, temp: 76.5, source: "红外测温" },
            { id: "T029", time: 90, x: 0, y: -15, temp: 86.0, source: "红外测温" },
            { id: "T030", time: 90, x: 15, y: -15, temp: 76.0, source: "红外测温" },
            { id: "T031", time: 90, x: -15, y: 0, temp: 93.0, source: "红外测温" },
            { id: "T032", time: 90, x: 0, y: 0, temp: 100.0, source: "红外测温" },
            { id: "T033", time: 90, x: 15, y: 0, temp: 92.6, source: "红外测温" },
            { id: "T034", time: 90, x: -15, y: 15, temp: 76.2, source: "红外测温" },
            { id: "T035", time: 90, x: 0, y: 15, temp: 86.3, source: "红外测温" },
            { id: "T036", time: 90, x: 15, y: 15, temp: 75.8, source: "红外测温" },
            { id: "T037", time: 120, x: -15, y: -15, temp: 85.8, source: "红外测温" },
            { id: "T038", time: 120, x: 0, y: -15, temp: 94.5, source: "红外测温" },
            { id: "T039", time: 120, x: 15, y: -15, temp: 85.5, source: "红外测温" },
            { id: "T040", time: 120, x: -15, y: 0, temp: 99.0, source: "红外测温" },
            { id: "T041", time: 120, x: 0, y: 0, temp: 100.0, source: "红外测温" },
            { id: "T042", time: 120, x: 15, y: 0, temp: 98.8, source: "红外测温" },
            { id: "T043", time: 120, x: -15, y: 15, temp: 85.6, source: "红外测温" },
            { id: "T044", time: 120, x: 0, y: 15, temp: 94.8, source: "红外测温" },
            { id: "T045", time: 120, x: 15, y: 15, temp: 85.3, source: "红外测温" }
        ],
        turntablePositions: [
            { time: 0, angle: 0, note: "起始位置" },
            { time: 10, angle: 36, note: "1/10圈" },
            { time: 20, angle: 72, note: "1/5圈" },
            { time: 30, angle: 108, note: "3/10圈" },
            { time: 60, angle: 216, note: "3/5圈 - 注意：40-50秒数据缺失" },
            { time: 70, angle: 252, note: "7/10圈" },
            { time: 80, angle: 288, note: "4/5圈" },
            { time: 90, angle: 324, note: "9/10圈" },
            { time: 100, angle: 360, note: "1圈" },
            { time: 110, angle: 396, note: "1又1/10圈" },
            { time: 120, angle: 432, note: "实验结束" }
        ],
        notes: "注意：此数据集故意模拟了时间缺口，用于教学演示如何处理不完整数据序列。"
    },
    
    sample_mix: {
        name: "样品混用案例",
        description: "实验过程中样品类型发生混淆",
        errors: [{
            type: "sample_contamination",
            severity: "high",
            description: "检测到温度数据模式异常，推测实验中途可能更换了样品或存在污染",
            evidence: "60秒后升温速率突变，热区分布模式改变",
            suggestion: "建议：1) 严格执行单一样品实验规程；2) 如需更换样品，重新开始完整实验；3) 分开分析前后两段数据；4) 在备注中详细记录样品变更情况。"
        }],
        metadata: {
            sampleId: "EXP-2024-004",
            date: "2024-01-18",
            operator: "赵同学",
            sampleType: "纯净水+糖水混合",
            initialTemp: 23.5
        },
        parameters: {
            frequency: 2.45,
            speed: 6,
            power: 800,
            duration: 120
        },
        temperaturePoints: [
            { id: "T001", time: 0, x: -15, y: -15, temp: 23.5, source: "红外测温", sample: "纯净水" },
            { id: "T002", time: 0, x: 0, y: -15, temp: 23.3, source: "红外测温", sample: "纯净水" },
            { id: "T003", time: 0, x: 15, y: -15, temp: 23.4, source: "红外测温", sample: "纯净水" },
            { id: "T004", time: 0, x: -15, y: 0, temp: 23.6, source: "红外测温", sample: "纯净水" },
            { id: "T005", time: 0, x: 0, y: 0, temp: 23.5, source: "红外测温", sample: "纯净水" },
            { id: "T006", time: 0, x: 15, y: 0, temp: 23.3, source: "红外测温", sample: "纯净水" },
            { id: "T007", time: 0, x: -15, y: 15, temp: 23.4, source: "红外测温", sample: "纯净水" },
            { id: "T008", time: 0, x: 0, y: 15, temp: 23.5, source: "红外测温", sample: "纯净水" },
            { id: "T009", time: 0, x: 15, y: 15, temp: 23.4, source: "红外测温", sample: "纯净水" },
            { id: "T010", time: 30, x: -15, y: -15, temp: 43.5, source: "红外测温", sample: "纯净水" },
            { id: "T011", time: 30, x: 0, y: -15, temp: 50.2, source: "红外测温", sample: "纯净水" },
            { id: "T012", time: 30, x: 15, y: -15, temp: 43.2, source: "红外测温", sample: "纯净水" },
            { id: "T013", time: 30, x: -15, y: 0, temp: 55.5, source: "红外测温", sample: "纯净水" },
            { id: "T014", time: 30, x: 0, y: 0, temp: 69.5, source: "红外测温", sample: "纯净水" },
            { id: "T015", time: 30, x: 15, y: 0, temp: 55.1, source: "红外测温", sample: "纯净水" },
            { id: "T016", time: 30, x: -15, y: 15, temp: 43.3, source: "红外测温", sample: "纯净水" },
            { id: "T017", time: 30, x: 0, y: 15, temp: 50.5, source: "红外测温", sample: "纯净水" },
            { id: "T018", time: 30, x: 15, y: 15, temp: 43.0, source: "红外测温", sample: "纯净水" },
            { id: "T019", time: 60, x: -15, y: -15, temp: 58.2, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T020", time: 60, x: 0, y: -15, temp: 82.5, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T021", time: 60, x: 15, y: -15, temp: 57.8, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T022", time: 60, x: -15, y: 0, temp: 88.9, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T023", time: 60, x: 0, y: 0, temp: 95.5, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T024", time: 60, x: 15, y: 0, temp: 88.5, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T025", time: 60, x: -15, y: 15, temp: 58.0, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T026", time: 60, x: 0, y: 15, temp: 82.8, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T027", time: 60, x: 15, y: 15, temp: 57.6, source: "红外测温", sample: "糖水混合", flagged: true, flagReason: "样品变更" },
            { id: "T028", time: 90, x: -15, y: -15, temp: 72.8, source: "红外测温", sample: "糖水混合" },
            { id: "T029", time: 90, x: 0, y: -15, temp: 95.2, source: "红外测温", sample: "糖水混合" },
            { id: "T030", time: 90, x: 15, y: -15, temp: 72.5, source: "红外测温", sample: "糖水混合" },
            { id: "T031", time: 90, x: -15, y: 0, temp: 98.0, source: "红外测温", sample: "糖水混合" },
            { id: "T032", time: 90, x: 0, y: 0, temp: 100.0, source: "红外测温", sample: "糖水混合" },
            { id: "T033", time: 90, x: 15, y: 0, temp: 97.8, source: "红外测温", sample: "糖水混合" },
            { id: "T034", time: 90, x: -15, y: 15, temp: 72.6, source: "红外测温", sample: "糖水混合" },
            { id: "T035", time: 90, x: 0, y: 15, temp: 95.5, source: "红外测温", sample: "糖水混合" },
            { id: "T036", time: 90, x: 15, y: 15, temp: 72.3, source: "红外测温", sample: "糖水混合" },
            { id: "T037", time: 120, x: -15, y: -15, temp: 82.2, source: "红外测温", sample: "糖水混合" },
            { id: "T038", time: 120, x: 0, y: -15, temp: 100.0, source: "红外测温", sample: "糖水混合" },
            { id: "T039", time: 120, x: 15, y: -15, temp: 82.0, source: "红外测温", sample: "糖水混合" },
            { id: "T040", time: 120, x: -15, y: 0, temp: 100.0, source: "红外测温", sample: "糖水混合" },
            { id: "T041", time: 120, x: 0, y: 0, temp: 100.0, source: "红外测温", sample: "糖水混合" },
            { id: "T042", time: 120, x: 15, y: 0, temp: 100.0, source: "红外测温", sample: "糖水混合" },
            { id: "T043", time: 120, x: -15, y: 15, temp: 82.1, source: "红外测温", sample: "糖水混合" },
            { id: "T044", time: 120, x: 0, y: 15, temp: 100.0, source: "红外测温", sample: "糖水混合" },
            { id: "T045", time: 120, x: 15, y: 15, temp: 81.9, source: "红外测温", sample: "糖水混合" }
        ],
        turntablePositions: [
            { time: 0, angle: 0, note: "起始位置 - 样品：纯净水" },
            { time: 10, angle: 36, note: "1/10圈" },
            { time: 20, angle: 72, note: "1/5圈" },
            { time: 30, angle: 108, note: "3/10圈" },
            { time: 40, angle: 144, note: "2/5圈" },
            { time: 50, angle: 180, note: "半圈 - 样品更换（操作失误）" },
            { time: 60, angle: 216, note: "3/5圈 - 样品：糖水混合" },
            { time: 70, angle: 252, note: "7/10圈" },
            { time: 80, angle: 288, note: "4/5圈" },
            { time: 90, angle: 324, note: "9/10圈" },
            { time: 100, angle: 360, note: "1圈" },
            { time: 110, angle: 396, note: "1又1/10圈" },
            { time: 120, angle: 432, note: "实验结束" }
        ],
        notes: "注意：此数据集模拟了样品混用情况，用于教学演示如何识别实验操作失误导致的数据异常。"
    }
};

const waveExplanations = {
    normal: `
        <p class="font-medium mb-2">驻波原理说明：</p>
        <p>微波炉利用2.45GHz的微波使水分子振动产生热量。当微波在炉腔内反射时，入射波与反射波叠加形成<strong>驻波</strong>。</p>
        <p class="mt-2"><strong>波腹</strong>（antinodes）：振动幅度最大的位置，温度升高最快，通常出现在腔体中心和特定距离处。</p>
        <p class="mt-1"><strong>波节</strong>（nodes）：振动幅度最小的位置，温度升高较慢。</p>
        <p class="mt-2"><strong>转盘的作用</strong>：通过旋转使食物经过不同位置，实现均匀加热。</p>
    `,
    position_error: `
        <p class="font-medium mb-2 text-red-600">数据异常检测说明：</p>
        <p>本案例中检测到<strong>位置错标</strong>问题，表现为：</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>部分温度点坐标超出正常测量范围（±20mm）</li>
            <li>异常点温度值明显偏离预期趋势</li>
            <li>空间分布模式出现不合理的跳跃</li>
        </ul>
        <p class="mt-2"><strong>原因分析</strong>：可能是红外测温仪定位不准、记录时笔误、或测量基准偏移。</p>
        <p class="mt-2 text-blue-600"><strong>教学要点</strong：引导学生观察异常数据点，学习如何识别和处理数据质量问题。</p>
    `,
    time_gap: `
        <p class="font-medium mb-2 text-orange-600">数据缺口说明：</p>
        <p>本案例中存在<strong>时间数据缺口</strong>（40-50秒区间），表现为：</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>时间轴上缺少连续的测量点</li>
            <li>转盘位置记录出现跳跃</li>
            <li>需要使用插值算法估算缺失数据</li>
        </ul>
        <p class="mt-2"><strong>本系统处理方式</strong>：采用线性插值自动估算缺失时间点的温度值，确保动画播放流畅。</p>
        <p class="mt-2 text-blue-600"><strong>教学要点</strong>：讨论数据完整性的重要性，以及不同插值方法的适用场景。</p>
    `,
    sample_mix: `
        <p class="font-medium mb-2 text-purple-600">样品变更检测说明：</p>
        <p>本案例中检测到<strong>样品混用</strong>问题，表现为：</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
            <li>60秒后升温速率突然加快</li>
            <li>热区分布模式发生明显改变</li>
            <li>边缘区域温度异常升高</li>
        </ul>
        <p class="mt-2"><strong>科学原理</strong>：不同物质的介电常数不同，吸收微波的效率也不同。糖水的升温速率通常快于纯净水。</p>
        <p class="mt-2 text-blue-600"><strong>教学要点</strong>：理解变量控制的重要性，学习从数据模式变化反推实验条件改变。</p>
    `
};
