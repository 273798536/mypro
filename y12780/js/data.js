const TITRATION_RECORDS = [
    {
        id: "REC-2026-001",
        originalRow: 7,
        batchNo: "FE-20260608-A",
        oreId: "铁矿石-Fe-017",
        experimentDate: "2026-06-08",
        studentName: "张小明",
        studentGroup: "分析化学A组",
        measuredGrade: 58.42,
        theoreticalGrade: 58.35,
        deviation: 0.07,
        deviationStatus: "pass",
        status: "pass",
        statusText: "可直接用",
        imageName: "滴定曲线_Fe-017_张小明_20260608.png",
        sourceNote: "《分析化学实验记录本》第12册，第7行，第32页",
        titrationData: {
            method: "重铬酸钾滴定法（GB/T 6730.5-2007）",
            indicator: "二苯胺磺酸钠",
            titrantName: "K₂Cr₂O₇ 标准溶液",
            titrantConcentration: 0.05002,
            titrantConcentrationUnit: "mol/L",
            buretteInitial: 0.12,
            buretteFinal: 23.85,
            titrantVolume: 23.73,
            sampleWeight: 0.2503,
            parallelTests: [
                { testNo: 1, volume: 23.68, grade: 58.29 },
                { testNo: 2, volume: 23.75, grade: 58.47 },
                { testNo: 3, volume: 23.76, grade: 58.50 }
            ],
            rsd: 0.20,
            curvePoints: generateSmoothCurve(23.73)
        },
        reagentLedger: [
            {
                name: "K₂Cr₂O₇ 标准溶液",
                batchNo: "STD-K2Cr2O7-2026-012",
                concInLedger: 0.05002,
                concUsed: 0.05002,
                expiryDate: "2026-12-31",
                match: true,
                status: "ok",
                remark: ""
            },
            {
                name: "H₃PO₄ 磷酸（分析纯）",
                batchNo: "REA-H3PO4-2026-033",
                inLedger: true,
                status: "ok",
                remark: ""
            },
            {
                name: "SnCl₂ 氯化亚锡溶液",
                batchNo: "REA-SnCl2-2026-045",
                inLedger: true,
                status: "ok",
                remark: ""
            }
        ],
        anomalies: [
            {
                level: "green",
                title: "滴定曲线平滑",
                description: "突跃范围清晰（23.50mL ~ 23.90mL），终点颜色变化敏锐（无色 → 紫蓝色），指示剂显色正常。",
                source: "谱图自动判读：曲线二阶导数最大值出现在 23.72mL 处"
            },
            {
                level: "green",
                title: "平行样精密度良好",
                description: "三次平行测定结果 RSD = 0.20%，远低于允许限 0.50%。",
                source: "原始数据行7，平行试验1/2/3列"
            },
            {
                level: "green",
                title: "试剂台账完全匹配",
                description: "标准溶液浓度、试剂批号、有效期与化学试剂登记台账一致，无冲突。",
                source: "试剂台账第48页第12行"
            }
        ],
        chartAnnotations: [
            { color: "blue", text: "滴定突跃开始：pH/E 快速变化起点（23.50 mL）" },
            { color: "green", text: "化学计量点：23.72 mL（由二阶导数法确定）" },
            { color: "green", text: "终点判定：23.73 mL，与计量点偏差 < 0.02 mL" }
        ],
        narrative: "本次铁矿石全铁含量测定采用重铬酸钾滴定法，按GB/T 6730.5-2007标准操作。学生张小明完成的三次平行试验结果分别为58.29%、58.47%、58.50%，平均值58.42%，相对标准偏差0.20%，精密度符合要求。与理论品位58.35%相比偏差仅+0.07%，在允许误差范围（±0.30%）内。滴定曲线突跃明显，终点颜色变化敏锐，指示剂反应正常。所用标准溶液K₂Cr₂O₇（批号STD-K2Cr2O7-2026-012）浓度0.05002 mol/L与试剂台账登记一致，其他辅助试剂也均在有效期内。综合判定：该组数据可直接用于实验报告。"
    },
    {
        id: "REC-2026-002",
        originalRow: 15,
        batchNo: "CU-20260609-B",
        oreId: "铜矿石-Cu-042",
        experimentDate: "2026-06-09",
        studentName: "李华",
        studentGroup: "分析化学B组",
        measuredGrade: 2.48,
        theoreticalGrade: 2.15,
        deviation: 0.33,
        deviationStatus: "review",
        status: "review",
        statusText: "待复核",
        imageName: "滴定曲线_Cu-042_李华_20260609.jpg",
        sourceNote: "《分析化学实验记录本》第12册，第15行，第45页；原始数据有涂改痕迹",
        titrationData: {
            method: "碘量法测铜（GB/T 3884.1-2012）",
            indicator: "淀粉指示剂",
            titrantName: "Na₂S₂O₃ 标准溶液",
            titrantConcentration: 0.04988,
            titrantConcentrationUnit: "mol/L",
            buretteInitial: 1.05,
            buretteFinal: 18.72,
            titrantVolume: 17.67,
            sampleWeight: 0.5001,
            parallelTests: [
                { testNo: 1, volume: 15.42, grade: 2.17 },
                { testNo: 2, volume: 17.67, grade: 2.48 },
                { testNo: 3, volume: 15.38, grade: 2.16 }
            ],
            rsd: 8.31,
            curvePoints: generateNoisyCurve(17.67, 15.40)
        },
        reagentLedger: [
            {
                name: "Na₂S₂O₃ 标准溶液",
                batchNo: "STD-Na2S2O3-2026-008",
                concInLedger: 0.04988,
                concUsed: 0.04988,
                expiryDate: "2026-08-15",
                match: true,
                status: "ok",
                remark: ""
            },
            {
                name: "KI 碘化钾（分析纯）",
                batchNo: "REA-KI-2026-021",
                inLedger: true,
                status: "ok",
                remark: ""
            },
            {
                name: "KSCN 硫氰酸钾",
                batchNo: "REA-KSCN-2026-???",
                inLedger: true,
                status: "warn",
                remark: "试剂瓶标签批号模糊，登记台账上相近批号为REA-KSCN-2026-017，但无法确认是否为同一瓶"
            }
        ],
        anomalies: [
            {
                level: "yellow",
                title: "平行样第2组数据异常偏高",
                description: "三次平行试验中，第2组测定值2.48%与第1组2.17%、第3组2.16%偏差超过14%，RSD高达8.31%，远超允许限。怀疑第2组滴定终点判断滞后或溶液中有其他氧化性杂质干扰。",
                source: "原始数据行15，第2平行试验列，该格有涂改痕迹（原数字疑似15.77被改为17.67）"
            },
            {
                level: "yellow",
                title: "滴定曲线存在波动",
                description: "谱图判读：在15mL附近曲线出现一个小平台，可能是Cu²⁺未被完全还原或Fe³⁺掩蔽不彻底。正常情况下碘量法测铜曲线应在14~16mL处出现单一突跃。",
                source: "谱图自动判读：15.3mL处出现次级拐点"
            },
            {
                level: "yellow",
                title: "KSCN试剂批号存疑",
                description: "学生取用的硫氰酸钾试剂瓶标签褪色，批号无法准确辨识，与登记台账中REA-KSCN-2026-017无法完全对应。建议化学老师核对试剂库存。",
                source: "试剂台账第62页第17行与实物照片比对"
            }
        ],
        chartAnnotations: [
            { color: "yellow", text: "异常平台：15.0~15.5 mL 曲线不单调下降，疑似干扰反应" },
            { color: "blue", text: "正常终点（第1/3组）：约 15.4 mL" },
            { color: "yellow", text: "第2组判定终点：17.67 mL，与正常终点偏差 2.2 mL" }
        ],
        narrative: "铜矿石中铜含量测定采用碘量法（GB/T 3884.1-2012）。学生李华完成的三次平行试验结果差异显著：第1组2.17%、第3组2.16%基本一致，但第2组2.48%明显偏高，整体RSD 8.31%不符合分析要求。平均品位2.48%与理论品位2.15%偏差+0.33%，若剔除第2组异常值后平均值2.165%则与理论值吻合。滴定曲线在15mL附近出现异常平台，提示可能存在Fe³⁺未被完全掩蔽或Cu²⁺还原不完全。此外，KSCN试剂批号无法准确辨认，也是潜在误差来源。综合判定：原始数据需化学老师复核，建议重测第2组或由老师确认KSCN试剂来源后再决定是否采信。"
    },
    {
        id: "REC-2026-003",
        originalRow: 23,
        batchNo: "MN-20260610-C",
        duplicateBatchWith: "REC-2026-003B",
        oreId: "锰矿石-Mn-009",
        experimentDate: "2026-06-10",
        studentName: "王大力",
        studentGroup: "分析化学A组",
        measuredGrade: null,
        theoreticalGrade: 32.80,
        deviation: null,
        deviationStatus: "reject",
        status: "reject",
        statusText: "异常/坏数据",
        imageName: "滴定曲线_Mn-009_王大力_20260610_损坏.png",
        sourceNote: "《分析化学实验记录本》第12册，第23行，第58页；原始数据多处缺失；该批号MN-20260610-C与第24行重复",
        titrationData: {
            method: "硫酸亚铁铵滴定法（GB/T 1506-2002）",
            indicator: "二苯胺磺酸钠",
            titrantName: "(NH₄)₂Fe(SO₄)₂ 标准溶液",
            titrantConcentration: null,
            titrantConcentrationUnit: "mol/L",
            buretteInitial: null,
            buretteFinal: null,
            titrantVolume: null,
            sampleWeight: 0.2000,
            parallelTests: [
                { testNo: 1, volume: null, grade: null },
                { testNo: 2, volume: 31.25, grade: null },
                { testNo: 3, volume: null, grade: null }
            ],
            rsd: null,
            curvePoints: generateBrokenCurve()
        },
        reagentLedger: [
            {
                name: "(NH₄)₂Fe(SO₄)₂ 标准溶液",
                batchNo: "STD-FAS-2026-005",
                concInLedger: 0.04000,
                concUsed: null,
                expiryDate: "2026-06-01",
                match: false,
                status: "fail",
                remark: "标准溶液已过期9天（有效期至2026-06-01），学生使用的是过期试剂"
            },
            {
                name: "H₃PO₄ 磷酸",
                batchNo: "REA-H3PO4-2026-033",
                inLedger: true,
                status: "ok",
                remark: ""
            },
            {
                name: "AgNO₃ 硝酸银（催化剂）",
                batchNo: null,
                inLedger: false,
                status: "fail",
                remark: "未登记！学生自行取用了存放于角落的未入库试剂"
            }
        ],
        anomalies: [
            {
                level: "red",
                title: "严重数据缺失",
                description: "三次平行试验中仅第2组有滴定体积记录（31.25mL），其余两组空白。标准溶液浓度未填写，滴定管初读数、终读数均缺失，无法计算品位。",
                source: "原始数据行23，浓度列、第1/3平行试验列为空"
            },
            {
                level: "red",
                title: "滴定曲线完全损坏",
                description: "谱图数据杂乱无章，无清晰突跃点，多处出现突变跳变，疑似滴定过程中电极接触不良或仪器故障，也可能是数据采集时误操作。",
                source: "谱图自动判读：连续3处跳变超过100mV，曲线相关系数R² < 0.5"
            },
            {
                level: "red",
                title: "标准溶液已过期",
                description: "(NH₄)₂Fe(SO₄)₂ 标准溶液有效期至2026-06-01，学生在2026-06-10使用时已过期9天。亚铁离子在酸性溶液中虽较稳定，但过期标准溶液浓度无法保证，所有数据不可采信。",
                source: "试剂台账第35页第5行，有效期标记与实验日期比对"
            },
            {
                level: "red",
                title: "使用未登记试剂",
                description: "AgNO₃催化剂来源不明，未在化学试剂登记台账中入库，属于学生私自取用，违反实验室安全管理规定。",
                source: "试剂台账全库检索，无对应批号记录"
            },
            {
                level: "red",
                title: "批号重复冲突",
                description: "批号MN-20260610-C同时出现在第23行（王大力）和第24行（另一位学生），存在重复登记或样品混淆风险，两条记录需一起核查。",
                source: "原始数据第23行与第24行批号比对"
            }
        ],
        chartAnnotations: [
            { color: "red", text: "异常跳变①：第12数据点突变 +120mV" },
            { color: "red", text: "异常跳变②：第28数据点突变 -95mV" },
            { color: "red", text: "异常跳变③：第41数据点突变 +150mV" },
            { color: "red", text: "无法识别滴定突跃，曲线判定为损坏" }
        ],
        narrative: "本组锰矿石全锰含量测定数据因多重严重问题，判定为坏数据，不可采信。主要问题：①数据严重缺失，三次平行试验仅一组有体积记录，标准溶液浓度未填写，无法进行定量计算；②滴定曲线出现多处剧烈跳变，无有效突跃点，表明仪器或操作存在重大故障；③所用硫酸亚铁铵标准溶液已过期9天，浓度无法保证；④使用了未入库登记的AgNO₃试剂，违反实验室管理规定；⑤该样品批号MN-20260610-C与第24行另一位学生的记录重复，存在样品混淆可能性。综合以上情况，该组实验需全部重新进行，且学生应接受标准溶液使用和试剂取用规范的再培训。"
    }
];

