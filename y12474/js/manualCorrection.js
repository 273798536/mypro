class ManualCorrection {
    constructor() {
        this.originalConfig = null;
        this.correctedConfig = null;
        this.originalResult = null;
        this.correctedResult = null;
        this.comparisonResult = null;
    }

    saveOriginalConfig(level) {
        this.originalConfig = {
            windDirection: level.wind.direction,
            windMagnitude: level.wind.magnitude,
            currentDirection: level.current.direction,
            currentMagnitude: level.current.magnitude,
            timestamp: new Date().toISOString()
        };
        return this.originalConfig;
    }

    saveCorrectedConfig(windDirection, windMagnitude, currentDirection, currentMagnitude) {
        this.correctedConfig = {
            windDirection: windDirection,
            windMagnitude: windMagnitude,
            currentDirection: currentDirection,
            currentMagnitude: currentMagnitude,
            timestamp: new Date().toISOString()
        };
        return this.correctedConfig;
    }

    saveOriginalResult(result) {
        this.originalResult = result;
        return this.originalResult;
    }

    saveCorrectedResult(result) {
        this.correctedResult = result;
        return this.correctedResult;
    }

    applyCorrection(level) {
        if (!this.correctedConfig) {
            throw new Error('请先设置修正参数');
        }

        level.wind.update(
            this.correctedConfig.windDirection,
            this.correctedConfig.windMagnitude
        );

        if (this.correctedConfig.currentDirection !== undefined && 
            this.correctedConfig.currentMagnitude !== undefined) {
            level.current.update(
                this.correctedConfig.currentDirection,
                this.correctedConfig.currentMagnitude
            );
        }

        return {
            wind: {
                from: this.originalConfig.windDirection,
                to: this.correctedConfig.windDirection
            },
            windMagnitude: {
                from: this.originalConfig.windMagnitude,
                to: this.correctedConfig.windMagnitude
            }
        };
    }

    revertToOriginal(level) {
        if (!this.originalConfig) {
            throw new Error('没有原始配置可恢复');
        }

        level.wind.update(
            this.originalConfig.windDirection,
            this.originalConfig.windMagnitude
        );
        level.current.update(
            this.originalConfig.currentDirection,
            this.originalConfig.currentMagnitude
        );

        return this.originalConfig;
    }

    compareResults() {
        if (!this.originalResult || !this.correctedResult) {
            return null;
        }

        const comparison = {
            originalConfig: this.originalConfig,
            correctedConfig: this.correctedConfig,
            changes: this.calculateChanges(),
            originalResult: this.summarizeResult(this.originalResult),
            correctedResult: this.summarizeResult(this.correctedResult),
            improvements: this.calculateImprovements()
        };

        this.comparisonResult = comparison;
        return comparison;
    }

    calculateChanges() {
        const changes = [];

        if (this.originalConfig.windDirection !== this.correctedConfig.windDirection) {
            const diff = ((this.correctedConfig.windDirection - this.originalConfig.windDirection + 540) % 360) - 180;
            changes.push({
                type: 'wind_direction',
                name: '风向',
                from: `${this.originalConfig.windDirection}°`,
                to: `${this.correctedConfig.windDirection}°`,
                difference: `${diff > 0 ? '+' : ''}${diff}°`,
                isOpposite: Math.abs(diff) > 170 && Math.abs(diff) < 190
            });
        }

        if (this.originalConfig.windMagnitude !== this.correctedConfig.windMagnitude) {
            const diff = this.correctedConfig.windMagnitude - this.originalConfig.windMagnitude;
            changes.push({
                type: 'wind_magnitude',
                name: '风力',
                from: `${this.originalConfig.windMagnitude.toFixed(1)} 单位`,
                to: `${this.correctedConfig.windMagnitude.toFixed(1)} 单位`,
                difference: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} 单位`
            });
        }

        return changes;
    }

    summarizeResult(result) {
        if (!result || !result.sailboatResults || result.sailboatResults.length === 0) {
            return null;
        }

        const boat = result.sailboatResults[0];
        return {
            status: boat.finalState,
            score: boat.score ? boat.score.total : 0,
            maxScore: 100,
            distance: boat.distanceTraveled,
            finalPosition: boat.finalPosition,
            gridCoordinate: boat.gridCoordinate,
            errorCount: boat.errorCount,
            warningCount: boat.warningCount,
            totalSteps: result.totalSteps
        };
    }

    calculateImprovements() {
        const improvements = [];

        const orig = this.summarizeResult(this.originalResult);
        const corr = this.summarizeResult(this.correctedResult);

        if (!orig || !corr) return improvements;

        if (orig.status !== corr.status) {
            improvements.push({
                type: 'status',
                name: '航行状态',
                from: orig.status,
                to: corr.status,
                improved: corr.status === '成功到达' || 
                         (orig.status === '航行失败' && corr.status !== '航行失败')
            });
        }

        if (orig.score !== corr.score) {
            const diff = corr.score - orig.score;
            improvements.push({
                type: 'score',
                name: '总分',
                from: orig.score,
                to: corr.score,
                difference: `${diff > 0 ? '+' : ''}${diff}`,
                improved: diff > 0,
                maxPossible: corr.maxScore
            });
        }

        if (orig.errorCount !== corr.errorCount) {
            const diff = corr.errorCount - orig.errorCount;
            improvements.push({
                type: 'errors',
                name: '错误数量',
                from: orig.errorCount,
                to: corr.errorCount,
                difference: `${diff > 0 ? '+' : ''}${diff}`,
                improved: diff < 0
            });
        }

        if (orig.warningCount !== corr.warningCount) {
            const diff = corr.warningCount - orig.warningCount;
            improvements.push({
                type: 'warnings',
                name: '警告数量',
                from: orig.warningCount,
                to: corr.warningCount,
                difference: `${diff > 0 ? '+' : ''}${diff}`,
                improved: diff < 0
            });
        }

        return improvements;
    }

    generateComparisonReport() {
        const comparison = this.compareResults();
        if (!comparison) return '';

        let report = `
═══════════════════════════════════════════════════════════
                修正前后结果对比报告
═══════════════════════════════════════════════════════════

📋 修正参数
───────────────────────────────────────────────────────────
`;

        for (const change of comparison.changes) {
            report += `  ${change.name}: ${change.from} → ${change.to} (${change.difference})`;
            if (change.isOpposite) {
                report += ' ⚠️ 方向完全相反';
            }
            report += '\n';
        }

        report += `
📊 结果对比
───────────────────────────────────────────────────────────
  指标                修正前                修正后
  ─────────────────────────────────────────────────────────
`;

        const orig = comparison.originalResult;
        const corr = comparison.correctedResult;

        if (orig && corr) {
            report += `  航行状态: ${orig.status.padEnd(18)} ${corr.status}\n`;
            report += `  总分:     ${orig.score.toString().padEnd(18)} ${corr.score}\n`;
            report += `  错误数:   ${orig.errorCount.toString().padEnd(18)} ${corr.errorCount}\n`;
            report += `  警告数:   ${orig.warningCount.toString().padEnd(18)} ${corr.warningCount}\n`;
            report += `  步数:     ${orig.totalSteps.toString().padEnd(18)} ${corr.totalSteps}\n`;
        }

        report += `
📈 改进分析
───────────────────────────────────────────────────────────
`;

        const improvements = comparison.improvements.filter(i => i.improved);
        const regressions = comparison.improvements.filter(i => !i.improved && i.difference !== undefined);

        if (improvements.length > 0) {
            report += '✅ 改进项:\n';
            for (const imp of improvements) {
                report += `  • ${imp.name}: ${imp.from} → ${imp.to}`;
                if (imp.difference) report += ` (${imp.difference})`;
                report += '\n';
            }
        }

        if (regressions.length > 0) {
            report += '\n⚠️ 需要关注:\n';
            for (const reg of regressions) {
                report += `  • ${reg.name}: ${reg.from} → ${reg.to}`;
                if (reg.difference) report += ` (${reg.difference})`;
                report += '\n';
            }
        }

        if (improvements.length === 0 && regressions.length === 0) {
            report += '  修正后结果没有明显变化。建议检查修正参数是否合理。\n';
        }

        report += `
💡 教学说明
───────────────────────────────────────────────────────────
`;

        for (const change of comparison.changes) {
            if (change.type === 'wind_direction') {
                if (change.isOpposite) {
                    report += `
  风向修正分析:
  原始风向 ${change.from} 与修正后 ${change.to} 完全相反。
  这是向量学习中最常见的错误之一：
  • 原因: 混淆了"风从哪里来"和"风往哪里吹"
  • 数学原理: 相反向量的和会相互抵消
  • 修正: 将角度增加或减少 180°
  • 记忆: 0°=东风（向东吹），90°=北风（向北吹）
`;
                } else {
                    report += `
  风向修正分析:
  风向调整了 ${change.difference}。
  小角度调整可以精确控制航行方向，
  这体现了向量方向对最终结果的敏感影响。
`;
                }
            }

            if (change.type === 'wind_magnitude') {
                report += `
  风力修正分析:
  风力调整了 ${change.difference}。
  向量的大小（模）决定了移动的距离，
  单位错误会导致位置计算偏差。
`;
            }
        }

        report += `
═══════════════════════════════════════════════════════════
`;

        return report;
    }

    canCompare() {
        return this.originalResult !== null && this.correctedResult !== null;
    }

    reset() {
        this.originalConfig = null;
        this.correctedConfig = null;
        this.originalResult = null;
        this.correctedResult = null;
        this.comparisonResult = null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ManualCorrection };
}
