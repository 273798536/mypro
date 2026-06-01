class ProblemDetector {
    constructor(acousticModel) {
        this.acousticModel = acousticModel;
        this.detectedProblems = [];
    }

    detectAllProblems(sources, mics, obstacles, settings, levelProblems) {
        this.detectedProblems = [];

        this.detectHowling(sources, mics, settings);
        this.detectExcessiveReverb(settings);
        this.detectOcclusion(sources, mics, obstacles);
        this.detectMissingMic(sources, mics);

        return this.detectedProblems;
    }

    detectHowling(sources, mics, settings) {
        for (const source of sources) {
            for (const mic of mics) {
                const feedback = this.acousticModel.calculateFeedbackRisk(
                    mic, source, settings, settings.feedbackAperture
                );

                if (feedback.howlingLikely) {
                    const problem = {
                        id: `howling-${source.id}-${mic.id}`,
                        type: 'howling',
                        title: '啸叫警告',
                        description: `${mic.name} 与 ${source.name} 之间存在啸叫风险`,
                        source: source,
                        mic: mic,
                        riskLevel: feedback.level,
                        riskScore: feedback.risk,
                        originalValues: {
                            micGain: mic.gain,
                            sourceVolume: source.volume,
                            eqHigh: settings.eqHigh,
                            distance: this.acousticModel.calculateDistance(mic, source)
                        },
                        currentValues: {
                            micGain: mic.gain,
                            sourceVolume: source.volume,
                            eqHigh: settings.eqHigh,
                            distance: this.acousticModel.calculateDistance(mic, source)
                        },
                        resolutionHint: this.getHowlingHint(mic, source, settings),
                        resolved: false
                    };
                    this.detectedProblems.push(problem);
                }
            }
        }
    }

    detectExcessiveReverb(settings) {
        const reverbEffect = this.acousticModel.calculateReverbEffect(settings.reverb);
        
        if (reverbEffect.isExcessive) {
            const problem = {
                id: 'reverb-excessive',
                type: 'reverb',
                title: '混响过长',
                description: `当前混响时间 ${reverbEffect.reverbTime.toFixed(1)}s，超过推荐值 3s`,
                reverbData: reverbEffect,
                originalValues: {
                    reverb: settings.reverb,
                    delay: settings.delay,
                    reverbTime: reverbEffect.reverbTime
                },
                currentValues: {
                    reverb: settings.reverb,
                    delay: settings.delay,
                    reverbTime: reverbEffect.reverbTime
                },
                resolutionHint: this.getReverbHint(settings, reverbEffect),
                resolved: false
            };
            this.detectedProblems.push(problem);
        }
    }

    detectOcclusion(sources, mics, obstacles) {
        for (const source of sources) {
            for (const mic of mics) {
                const occlusion = this.acousticModel.checkOcclusion(source, mic, obstacles);
                
                if (occlusion.blocked) {
                    const problem = {
                        id: `occlusion-${source.id}-${mic.id}`,
                        type: 'occlusion',
                        title: '座位遮挡',
                        description: `${occlusion.obstacle.name} 遮挡了 ${source.name} 到 ${mic.name} 的声音路径`,
                        source: source,
                        mic: mic,
                        obstacle: occlusion.obstacle,
                        originalValues: {
                            micX: mic.x,
                            micY: mic.y,
                            sourceX: source.x,
                            sourceY: source.y,
                            obstacleName: occlusion.obstacle.name
                        },
                        currentValues: {
                            micX: mic.x,
                            micY: mic.y,
                            sourceX: source.x,
                            sourceY: source.y,
                            obstacleName: occlusion.obstacle.name
                        },
                        resolutionHint: this.getOcclusionHint(mic, source, occlusion.obstacle),
                        resolved: false
                    };
                    this.detectedProblems.push(problem);
                }
            }
        }
    }

    detectMissingMic(sources, mics) {
        if (mics.length === 0) {
            const problem = {
                id: 'no-mic',
                type: 'warning',
                title: '麦克风缺失',
                description: '当前没有可用的麦克风，无法拾取声音',
                originalValues: { micCount: 0 },
                currentValues: { micCount: 0 },
                resolutionHint: '请点击"添加麦克风"按钮，至少添加一个麦克风。建议在每个主要声源附近放置麦克风。',
                resolved: false,
                isWarning: true
            };
            this.detectedProblems.push(problem);
            return;
        }

        const vocalSources = sources.filter(s => s.type === 'vocal');
        const coverageMap = new Map();

        for (const source of vocalSources) {
            let hasCloseMic = false;
            for (const mic of mics) {
                const dist = this.acousticModel.calculateDistance(source, mic);
                if (dist < 100) {
                    hasCloseMic = true;
                    break;
                }
            }
            if (!hasCloseMic) {
                const problem = {
                    id: `missing-mic-${source.id}`,
                    type: 'warning',
                    title: '麦克风位置不当',
                    description: `${source.name} 附近没有足够近的麦克风，可能导致拾音效果差`,
                    source: source,
                    originalValues: { sourceName: source.name, micDistance: '> 100px' },
                    currentValues: { sourceName: source.name, micDistance: '> 100px' },
                    resolutionHint: `在 ${source.name} 附近（100像素内）添加或移动麦克风，以获得更好的拾音效果。`,
                    resolved: false,
                    isWarning: true
                };
                this.detectedProblems.push(problem);
            }
        }
    }

    getHowlingHint(mic, source, settings) {
        const hints = [];
        const distance = this.acousticModel.calculateDistance(mic, source);

        if (mic.gain > 70) {
            hints.push(`降低 ${mic.name} 增益（当前 ${mic.gain}，建议降至 70 以下）`);
        }
        if (source.volume > 80) {
            hints.push(`降低 ${source.name} 音量（当前 ${source.volume}，建议降至 80 以下）`);
        }
        if (settings.eqHigh > 15) {
            hints.push(`降低高频均衡（当前 ${settings.eqHigh}，建议降至 15 以下）`);
        }
        if (distance < 50) {
            hints.push(`增加麦克风与声源的距离（当前 ${distance.toFixed(0)}px，建议至少 50px）`);
        }
        if (settings.feedbackAperture < 5) {
            hints.push(`增大反馈灯口径（当前 ${settings.feedbackAperture}，增大可降低啸叫风险）`);
        }

        return hints.length > 0 ? hints.join('；') : '调整麦克风位置或降低增益';
    }

    getReverbHint(settings, reverbEffect) {
        const hints = [];

        if (settings.reverb > 60) {
            hints.push(`降低混响参数（当前 ${settings.reverb}，建议降至 60 以下）`);
        }
        if (settings.delay > 50) {
            hints.push(`降低延迟参数（当前 ${settings.delay}，与混响配合调节）`);
        }

        hints.push(`当前混响时间 ${reverbEffect.reverbTime.toFixed(1)}s，理想范围 1.5-2.5s`);

        return hints.join('；');
    }

    getOcclusionHint(mic, source, obstacle) {
        const hints = [];

        hints.push(`移动 ${mic.name}（当前位置 ${mic.x}, ${mic.y}）避开 ${obstacle.name}`);
        hints.push(`或者调整 ${source.name} 位置（当前 ${source.x}, ${source.y}）`);

        return hints.join('；');
    }

    checkProblemResolved(problem, sources, mics, obstacles, settings) {
        if (problem.type === 'howling') {
            const feedback = this.acousticModel.calculateFeedbackRisk(
                problem.mic, problem.source, settings, settings.feedbackAperture
            );
            return !feedback.howlingLikely;
        }

        if (problem.type === 'reverb') {
            const reverbEffect = this.acousticModel.calculateReverbEffect(settings.reverb);
            return !reverbEffect.isExcessive;
        }

        if (problem.type === 'occlusion') {
            const occlusion = this.acousticModel.checkOcclusion(
                problem.source, problem.mic, obstacles
            );
            return !occlusion.blocked;
        }

        if (problem.type === 'warning') {
            if (problem.id === 'no-mic') {
                return mics.length > 0;
            }
            if (problem.id.startsWith('missing-mic-')) {
                const source = sources.find(s => s.id === problem.source.id);
                if (!source) return true;
                for (const mic of mics) {
                    const dist = this.acousticModel.calculateDistance(source, mic);
                    if (dist < 100) return true;
                }
            }
        }

        return false;
    }

    updateProblemValues(problem, sources, mics, obstacles, settings) {
        if (problem.type === 'howling') {
            const mic = mics.find(m => m.id === problem.mic.id);
            const source = sources.find(s => s.id === problem.source.id);
            if (mic && source) {
                problem.currentValues = {
                    micGain: mic.gain,
                    sourceVolume: source.volume,
                    eqHigh: settings.eqHigh,
                    distance: this.acousticModel.calculateDistance(mic, source)
                };
            }
        }

        if (problem.type === 'reverb') {
            const reverbEffect = this.acousticModel.calculateReverbEffect(settings.reverb);
            problem.currentValues = {
                reverb: settings.reverb,
                delay: settings.delay,
                reverbTime: reverbEffect.reverbTime
            };
        }

        if (problem.type === 'occlusion') {
            const mic = mics.find(m => m.id === problem.mic.id);
            const source = sources.find(s => s.id === problem.source.id);
            if (mic && source) {
                problem.currentValues = {
                    micX: mic.x,
                    micY: mic.y,
                    sourceX: source.x,
                    sourceY: source.y,
                    obstacleName: problem.obstacle.name
                };
            }
        }

        if (problem.type === 'warning' && problem.id.startsWith('missing-mic-')) {
            const source = sources.find(s => s.id === problem.source.id);
            if (source) {
                let minDist = Infinity;
                for (const mic of mics) {
                    const dist = this.acousticModel.calculateDistance(source, mic);
                    minDist = Math.min(minDist, dist);
                }
                problem.currentValues = {
                    sourceName: source.name,
                    micDistance: minDist < 100 ? `${minDist.toFixed(0)}px` : '> 100px'
                };
            }
        }

        problem.resolved = this.checkProblemResolved(problem, sources, mics, obstacles, settings);
        return problem;
    }

    getOperationalSuggestions(problems) {
        const suggestions = [];
        const warnings = problems.filter(p => p.isWarning && !p.resolved);

        for (const warning of warnings) {
            if (warning.id === 'no-mic') {
                suggestions.push({
                    priority: 'critical',
                    action: '立即添加麦克风',
                    steps: [
                        '1. 点击控制面板中的"添加麦克风"按钮',
                        '2. 将新麦克风拖放到声源附近（约50-80px距离）',
                        '3. 调整麦克风增益到60-70之间'
                    ]
                });
            }
            if (warning.id.startsWith('missing-mic-')) {
                suggestions.push({
                    priority: 'high',
                    action: `优化 ${warning.source?.name || '声源'} 的拾音`,
                    steps: [
                        `1. 在 ${warning.source?.name || '声源'} 100px 范围内放置麦克风`,
                        '2. 可以拖拽现有麦克风移动位置',
                        '3. 或者添加新的麦克风'
                    ]
                });
            }
        }

        return suggestions;
    }
}
