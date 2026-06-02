import * as THREE from 'three';
import { PhysicsEngine } from './physics.js';

const _ReportGenerator = (() => {
    const { Constants, BOUNDARY } = PhysicsEngine;
    const { AU, M_SUN, DAY_SECONDS } = Constants;

    function formatNumber(num, units = '', digits = 2) {
        if (!isFinite(num)) return '∞';
        if (Math.abs(num) >= 1e9 || (Math.abs(num) < 0.001 && num !== 0)) {
            return num.toExponential(digits) + (units ? ' ' + units : '');
        }
        return num.toFixed(digits) + (units ? ' ' + units : '');
    }

    function formatDistance(meters) {
        if (!isFinite(meters)) return '∞';
        const au = meters / AU;
        if (Math.abs(au) >= 0.1) {
            return au.toFixed(3) + ' AU';
        }
        const km = meters / 1000;
        if (Math.abs(km) >= 1) {
            return km.toFixed(2) + ' 万公里';
        }
        return (meters).toFixed(0) + ' 米';
    }

    function formatMass(kg) {
        if (!isFinite(kg)) return '∞';
        const solarMass = kg / M_SUN;
        if (Math.abs(solarMass) >= 0.001) {
            return solarMass.toFixed(4) + ' M☉';
        }
        return formatNumber(kg, 'kg', 2);
    }

    function formatVelocity(mps) {
        if (!isFinite(mps)) return '∞';
        const kmps = mps / 1000;
        if (Math.abs(kmps) >= 1) {
            return kmps.toFixed(2) + ' km/s';
        }
        return mps.toFixed(2) + ' m/s';
    }

    function formatTime(days) {
        if (!isFinite(days)) return '∞';
        if (days < 1) {
            return (days * 24).toFixed(1) + ' 小时';
        }
        if (days < 365) {
            return days.toFixed(1) + ' 天';
        }
        const years = days / 365.25;
        if (years < 1000) {
            return years.toFixed(2) + ' 年';
        }
        return formatNumber(years, '年', 2);
    }

    function explainEccentricity(e) {
        if (!isFinite(e)) return '无法计算';
        if (e < 0.01) return '接近完美圆形，像地球绕太阳的轨道';
        if (e < 0.1) return '略扁的椭圆形，和大多数行星类似';
        if (e < 0.3) return '明显的椭圆形，有近日点和远日点之分';
        if (e < 0.5) return '很扁的椭圆形，像彗星轨道';
        if (e < 0.8) return '非常扁长，天体在远日点会飞得很远';
        if (e < 0.99) return '极度扁长，几乎是一条直线';
        if (e >= 1) return '抛物线或双曲线轨道，这个天体将会一去不复返';
        return '不规则形状';
    }

    function explainInclination(radians) {
        const degrees = radians * 180 / Math.PI;
        if (degrees < 1) return '几乎在黄道面上，和大多数行星同一平面';
        if (degrees < 10) return '略微倾斜，有小角度的上下摆动';
        if (degrees < 30) return '明显倾斜，会穿过黄道面上下';
        if (degrees < 60) return '大幅倾斜，轨道平面倾角较大';
        if (degrees < 90) return '陡峭倾斜，接近垂直于黄道面';
        return '逆向轨道，和大多数天体运动方向相反';
    }

    function explainStability(index) {
        if (index >= 80) return { text: '非常稳定', class: 'success-text' };
        if (index >= 60) return { text: '基本稳定', class: 'success-text' };
        if (index >= 40) return { text: '轻微不稳定', class: 'warning-text' };
        if (index >= 20) return { text: '不稳定', class: 'warning-text' };
        return { text: '极不稳定', class: 'error-text' };
    }

    function explainEnergyDrift(drift) {
        if (drift < 0.1) return '能量守恒极佳，模拟精度很高';
        if (drift < 1) return '能量略有漂移，但在可接受范围内';
        if (drift < 5) return '能量漂移明显，建议减小时间步长';
        return '能量漂移严重，模拟结果不可靠，请大幅减小时间步长';
    }

    class Report {
        constructor(solver, dataStore, config = {}) {
            this.solver = solver;
            this.dataStore = dataStore;
            this.config = config;
            this.generatedAt = new Date();
        }

        generateHTML() {
            const sections = [];

            sections.push(this.generateHeader());
            sections.push(this.generateOverview());
            sections.push(this.generateBodyAnalysis());
            sections.push(this.generatePerturbationAnalysis());
            sections.push(this.generateCollisionAnalysis());
            sections.push(this.generateBoundaryAnalysis());
            sections.push(this.generateEnergyAnalysis());
            sections.push(this.generateDataQualityReport());
            sections.push(this.generateRecommendations());

            return sections.join('\n');
        }

        generateHeader() {
            return `
                <h3>📊 轨道分析报告</h3>
                <p>生成时间: <span class="highlight">${this.generatedAt.toLocaleString('zh-CN')}</span></p>
                <p>模拟时长: <span class="highlight">${formatTime(this.solver.time)}</span></p>
                <p>时间步长: <span class="highlight">${this.solver.timeStep.toFixed(1)} 天</span></p>
            `;
        }

        generateOverview() {
            const bodies = this.solver.bodies;
            const typeCounts = {};
            for (const body of bodies) {
                typeCounts[body.type] = (typeCounts[body.type] || 0) + 1;
            }

            const typeLabels = {
                star: '恒星', planet: '行星', moon: '卫星',
                asteroid: '小行星', comet: '彗星', blackhole: '黑洞'
            };

            let typeSummary = '';
            for (const [type, count] of Object.entries(typeCounts)) {
                typeSummary += `${typeLabels[type] || type} × ${count}, `;
            }
            typeSummary = typeSummary.slice(0, -2);

            return `
                <h3>🌍 系统概览</h3>
                <p>本系统包含 <span class="highlight">${bodies.length}</span> 个天体：${typeSummary}</p>
                <p>系统总能量: <span class="highlight">${formatNumber(this.solver.systemEnergy.total, 'J', 2)}</span></p>
                ${this.solver.collisions.length > 0 ? `
                    <p class="warning-text">⚠️ 已记录 ${this.solver.collisions.length} 次碰撞事件</p>
                ` : ''}
                ${this.solver.warnings.length > 0 ? `
                    <p class="warning-text">⚠️ 存在 ${this.solver.warnings.length} 个系统警告</p>
                ` : ''}
            `;
        }

        generateBodyAnalysis() {
            const centralBody = this.findCentralBody();
            const bodyAnalyses = [];

            for (const body of this.solver.bodies) {
                const stability = this.solver.analyzeOrbitStability(body, centralBody);
                const elements = body.getOrbitalElements(centralBody);
                
                bodyAnalyses.push({
                    body,
                    stability,
                    elements,
                    centralBody
                });
            }

            let html = '<h3>🪐 各天体轨道分析</h3>';
            
            html += '<table class="data-table"><thead><tr>';
            html += '<th>天体</th><th>类型</th><th>质量</th><th>轨道形状</th>';
            html += '<th>半长轴</th><th>公转周期</th><th>稳定性</th>';
            html += '</tr></thead><tbody>';

            for (const { body, stability, elements } of bodyAnalyses) {
                const stabInfo = stability ? explainStability(stability.stabilityIndex) : { text: '无法评估', class: 'warning-text' };
                const eccExplain = elements ? explainEccentricity(elements.eccentricity) : '无法计算';
                const semiMajorAxis = elements ? formatDistance(elements.semiMajorAxis) : '—';
                const period = elements ? formatTime(elements.period) : '—';

                const typeLabels = {
                    star: '恒星', planet: '行星', moon: '卫星',
                    asteroid: '小行星', comet: '彗星', blackhole: '黑洞'
                };

                html += `<tr>
                    <td><strong>${body.name}</strong></td>
                    <td>${typeLabels[body.type] || body.type}</td>
                    <td>${formatMass(body.mass)}</td>
                    <td title="${eccExplain}">${elements ? 'e=' + elements.eccentricity.toFixed(3) : '—'}</td>
                    <td>${semiMajorAxis}</td>
                    <td>${period}</td>
                    <td class="${stabInfo.class}">${stabInfo.text} (${stability?.stabilityIndex?.toFixed(0) || '—'})</td>
                </tr>`;
            }

            html += '</tbody></table>';

            for (const { body, stability, elements, centralBody } of bodyAnalyses) {
                if (centralBody && body.id !== centralBody.id && elements) {
                    html += `
                        <p><strong>${body.name}</strong> 围绕 ${centralBody.name} 运行:</p>
                        <ul>
                            <li>轨道偏心率 e = ${elements.eccentricity.toFixed(4)} — ${explainEccentricity(elements.eccentricity)}</li>
                            <li>轨道倾角 i = ${(elements.inclination * 180 / Math.PI).toFixed(1)}° — ${explainInclination(elements.inclination)}</li>
                            <li>${elements.isBound ? 
                                `<span class="success-text">✓ 束缚轨道，公转周期 ${formatTime(elements.period)}</span>` : 
                                `<span class="error-text">✗ 非束缚轨道，该天体将逃离系统</span>`
                            }</li>
                            ${stability && stability.perturbations.length > 0 ? `
                                <li>主要摄动源:
                                    <ul>
                                        ${stability.perturbations.slice(0, 3).map(p => `
                                            <li>${p.body.name}（强度 ${p.strength.toExponential(2)}）</li>
                                        `).join('')}
                                    </ul>
                                </li>
                            ` : ''}
                        </ul>
                    `;
                }
            }

            return html;
        }

        generatePerturbationAnalysis() {
            const centralBody = this.findCentralBody();
            const perturbations = [];

            for (const body of this.solver.bodies) {
                if (body.id === centralBody?.id) continue;
                
                const dominant = this.solver.getDominantPerturbation(body);
                const stability = this.solver.analyzeOrbitStability(body, centralBody);
                
                if (dominant || (stability && stability.perturbations.length > 0)) {
                    perturbations.push({
                        body,
                        dominant,
                        stability
                    });
                }
            }

            if (perturbations.length === 0) {
                return `
                    <h3>🌙 摄动分析</h3>
                    <p class="success-text">✓ 系统中未检测到显著的轨道摄动，各天体运动相对独立。</p>
                `;
            }

            let html = '<h3>🌙 摄动分析</h3>';
            html += '<p>轨道摄动是指天体在主要引力作用之外，受到其他天体引力影响而产生的轨道偏差。</p>';

            for (const p of perturbations) {
                html += `<p><strong>${p.body.name}</strong> 的摄动情况:</p><ul>`;
                
                if (p.dominant) {
                    html += `<li>主要摄动力来自 <span class="highlight">${p.dominant.source}</span></li>`;
                }
                
                if (p.stability && p.stability.perturbations.length > 0) {
                    html += `<li>影响较大的摄动体 (按强度排序):<ul>`;
                    for (const pert of p.stability.perturbations.slice(0, 5)) {
                        html += `<li>${pert.body.name}: 摄动强度 ${pert.strength.toExponential(2)}</li>`;
                    }
                    html += `</ul></li>`;
                }

                if (p.stability && !p.stability.isStable) {
                    html += `<li class="warning-text">⚠️ 该轨道受摄动影响较大，可能不稳定</li>`;
                }
                
                html += `</ul>`;
            }

            return html;
        }

        generateCollisionAnalysis() {
            const collisions = this.solver.collisions;
            
            if (collisions.length === 0) {
                return `
                    <h3>💥 碰撞事件</h3>
                    <p class="success-text">✓ 在模拟期间未检测到碰撞事件。</p>
                `;
            }

            let html = '<h3>💥 碰撞事件分析</h3>';
            html += `<p class="error-text">⚠️ 检测到 ${collisions.length} 次碰撞事件:</p>`;

            for (let i = 0; i < collisions.length; i++) {
                const c = collisions[i];
                html += `
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                        <p><strong>碰撞 #${i + 1}: ${c.bodyA.name} ↔ ${c.bodyB.name}</strong></p>
                        <ul>
                            <li>发生时间: <span class="highlight">第 ${formatTime(c.time)}</span></li>
                            <li>碰撞时距离: <span class="highlight">${formatDistance(c.distance)}</span></li>
                            <li>相对速度: <span class="highlight">${formatVelocity(c.relativeVelocity)}</span></li>
                            <li>碰撞参数: <span class="highlight">${formatDistance(c.impactParameter)}</span></li>
                        </ul>
                        ${this.generateCollisionEvidenceAnalysis(c)}
                    </div>
                `;
            }

            return html;
        }

        generateCollisionEvidenceAnalysis(collision) {
            const analysis = this.dataStore.evidenceAnalyzer.analyzeCollisionEvidence(collision);
            
            if (analysis.isSufficient) {
                return `<p class="success-text">✓ 证据充足 (置信度 ${(analysis.confidence * 100).toFixed(0)}%)，可确认碰撞发生。</p>`;
            }

            let html = `<p class="warning-text">⚠️ 证据不足 (置信度 ${(analysis.confidence * 100).toFixed(0)}%)，缺少以下证据:</p><ul>`;
            
            for (const item of analysis.missing) {
                const priority = item.required ? 
                    '<span class="error-text">[必需]</span>' : 
                    '<span class="warning-text">[补充]</span>';
                html += `<li>${priority} ${item.label}</li>`;
            }
            
            html += `</ul>`;
            html += `<p class="hint" style="font-size: 12px;">💡 建议: 请补充上述观测数据，以提高碰撞事件的可信度。</p>`;
            
            return html;
        }

        generateBoundaryAnalysis() {
            const warnings = this.solver.warnings;
            const escapedBodies = this.solver.bodies.filter(b => b.escapeDetected);
            const divergentBodies = this.solver.bodies.filter(b => b.divergenceDetected);

            if (warnings.length === 0 && escapedBodies.length === 0 && divergentBodies.length === 0) {
                return `
                    <h3>⚠️ 边界与稳定性检查</h3>
                    <p class="success-text">✓ 所有天体均在合理范围内运动，未检测到边界越界或数值发散。</p>
                `;
            }

            let html = '<h3>⚠️ 边界与稳定性检查</h3>';

            if (escapedBodies.length > 0) {
                html += `<p class="warning-text">以下天体已飞离系统边界 (${formatDistance(BOUNDARY.MAX_DISTANCE)}):</p><ul>`;
                for (const body of escapedBodies) {
                    const dist = body.position.length();
                    html += `<li>${body.name}: 当前距离 ${formatDistance(dist)}</li>`;
                }
                html += `</ul>`;
                html += `<p class="hint" style="font-size: 12px;">💡 这意味着这些天体获得了足够的动能逃离系统引力束缚，可能是因为：
                    <ol>
                        <li>初始速度过高（超过逃逸速度）</li>
                        <li>与其他天体近距离相遇获得了引力弹弓加速</li>
                        <li>系统总能量为正，本身就是非束缚系统</li>
                    </ol>
                </p>`;
            }

            if (divergentBodies.length > 0) {
                html += `<p class="error-text">以下天体出现数值发散:</p><ul>`;
                for (const body of divergentBodies) {
                    html += `<li>${body.name}: 轨道计算出现数值不稳定</li>`;
                }
                html += `</ul>`;
                html += `<p class="hint" style="font-size: 12px;">💡 <strong>为什么会发散？</strong> 数值发散通常是因为时间步长太大。
                    当两个天体靠得很近时，引力变化非常快，如果时间步长不够小，计算就会"跳步"，导致误差累积最终失控。
                    请尝试将时间步长减小到当前的 1/3 或更小。</p>`;
            }

            if (warnings.length > 0) {
                html += `<p>其他系统警告:</p><ul>`;
                for (const w of warnings) {
                    const className = w.level === 'error' ? 'error-text' : 'warning-text';
                    html += `<li class="${className}">${w.message}</li>`;
                }
                html += `</ul>`;
            }

            return html;
        }

        generateEnergyAnalysis() {
            const energyCheck = this.solver.checkEnergyConservation();
            
            if (!energyCheck) {
                return `
                    <h3>⚡ 能量守恒检查</h3>
                    <p class="warning-text">模拟时间太短，无法进行有效的能量守恒分析。</p>
                `;
            }

            const driftExplanation = explainEnergyDrift(energyCheck.drift);

            return `
                <h3>⚡ 能量守恒检查</h3>
                <p>初始总能量: <span class="highlight">${formatNumber(energyCheck.initial, 'J', 2)}</span></p>
                <p>当前总能量: <span class="highlight">${formatNumber(energyCheck.current, 'J', 2)}</span></p>
                <p>能量漂移: <span class="${energyCheck.isProblematic ? 'error-text' : 'success-text'}">${energyCheck.drift.toFixed(4)}%</span></p>
                <p>${driftExplanation}</p>
                ${energyCheck.isProblematic ? `
                    <p class="hint" style="font-size: 12px;">💡 能量漂移超过 1% 意味着模拟精度可能不足。
                    能量不守恒通常是因为:
                    <ol>
                        <li>时间步长太大 — 试试减小到当前的 1/3 到 1/5</li>
                        <li>天体之间发生了近距离接触 — 这时候需要更小的时间步长</li>
                        <li>系统本身是混沌的 — 某些 N 体系统本身就对初始条件极度敏感</li>
                    </ol>
                    </p>
                ` : ''}
            `;
        }

        generateDataQualityReport() {
            const conflicts = this.dataStore.conflicts;
            
            if (conflicts.length === 0) {
                return `
                    <h3>📋 数据质量报告</h3>
                    <p class="success-text">✓ 数据一致性良好，未检测到参数冲突。</p>
                `;
            }

            let html = '<h3>📋 数据质量报告</h3>';
            html += `<p class="warning-text">⚠️ 存在 ${conflicts.length} 个未解决的数据冲突:</p>`;

            for (const conflict of conflicts) {
                const diffPercent = conflict.getDifferencePercent();
                html += `
                    <div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                        <p><strong>${conflict.bodyId}: ${conflict.getDescription()}</strong></p>
                        <ul>
                            <li>来源 ${conflict.sourceA}: ${this.formatValue(conflict.field, conflict.valueA)}</li>
                            <li>来源 ${conflict.sourceB}: ${this.formatValue(conflict.field, conflict.valueB)}</li>
                            ${diffPercent !== null ? `<li>差异程度: <span class="error-text">${diffPercent.toFixed(1)}%</span></li>` : ''}
                        </ul>
                        <p class="hint" style="font-size: 12px;">💡 请在左侧"数据管理"面板中手动选择采用哪个值，或使用批量解决功能。</p>
                    </div>
                `;
            }

            return html;
        }

        generateRecommendations() {
            const recommendations = [];
            
            const energyCheck = this.solver.checkEnergyConservation();
            if (energyCheck && energyCheck.isProblematic) {
                recommendations.push({
                    priority: '高',
                    text: '减小时间步长',
                    detail: `当前能量漂移 ${energyCheck.drift.toFixed(2)}%，建议将时间步长从 ${this.solver.timeStep.toFixed(1)} 天减小到 ${(this.solver.timeStep / 3).toFixed(1)} 天以提高模拟精度。`
                });
            }

            const divergentBodies = this.solver.bodies.filter(b => b.divergenceDetected);
            if (divergentBodies.length > 0) {
                recommendations.push({
                    priority: '高',
                    text: '处理数值发散',
                    detail: `${divergentBodies.map(b => b.name).join('、')} 出现数值发散。这是因为时间步长太大导致的计算误差累积。请将时间步长至少减小到当前的 1/5。`
                });
            }

            const unstableBodies = [];
            const centralBody = this.findCentralBody();
            for (const body of this.solver.bodies) {
                const stability = this.solver.analyzeOrbitStability(body, centralBody);
                if (stability && stability.stabilityIndex < 40) {
                    unstableBodies.push(body.name);
                }
            }
            if (unstableBodies.length > 0) {
                recommendations.push({
                    priority: '中',
                    text: '关注不稳定轨道',
                    detail: `${unstableBodies.join('、')} 的轨道稳定性较低，可能在长期演化中发生剧烈变化。建议延长模拟时间观察其行为。`
                });
            }

            const escapedBodies = this.solver.bodies.filter(b => b.escapeDetected);
            if (escapedBodies.length > 0) {
                recommendations.push({
                    priority: '中',
                    text: '分析逃逸原因',
                    detail: `${escapedBodies.map(b => b.name).join('、')} 已逃离系统。请检查是初始速度过高，还是引力相互作用导致的逃逸。`
                });
            }

            if (this.dataStore.conflicts.length > 0) {
                recommendations.push({
                    priority: '中',
                    text: '解决数据冲突',
                    detail: `存在 ${this.dataStore.conflicts.length} 个数据冲突未解决。不同来源的数据参数不一致可能影响模拟结果的可信度。`
                });
            }

            if (recommendations.length === 0) {
                return `
                    <h3>💡 操作建议</h3>
                    <p class="success-text">✓ 当前模拟状态良好，无特别需要处理的问题。</p>
                    <p>您可以：</p>
                    <ul>
                        <li>尝试调整某天体的质量或初速度，观察轨道如何变化</li>
                        <li>开启"显示轨迹点"查看详细运动历史</li>
                        <li>点击任意天体查看其详细轨道参数</li>
                        <li>使用截图功能保存当前场景</li>
                    </ul>
                `;
            }

            let html = '<h3>💡 操作建议</h3>';
            html += '<table class="data-table"><thead><tr>';
            html += '<th>优先级</th><th>建议</th><th>详细说明</th>';
            html += '</tr></thead><tbody>';

            for (const rec of recommendations) {
                const priorityClass = rec.priority === '高' ? 'error-text' : 'warning-text';
                html += `<tr>
                    <td class="${priorityClass}">${rec.priority}</td>
                    <td><strong>${rec.text}</strong></td>
                    <td>${rec.detail}</td>
                </tr>`;
            }

            html += '</tbody></table>';

            return html;
        }

        formatValue(field, value) {
            if (typeof value === 'number') {
                if (field === 'mass') return formatMass(value);
                if (field === 'radius') return formatDistance(value);
                if (field === 'velocity') return formatVelocity(value);
                return value.toString();
            }
            if (typeof value === 'object' && value !== null) {
                return `(${value.x?.toFixed(2) || 0}, ${value.y?.toFixed(2) || 0}, ${value.z?.toFixed(2) || 0})`;
            }
            return String(value);
        }

        findCentralBody() {
            if (this.solver.bodies.length === 0) return null;
            
            let mostMassive = this.solver.bodies[0];
            for (const body of this.solver.bodies) {
                if (body.mass > mostMassive.mass) {
                    mostMassive = body;
                }
            }
            
            if (mostMassive.mass < M_SUN * 0.01 && this.solver.bodies.length > 2) {
                const barycenter = new THREE.Vector3(0, 0, 0);
                let totalMass = 0;
                for (const body of this.solver.bodies) {
                    barycenter.add(body.position.clone().multiplyScalar(body.mass));
                    totalMass += body.mass;
                }
                barycenter.divideScalar(totalMass);
                
                return {
                    id: 'barycenter',
                    name: '系统质心',
                    mass: totalMass,
                    position: barycenter,
                    velocity: new THREE.Vector3(0, 0, 0)
                };
            }
            
            return mostMassive;
        }

        generatePlainText() {
            const html = this.generateHTML();
            return html
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
    }

    return {
        Report,
        formatters: {
            formatNumber,
            formatDistance,
            formatMass,
            formatVelocity,
            formatTime,
            explainEccentricity,
            explainInclination,
            explainStability,
            explainEnergyDrift
        }
    };
})();

export const ReportGenerator = window.ReportGenerator || _ReportGenerator;
window.ReportGenerator = ReportGenerator;
