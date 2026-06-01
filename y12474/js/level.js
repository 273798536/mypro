class Level {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.difficulty = config.difficulty || 'easy';
        this.maxSteps = config.maxSteps || 10;
        this.startPosition = config.startPosition.clone();
        this.targetPosition = config.targetPosition.clone();
        this.targetTolerance = config.targetTolerance || 30;
        this.wind = config.wind;
        this.current = config.current;
        this.islands = config.islands || [];
        this.hints = config.hints || [];
        this.expectedPath = config.expectedPath || null;
        this.pitfalls = config.pitfalls || [];
        
        this.startPoint = new StartPoint(this.startPosition, '起点');
        this.target = new Target(this.targetPosition, this.targetTolerance, '目标');
    }

    createSailboat(id = 'boat-1') {
        return new Sailboat(this.startPosition, id);
    }

    checkPitfalls(stepRecord, grid) {
        const issues = [];
        
        for (const pitfall of this.pitfalls) {
            if (pitfall.type === 'opposite_direction') {
                if (VectorMath.isOppositeDirection(stepRecord.windVector, stepRecord.currentVector, 5)) {
                    issues.push({
                        ...pitfall,
                        detected: true,
                        step: stepRecord.step
                    });
                }
            }
            
            if (pitfall.type === 'unit_error_wind') {
                if (VectorMath.checkUnitError(stepRecord.windVector, pitfall.expectedMagnitude, 0.3)) {
                    issues.push({
                        ...pitfall,
                        detected: true,
                        step: stepRecord.step,
                        actual: stepRecord.windVector.magnitude()
                    });
                }
            }
            
            if (pitfall.type === 'unit_error_current') {
                if (VectorMath.checkUnitError(stepRecord.currentVector, pitfall.expectedMagnitude, 0.3)) {
                    issues.push({
                        ...pitfall,
                        detected: true,
                        step: stepRecord.step,
                        actual: stepRecord.currentVector.magnitude()
                    });
                }
            }
            
            if (pitfall.type === 'boundary') {
                if (!grid.isVectorInBounds(stepRecord.endPosition)) {
                    issues.push({
                        ...pitfall,
                        detected: true,
                        step: stepRecord.step,
                        position: stepRecord.endPosition
                    });
                }
            }
            
            if (pitfall.type === 'island') {
                for (const island of this.islands) {
                    if (island.checkCollision(stepRecord.endPosition)) {
                        issues.push({
                            ...pitfall,
                            detected: true,
                            step: stepRecord.step,
                            island: island,
                            position: stepRecord.endPosition
                        });
                        break;
                    }
                }
            }
        }
        
        return issues;
    }

    calculateScore(sailboat) {
        if (sailboat.state === 'failed') {
            return {
                total: 0,
                breakdown: [
                    { category: '完成状态', score: 0, max: 50, description: '航行失败' }
                ]
            };
        }

        const score = {
            total: 0,
            breakdown: []
        };

        let completionScore = 0;
        const distance = sailboat.position.distanceTo(this.target.position);
        if (distance < this.targetTolerance) {
            completionScore = 50;
            score.breakdown.push({
                category: '到达目标',
                score: 50,
                max: 50,
                description: '成功到达目标点'
            });
        } else if (distance < this.targetTolerance * 2) {
            completionScore = Math.max(0, 50 - Math.floor(distance / 5));
            score.breakdown.push({
                category: '接近目标',
                score: completionScore,
                max: 50,
                description: `距离目标 ${distance.toFixed(1)} 像素`
            });
        } else {
            score.breakdown.push({
                category: '完成状态',
                score: 0,
                max: 50,
                description: '未到达目标区域'
            });
        }
        score.total += completionScore;

        let errorScore = 30;
        const totalErrors = sailboat.stepRecords.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = sailboat.stepRecords.reduce((sum, r) => sum + r.warnings.length, 0);
        errorScore = Math.max(0, errorScore - totalErrors * 10 - totalWarnings * 3);
        score.total += errorScore;
        score.breakdown.push({
            category: '错误扣分',
            score: errorScore,
            max: 30,
            description: `错误 ${totalErrors} 个，警告 ${totalWarnings} 个`
        });

        let efficiencyScore = 20;
        const expectedDistance = this.startPosition.distanceTo(this.target.position);
        const actualDistance = sailboat.getDistanceTraveled();
        if (actualDistance > 0) {
            const efficiency = Math.min(1, expectedDistance / actualDistance);
            efficiencyScore = Math.floor(efficiency * 20);
        }
        score.total += efficiencyScore;
        score.breakdown.push({
            category: '航行效率',
            score: efficiencyScore,
            max: 20,
            description: `实际航程 ${actualDistance.toFixed(1)}，直线距离 ${expectedDistance.toFixed(1)}`
        });

        return score;
    }

    static getPredefinedLevels(grid) {
        const levels = [];
        
        const start1 = grid.gridToWorld(3, 8);
        const target1 = grid.gridToWorld(12, 3);
        levels.push(new Level({
            id: 'level-1',
            name: '第一课：顺流而下',
            description: '学习基本的向量合成。风向与水流方向相同，观察合力作用。',
            difficulty: 'easy',
            maxSteps: 8,
            startPosition: start1,
            targetPosition: target1,
            targetTolerance: 35,
            wind: new Wind(90, 1),
            current: new Current(90, 0.5),
            islands: [],
            hints: [
                '风向 90° 表示北风（向北吹）',
                '合力 = 风力 + 水流',
                '每一步移动的距离是两个向量的和'
            ],
            pitfalls: [
                {
                    type: 'opposite_direction',
                    name: '方向相反陷阱',
                    description: '当风向与水流方向相反时，合力会大幅减小',
                    suggestion: '尝试将风向调整为与水流相同的方向'
                }
            ]
        }));

        const start2 = grid.gridToWorld(2, 7);
        const target2 = grid.gridToWorld(12, 7);
        const island2 = new Island(grid.gridToWorld(7, 7), 35, '中央岛');
        levels.push(new Level({
            id: 'level-2',
            name: '第二课：绕岛航行',
            description: '学习调整风向绕过障碍物。注意不要撞上中央岛屿！',
            difficulty: 'medium',
            maxSteps: 10,
            startPosition: start2,
            targetPosition: target2,
            targetTolerance: 35,
            wind: new Wind(0, 1),
            current: new Current(180, 0.3),
            islands: [island2],
            hints: [
                '水流会把你向西推（180°）',
                '你需要调整风向来补偿水流的影响',
                '岛屿半径 35 像素，不要太靠近'
            ],
            pitfalls: [
                {
                    type: 'island',
                    name: '岛屿碰撞',
                    description: '帆船撞上了中央岛屿！',
                    suggestion: '调整风向，让帆船从岛屿上方或下方绕过'
                },
                {
                    type: 'unit_error_wind',
                    name: '风力单位错误',
                    description: '风力单位使用不当',
                    expectedMagnitude: 1,
                    suggestion: '检查风力是否在 0.7-1.3 单位之间'
                }
            ]
        }));

        const start3 = grid.gridToWorld(2, 9);
        const target3 = grid.gridToWorld(13, 2);
        const island3a = new Island(grid.gridToWorld(5, 6), 30, '暗礁A');
        const island3b = new Island(grid.gridToWorld(8, 4), 35, '暗礁B');
        const island3c = new Island(grid.gridToWorld(11, 7), 28, '暗礁C');
        levels.push(new Level({
            id: 'level-3',
            name: '第三课：逆流而上',
            description: '挑战：水流与目标方向相反，需要精确计算风向角度。',
            difficulty: 'hard',
            maxSteps: 12,
            startPosition: start3,
            targetPosition: target3,
            targetTolerance: 40,
            wind: new Wind(45, 1.2),
            current: new Current(225, 0.6),
            islands: [island3a, island3b, island3c],
            hints: [
                '水流方向 225° 是西南方向',
                '你需要风向东北（45°）来抵消水流',
                '这是最困难的对齐问题，仔细计算向量和'
            ],
            pitfalls: [
                {
                    type: 'opposite_direction',
                    name: '方向相反',
                    description: '风向与水流几乎相反，航行效率极低',
                    suggestion: '调整风向角度，找到最佳合力方向'
                },
                {
                    type: 'boundary',
                    name: '越界风险',
                    description: '帆船驶出网格边界',
                    suggestion: '注意观察边界，调整航向保持在网格内'
                },
                {
                    type: 'unit_error_current',
                    name: '水流单位错误',
                    description: '水流单位使用不当',
                    expectedMagnitude: 0.5,
                    suggestion: '检查水流是否在 0.3-0.7 单位之间'
                }
            ]
        }));

        const start4 = grid.gridToWorld(3, 8);
        const target4 = grid.gridToWorld(12, 3);
        levels.push(new Level({
            id: 'level-trap',
            name: '陷阱课：反向风',
            description: '这是一个教学陷阱：预设风向与正确方向完全相反。',
            difficulty: 'teaching',
            maxSteps: 6,
            startPosition: start4,
            targetPosition: target4,
            targetTolerance: 35,
            wind: new Wind(270, 1),
            current: new Current(90, 0.5),
            islands: [],
            hints: [
                '⚠️ 注意：预设风向 270°（南风）与目标方向相反！',
                '这是故意设置的错误，用于教学方向相反的后果',
                '正确风向应该是 90°（北风）'
            ],
            pitfalls: [
                {
                    type: 'opposite_direction',
                    name: '方向相反陷阱',
                    description: '风向与水流方向完全相反！合力几乎为零。',
                    suggestion: '将风向从 270° 改为 90°，观察航行变化'
                }
            ]
        }));

        return levels;
    }
}

