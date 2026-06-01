class ReplaySystem {
    constructor() {
        this.history = [];
        this.currentSession = null;
        this.snapshots = [];
    }

    startSession(levelId, levelName) {
        this.currentSession = {
            sessionId: Date.now(),
            levelId,
            levelName,
            startTime: new Date().toISOString(),
            endTime: null,
            initialState: null,
            finalState: null,
            problemHistory: [],
            snapshots: [],
            score: null,
            passed: false
        };
        this.snapshots = [];
    }

    recordInitialState(state) {
        if (this.currentSession) {
            this.currentSession.initialState = JSON.parse(JSON.stringify(state));
        }
    }

    recordSnapshot(state, problems, action = '') {
        const snapshot = {
            timestamp: new Date().toISOString(),
            action,
            settings: JSON.parse(JSON.stringify(state.settings)),
            mics: JSON.parse(JSON.stringify(state.mics)),
            problems: this.serializeProblems(problems),
            coverage: state.coverage ? JSON.parse(JSON.stringify(state.coverage)) : null
        };
        this.snapshots.push(snapshot);

        if (this.currentSession) {
            this.currentSession.snapshots.push(snapshot);
        }
    }

    recordProblemChange(problem, resolved) {
        if (this.currentSession) {
            this.currentSession.problemHistory.push({
                timestamp: new Date().toISOString(),
                problemId: problem.id,
                problemType: problem.type,
                title: problem.title,
                resolved,
                originalValues: JSON.parse(JSON.stringify(problem.originalValues)),
                currentValues: JSON.parse(JSON.stringify(problem.currentValues))
            });
        }
    }

    serializeProblems(problems) {
        return problems.map(p => ({
            id: p.id,
            type: p.type,
            title: p.title,
            description: p.description,
            resolved: p.resolved,
            isWarning: p.isWarning || false,
            originalValues: JSON.parse(JSON.stringify(p.originalValues)),
            currentValues: JSON.parse(JSON.stringify(p.currentValues)),
            riskLevel: p.riskLevel,
            riskScore: p.riskScore
        }));
    }

    endSession(finalState, score, passed) {
        if (this.currentSession) {
            this.currentSession.endTime = new Date().toISOString();
            this.currentSession.finalState = JSON.parse(JSON.stringify(finalState));
            this.currentSession.score = score;
            this.currentSession.passed = passed;
            this.history.push(JSON.parse(JSON.stringify(this.currentSession)));
        }
        return this.currentSession;
    }

    calculateScore(session, level) {
        const score = {
            total: 0,
            breakdown: [],
            coverageScore: 0,
            problemScore: 0,
            efficiencyScore: 0,
            feedbackScore: 0
        };

        const coverage = session.finalState.coverage;
        if (coverage) {
            const coveragePercent = coverage.percentage;
            const targetCoverage = level.targetCoverage;
            let coverageScore = 0;
            
            if (coveragePercent >= targetCoverage) {
                coverageScore = 40;
            } else {
                coverageScore = Math.floor((coveragePercent / targetCoverage) * 40);
            }
            score.coverageScore = Math.max(0, Math.min(40, coverageScore));
            score.breakdown.push({ name: '声场覆盖', score: score.coverageScore, max: 40 });
        }

        const allProblems = session.problemHistory;
        const uniqueProblems = new Map();
        for (const p of allProblems) {
            if (!uniqueProblems.has(p.problemId)) {
                uniqueProblems.set(p.problemId, p);
            }
            if (p.resolved) {
                uniqueProblems.set(p.problemId, p);
            }
        }

        let problemScore = 30;
        const unresolvedProblems = Array.from(uniqueProblems.values()).filter(p => !p.resolved && !p.isWarning);
        const unresolvedWarnings = Array.from(uniqueProblems.values()).filter(p => !p.resolved && p.isWarning);

        problemScore -= unresolvedProblems.length * 10;
        problemScore -= unresolvedWarnings.length * 5;
        score.problemScore = Math.max(0, Math.min(30, problemScore));
        score.breakdown.push({ name: '问题处理', score: score.problemScore, max: 30 });

        if (session.startTime && session.endTime) {
            const duration = (new Date(session.endTime) - new Date(session.startTime)) / 1000;
            const timeLimit = level.timeLimit;
            let efficiencyScore = 15;

            if (duration < timeLimit * 0.5) {
                efficiencyScore = 15;
            } else if (duration < timeLimit * 0.75) {
                efficiencyScore = 12;
            } else if (duration < timeLimit) {
                efficiencyScore = 8;
            } else {
                efficiencyScore = 0;
            }
            score.efficiencyScore = efficiencyScore;
            score.breakdown.push({ name: '效率', score: score.efficiencyScore, max: 15 });
        }

        const finalSettings = session.finalState.settings;
        const initialSettings = session.initialState.settings;
        const apertureChanges = Math.abs(finalSettings.feedbackAperture - initialSettings.feedbackAperture);
        const settingsStability = 15 - apertureChanges;
        score.feedbackScore = Math.max(0, Math.min(15, settingsStability));
        score.breakdown.push({ name: '反馈调节', score: score.feedbackScore, max: 15 });

        score.total = score.coverageScore + score.problemScore + score.efficiencyScore + score.feedbackScore;
        score.breakdown.push({ name: '总分', score: score.total, max: 100 });

        return score;
    }

    generateReplayReport(session, level, score) {
        const report = {
            sessionId: session.sessionId,
            level: session.levelName,
            levelId: session.levelId,
            duration: this.calculateDuration(session),
            startTime: session.startTime,
            endTime: session.endTime,
            score,
            passed: score.total >= 60,
            targetCoverage: level.targetCoverage,
            finalCoverage: session.finalState.coverage?.percentage || 0,
            feedbackAnalysis: this.analyzeFeedbackImpact(session),
            problemSummary: this.summarizeProblems(session),
            valueComparisons: this.compareValues(session),
            timeline: this.generateTimeline(session)
        };
        return report;
    }

    calculateDuration(session) {
        if (!session.startTime || !session.endTime) return 'N/A';
        const seconds = Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}分${secs}秒`;
    }

    analyzeFeedbackImpact(session) {
        const impacts = [];
        const snapshots = session.snapshots;

        for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i - 1];
            const curr = snapshots[i];
            
            if (prev.settings.feedbackAperture !== curr.settings.feedbackAperture) {
                const prevProblems = prev.problems.filter(p => p.type === 'howling').length;
                const currProblems = curr.problems.filter(p => p.type === 'howling').length;
                const problemChange = currProblems - prevProblems;

                impacts.push({
                    timestamp: curr.timestamp,
                    oldAperture: prev.settings.feedbackAperture,
                    newAperture: curr.settings.feedbackAperture,
                    howlingProblemsChange: problemChange,
                    coverageChange: curr.coverage && prev.coverage ? 
                        (curr.coverage.percentage - prev.coverage.percentage).toFixed(1) : null,
                    improved: problemChange < 0
                });
            }
        }

        return impacts;
    }

    summarizeProblems(session) {
        const problemTypes = {
            howling: { total: 0, resolved: 0 },
            reverb: { total: 0, resolved: 0 },
            occlusion: { total: 0, resolved: 0 },
            warning: { total: 0, resolved: 0 }
        };

        const seen = new Set();
        for (const p of session.problemHistory) {
            const type = p.isWarning ? 'warning' : p.problemType;
            if (!seen.has(p.problemId)) {
                problemTypes[type].total++;
                seen.add(p.problemId);
            }
            if (p.resolved) {
                problemTypes[type].resolved++;
            }
        }

        return problemTypes;
    }

    compareValues(session) {
        const comparisons = [];
        const initial = session.initialState;
        const final = session.finalState;

        const settingNames = {
            volume: '主音量',
            reverb: '混响',
            delay: '延迟',
            eqHigh: '高频均衡',
            eqLow: '低频均衡',
            feedbackAperture: '反馈灯口径'
        };

        for (const key of Object.keys(settingNames)) {
            if (initial.settings[key] !== final.settings[key]) {
                comparisons.push({
                    name: settingNames[key],
                    original: initial.settings[key],
                    current: final.settings[key],
                    changed: true
                });
            } else {
                comparisons.push({
                    name: settingNames[key],
                    original: initial.settings[key],
                    current: final.settings[key],
                    changed: false
                });
            }
        }

        const micChanges = [];
        for (const initialMic of initial.mics) {
            const finalMic = final.mics.find(m => m.id === initialMic.id);
            if (finalMic) {
                const changed = initialMic.x !== finalMic.x || 
                               initialMic.y !== finalMic.y || 
                               initialMic.gain !== finalMic.gain;
                if (changed) {
                    micChanges.push({
                        name: initialMic.name,
                        original: { x: initialMic.x, y: initialMic.y, gain: initialMic.gain },
                        current: { x: finalMic.x, y: finalMic.y, gain: finalMic.gain }
                    });
                }
            }
        }

        const addedMics = final.mics.filter(m => !initial.mics.find(im => im.id === m.id));
        const removedMics = initial.mics.filter(m => !final.mics.find(fm => fm.id === m.id));

        return {
            settings: comparisons,
            micChanges,
            addedMics: addedMics.map(m => m.name),
            removedMics: removedMics.map(m => m.name)
        };
    }

    generateTimeline(session) {
        const events = [];

        events.push({
            time: '开始',
            type: 'start',
            description: `开始关卡：${session.levelName}`
        });

        for (const snapshot of session.snapshots) {
            if (snapshot.action) {
                const time = this.formatTimeDiff(session.startTime, snapshot.timestamp);
                events.push({
                    time,
                    type: 'action',
                    description: snapshot.action,
                    timestamp: snapshot.timestamp
                });
            }
        }

        for (const problemEvent of session.problemHistory) {
            const time = this.formatTimeDiff(session.startTime, problemEvent.timestamp);
            events.push({
                time,
                type: problemEvent.resolved ? 'problem_resolved' : 'problem_detected',
                description: `${problemEvent.resolved ? '解决' : '检测到'}：${problemEvent.title}`,
                problemId: problemEvent.problemId,
                originalValues: problemEvent.originalValues,
                currentValues: problemEvent.currentValues
            });
        }

        events.push({
            time: '结束',
            type: session.passed ? 'success' : 'fail',
            description: session.passed ? '调音成功！' : '调音失败',
            score: session.score
        });

        return events.sort((a, b) => {
            if (a.time === '开始') return -1;
            if (b.time === '开始') return 1;
            if (a.time === '结束') return 1;
            if (b.time === '结束') return -1;
            return 0;
        });
    }

    formatTimeDiff(startTime, currentTime) {
        const diff = (new Date(currentTime) - new Date(startTime)) / 1000;
        const mins = Math.floor(diff / 60);
        const secs = Math.floor(diff % 60);
        return `+${mins}:${secs.toString().padStart(2, '0')}`;
    }

    exportReport(report, format = 'json') {
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }

        if (format === 'text') {
            let text = '='.repeat(60) + '\n';
            text += '声学剧场调音战 - 复盘报告\n';
            text += '='.repeat(60) + '\n\n';
            
            text += `关卡: ${report.level} (ID: ${report.levelId})\n`;
            text += `时长: ${report.duration}\n`;
            text += `开始时间: ${new Date(report.startTime).toLocaleString()}\n`;
            text += `结束时间: ${new Date(report.endTime).toLocaleString()}\n`;
            text += `结果: ${report.passed ? '通过' : '未通过'}\n`;
            text += `总分: ${report.score.total}/100\n\n`;

            text += '-'.repeat(40) + '\n';
            text += '得分明细\n';
            text += '-'.repeat(40) + '\n';
            for (const item of report.score.breakdown) {
                text += `  ${item.name}: ${item.score}/${item.max}\n`;
            }
            text += '\n';

            text += '-'.repeat(40) + '\n';
            text += '覆盖评分\n';
            text += '-'.repeat(40) + '\n';
            text += `  目标覆盖率: ${report.targetCoverage}%\n`;
            text += `  最终覆盖率: ${report.finalCoverage.toFixed(1)}%\n`;
            text += `  达标: ${report.finalCoverage >= report.targetCoverage ? '是' : '否'}\n\n`;

            text += '-'.repeat(40) + '\n';
            text += '问题汇总\n';
            text += '-'.repeat(40) + '\n';
            const problemNames = {
                howling: '啸叫',
                reverb: '混响过长',
                occlusion: '座位遮挡',
                warning: '提示警告'
            };
            for (const [type, data] of Object.entries(report.problemSummary)) {
                if (data.total > 0) {
                    text += `  ${problemNames[type]}: ${data.resolved}/${data.total} 已解决\n`;
                }
            }
            text += '\n';

            text += '-'.repeat(40) + '\n';
            text += '参数对比（原始值 → 当前值）\n';
            text += '-'.repeat(40) + '\n';
            for (const comp of report.valueComparisons.settings) {
                const marker = comp.changed ? '*' : ' ';
                text += `  ${marker} ${comp.name}: ${comp.original} → ${comp.current}\n`;
            }
            text += '\n';

            if (report.valueComparisons.micChanges.length > 0) {
                text += '麦克风位置/增益变化:\n';
                for (const mic of report.valueComparisons.micChanges) {
                    text += `  - ${mic.name}:\n`;
                    text += `      位置: (${mic.original.x}, ${mic.original.y}) → (${mic.current.x}, ${mic.current.y})\n`;
                    text += `      增益: ${mic.original.gain} → ${mic.current.gain}\n`;
                }
                text += '\n';
            }

            if (report.valueComparisons.addedMics.length > 0) {
                text += `新增麦克风: ${report.valueComparisons.addedMics.join(', ')}\n`;
            }
            if (report.valueComparisons.removedMics.length > 0) {
                text += `移除麦克风: ${report.valueComparisons.removedMics.join(', ')}\n`;
            }
            text += '\n';

            if (report.feedbackAnalysis.length > 0) {
                text += '-'.repeat(40) + '\n';
                text += '反馈灯口径影响分析\n';
                text += '-'.repeat(40) + '\n';
                for (const impact of report.feedbackAnalysis) {
                    const change = impact.howlingProblemsChange;
                    const direction = change > 0 ? '+' : '';
                    text += `  ${impact.timestamp}: ${impact.oldAperture} → ${impact.newAperture}\n`;
                    text += `    啸叫问题变化: ${direction}${change}\n`;
                    if (impact.coverageChange !== null) {
                        const covChange = parseFloat(impact.coverageChange);
                        const covDir = covChange > 0 ? '+' : '';
                        text += `    覆盖率变化: ${covDir}${covChange}%\n`;
                    }
                }
                text += '\n';
            }

            text += '-'.repeat(40) + '\n';
            text += '事件时间线\n';
            text += '-'.repeat(40) + '\n';
            for (const event of report.timeline) {
                text += `  [${event.time}] ${event.description}\n`;
                if (event.originalValues && event.currentValues) {
                    text += `      原始值: ${JSON.stringify(event.originalValues)}\n`;
                    text += `      当前值: ${JSON.stringify(event.currentValues)}\n`;
                }
            }

            return text;
        }

        return null;
    }

    downloadReport(report, filename = null) {
        const textReport = this.exportReport(report, 'text');
        const jsonReport = this.exportReport(report, 'json');

        if (!filename) {
            const date = new Date().toISOString().slice(0, 10);
            filename = `调音复盘_${report.level}_${date}`;
        }

        const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { textReport, jsonReport };
    }

    getSessionHistory() {
        return this.history;
    }

    clearHistory() {
        this.history = [];
    }
}
