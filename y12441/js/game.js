const Game = (function() {
    const state = {
        currentLevel: 1,
        health: 100,
        maxHealth: 100,
        score: 0,
        selectedJudgment: null,
        selectedAction: null,
        history: [],
        currentLevelData: null,
        battleInProgress: false
    };

    const actions = {
        bullish: [
            { id: 'full_attack', name: '全线出击', desc: '调集全部兵力发起反攻', risk: 'high', reward: 'high' },
            { id: 'probe_attack', name: '试探进攻', desc: '派出小股部队试探敌军虚实', risk: 'medium', reward: 'medium' },
            { id: 'strengthen_defense', name: '加固防御', desc: '趁敌军疲惫加强城防工事', risk: 'low', reward: 'low' },
            { id: 'wait_and_see', name: '按兵不动', desc: '观察局势，等待更明确信号', risk: 'low', reward: 'none' }
        ],
        bearish: [
            { id: 'full_retreat', name: '全军撤退', desc: '放弃外围阵地，收缩防御', risk: 'low', reward: 'low' },
            { id: 'tactical_retreat', name: '战术后撤', desc: '诱敌深入，设伏歼敌', risk: 'medium', reward: 'medium' },
            { id: 'counter_attack', name: '夜袭敌营', desc: '趁敌军立足未稳发起突袭', risk: 'high', reward: 'high' },
            { id: 'hold_position', name: '坚守待援', desc: '死守阵地，等待援军到来', risk: 'medium', reward: 'low' }
        ],
        neutral: [
            { id: 'reinforce', name: '增兵布防', desc: '补充兵力，加强各方向防御', risk: 'low', reward: 'low' },
            { id: 'reconnaissance', name: '派出斥候', desc: '刺探敌军虚实和粮草情况', risk: 'low', reward: 'medium' },
            { id: 'formation_adjust', name: '变阵应对', desc: '调整阵型，保持灵活性', risk: 'medium', reward: 'medium' },
            { id: 'negotiate', name: '遣使议和', desc: '派出使者试探敌军意图', risk: 'medium', reward: 'none' }
        ]
    };

    function init() {
        state.currentLevel = 1;
        state.health = 100;
        state.maxHealth = 100;
        state.score = 0;
        state.selectedJudgment = null;
        state.selectedAction = null;
        state.history = [];
        state.battleInProgress = false;
        
        loadLevel(state.currentLevel);
    }

    function loadLevel(levelId) {
        const level = KLine.getLevel(levelId);
        state.currentLevelData = level;
        state.selectedJudgment = null;
        state.selectedAction = null;
        state.battleInProgress = false;
        
        return level;
    }

    function getJudgmentOptions() {
        if (!state.currentLevelData) return [];
        
        const currentKLine = state.currentLevelData.klineData[state.currentLevelData.klineData.length - 1];
        const features = KLine.analyzeKLine(currentKLine);
        const identified = KLine.identifyPattern(features);
        
        const allPatterns = KLine.getAllPatterns();
        const options = [];
        
        identified.slice(0, 2).forEach(p => {
            options.push({
                id: p.pattern.id,
                name: p.pattern.name,
                desc: p.pattern.desc,
                confidence: p.confidence,
                direction: getPatternDirection(p.pattern.id)
            });
        });
        
        const otherPatterns = [
            ...allPatterns.bullish.filter(p => !options.find(o => o.id === p.id)),
            ...allPatterns.bearish.filter(p => !options.find(o => o.id === p.id)),
            ...allPatterns.neutral.filter(p => !options.find(o => o.id === p.id))
        ];
        
        const shuffled = otherPatterns.sort(() => Math.random() - 0.5).slice(0, 2);
        shuffled.forEach(p => {
            options.push({
                id: p.id,
                name: p.name,
                desc: p.desc,
                confidence: 0.3 + Math.random() * 0.3,
                direction: getPatternDirection(p.id)
            });
        });
        
        return options.sort(() => Math.random() - 0.5);
    }

    function getPatternDirection(patternId) {
        const allPatterns = KLine.getAllPatterns();
        if (allPatterns.bullish.find(p => p.id === patternId)) return 'bullish';
        if (allPatterns.bearish.find(p => p.id === patternId)) return 'bearish';
        return 'neutral';
    }

    function getActionOptions(direction) {
        return actions[direction] || actions.neutral;
    }

    function selectJudgment(judgmentId) {
        const options = getJudgmentOptions();
        const selected = options.find(o => o.id === judgmentId);
        if (selected) {
            state.selectedJudgment = selected;
            state.selectedAction = null;
            return selected;
        }
        return null;
    }

    function selectAction(actionId) {
        if (!state.selectedJudgment) return null;
        
        const options = getActionOptions(state.selectedJudgment.direction);
        const selected = options.find(o => o.id === actionId);
        if (selected) {
            state.selectedAction = selected;
            return selected;
        }
        return null;
    }

    function canExecute() {
        return state.selectedJudgment && state.selectedAction && !state.battleInProgress;
    }

    function executeBattle() {
        if (!canExecute()) return null;
        
        state.battleInProgress = true;
        
        const level = state.currentLevelData;
        const currentKLine = level.klineData[level.klineData.length - 1];
        const features = KLine.analyzeKLine(currentKLine);
        const wickAnalysis = KLine.analyzeWicks(features, { 
            position: level.correctDirection === 'bullish' ? 'low' : 
                     level.correctDirection === 'bearish' ? 'high' : 'medium'
        });
        
        let prevKLine = null;
        let volumeRelation = null;
        if (level.klineData.length >= 2) {
            prevKLine = level.klineData[level.klineData.length - 2];
            volumeRelation = KLine.checkVolumePriceRelation(currentKLine, prevKLine);
        }
        
        const judgmentCorrect = state.selectedJudgment.id === level.correctPattern;
        const directionCorrect = state.selectedJudgment.direction === level.correctDirection;
        
        const analysis = analyzeAction(level, features, wickAnalysis, volumeRelation);
        
        const result = calculateResult(level, judgmentCorrect, directionCorrect, analysis);
        
        const historyRecord = {
            id: Date.now(),
            level: level.id,
            levelName: level.name,
            timestamp: new Date().toISOString(),
            judgment: state.selectedJudgment,
            action: state.selectedAction,
            klineData: [...level.klineData],
            features: features,
            wickAnalysis: wickAnalysis,
            volumeRelation: volumeRelation,
            judgmentCorrect: judgmentCorrect,
            directionCorrect: directionCorrect,
            result: result,
            analysis: analysis,
            traps: level.traps,
            triggeredTraps: analysis.triggeredTraps
        };
        
        state.history.unshift(historyRecord);
        
        state.health = Math.max(0, state.health + result.healthChange);
        state.score += result.scoreChange;
        
        return {
            ...result,
            historyRecord: historyRecord,
            features: features,
            wickAnalysis: wickAnalysis,
            volumeRelation: volumeRelation
        };
    }

    function analyzeAction(level, features, wickAnalysis, volumeRelation) {
        const triggeredTraps = [];
        const analysisPoints = [];
        
        const judgmentDir = state.selectedJudgment.direction;
        const actionId = state.selectedAction.id;
        
        level.traps.forEach(trap => {
            let triggered = false;
            let triggerReason = '';
            
            switch (trap.type) {
                case 'wick_misjudge':
                    if (judgmentDir !== level.correctDirection) {
                        if (wickAnalysis.upperWick.significance === 'high' && judgmentDir === 'bullish') {
                            triggered = true;
                            triggerReason = '误判了上影线的含义，将抛压当成了上攻动能';
                        } else if (wickAnalysis.lowerWick.significance === 'high' && judgmentDir === 'bearish') {
                            triggered = true;
                            triggerReason = '误判了下影线的含义，将支撑当成了弱势信号';
                        }
                    }
                    if (features.bodyToRangeRatio < 0.3 && state.selectedJudgment.confidence > 0.7) {
                        triggered = true;
                        triggerReason = `过度自信地解读了影线信号：${trap.description}`;
                    }
                    break;
                    
                case 'volume_divergence':
                    if (volumeRelation && volumeRelation.divergence) {
                        if ((judgmentDir === 'bullish' && volumeRelation.priceChange > 0) ||
                            (judgmentDir === 'bearish' && volumeRelation.priceChange < 0)) {
                            if (actionId.includes('attack') || actionId.includes('retreat')) {
                                triggered = true;
                                triggerReason = `忽略了量价背离信号：${trap.description}。实际成交量 ${currentVolume()} 未达到阈值 ${trap.threshold}`;
                            }
                        }
                    }
                    break;
                    
                case 'trend_deviation':
                    if (trap.strength > 0.5 && state.selectedAction.risk === 'high') {
                        triggered = true;
                        triggerReason = `逆势操作：${trap.description}，趋势强度 ${Math.round(trap.strength * 100)}%`;
                    }
                    break;
                    
                case 'event_overlay':
                    if (state.selectedJudgment.confidence > 0.8) {
                        triggered = true;
                        triggerReason = `事件叠加干扰：${trap.event} - ${trap.description}`;
                    }
                    break;
            }
            
            if (triggered) {
                triggeredTraps.push({
                    ...trap,
                    triggerReason: triggerReason
                });
            }
        });
        
        if (wickAnalysis.upperWick.significance === 'high') {
            analysisPoints.push({
                type: 'wick',
                correct: level.correctDirection === 'bearish',
                text: wickAnalysis.upperWick.interpretation
            });
        }
        
        if (wickAnalysis.lowerWick.significance === 'high') {
            analysisPoints.push({
                type: 'wick',
                correct: level.correctDirection === 'bullish',
                text: wickAnalysis.lowerWick.interpretation
            });
        }
        
        if (volumeRelation) {
            analysisPoints.push({
                type: 'volume',
                correct: !volumeRelation.divergence,
                text: volumeRelation.relation
            });
        }
        
        return {
            triggeredTraps: triggeredTraps,
            analysisPoints: analysisPoints
        };
    }

    function currentVolume() {
        const kline = state.currentLevelData.klineData[state.currentLevelData.klineData.length - 1];
        return kline ? kline.volume : 0;
    }

    function calculateResult(level, judgmentCorrect, directionCorrect, analysis) {
        let healthChange = 0;
        let scoreChange = 0;
        let resultType = 'neutral';
        let resultTitle = '';
        let resultDescription = '';
        let failureReasons = [];
        let successFactors = [];
        
        const trapDamage = analysis.triggeredTraps.length * 15;
        const trapPenalty = analysis.triggeredTraps.length * 50;
        
        if (judgmentCorrect && directionCorrect) {
            scoreChange += 200;
            successFactors.push('烛台形态判断正确');
            
            const actionScore = calculateActionScore(state.selectedAction, level.correctDirection);
            scoreChange += actionScore;
            
            if (state.selectedAction.risk === 'high') {
                healthChange += 10;
                successFactors.push('高风险战术获得成功，士气大振');
            } else if (state.selectedAction.risk === 'medium') {
                healthChange += 5;
                successFactors.push('战术选择得当');
            } else {
                healthChange += 2;
                successFactors.push('稳健的战术选择');
            }
            
            if (analysis.triggeredTraps.length === 0) {
                scoreChange += 100;
                successFactors.push('成功避开所有陷阱');
            } else {
                scoreChange -= trapPenalty;
                analysis.triggeredTraps.forEach(trap => {
                    failureReasons.push(`⚠️ ${trap.triggerReason}`);
                });
            }
            
            if (scoreChange > 0) {
                resultType = 'win';
                resultTitle = '🎉 战役胜利！';
                resultDescription = `你的判断准确，战术得当，成功守住了城池！`;
            } else {
                resultType = 'partial';
                resultTitle = '⚔️ 惨胜';
                resultDescription = '虽然判断正确，但中了敌军圈套，损失不小。';
            }
            
        } else if (directionCorrect && !judgmentCorrect) {
            scoreChange += 80;
            healthChange -= 10;
            successFactors.push('方向判断正确');
            failureReasons.push('烛台形态识别错误，但方向蒙对了');
            
            if (analysis.triggeredTraps.length > 0) {
                healthChange -= trapDamage;
                scoreChange -= trapPenalty;
                analysis.triggeredTraps.forEach(trap => {
                    failureReasons.push(`⚠️ ${trap.triggerReason}`);
                });
            }
            
            resultType = 'partial';
            resultTitle = '🛡️ 勉强守住';
            resultDescription = '方向蒙对了，但形态判断有误，防守不够稳固。';
            
        } else if (!directionCorrect && judgmentCorrect) {
            healthChange -= 20;
            scoreChange += 50;
            successFactors.push('烛台形态识别正确');
            failureReasons.push('形态判断正确，但对多空方向理解错误');
            
            if (analysis.triggeredTraps.length > 0) {
                healthChange -= trapDamage;
                scoreChange -= trapPenalty;
                analysis.triggeredTraps.forEach(trap => {
                    failureReasons.push(`⚠️ ${trap.triggerReason}`);
                });
            }
            
            resultType = 'partial';
            resultTitle = '⚠️ 方向失误';
            resultDescription = '虽然认出了形态，但搞反了多空方向，吃了亏。';
            
        } else {
            healthChange -= 30;
            failureReasons.push('烛台形态和方向判断都错误');
            
            if (analysis.triggeredTraps.length > 0) {
                healthChange -= trapDamage;
                scoreChange -= trapPenalty;
                analysis.triggeredTraps.forEach(trap => {
                    failureReasons.push(`⚠️ ${trap.triggerReason}`);
                });
            }
            
            if (state.selectedAction.risk === 'high') {
                healthChange -= 15;
                failureReasons.push('判断错误还敢用高风险战术，损失惨重');
            }
            
            resultType = 'lose';
            resultTitle = '💀 战役失败';
            resultDescription = '判断完全错误，敌军攻破了防线！';
        }
        
        healthChange = Math.round(healthChange);
        scoreChange = Math.round(scoreChange);
        
        return {
            type: resultType,
            title: resultTitle,
            description: resultDescription,
            healthChange: healthChange,
            scoreChange: scoreChange,
            failureReasons: failureReasons,
            successFactors: successFactors,
            correctPattern: level.correctPattern,
            correctDirection: level.correctDirection,
            triggeredTraps: analysis.triggeredTraps,
            analysisPoints: analysis.analysisPoints
        };
    }

    function calculateActionScore(action, correctDirection) {
        const riskMultiplier = {
            'high': 2.0,
            'medium': 1.5,
            'low': 1.0
        };
        
        const actionScores = {
            'full_attack': 100,
            'probe_attack': 60,
            'strengthen_defense': 40,
            'wait_and_see': 20,
            'full_retreat': 40,
            'tactical_retreat': 60,
            'counter_attack': 100,
            'hold_position': 50,
            'reinforce': 30,
            'reconnaissance': 50,
            'formation_adjust': 40,
            'negotiate': 10
        };
        
        let baseScore = actionScores[action.id] || 30;
        let multiplier = riskMultiplier[action.risk] || 1.0;
        
        if ((correctDirection === 'bullish' && action.id.includes('attack')) ||
            (correctDirection === 'bearish' && action.id.includes('retreat')) ||
            (correctDirection === 'bearish' && action.id.includes('counter'))) {
            multiplier *= 1.2;
        }
        
        return Math.round(baseScore * multiplier);
    }

    function nextLevel() {
        const maxLevel = KLine.getAllLevels().length;
        if (state.currentLevel < maxLevel) {
            state.currentLevel++;
            return loadLevel(state.currentLevel);
        }
        return null;
    }

    function getState() {
        return { ...state };
    }

    function getHistory() {
        return state.history;
    }

    function getHistoryRecord(recordId) {
        return state.history.find(h => h.id === recordId);
    }

    function clearHistory() {
        state.history = [];
    }

    function getTraceData(recordId) {
        const record = getHistoryRecord(recordId);
        if (!record) return null;
        
        return KLine.traceDataSource({
            id: record.level,
            name: record.levelName,
            klineData: record.klineData,
            correctPattern: record.result.correctPattern,
            correctDirection: record.result.correctDirection,
            source: {
                market: `课堂教学记录 #${record.id}`,
                dataSource: `历史战役存档 - ${new Date(record.timestamp).toLocaleString()}`,
                collectionTime: record.timestamp,
                preCalculation: '原始数据，未作修改'
            },
            traps: record.traps
        });
    }

    function isGameOver() {
        return state.health <= 0;
    }

    function isVictory() {
        const maxLevel = KLine.getAllLevels().length;
        return state.currentLevel > maxLevel && state.health > 0;
    }

    return {
        init,
        loadLevel,
        getJudgmentOptions,
        getActionOptions,
        selectJudgment,
        selectAction,
        canExecute,
        executeBattle,
        nextLevel,
        getState,
        getHistory,
        getHistoryRecord,
        clearHistory,
        getTraceData,
        isGameOver,
        isVictory
    };
})();