class GameState {
    constructor() {
        this.currentLevel = null;
        this.sailboats = [];
        this.currentStep = 0;
        this.maxSteps = 10;
        this.isRunning = false;
        this.isPaused = false;
        this.gameStatus = 'idle';
        this.runResults = [];
        this.originalResult = null;
        this.correctedResult = null;
        this.animationSpeed = 500;
    }

    reset() {
        this.sailboats.forEach(boat => boat.reset());
        this.currentStep = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.gameStatus = 'idle';
    }

    addSailboat(sailboat) {
        this.sailboats.push(sailboat);
    }

    getCurrentWindVector() {
        return this.currentLevel ? this.currentLevel.wind.getVector() : new Vector(0, 0);
    }

    getCurrentVectorAt(position) {
        return this.currentLevel ? this.currentLevel.current.getVectorAt(position) : new Vector(0, 0);
    }

    stepAll(grid) {
        const results = [];
        
        for (const boat of this.sailboats) {
            if (boat.state === 'failed' || boat.state === 'success') continue;

            const windVec = this.getCurrentWindVector();
            const currentVec = this.getCurrentVectorAt(boat.position);
            
            const result = boat.move(
                windVec,
                currentVec,
                grid,
                this.currentLevel.islands,
                this.currentStep
            );

            if (this.currentLevel) {
                boat.checkTargetReached(
                    this.currentLevel.target.position,
                    this.currentLevel.targetTolerance
                );
            }

            results.push({ boatId: boat.id, ...result });
        }

        this.currentStep++;
        
        const allFinished = this.sailboats.every(
            boat => boat.state === 'failed' || boat.state === 'success'
        );
        
        if (allFinished || this.currentStep >= this.maxSteps) {
            this.isRunning = false;
            this.gameStatus = allFinished ? 'finished' : 'timeout';
        }

        return results;
    }

    isComplete() {
        return this.gameStatus === 'finished' || this.gameStatus === 'timeout';
    }

    getSummary() {
        return {
            levelId: this.currentLevel ? this.currentLevel.id : null,
            levelName: this.currentLevel ? this.currentLevel.name : null,
            currentStep: this.currentStep,
            maxSteps: this.maxSteps,
            gameStatus: this.gameStatus,
            sailboats: this.sailboats.map(boat => ({
                id: boat.id,
                state: boat.state,
                position: boat.position,
                distanceTraveled: boat.getDistanceTraveled(),
                displacement: boat.getFinalDisplacement(),
                score: this.currentLevel ? this.currentLevel.calculateScore(boat) : null
            }))
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Level, GameState };
}
