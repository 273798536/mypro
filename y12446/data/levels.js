const LEVELS = [
    {
        id: 1,
        name: "初入剧场",
        description: "学习基础调音，处理简单的啸叫问题",
        timeLimit: 90,
        sources: [
            { id: 's1', name: '主唱', x: 400, y: 150, type: 'vocal', volume: 80 },
            { id: 's2', name: '吉他手', x: 250, y: 200, type: 'guitar', volume: 70 }
        ],
        initialMics: [
            { id: 'm1', name: '主唱麦', x: 400, y: 180, angle: 180, gain: 60 }
        ],
        obstacles: [
            { x: 300, y: 300, width: 80, height: 60, name: '音箱' }
        ],
        targetCoverage: 70,
        problems: [
            { type: 'howling', trigger: { micGain: 75, sourceVolume: 85, distance: 30 }, hint: '降低麦克风增益或主唱音量' }
        ],
        initialSettings: {
            volume: 75,
            reverb: 40,
            delay: 25,
            eqHigh: 10,
            eqLow: 5,
            feedbackAperture: 5
        }
    },
    {
        id: 2,
        name: "混响迷宫",
        description: "处理剧场混响问题，优化声场覆盖",
        timeLimit: 120,
        sources: [
            { id: 's1', name: '主唱', x: 400, y: 120, type: 'vocal', volume: 85 },
            { id: 's2', name: '吉他手', x: 200, y: 180, type: 'guitar', volume: 75 },
            { id: 's3', name: '鼓手', x: 600, y: 180, type: 'drums', volume: 90 }
        ],
        initialMics: [
            { id: 'm1', name: '主唱麦', x: 400, y: 150, angle: 180, gain: 65 },
            { id: 'm2', name: '鼓组麦', x: 600, y: 210, angle: 180, gain: 70 }
        ],
        obstacles: [
            { x: 150, y: 280, width: 100, height: 80, name: '左侧音箱' },
            { x: 550, y: 280, width: 100, height: 80, name: '右侧音箱' },
            { x: 350, y: 350, width: 100, height: 60, name: '调音台' }
        ],
        targetCoverage: 80,
        problems: [
            { type: 'howling', trigger: { micGain: 80, sourceVolume: 90, distance: 25 }, hint: '注意鼓组麦与鼓声源的距离' },
            { type: 'reverb', trigger: { reverb: 60, roomSize: 80 }, hint: '混响过长会导致声音浑浊' },
            { type: 'occlusion', trigger: { obstacle: '左侧音箱', mic: 'm1' }, hint: '调整麦克风位置避开遮挡' }
        ],
        initialSettings: {
            volume: 80,
            reverb: 65,
            delay: 30,
            eqHigh: 15,
            eqLow: 10,
            feedbackAperture: 5
        }
    },
    {
        id: 3,
        name: "完美声场",
        description: "综合挑战，达到完美声场覆盖",
        timeLimit: 150,
        sources: [
            { id: 's1', name: '主唱', x: 400, y: 100, type: 'vocal', volume: 85 },
            { id: 's2', name: '和声1', x: 280, y: 140, type: 'vocal', volume: 70 },
            { id: 's3', name: '和声2', x: 520, y: 140, type: 'vocal', volume: 70 },
            { id: 's4', name: '吉他', x: 180, y: 200, type: 'guitar', volume: 75 },
            { id: 's5', name: '键盘', x: 620, y: 200, type: 'keyboard', volume: 72 },
            { id: 's6', name: '鼓手', x: 400, y: 260, type: 'drums', volume: 88 }
        ],
        initialMics: [
            { id: 'm1', name: '主唱麦', x: 400, y: 130, angle: 180, gain: 65 }
        ],
        obstacles: [
            { x: 120, y: 320, width: 120, height: 90, name: '左侧阵列' },
            { x: 560, y: 320, width: 120, height: 90, name: '右侧阵列' },
            { x: 340, y: 380, width: 120, height: 70, name: '监听台' },
            { x: 250, y: 300, width: 60, height: 50, name: '返送音箱' },
            { x: 490, y: 300, width: 60, height: 50, name: '返送音箱' }
        ],
        targetCoverage: 90,
        problems: [
            { type: 'howling', trigger: { micGain: 75, eqHigh: 25, distance: 20 }, hint: '高频过多容易引发啸叫' },
            { type: 'reverb', trigger: { reverb: 55, delay: 45 }, hint: '混响和延迟需要平衡' },
            { type: 'occlusion', trigger: { obstacle: '返送音箱', mic: 'm1' }, hint: '返送音箱可能遮挡主唱麦' },
            { type: 'occlusion', trigger: { obstacle: '左侧阵列', mic: 'm2' }, hint: '注意麦克风与障碍物的位置关系' }
        ],
        initialSettings: {
            volume: 78,
            reverb: 58,
            delay: 42,
            eqHigh: 22,
            eqLow: 8,
            feedbackAperture: 5
        }
    }
];
