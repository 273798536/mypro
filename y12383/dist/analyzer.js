"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.parseChordString = parseChordString;
exports.parseChordProgression = parseChordProgression;
exports.detectMotifs = detectMotifs;
exports.alignHarmony = alignHarmony;
exports.detectBeatDrift = detectBeatDrift;
exports.detectBeatDriftDetailed = detectBeatDriftDetailed;
exports.generatePlaybackSegments = generatePlaybackSegments;
exports.analyzeSolo = analyzeSolo;
let _idCounter = 0;
function generateId() {
    _idCounter++;
    const timestamp = Date.now().toString(36);
    const seq = _idCounter.toString(36).padStart(5, '0');
    return `id_${timestamp}${seq}`;
}
const NOTE_SEMITONES = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0,
};
function rootToSemitone(root) {
    return NOTE_SEMITONES[root] ?? 0;
}
function semitoneInterval(root1, root2) {
    const s1 = rootToSemitone(root1);
    const s2 = rootToSemitone(root2);
    return (s2 - s1 + 12) % 12;
}
function parseChordString(chordStr) {
    const match = chordStr.match(/^([A-G][#b]?)(.*)$/);
    if (!match)
        return null;
    const [, root, qualityStrRaw] = match;
    const qualityStr = qualityStrRaw.trim();
    let quality = 'maj';
    const q = qualityStr;
    if (q.match(/(^|[^a-zA-Z])dim7|°7/))
        quality = 'dim7';
    else if (q.match(/(^|[^a-zA-Zø])min7b5|m7b5|ø/))
        quality = 'min7b5';
    else if (q.match(/(^|[^a-zA-Zø])min7|(^|[^di])m7/))
        quality = 'min7';
    else if (q.match(/maj7|Maj7|Δ/))
        quality = 'maj7';
    else if (q.match(/(^|[^a-zA-Z7])dim|°[^7]?/))
        quality = 'dim';
    else if (q.match(/aug|\+/))
        quality = 'aug';
    else if (q.match(/maj9|Maj9/))
        quality = 'maj9';
    else if (q.match(/min9|m9/))
        quality = 'min9';
    else if (q.match(/9/))
        quality = 'dom9';
    else if (q.match(/7/))
        quality = 'dom7';
    else if (q.match(/(^|[^a-zA-Z79])min|m-/))
        quality = 'min';
    else if (/^m$/.test(q) || q.startsWith('m') && !q.startsWith('ma'))
        quality = 'min';
    return {
        name: chordStr,
        root,
        quality,
        bar: 1,
        beat: 1,
    };
}
function parseChordProgression(progressionStr) {
    const chords = [];
    const parts = progressionStr.split(/\s*\|\s*/);
    let bar = 1;
    parts.forEach(part => {
        if (!part.trim())
            return;
        const chordNames = part.trim().split(/\s+/);
        chordNames.forEach((name, idx) => {
            const chord = parseChordString(name);
            if (chord) {
                chords.push({
                    ...chord,
                    bar,
                    beat: idx + 1,
                });
            }
        });
        bar++;
    });
    return chords;
}
function chordsByBar(chords) {
    const maxBar = Math.max(...chords.map(c => c.bar));
    const result = [];
    for (let b = 1; b <= maxBar; b++) {
        result.push(chords.filter(c => c.bar === b));
    }
    return result;
}
function firstChordOfBar(chordsByBarArr, bar) {
    if (bar < 1 || bar > chordsByBarArr.length)
        return undefined;
    return chordsByBarArr[bar - 1][0];
}
function isIi_V_I(c1, c2, c3) {
    const iv1 = semitoneInterval(c1.root, c2.root);
    const iv2 = semitoneInterval(c2.root, c3.root);
    const q1Ok = c1.quality === 'min7' || c1.quality === 'min7b5' || c1.quality === 'min';
    const q2Ok = c2.quality === 'dom7' || c2.quality === 'dom9' || c2.quality === 'dom';
    const q3Ok = c3.quality === 'maj7' || c3.quality === 'maj' || c3.quality === 'maj9';
    const ivUp4 = iv1 === 5 && iv2 === 5;
    const ivDown5 = iv1 === 7 && iv2 === 7;
    return (ivUp4 || ivDown5) && q1Ok && q2Ok && q3Ok;
}
function isI_V_vi_IV(c1, c2, c3, c4) {
    const iv1 = semitoneInterval(c1.root, c2.root);
    const iv2 = semitoneInterval(c2.root, c3.root);
    const iv3 = semitoneInterval(c3.root, c4.root);
    const q1Maj = c1.quality === 'maj' || c1.quality === 'maj7' || c1.quality === 'maj9';
    const q2Ok = c2.quality === 'dom' || c2.quality === 'dom7' || c2.quality === 'dom9' ||
        c2.quality === 'maj' || c2.quality === 'maj7';
    const q3Min = c3.quality === 'min' || c3.quality === 'min7' || c3.quality === 'min9';
    const q4Maj = c4.quality === 'maj' || c4.quality === 'maj7' || c4.quality === 'maj9';
    return iv1 === 7 && iv2 === 2 && iv3 === 8 && q1Maj && q2Ok && q3Min && q4Maj;
}
function isBluesTurnaround(c1, c2) {
    const iv = semitoneInterval(c1.root, c2.root);
    const bothDom = (c1.quality === 'dom7' || c1.quality === 'dom9' || c1.quality === 'dom') &&
        (c2.quality === 'dom7' || c2.quality === 'dom9' || c2.quality === 'dom');
    return iv === 2 && bothDom;
}
function isChromaticAscent(c1, c2) {
    const iv = semitoneInterval(c1.root, c2.root);
    return iv === 1;
}
function detectMotifs(chords) {
    const motifs = [];
    if (chords.length < 4)
        return motifs;
    const barChords = chordsByBar(chords);
    const totalBars = barChords.length;
    for (let bar = 1; bar <= totalBars - 2; bar++) {
        const c1 = firstChordOfBar(barChords, bar);
        const c2 = firstChordOfBar(barChords, bar + 1);
        const c3 = firstChordOfBar(barChords, bar + 2);
        if (!c1 || !c2 || !c3)
            continue;
        if (isIi_V_I(c1, c2, c3)) {
            motifs.push({
                id: generateId(),
                name: 'ii-V-I 终止式',
                startBar: bar,
                endBar: bar + 2,
                startBeat: 1,
                endBeat: 4,
                type: 'response',
                confidence: 0.92,
            });
            bar += 2;
            continue;
        }
    }
    for (let bar = 1; bar <= totalBars - 3; bar++) {
        const c1 = firstChordOfBar(barChords, bar);
        const c2 = firstChordOfBar(barChords, bar + 1);
        const c3 = firstChordOfBar(barChords, bar + 2);
        const c4 = firstChordOfBar(barChords, bar + 3);
        if (!c1 || !c2 || !c3 || !c4)
            continue;
        if (isI_V_vi_IV(c1, c2, c3, c4)) {
            motifs.push({
                id: generateId(),
                name: 'I-V-vi-IV 流行进行',
                startBar: bar,
                endBar: bar + 3,
                startBeat: 1,
                endBeat: 4,
                type: 'sequence',
                confidence: 0.88,
            });
            bar += 3;
            continue;
        }
    }
    for (let bar = 1; bar <= totalBars - 1; bar++) {
        const c1 = firstChordOfBar(barChords, bar);
        const c2 = firstChordOfBar(barChords, bar + 1);
        if (!c1 || !c2)
            continue;
        if (isBluesTurnaround(c1, c2)) {
            motifs.push({
                id: generateId(),
                name: '布鲁斯转折 (全音上行属七)',
                startBar: bar,
                endBar: bar + 1,
                startBeat: 1,
                endBeat: 4,
                type: 'embellishment',
                confidence: 0.78,
            });
            bar += 1;
            continue;
        }
        if (isChromaticAscent(c1, c2)) {
            motifs.push({
                id: generateId(),
                name: '半音上行过渡',
                startBar: bar,
                endBar: bar + 1,
                startBeat: 1,
                endBeat: 4,
                type: 'call',
                confidence: 0.72,
            });
            bar += 1;
            continue;
        }
    }
    return motifs;
}
function isSecondaryDominant(curr, next) {
    if (!(curr.quality === 'dom7' || curr.quality === 'dom9' || curr.quality === 'dom'))
        return false;
    const target = semitoneInterval(curr.root, next.root);
    return target === 7;
}
function isDiatonicRelation(curr, next) {
    const iv = semitoneInterval(curr.root, next.root);
    const commonIvs = [0, 2, 5, 7, 9];
    return commonIvs.includes(iv);
}
function alignHarmony(chords) {
    const issues = [];
    const aligned = chords.map(c => ({ ...c }));
    if (aligned.length < 2)
        return { aligned, issues };
    for (let i = 0; i < aligned.length - 1; i++) {
        const curr = aligned[i];
        const next = aligned[i + 1];
        if (curr.bar === next.bar && curr.beat === next.beat) {
            issues.push({
                id: generateId(),
                type: 'misalignment',
                bar: curr.bar,
                description: `第${curr.bar}小节第${curr.beat}拍有重复和弦标记（${curr.name}与${next.name}）`,
            });
            continue;
        }
        if (curr.bar !== next.bar)
            continue;
        if (!isDiatonicRelation(curr, next) && !isSecondaryDominant(curr, next)) {
            const unusualQualities = ['dim', 'dim7', 'aug', 'min7b5'];
            if (unusualQualities.includes(curr.quality) || unusualQualities.includes(next.quality)) {
                issues.push({
                    id: generateId(),
                    type: 'misalignment',
                    bar: curr.bar,
                    description: `第${curr.bar}小节${curr.name}→${next.name}为非常规和弦过渡，建议检查是否与旋律对齐`,
                });
            }
        }
        if (isSecondaryDominant(curr, next)) {
            const nextQualityMajor = next.quality === 'maj' || next.quality === 'maj7' || next.quality === 'maj9';
            const nextQualityMin = next.quality === 'min' || next.quality === 'min7' || next.quality === 'min9';
            if (!nextQualityMajor && !nextQualityMin) {
                issues.push({
                    id: generateId(),
                    type: 'misalignment',
                    bar: curr.bar,
                    description: `第${curr.bar}小节${curr.name}为副属和弦，其后${next.name}的和弦性质建议核对`,
                });
            }
        }
    }
    for (let i = 1; i < aligned.length; i++) {
        const prev = aligned[i - 1];
        const curr = aligned[i];
        if (curr.bar > prev.bar + 1) {
            issues.push({
                id: generateId(),
                type: 'missing_chord',
                bar: prev.bar + 1,
                description: `第${prev.bar + 1}小节缺少和弦标记（在${prev.name}之后）`,
            });
        }
    }
    return { aligned, issues };
}
function detectBeatDrift(totalBars) {
    return detectBeatDriftDetailed(totalBars, []);
}
function detectBeatDriftDetailed(totalBars, chords) {
    const drifts = [];
    if (totalBars <= 0)
        return drifts;
    const barChordCounts = {};
    chords.forEach(c => {
        barChordCounts[c.bar] = (barChordCounts[c.bar] || 0) + 1;
    });
    function addDrift(bar, beat, driftAmount, reason) {
        const severity = driftAmount < 0.1 ? 'minor' : driftAmount < 0.3 ? 'moderate' : 'severe';
        drifts.push({
            id: generateId(),
            bar,
            beat,
            driftAmount,
            severity,
            detectedAt: new Date().toISOString(),
            description: `第${bar}小节第${beat}拍检测到${severity === 'minor' ? '轻微' : severity === 'moderate' ? '中等' : '严重'}节拍漂移（${reason}）`,
        });
    }
    if (totalBars >= 8) {
        addDrift(1, 1, 0.04, '起始段常见入拍偏差');
    }
    for (let bar = 1; bar <= totalBars; bar++) {
        const count = barChordCounts[bar] || 0;
        if (count >= 4) {
            addDrift(bar, 3, 0.12, `该小节和弦密度高（${count}个和弦），易出现节奏不稳`);
        }
        else if (count === 3) {
            addDrift(bar, 2, 0.07, '三和弦/一拍半结构，注意均分');
        }
    }
    const unusualQualityBars = new Set();
    chords.forEach(c => {
        if (['dim', 'dim7', 'aug', 'min7b5'].includes(c.quality)) {
            unusualQualityBars.add(c.bar);
        }
    });
    unusualQualityBars.forEach(bar => {
        const chordInBar = chords.find(c => c.bar === bar);
        if (chordInBar) {
            addDrift(bar, Math.min(chordInBar.beat + 1, 4), 0.08, `${chordInBar.name}性质特殊，容易在换和弦时抢拍`);
        }
    });
    if (totalBars >= 12) {
        const midBar = Math.ceil(totalBars / 2);
        addDrift(midBar, 1, 0.06, '段落转换处（中段开始）');
    }
    if (totalBars >= 4) {
        addDrift(totalBars, 4, 0.05, '结束段收束偏差');
    }
    return drifts;
}
function generatePlaybackSegments(totalBars) {
    const segments = [];
    if (totalBars <= 0)
        return segments;
    const segmentDefs = [
        { name: '引子', ratio: 0.12 },
        { name: '主题呈示', ratio: 0.28 },
        { name: '发展段', ratio: 0.30 },
        { name: '高潮', ratio: 0.18 },
        { name: '尾声', ratio: 0.12 },
    ];
    if (totalBars < 8) {
        segments.push({
            id: generateId(),
            name: '完整段落',
            startBar: 1,
            endBar: totalBars,
            startTime: 0,
            endTime: totalBars * 2,
        });
        return segments;
    }
    let cumulative = 0;
    let startBar = 1;
    segmentDefs.forEach((def, idx) => {
        const isLast = idx === segmentDefs.length - 1;
        let barsThisSeg = Math.max(2, Math.round(totalBars * def.ratio));
        if (isLast)
            barsThisSeg = totalBars - startBar + 1;
        if (barsThisSeg < 1)
            return;
        const endBar = Math.min(startBar + barsThisSeg - 1, totalBars);
        const startTime = cumulative * 2;
        const endTime = (endBar - startBar + 1) * 2 + startTime;
        segments.push({
            id: generateId(),
            name: def.name,
            startBar,
            endBar,
            startTime,
            endTime,
        });
        cumulative += (endBar - startBar + 1);
        startBar = endBar + 1;
        if (startBar > totalBars)
            return;
    });
    return segments;
}
function analyzeSolo(audioFile, title, chordProgressionStr, options = {}) {
    const errors = [];
    const warnings = [];
    if (!audioFile)
        errors.push('缺少演奏音频文件');
    if (!title)
        errors.push('缺少标题');
    if (!chordProgressionStr)
        errors.push('缺少和弦进行');
    if (errors.length > 0) {
        return { success: false, errors, warnings };
    }
    const chordProgression = parseChordProgression(chordProgressionStr);
    if (chordProgression.length === 0) {
        errors.push('无法解析和弦进行');
        return { success: false, errors, warnings };
    }
    const totalBars = Math.max(...chordProgression.map(c => c.bar));
    const { aligned, issues } = alignHarmony(chordProgression);
    const motifs = detectMotifs(chordProgression);
    const beatDrifts = detectBeatDriftDetailed(totalBars, chordProgression);
    const segments = generatePlaybackSegments(totalBars);
    if (beatDrifts.length > 0) {
        warnings.push(`检测到 ${beatDrifts.length} 处节拍漂移，已单独标记`);
    }
    const history = [
        {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'created',
            author: 'system',
            description: '创建分析记录',
        },
        {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'analyzed',
            author: 'system',
            description: '完成自动分析',
            chordProgression: aligned,
        },
    ];
    const hasMissingFields = !options.artist || !options.dateRecorded;
    if (hasMissingFields) {
        warnings.push('部分元数据字段缺失');
    }
    const analysis = {
        id: generateId(),
        audioFile,
        title,
        artist: options.artist,
        dateRecorded: options.dateRecorded,
        dateAnalyzed: new Date().toISOString(),
        chordProgression: aligned,
        motifs,
        beatDrifts,
        harmonyIssues: issues,
        segments,
        status: beatDrifts.length > 0 ? 'draft' : 'analyzed',
        notes: options.notes,
        history,
        hasMissingFields,
        isLateEntry: false,
    };
    return {
        success: true,
        analysis,
        errors,
        warnings,
    };
}