function generateSmoothCurve(eqVolume) {
    const points = [];
    const startV = Math.max(0, eqVolume - 5);
    const endV = eqVolume + 5;
    const step = (endV - startV) / 50;
    for (let i = 0; i <= 50; i++) {
        const v = startV + step * i;
        let e;
        const dist = v - eqVolume;
        if (dist < -0.5) {
            e = 200 + Math.random() * 10 - dist * 30;
        } else if (dist > 0.5) {
            e = 700 + (dist - 0.5) * 40 + Math.random() * 10;
        } else {
            const ratio = (dist + 0.5);
            e = 250 + ratio * 450 + Math.sin(ratio * Math.PI) * 50 + Math.random() * 5;
        }
        points.push({ volume: parseFloat(v.toFixed(2)), potential: parseFloat(e.toFixed(1)) });
    }
    return points;
}

function generateNoisyCurve(eqVolume, altEq) {
    const points = [];
    const startV = Math.max(0, eqVolume - 8);
    const endV = eqVolume + 5;
    const step = (endV - startV) / 55;
    for (let i = 0; i <= 55; i++) {
        const v = startV + step * i;
        let e;
        const dist = v - eqVolume;
        const dist2 = v - altEq;
        if (dist < -0.8) {
            e = 180 + Math.random() * 25;
            if (Math.abs(dist2) < 0.6) {
                e += 40 + Math.random() * 20;
            }
        } else if (dist > 0.8) {
            e = 720 + (dist - 0.8) * 35 + Math.random() * 15;
        } else {
            const ratio = (dist + 0.8) / 1.6;
            e = 200 + ratio * 520 + Math.random() * 30;
        }
        points.push({ volume: parseFloat(v.toFixed(2)), potential: parseFloat(e.toFixed(1)) });
    }
    return points;
}

function generateBrokenCurve() {
    const points = [];
    let e = 250;
    for (let i = 0; i <= 50; i++) {
        const v = (i * 0.8).toFixed(2);
        if (i === 12) e += 120;
        if (i === 28) e -= 95;
        if (i === 41) e += 150;
        e += (Math.random() - 0.5) * 60;
        points.push({ volume: parseFloat(v), potential: parseFloat(e.toFixed(1)) });
    }
    return points;
}
