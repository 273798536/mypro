class ErrorDetector {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    reset() {
        this.errors = [];
        this.warnings = [];
    }

    detectAll(stepRecord, grid, level = null) {
        this.reset();

        this.detectOppositeDirection(stepRecord);
        this.detectUnitError(stepRecord);
        this.detectOutOfBounds(stepRecord, grid);
        this.detectIslandCollision(stepRecord, level);
        this.detectMisalignment(stepRecord, grid);

        return {
            errors: [...this.errors],
            warnings: [...this.warnings]
        };
    }

    detectOppositeDirection(stepRecord) {
        const { windVector, currentVector } = stepRecord;
        const angle = VectorMath.angleBetween(windVector, currentVector);
        
        if (Math.abs(angle - 180) < 5) {
            this.warnings.push({
                type: 'opposite_direction',
                severity: 'warning',
                title: '⚠️ 方向相反警告',
                description: `风向与水流方向几乎相反（夹角 ${angle.toFixed(1)}°），合力大幅减小。`,
                details: {
                    windAngle: windVector.angleNav().toFixed(1),
                    currentAngle: currentVector.angleNav().toFixed(1),
                    angleBetween: angle.toFixed(1)
                },
                explanation: '当两个向量方向相反时，它们的和的大小等于两个大小之差。' +
                             '如果风力为 1 单位，水流为 0.5 单位，合力只有 0.5 单位。',
                suggestion: '调整风向角度，使其与水流方向的夹角小于 90°，' +
                            '这样两个向量可以相互加强而不是抵消。',
                correction: `将风向从 ${windVector.angleNav().toFixed(0)}° 调整为 ` +
                           `${(windVector.angleNav() + 180).toFixed(0)}° （反向）`
            });
        } else if (Math.abs(angle - 180) < 15) {
            this.warnings.push({
                type: 'opposite_direction',
                severity: 'info',
                title: 'ℹ️ 方向接近相反',
                description: `风向与水流方向夹角约 ${angle.toFixed(1)}°，接近相反方向。`,
                details: {
                    windAngle: windVector.angleNav().toFixed(1),
                    currentAngle: currentVector.angleNav().toFixed(1),
                    angleBetween: angle.toFixed(1)
                },
                explanation: '当两个向量夹角大于 90° 时，它们会相互抵消一部分。' +
                             '夹角越接近 180°，抵消越明显。',
                suggestion: '如果可能，调整风向使其与目标方向更一致。'
            });
        }
    }

    detectUnitError(stepRecord) {
        const { windVector, currentVector } = stepRecord;
        const expectedWind = 1;
        const expectedCurrent = 0.5;
        const tolerance = 0.3;

        const windMag = windVector.magnitude();
        const currentMag = currentVector.magnitude();

        if (windMag > expectedWind * (2 + tolerance) || windMag < expectedWind * (0.5 - tolerance)) {
            this.warnings.push({
                type: 'unit_error',
                severity: 'warning',
                title: '⚠️ 风力单位异常',
                description: `风力大小为 ${windMag.toFixed(2)} 单位，预期约 ${expectedWind} 单位。`,
                details: {
                    actual: windMag,
                    expected: expectedWind,
                    ratio: (windMag / expectedWind).toFixed(2)
                },
                explanation: '在本课程中，风力的标准单位是 1 单位/步。' +
                             '如果风力过大，帆船可能会失控；如果过小，则无法到达目标。',
                suggestion: `检查风力输入值，应该在 ${expectedWind * 0.5} 到 ${expectedWind * 1.5} 之间。`,
                correction: `将风力从 ${windMag.toFixed(2)} 调整为 ${expectedWind}`
            });
        }

        if (currentMag > expectedCurrent * (2 + tolerance) || currentMag < expectedCurrent * (0.5 - tolerance)) {
            this.warnings.push({
                type: 'unit_error',
                severity: 'warning',
                title: '⚠️ 水流单位异常',
                description: `水流大小为 ${currentMag.toFixed(2)} 单位，预期约 ${expectedCurrent} 单位。`,
                details: {
                    actual: currentMag,
                    expected: expectedCurrent,
                    ratio: (currentMag / expectedCurrent).toFixed(2)
                },
                explanation: '在本课程中，水流的标准单位是 0.5 单位/步。' +
                             '水流是自然因素，通常不应随意修改。',
                suggestion: `检查水流设置，应该在 ${expectedCurrent * 0.5} 到 ${expectedCurrent * 1.5} 之间。`,
                correction: `将水流从 ${currentMag.toFixed(2)} 调整为 ${expectedCurrent}`
            });
        }
    }

    detectOutOfBounds(stepRecord, grid) {
        const { endPosition } = stepRecord;
        
        if (!grid.isVectorInBounds(endPosition)) {
            this.errors.push({
                type: 'out_of_bounds',
                severity: 'error',
                title: '❌ 越界错误',
                description: `帆船驶出网格边界！位置 ${endPosition.toString()}`,
                details: {
                    position: endPosition,
                    gridBounds: {
                        minX: grid.originX,
                        maxX: grid.originX + grid.cols * grid.cellSize,
                        minY: grid.originY,
                        maxY: grid.originY + grid.rows * grid.cellSize
                    }
                },
                explanation: '坐标网格定义了可航行的区域。帆船必须始终保持在网格内。' +
                             '越界通常是因为向量计算错误或方向设置不当。',
                suggestion: '检查上一步的合力向量，确保其不会将帆船推出边界。' +
                            '可能需要减小风力或调整方向。',
                location: this.getStepLocation(stepRecord)
            });
        }
    }

    detectIslandCollision(stepRecord, level) {
        if (!level || !level.islands) return;

        const { endPosition } = stepRecord;

        for (const island of level.islands) {
            if (island.checkCollision(endPosition)) {
                const distance = endPosition.distanceTo(island.center);
                this.errors.push({
                    type: 'island_collision',
                    severity: 'error',
                    title: '❌ 岛屿碰撞',
                    description: `帆船撞上 ${island.name}！距离中心 ${distance.toFixed(1)} 像素，岛屿半径 ${island.radius} 像素。`,
                    details: {
                        island: island.name,
                        islandCenter: island.center,
                        islandRadius: island.radius,
                        impactPosition: endPosition,
                        distance: distance
                    },
                    explanation: '岛屿是不可穿越的障碍物。碰撞检测使用圆形边界：' +
                                 `如果帆船位置到岛屿中心的距离小于 ${island.radius} 像素，即判定为碰撞。`,
                    suggestion: `重新规划航线，让帆船从 ${island.name} 的上方或下方绕过。` +
                                '建议保持至少 40 像素的安全距离。',
                    correction: '调整风向，使合力向量指向岛屿的北侧或南侧。',
                    location: this.getStepLocation(stepRecord)
                });
                break;
            }
        }
    }

    detectMisalignment(stepRecord, grid) {
        const { endPosition } = stepRecord;
        const alignmentChecker = new GridAlignmentChecker(grid);
        const check = alignmentChecker.checkAlignment(endPosition, 10);

        if (!check.isAligned) {
            this.warnings.push({
                type: 'grid_misalignment',
                severity: 'info',
                title: 'ℹ️ 网格对齐提示',
                description: `帆船位置 ${endPosition.toString()} 偏离网格点 ${check.distance.toFixed(1)} 像素。`,
                details: {
                    actualPosition: endPosition,
                    snappedPosition: check.snapped,
                    gridCoordinate: grid.getGridCoordinateLabel(endPosition),
                    distance: check.distance
                },
                explanation: '在向量运算中，理想情况下每一步的终点应该对齐到网格点。' +
                             '这样可以直观地看到坐标变化。' +
                             `最近的网格点是 ${check.snapped.toString()} (${grid.getGridCoordinateLabel(check.snapped)})。`,
                suggestion: '如果偏差持续较大，检查向量计算是否正确。' +
                            '使用整数值的向量分量可以确保对齐。'
            });
        }
    }

    getStepLocation(stepRecord) {
        return `第 ${stepRecord.step + 1} 步，从 ${stepRecord.startPosition.toString()} 到 ${stepRecord.endPosition.toString()}`;
    }

    explainError(error) {
        const explanations = {
            opposite_direction: (e) => `
                <strong>数学原理解释：</strong><br>
                两个向量 $\vec{a}$ 和 $\vec{b}$ 方向相反时，它们的和为：<br>
                $$\vec{a} + \vec{b} = |\vec{a}| - |\vec{b}| \text{ （在相反方向上）}$$<br>
                在你的情况中：<br>
                风力向量: ${e.details.windAngle}°<br>
                水流向量: ${e.details.currentAngle}°<br>
                夹角: ${e.details.angleBetween}°<br>
                <br>
                <strong>修正方法：</strong><br>
                ${e.suggestion}
            `,
            unit_error: (e) => `
                <strong>单位分析：</strong><br>
                预期大小: ${e.details.expected} 单位<br>
                实际大小: ${e.details.actual.toFixed(2)} 单位<br>
                比值: ${e.details.ratio}x<br>
                <br>
                <strong>可能的原因：</strong><br>
                1. 混淆了度数和弧度<br>
                2. 忘记将极坐标转换为直角坐标<br>
                3. 计算时使用了错误的公式<br>
                <br>
                <strong>修正方法：</strong><br>
                ${e.suggestion}
            `,
            out_of_bounds: (e) => `
                <strong>边界检测：</strong><br>
                网格范围: X: [${e.details.gridBounds.minX}, ${e.details.gridBounds.maxX}], Y: [${e.details.gridBounds.minY}, ${e.details.gridBounds.maxY}]<br>
                帆船位置: (${e.details.position.x.toFixed(2)}, ${e.details.position.y.toFixed(2)})<br>
                <br>
                <strong>数学分析：</strong><br>
                检查上一步的移动向量：如果移动向量过大或方向错误，就会导致越界。<br>
                <br>
                <strong>修正方法：</strong><br>
                ${e.suggestion}
            `,
            island_collision: (e) => `
                <strong>碰撞检测（圆-点）：</strong><br>
                岛屿中心: (${e.details.islandCenter.x.toFixed(2)}, ${e.details.islandCenter.y.toFixed(2)})<br>
                岛屿半径: ${e.details.islandRadius} 像素<br>
                碰撞点: (${e.details.impactPosition.x.toFixed(2)}, ${e.details.impactPosition.y.toFixed(2)})<br>
                碰撞距离: ${e.details.distance.toFixed(2)} 像素<br>
                <br>
                <strong>数学公式：</strong><br>
                碰撞条件: $\sqrt{(x - x_0)^2 + (y - y_0)^2} < r$<br>
                其中 $(x_0, y_0)$ 是岛屿中心，$r$ 是半径。<br>
                <br>
                <strong>修正方法：</strong><br>
                ${e.suggestion}
            `,
            grid_misalignment: (e) => `
                <strong>对齐分析：</strong><br>
                实际位置: ${e.details.actualPosition.toString()}<br>
                最近网格点: ${e.details.snappedPosition.toString()}<br>
                网格坐标: ${e.details.gridCoordinate}<br>
                偏差: ${e.details.distance.toFixed(2)} 像素<br>
                <br>
                <strong>可能的原因：</strong><br>
                1. 向量分量不是整数<br>
                2. 角度计算有误差<br>
                3. 浮点运算精度问题<br>
                <br>
                <strong>修正方法：</strong><br>
                ${e.suggestion}
            `
        };

        return explanations[error.type] ? explanations[error.type](error) : error.description;
    }

    static getErrorTypes() {
        return {
            opposite_direction: {
                name: '方向相反',
                description: '两个向量方向几乎相反，相互抵消',
                common_causes: ['风向设置错误', '角度理解错误', '坐标系混淆'],
                learning_objective: '理解向量加法的几何意义，特别是相反向量的和'
            },
            unit_error: {
                name: '单位错误',
                description: '向量的大小不符合预期值',
                common_causes: ['公式错误', '单位混淆', '计算错误'],
                learning_objective: '掌握向量的大小（模）的计算方法'
            },
            out_of_bounds: {
                name: '越界错误',
                description: '帆船驶出网格边界',
                common_causes: ['向量过大', '方向错误', '未考虑边界'],
                learning_objective: '学习边界检测和约束条件处理'
            },
            island_collision: {
                name: '岛屿碰撞',
                description: '帆船撞上障碍物',
                common_causes: ['未检测障碍物', '路径规划错误', '向量计算错误'],
                learning_objective: '掌握碰撞检测算法和路径规划'
            },
            grid_misalignment: {
                name: '网格不对齐',
                description: '位置点没有对齐到网格交点',
                common_causes: ['向量分量非整数', '浮点误差', '角度误差'],
                learning_objective: '理解坐标系统和对齐的重要性'
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorDetector };
}
