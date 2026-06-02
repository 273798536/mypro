const _DataManager = (() => {
    const CONFLICT_THRESHOLDS = {
        mass: 0.1,
        position: 1e9,
        velocity: 100
    };

    const EVIDENCE_REQUIREMENTS = {
        collision: [
            { key: 'collision_time', label: '碰撞时间记录', required: true },
            { key: 'relative_velocity', label: '相对速度测量', required: true },
            { key: 'impact_parameter', label: '碰撞参数计算', required: true },
            { key: 'distance_history', label: '距离历史数据', required: false },
            { key: 'velocity_history', label: '速度历史数据', required: false },
            { key: 'light_curve', label: '光变曲线观测', required: false },
            { key: 'spectral_data', label: '光谱分析数据', required: false }
        ]
    };

    const BODY_TYPES = {
        star: { label: '恒星', color: '#ffd700', minMass: 1e28, maxMass: 1e32 },
        planet: { label: '行星', color: '#4a9eff', minMass: 1e22, maxMass: 1e28 },
        moon: { label: '卫星', color: '#aaaaaa', minMass: 1e18, maxMass: 1e24 },
        asteroid: { label: '小行星', color: '#8b4513', minMass: 1e10, maxMass: 1e21 },
        comet: { label: '彗星', color: '#90ee90', minMass: 1e12, maxMass: 1e18 },
        blackhole: { label: '黑洞', color: '#1a0033', minMass: 1e30, maxMass: 1e40 }
    };

    const PARAMETER_BOUNDS = {
        mass: {
            min: 1e10,
            max: 1e40,
            suggestedMin: 1e15,
            suggestedMax: 1e35,
            units: 'kg'
        },
        position: {
            min: -1e14,
            max: 1e14,
            suggestedMin: -1e13,
            suggestedMax: 1e13,
            units: 'm'
        },
        velocity: {
            min: -1e8,
            max: 1e8,
            suggestedMin: -1e7,
            suggestedMax: 1e7,
            units: 'm/s'
        },
        radius: {
            min: 1e3,
            max: 1e10,
            suggestedMin: 1e4,
            suggestedMax: 1e9,
            units: 'm'
        }
    };

    class DataConflict {
        constructor(bodyId, field, sourceA, valueA, sourceB, valueB) {
            this.id = Math.random().toString(36).substr(2, 9);
            this.bodyId = bodyId;
            this.field = field;
            this.sourceA = sourceA;
            this.valueA = valueA;
            this.sourceB = sourceB;
            this.valueB = valueB;
            this.resolved = false;
            this.resolution = null;
        }

        resolve(choice) {
            this.resolved = true;
            this.resolution = choice;
            return choice === 'A' ? this.valueA : this.valueB;
        }

        getDescription() {
            const fieldLabels = {
                mass: '质量',
                position: '位置',
                velocity: '速度',
                radius: '半径',
                color: '颜色'
            };
            return `${fieldLabels[this.field] || this.field} 参数冲突`;
        }

        getDifferencePercent() {
            if (typeof this.valueA === 'number' && typeof this.valueB === 'number') {
                const max = Math.max(Math.abs(this.valueA), Math.abs(this.valueB));
                if (max === 0) return 0;
                return Math.abs((this.valueA - this.valueB) / max) * 100;
            }
            return null;
        }
    }

    class EvidenceAnalyzer {
        constructor() {
            this.evidence = {};
        }

        addEvidence(key, data, source) {
            this.evidence[key] = {
                data: data,
                source: source,
                timestamp: Date.now()
            };
        }

        analyzeCollisionEvidence(collisionEvent) {
            const missing = [];
            const found = [];

            for (const req of EVIDENCE_REQUIREMENTS.collision) {
                if (this.evidence[req.key]) {
                    found.push({
                        ...req,
                        source: this.evidence[req.key].source
                    });
                } else {
                    missing.push(req);
                }
            }

            const hasSufficient = found.filter(f => f.required).length >= 
                EVIDENCE_REQUIREMENTS.collision.filter(r => r.required).length * 0.5;

            return {
                collision: collisionEvent,
                found: found,
                missing: missing,
                isSufficient: hasSufficient,
                confidence: found.length / EVIDENCE_REQUIREMENTS.collision.length
            };
        }

        getMissingEvidenceReport(analysis) {
            if (analysis.missing.length === 0) {
                return '所有必需证据均已收集完整。';
            }

            const report = [];
            report.push(`碰撞事件"${analysis.collision.bodyA.name} - ${analysis.collision.bodyB.name}"缺少以下证据：`);
            
            for (const item of analysis.missing) {
                const priority = item.required ? '必需' : '补充';
                report.push(`  • [${priority}] ${item.label}`);
            }

            report.push(`\n当前置信度: ${(analysis.confidence * 100).toFixed(1)}%`);
            report.push(`判定结果: ${analysis.isSufficient ? '证据基本充足，可初步判定' : '证据不足，需补充观测数据'}`);

            return report.join('\n');
        }
    }

    class DataStore {
        constructor() {
            this.datasets = {};
            this.conflicts = [];
            this.evidenceAnalyzer = new EvidenceAnalyzer();
            this.currentDatasetName = 'default';
            this.onConflictCallback = null;
        }

        loadDataset(name, data, source = 'user') {
            this.datasets[name] = {
                data: data,
                source: source,
                loadedAt: Date.now()
            };
            return this.datasets[name];
        }

        mergeDatasets(targetName, sourceNames, options = {}) {
            const { resolveConflicts = 'manual' } = options;
            
            const targetData = { bodies: [], timeStep: 1 };
            
            const allBodies = {};
            
            for (const sourceName of sourceNames) {
                const dataset = this.datasets[sourceName];
                if (!dataset || !dataset.data.bodies) continue;

                for (const bodyData of dataset.data.bodies) {
                    const bodyId = bodyData.id || `${sourceName}_${bodyData.name}`;
                    
                    if (!allBodies[bodyId]) {
                        allBodies[bodyId] = { ...bodyData, id: bodyId, source: sourceName };
                    } else {
                        const conflict = this.compareBodyData(
                            allBodies[bodyId], 
                            bodyData, 
                            allBodies[bodyId].source,
                            sourceName
                        );
                        
                        if (conflict.length > 0) {
                            for (const c of conflict) {
                                this.conflicts.push(c);
                                
                                if (resolveConflicts === 'latest') {
                                    allBodies[bodyId][c.field] = c.valueB;
                                } else if (resolveConflicts === 'original') {
                                    allBodies[bodyId][c.field] = c.valueA;
                                }
                            }
                        } else {
                            Object.assign(allBodies[bodyId], bodyData);
                        }
                    }
                }

                if (dataset.data.timeStep) {
                    targetData.timeStep = dataset.data.timeStep;
                }
            }

            targetData.bodies = Object.values(allBodies);
            
            if (this.onConflictCallback && this.conflicts.length > 0) {
                this.onConflictCallback(this.conflicts);
            }

            this.loadDataset(targetName, targetData, 'merged');
            return {
                data: targetData,
                conflicts: [...this.conflicts]
            };
        }

        compareBodyData(bodyA, bodyB, sourceA, sourceB) {
            const conflicts = [];
            const fieldsToCheck = ['mass', 'position', 'velocity', 'radius', 'color'];

            for (const field of fieldsToCheck) {
                const valA = bodyA[field];
                const valB = bodyB[field];

                if (valA === undefined || valB === undefined) continue;

                let hasConflict = false;

                if (typeof valA === 'number' && typeof valB === 'number') {
                    const threshold = CONFLICT_THRESHOLDS[field] || 1e-6;
                    hasConflict = Math.abs(valA - valB) > threshold;
                } else if (typeof valA === 'object' && typeof valB === 'object') {
                    const dist = Math.sqrt(
                        Math.pow((valA.x || 0) - (valB.x || 0), 2) +
                        Math.pow((valA.y || 0) - (valB.y || 0), 2) +
                        Math.pow((valA.z || 0) - (valB.z || 0), 2)
                    );
                    const threshold = CONFLICT_THRESHOLDS[field] || 1e-6;
                    hasConflict = dist > threshold;
                } else {
                    hasConflict = JSON.stringify(valA) !== JSON.stringify(valB);
                }

                if (hasConflict) {
                    conflicts.push(new DataConflict(
                        bodyA.id,
                        field,
                        sourceA,
                        valA,
                        sourceB,
                        valB
                    ));
                }
            }

            return conflicts;
        }

        resolveConflict(conflictId, choice) {
            const conflict = this.conflicts.find(c => c.id === conflictId);
            if (!conflict) return null;

            const resolvedValue = conflict.resolve(choice);
            
            for (const name in this.datasets) {
                const dataset = this.datasets[name];
                const body = dataset.data.bodies?.find(b => b.id === conflict.bodyId);
                if (body) {
                    body[conflict.field] = resolvedValue;
                }
            }

            this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
            
            return resolvedValue;
        }

        resolveAllConflicts(strategy = 'latest') {
            const results = [];
            
            for (const conflict of [...this.conflicts]) {
                const choice = strategy === 'latest' ? 'B' : 'A';
                const value = this.resolveConflict(conflict.id, choice);
                results.push({ conflict, choice, value });
            }

            return results;
        }

        validateBodyData(bodyData) {
            const errors = [];
            const warnings = [];

            if (!bodyData.name) {
                errors.push('天体名称不能为空');
            }

            if (bodyData.mass !== undefined) {
                const bounds = PARAMETER_BOUNDS.mass;
                if (bodyData.mass < bounds.min || bodyData.mass > bounds.max) {
                    errors.push(`质量 ${bodyData.mass.toExponential(2)} kg 超出物理合理范围 [${bounds.min.toExponential()}, ${bounds.max.toExponential()}]`);
                } else if (bodyData.mass < bounds.suggestedMin || bodyData.mass > bounds.suggestedMax) {
                    warnings.push(`质量 ${bodyData.mass.toExponential(2)} kg 超出建议范围，可能导致模拟不稳定`);
                }

                if (bodyData.type && BODY_TYPES[bodyData.type]) {
                    const typeBounds = BODY_TYPES[bodyData.type];
                    if (bodyData.mass < typeBounds.minMass || bodyData.mass > typeBounds.maxMass) {
                        warnings.push(`质量与天体类型"${typeBounds.label}"的典型质量范围不符`);
                    }
                }
            }

            if (bodyData.velocity) {
                const speed = Math.sqrt(
                    Math.pow(bodyData.velocity.x || 0, 2) +
                    Math.pow(bodyData.velocity.y || 0, 2) +
                    Math.pow(bodyData.velocity.z || 0, 2)
                );
                const lightSpeed = 299792458;
                if (speed > lightSpeed * 0.1) {
                    warnings.push(`初速度 ${(speed/1000).toFixed(2)} km/s 超过光速的10%，相对论效应不可忽略`);
                }
            }

            return { errors, warnings, isValid: errors.length === 0 };
        }

        checkParameterBounds(paramName, value) {
            const bounds = PARAMETER_BOUNDS[paramName];
            if (!bounds) return { inRange: true, warning: null };

            const numValue = typeof value === 'number' ? value : 
                (typeof value === 'object' ? 
                    Math.sqrt(Math.pow(value.x||0,2) + Math.pow(value.y||0,2) + Math.pow(value.z||0,2)) : 
                    0);

            const inHardRange = numValue >= bounds.min && numValue <= bounds.max;
            const inSoftRange = numValue >= bounds.suggestedMin && numValue <= bounds.suggestedMax;

            let warning = null;
            if (!inHardRange) {
                warning = {
                    level: 'error',
                    message: `${paramName} = ${numValue.toExponential(2)} ${bounds.units} 超出有效范围 [${bounds.min.toExponential()}, ${bounds.max.toExponential()}]`
                };
            } else if (!inSoftRange) {
                warning = {
                    level: 'warning',
                    message: `${paramName} = ${numValue.toExponential(2)} ${bounds.units} 接近边界，可能影响模拟精度`
                };
            }

            return { inRange: inHardRange, warning: warning, bounds: bounds };
        }

        getBodyTypeInfo(type) {
            return BODY_TYPES[type] || BODY_TYPES.asteroid;
        }

        getAllBodyTypes() {
            return Object.entries(BODY_TYPES).map(([key, value]) => ({
                id: key,
                ...value
            }));
        }

        getParameterBounds(paramName) {
            return PARAMETER_BOUNDS[paramName];
        }

        exportData(datasetName = null) {
            const name = datasetName || this.currentDatasetName;
            const dataset = this.datasets[name];
            return dataset ? JSON.stringify(dataset.data, null, 2) : null;
        }

        importData(jsonString, name = 'imported') {
            try {
                const data = JSON.parse(jsonString);
                
                if (!data.bodies || !Array.isArray(data.bodies)) {
                    return { success: false, error: '无效的数据格式：缺少 bodies 数组' };
                }

                const validationResults = data.bodies.map(b => this.validateBodyData(b));
                const hasErrors = validationResults.some(r => !r.isValid);

                if (hasErrors) {
                    return { 
                        success: false, 
                        error: '数据验证失败',
                        details: validationResults.map((r, i) => ({
                            body: data.bodies[i].name,
                            errors: r.errors,
                            warnings: r.warnings
                        }))
                    };
                }

                this.loadDataset(name, data, 'imported');
                return { 
                    success: true, 
                    data: data,
                    warnings: validationResults.flatMap(r => r.warnings)
                };
            } catch (e) {
                return { success: false, error: 'JSON 解析失败: ' + e.message };
            }
        }

        onConflict(callback) {
            this.onConflictCallback = callback;
        }
    }

    return {
        DataStore,
        DataConflict,
        EvidenceAnalyzer,
        BODY_TYPES,
        PARAMETER_BOUNDS,
        CONFLICT_THRESHOLDS,
        EVIDENCE_REQUIREMENTS
    };
})();

export const DataManager = window.DataManager || _DataManager;
window.DataManager = DataManager;
