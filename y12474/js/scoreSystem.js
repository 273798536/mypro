class ScoreSystem {
    constructor() {
        this.attempts = [];
        this.currentAttempt = null;
    }

    startAttempt(level, sailboatCount = 1) {
        this.currentAttempt = {
            id: Date.now(),
            levelId: level.id,
            levelName: level.name,
            startTime: new Date().toISOString(),
            sailboats: [],
            stepByStepErrors: [],
            totalScore: 0,
            status: 'in_progress'
        };

        for (let i = 0; i < sailboatCount; i++) {
            this.currentAttempt.sailboats.push({
                id: `boat-${i + 1}`,
                path: [],
                stepRecords: [],
                errors: [],
                warnings: []
            });
        }

        return this.currentAttempt;
    }

    recordStep(stepIndex, stepResults, errors, warnings) {
        if (!this.currentAttempt) return;

        const stepRecord = {
            step: stepIndex,
            timestamp: new Date().toISOString(),
            boats: stepResults.map(r => ({
                boatId: r.boatId,
                startPosition: r.startPosition,
                endPosition: r.endPosition,
                windVector: r.windVector,
                currentVector: r.currentVector,
                totalForce: r.totalForce,
                errors: r.errors,
                warnings: r.warnings
            })),
            detectedErrors: errors,
            detectedWarnings: warnings
        };

        this.currentAttempt.stepByStepErrors.push(stepRecord);

        for (let i = 0; i < stepResults.length; i++) {
            const result = stepResults[i];
            const boatRecord = this.currentAttempt.sailboats[i];
            boatRecord.path.push(result.endPosition.clone());
            boatRecord.stepRecords.push({ ...result });
            boatRecord.errors.push(...result.errors);
            boatRecord.warnings.push(...result.warnings);
        }
    }

    completeAttempt(gameState, level) {
        if (!this.currentAttempt) return null;

        this.currentAttempt.endTime = new Date().toISOString();
        this.currentAttempt.status = gameState.gameStatus;
        this.currentAttempt.totalSteps = gameState.currentStep;

        const summary = gameState.getSummary();
        this.currentAttempt.finalPositions = summary.sailboats;

        let totalScore = 0;
        for (const boat of gameState.sailboats) {
            const score = level.calculateScore(boat);
            totalScore += score.total;
            
            const boatRecord = this.currentAttempt.sailboats.find(b => b.id === boat.id);
            if (boatRecord) {
                boatRecord.finalState = boat.state;
                boatRecord.finalPosition = boat.position.clone();
                boatRecord.score = score;
                boatRecord.distanceTraveled = boat.getDistanceTraveled();
                boatRecord.displacement = boat.getFinalDisplacement();
            }
        }

        this.currentAttempt.totalScore = totalScore;
        this.currentAttempt.averageScore = totalScore / gameState.sailboats.length;

        this.attempts.push({ ...this.currentAttempt });
        const completed = this.currentAttempt;
        this.currentAttempt = null;

        return completed;
    }

    findOppositeDirectionErrors(attempt) {
        const errors = [];
        
        for (const step of attempt.stepByStepErrors) {
            for (const warning of step.detectedWarnings) {
                if (warning.type === 'opposite_direction') {
                    errors.push({
                        step: step.step + 1,
                        boatId: step.boats[0].boatId,
                        details: warning,
                        location: `第 ${step.step + 1} 步`
                    });
                }
            }
        }
        
        return errors;
    }

    findUnitErrors(attempt) {
        const errors = [];
        
        for (const step of attempt.stepByStepErrors) {
            for (const warning of step.detectedWarnings) {
                if (warning.type === 'unit_error') {
                    errors.push({
                        step: step.step + 1,
                        details: warning,
                        location: `第 ${step.step + 1} 步`
                    });
                }
            }
        }
        
        return errors;
    }

    generateReport(attempt, level, grid) {
        const oppositeErrors = this.findOppositeDirectionErrors(attempt);
        const unitErrors = this.findUnitErrors(attempt);
        const allErrors = [];
        
        for (const step of attempt.stepByStepErrors) {
            for (const err of step.detectedErrors) {
                allErrors.push({ step: step.step + 1, ...err });
            }
            for (const warn of step.detectedWarnings) {
                allErrors.push({ step: step.step + 1, ...warn, isWarning: true });
            }
        }

        const report = {
            title: '向量风帆航海课 - 成绩报告',
            generatedAt: new Date().toLocaleString('zh-CN'),
            level: {
                id: attempt.levelId,
                name: attempt.levelName,
                description: level.description
            },
            attempt: {
                id: attempt.id,
                startTime: attempt.startTime,
                endTime: attempt.endTime,
                totalSteps: attempt.totalSteps,
                status: attempt.status
            },
            wind: {
                direction: level.wind.direction,
                magnitude: level.wind.magnitude,
                vector: level.wind.vector.toString()
            },
            current: {
                direction: level.current.direction,
                magnitude: level.current.magnitude,
                vector: level.current.vector.toString()
            },
            sailboatResults: attempt.sailboats.map(boat => ({
                id: boat.id,
                finalState: this.getStateLabel(boat.finalState),
                finalPosition: boat.finalPosition.toString(),
                gridCoordinate: grid.getGridCoordinateLabel(boat.finalPosition),
                distanceTraveled: boat.distanceTraveled.toFixed(2),
                displacement: boat.displacement.toString(),
                score: boat.score ? {
                    total: boat.score.total,
                    breakdown: boat.score.breakdown
                } : null,
                errorCount: boat.errors.length,
                warningCount: boat.warnings.length
            })),
            errorAnalysis: {
                totalErrors: allErrors.filter(e => !e.isWarning).length,
                totalWarnings: allErrors.filter(e => e.isWarning).length,
                oppositeDirectionErrors: oppositeErrors,
                unitErrors: unitErrors,
                otherErrors: allErrors.filter(e => 
                    e.type !== 'opposite_direction' && 
                    e.type !== 'unit_error' &&
                    !e.isWarning
                ),
                byStep: this.groupErrorsByStep(allErrors)
            },
            stepByStepSummary: attempt.stepByStepErrors.map(step => ({
                step: step.step + 1,
                boats: step.boats.map(b => ({
                    id: b.boatId,
                    from: b.startPosition.toString(),
                    to: b.endPosition.toString(),
                    windVector: b.windVector.toString(),
                    currentVector: b.currentVector.toString(),
                    totalForce: b.totalForce.toString(),
                    errors: b.errors.map(e => e.message),
                    warnings: b.warnings.map(w => w.message)
                }))
            })),
            totalScore: attempt.totalScore,
            averageScore: attempt.averageScore.toFixed(2)
        };

        return report;
    }

    getStateLabel(state) {
        const labels = {
            'idle': '等待',
            'moving': '航行中',
            'success': '成功到达',
            'failed': '航行失败'
        };
        return labels[state] || state;
    }

    groupErrorsByStep(errors) {
        const groups = {};
        for (const err of errors) {
            const step = err.step;
            if (!groups[step]) groups[step] = [];
            groups[step].push({
                type: err.type,
                severity: err.severity,
                title: err.title,
                description: err.description,
                suggestion: err.suggestion
            });
        }
        return groups;
    }

    exportReportToText(report) {
        let text = `
═══════════════════════════════════════════════════════════
             向量风帆航海课 - 成绩报告
═══════════════════════════════════════════════════════════

📋 基本信息
───────────────────────────────────────────────────────────
报告生成时间: ${report.generatedAt}
关卡: ${report.level.name}
描述: ${report.level.description}

⏱️ 航行记录
───────────────────────────────────────────────────────────
开始时间: ${new Date(report.attempt.startTime).toLocaleString('zh-CN')}
结束时间: ${new Date(report.attempt.endTime).toLocaleString('zh-CN')}
总步数: ${report.attempt.totalSteps}
最终状态: ${this.getStateLabel(report.attempt.status)}

🌬️ 环境参数
───────────────────────────────────────────────────────────
风向: ${report.wind.direction}°，${report.wind.magnitude} 单位
风向量: ${report.wind.vector}
水流方向: ${report.current.direction}°，${report.current.magnitude} 单位
水流向量: ${report.current.vector}

⛵ 帆船成绩
───────────────────────────────────────────────────────────
`;

        for (const boat of report.sailboatResults) {
            text += `
  帆船 ${boat.id}:
    最终状态: ${boat.finalState}
    最终位置: ${boat.finalPosition} (网格: ${boat.gridCoordinate})
    航行距离: ${boat.distanceTraveled} 像素
    位移向量: ${boat.displacement}
    错误数: ${boat.errorCount}，警告数: ${boat.warningCount}
`;
            if (boat.score) {
                text += `    总分: ${boat.score.total} / 100\n`;
                for (const item of boat.score.breakdown) {
                    text += `      ${item.category}: ${item.score}/${item.max} - ${item.description}\n`;
                }
            }
        }

        text += `
⚠️ 错误分析
───────────────────────────────────────────────────────────
总错误数: ${report.errorAnalysis.totalErrors}
总警告数: ${report.errorAnalysis.totalWarnings}
`;

        if (report.errorAnalysis.oppositeDirectionErrors.length > 0) {
            text += `
❌ 方向相反错误 (${report.errorAnalysis.oppositeDirectionErrors.length} 处):
`;
            for (const err of report.errorAnalysis.oppositeDirectionErrors) {
                text += `  ${err.location}: ${err.details.title}\n`;
                text += `     ${err.details.description}\n`;
                text += `     建议: ${err.details.suggestion}\n`;
            }
        }

        if (report.errorAnalysis.unitErrors.length > 0) {
            text += `
❌ 单位错误 (${report.errorAnalysis.unitErrors.length} 处):
`;
            for (const err of report.errorAnalysis.unitErrors) {
                text += `  ${err.location}: ${err.details.title}\n`;
                text += `     ${err.details.description}\n`;
                text += `     建议: ${err.details.suggestion}\n`;
            }
        }

        if (report.errorAnalysis.otherErrors.length > 0) {
            text += `
❌ 其他错误 (${report.errorAnalysis.otherErrors.length} 处):
`;
            for (const err of report.errorAnalysis.otherErrors) {
                text += `  第 ${err.step} 步: ${err.title}\n`;
                text += `     ${err.description}\n`;
                text += `     建议: ${err.suggestion}\n`;
            }
        }

        text += `
📊 总分: ${report.totalScore} / ${100 * report.sailboatResults.length}
平均分: ${report.averageScore} / 100

═══════════════════════════════════════════════════════════
`;

        return text;
    }

    exportReportToJSON(report) {
        return JSON.stringify(report, null, 2);
    }

    exportReportToCSV(report) {
        let csv = '步骤,帆船ID,起点,终点,风力向量,水流向量,合力向量,错误数,警告数,状态\n';
        
        for (const step of report.stepByStepSummary) {
            for (const boat of step.boats) {
                csv += `${step.step},${boat.id},"${boat.from}","${boat.to}","${boat.windVector}","${boat.currentVector}","${boat.totalForce}",${boat.errors.length},${boat.warnings.length},"${boat.errors.length > 0 ? '错误' : boat.warnings.length > 0 ? '警告' : '正常'}"\n`;
            }
        }

        csv += '\n\n成绩汇总\n';
        csv += '帆船ID,最终状态,最终位置,网格坐标,航行距离,位移,总分,错误数,警告数\n';
        for (const boat of report.sailboatResults) {
            csv += `${boat.id},${boat.finalState},"${boat.finalPosition}",${boat.gridCoordinate},${boat.distanceTraveled},"${boat.displacement}",${boat.score ? boat.score.total : 'N/A'},${boat.errorCount},${boat.warningCount}\n`;
        }

        return csv;
    }

    downloadReport(report, format = 'text') {
        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = this.exportReportToJSON(report);
                filename = `sailing-report-${report.attempt.id}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.exportReportToCSV(report);
                filename = `sailing-report-${report.attempt.id}.csv`;
                mimeType = 'text/csv';
                break;
            default:
                content = this.exportReportToText(report);
                filename = `sailing-report-${report.attempt.id}.txt`;
                mimeType = 'text/plain';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getAttemptHistory() {
        return [...this.attempts];
    }

    clearHistory() {
        this.attempts = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScoreSystem };
}
