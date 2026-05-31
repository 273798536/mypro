const UI = (function() {
    let canvas, ctx;
    let currentTraceRecordId = null;

    function init() {
        canvas = document.getElementById('kline-canvas');
        ctx = canvas.getContext('2d');
        
        bindEvents();
        updateGameDisplay();
        renderCurrentLevel();
    }

    function bindEvents() {
        document.getElementById('btn-execute').addEventListener('click', handleExecute);
        document.getElementById('btn-next').addEventListener('click', handleNextLevel);
        document.getElementById('btn-review').addEventListener('click', handleReview);
        document.getElementById('btn-kline-source').addEventListener('click', showSourceModal);
        document.getElementById('btn-close-source').addEventListener('click', hideSourceModal);
        document.getElementById('btn-clear-history').addEventListener('click', handleClearHistory);
        
        document.getElementById('result-modal').addEventListener('click', function(e) {
            if (e.target === this) hideResultModal();
        });
        
        document.getElementById('source-modal').addEventListener('click', function(e) {
            if (e.target === this) hideSourceModal();
        });
    }

    function updateGameDisplay() {
        const state = Game.getState();
        
        document.getElementById('level').textContent = state.currentLevel;
        document.getElementById('score').textContent = state.score;
        
        const healthPercent = (state.health / state.maxHealth) * 100;
        const healthFill = document.getElementById('health-fill');
        healthFill.style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = `${state.health}/${state.maxHealth}`;
        
        healthFill.classList.remove('danger', 'warning');
        if (healthPercent <= 30) {
            healthFill.classList.add('danger');
        } else if (healthPercent <= 60) {
            healthFill.classList.add('warning');
        }
    }

    function renderCurrentLevel() {
        const state = Game.getState();
        const level = state.currentLevelData;
        
        if (!level) return;
        
        const currentKLine = level.klineData[level.klineData.length - 1];
        
        document.getElementById('kline-open').textContent = currentKLine.open;
        document.getElementById('kline-high').textContent = currentKLine.high;
        document.getElementById('kline-low').textContent = currentKLine.low;
        document.getElementById('kline-close').textContent = currentKLine.close;
        document.getElementById('kline-volume').textContent = formatVolume(currentKLine.volume);
        
        const avgVolume = currentKLine.avgVolume || 100000;
        const volumePercent = Math.min(100, (currentKLine.volume / (avgVolume * 2)) * 100);
        document.getElementById('volume-fill').style.width = volumePercent + '%';
        
        drawKLineChart(level.klineData);
        
        renderJudgmentOptions();
        renderActionOptions();
        renderEnemyForces(level);
        renderHistory();
        
        updateExecuteButton();
    }

    function drawKLineChart(data) {
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let minPrice = Infinity, maxPrice = -Infinity;
        let maxVolume = 0;
        
        data.forEach(d => {
            minPrice = Math.min(minPrice, d.low);
            maxPrice = Math.max(maxPrice, d.high);
            maxVolume = Math.max(maxVolume, d.volume);
        });
        
        const priceRange = maxPrice - minPrice || 1;
        const candleWidth = (chartWidth / data.length) * 0.6;
        const candleGap = (chartWidth / data.length) * 0.4;
        
        drawGrid(padding, chartWidth, chartHeight, minPrice, maxPrice);
        
        data.forEach((d, i) => {
            const x = padding.left + i * (candleWidth + candleGap) + candleGap / 2;
            
            const openY = padding.top + chartHeight - ((d.open - minPrice) / priceRange) * chartHeight;
            const closeY = padding.top + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight;
            const highY = padding.top + chartHeight - ((d.high - minPrice) / priceRange) * chartHeight;
            const lowY = padding.top + chartHeight - ((d.low - minPrice) / priceRange) * chartHeight;
            
            const isBullish = d.close > d.open;
            const isBearish = d.close < d.open;
            
            ctx.strokeStyle = isBullish ? '#e74c3c' : '#27ae60';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + candleWidth / 2, highY);
            ctx.lineTo(x + candleWidth / 2, lowY);
            ctx.stroke();
            
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.abs(closeY - openY) || 1;
            
            ctx.fillStyle = isBullish ? '#e74c3c' : '#27ae60';
            ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
            
            if (i === data.length - 1) {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x - 3, bodyTop - 3, candleWidth + 6, bodyHeight + 6);
                ctx.setLineDash([]);
                
                const features = KLine.analyzeKLine(d);
                
                if (features.upperWickToBodyRatio > 2) {
                    drawAnnotation(x + candleWidth / 2, highY - 10, '⚠️ 长上影线', '#e74c3c');
                }
                if (features.lowerWickToBodyRatio > 2) {
                    drawAnnotation(x + candleWidth / 2, lowY + 20, '⚠️ 长下影线', '#27ae60');
                }
            }
        });
        
        drawPriceLabels(padding, chartHeight, minPrice, maxPrice);
    }

    function drawGrid(padding, width, height, minPrice, maxPrice) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (height / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + width, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + height);
        ctx.stroke();
    }

    function drawPriceLabels(padding, height, minPrice, maxPrice) {
        ctx.fillStyle = '#888';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        
        const gridLines = 5;
        const priceStep = (maxPrice - minPrice) / gridLines;
        
        for (let i = 0; i <= gridLines; i++) {
            const price = maxPrice - priceStep * i;
            const y = padding.top + (height / gridLines) * i;
            ctx.fillText(price.toFixed(1), padding.left - 10, y + 4);
        }
    }

    function drawAnnotation(x, y, text, color) {
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        
        const textWidth = ctx.measureText(text).width;
        const padding = 4;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - textWidth / 2 - padding, y - 14, textWidth + padding * 2, 18);
        
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    function formatVolume(vol) {
        if (vol >= 10000) {
            return (vol / 10000).toFixed(1) + '万';
        }
        return vol.toString();
    }

    function renderJudgmentOptions() {
        const container = document.getElementById('judgment-options');
        const options = Game.getJudgmentOptions();
        const state = Game.getState();
        
        container.innerHTML = '';
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            if (state.selectedJudgment && state.selectedJudgment.id === option.id) {
                btn.classList.add('selected');
            }
            
            const directionLabel = option.direction === 'bullish' ? '📈' : 
                                  option.direction === 'bearish' ? '📉' : '↔️';
            
            btn.innerHTML = `
                <div><strong>${directionLabel} ${option.name}</strong></div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">${option.desc}</div>
                <div style="font-size: 10px; color: #ffd700; margin-top: 3px;">置信度: ${Math.round(option.confidence * 100)}%</div>
            `;
            
            btn.addEventListener('click', function() {
                Game.selectJudgment(option.id);
                renderJudgmentOptions();
                renderActionOptions();
                updateExecuteButton();
            });
            
            container.appendChild(btn);
        });
    }

    function renderActionOptions() {
        const container = document.getElementById('action-options');
        const state = Game.getState();
        
        container.innerHTML = '';
        
        if (!state.selectedJudgment) {
            container.innerHTML = '<div style="grid-column: 1/-1; color: #666; text-align: center; padding: 20px;">请先判断烛台形态</div>';
            return;
        }
        
        const options = Game.getActionOptions(state.selectedJudgment.direction);
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            if (state.selectedAction && state.selectedAction.id === option.id) {
                btn.classList.add('selected');
            }
            
            const riskLabel = option.risk === 'high' ? '🔴 高风险' : 
                             option.risk === 'medium' ? '🟡 中风险' : '🟢 低风险';
            
            btn.innerHTML = `
                <div><strong>${option.name}</strong></div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">${option.desc}</div>
                <div style="font-size: 10px; margin-top: 3px;">${riskLabel}</div>
            `;
            
            btn.addEventListener('click', function() {
                Game.selectAction(option.id);
                renderActionOptions();
                updateExecuteButton();
            });
            
            container.appendChild(btn);
        });
    }

    function renderEnemyForces(level) {
        const container = document.getElementById('enemy-forces');
        const currentKLine = level.klineData[level.klineData.length - 1];
        const features = KLine.analyzeKLine(currentKLine);
        
        let enemyCount = 3;
        
        if (features.volumeStatus === 'very_high') enemyCount = 5;
        else if (features.volumeStatus === 'high') enemyCount = 4;
        else if (features.volumeStatus === 'low') enemyCount = 2;
        
        if (level.correctDirection === 'bearish') {
            enemyCount = Math.min(6, enemyCount + 1);
        }
        
        container.innerHTML = '';
        for (let i = 0; i < enemyCount; i++) {
            const enemy = document.createElement('div');
            enemy.className = 'enemy-unit';
            enemy.style.animationDelay = (i * 0.2) + 's';
            container.appendChild(enemy);
        }
    }

    function updateExecuteButton() {
        const btn = document.getElementById('btn-execute');
        btn.disabled = !Game.canExecute();
    }

    function handleExecute() {
        const result = Game.executeBattle();
        if (!result) return;
        
        updateGameDisplay();
        
        const castle = document.getElementById('castle');
        if (result.healthChange < 0) {
            castle.classList.add('damaged');
            setTimeout(() => castle.classList.remove('damaged'), 500);
        }
        
        showResultModal(result);
        renderHistory();
    }

    function showResultModal(result) {
        const modal = document.getElementById('result-modal');
        const state = Game.getState();
        
        document.getElementById('result-title').textContent = result.title;
        
        let contentHtml = `
            <p>${result.description}</p>
            <div style="margin-top: 15px; display: flex; gap: 20px;">
                <div>
                    <span style="color: #888;">城池耐久:</span>
                    <strong style="color: ${result.healthChange >= 0 ? '#27ae60' : '#e74c3c'}">
                        ${result.healthChange >= 0 ? '+' : ''}${result.healthChange}
                    </strong>
                </div>
                <div>
                    <span style="color: #888;">获得分数:</span>
                    <strong style="color: ${result.scoreChange >= 0 ? '#27ae60' : '#e74c3c'}">
                        ${result.scoreChange >= 0 ? '+' : ''}${result.scoreChange}
                    </strong>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <p><strong>正确答案:</strong></p>
                <p>
                    形态: <span class="key-point">${getPatternName(result.correctPattern)}</span>
                    | 方向: <span class="${result.correctDirection === 'bullish' ? 'bullish' : 'bearish'}">${result.correctDirection === 'bullish' ? '看涨 📈' : result.correctDirection === 'bearish' ? '看跌 📉' : '观望 ↔️'}</span>
                </p>
            </div>
        `;
        
        document.getElementById('result-content').innerHTML = contentHtml;
        
        let analysisHtml = '<ul>';
        
        if (result.successFactors.length > 0) {
            result.successFactors.forEach(factor => {
                analysisHtml += `<li class="correct">✅ ${factor}</li>`;
            });
        }
        
        if (result.failureReasons.length > 0) {
            result.failureReasons.forEach(reason => {
                analysisHtml += `<li class="incorrect">❌ ${reason}</li>`;
            });
        }
        
        if (result.analysisPoints && result.analysisPoints.length > 0) {
            analysisHtml += `<li style="margin-top: 10px;"><strong class="key-point">📊 关键指标解读:</strong></li>`;
            result.analysisPoints.forEach(point => {
                const icon = point.correct ? '📗' : '📕';
                analysisHtml += `<li class="${point.correct ? 'correct' : 'incorrect'}">${icon} ${point.text}</li>`;
            });
        }
        
        if (result.triggeredTraps && result.triggeredTraps.length > 0) {
            analysisHtml += `<li style="margin-top: 10px;"><strong class="key-point">⚠️ 触发的认知陷阱:</strong></li>`;
            result.triggeredTraps.forEach(trap => {
                analysisHtml += `<li class="incorrect">
                    <strong>${trap.type === 'wick_misjudge' ? '影线误判' : 
                              trap.type === 'volume_divergence' ? '量价背离' :
                              trap.type === 'trend_deviation' ? '趋势偏差' : '事件叠加'}:</strong>
                    ${trap.triggerReason}
                </li>`;
            });
        }
        
        analysisHtml += '</ul>';
        
        if (Game.isGameOver()) {
            analysisHtml += `
                <div style="margin-top: 15px; padding: 10px; background: rgba(231, 76, 60, 0.2); border-radius: 6px; text-align: center;">
                    <strong style="color: #e74c3c;">💀 城池已被攻破！游戏结束</strong>
                </div>
            `;
        }
        
        document.getElementById('result-analysis-content').innerHTML = analysisHtml;
        
        currentTraceRecordId = result.historyRecord ? result.historyRecord.id : null;
        
        const nextBtn = document.getElementById('btn-next');
        if (Game.isGameOver()) {
            nextBtn.textContent = '重新开始';
        } else if (state.currentLevel >= KLine.getAllLevels().length) {
            nextBtn.textContent = '完成教学';
        } else {
            nextBtn.textContent = '下一关';
        }
        
        modal.classList.remove('hidden');
    }

    function getPatternName(patternId) {
        const all = KLine.getAllPatterns();
        const allPatterns = [...all.bullish, ...all.bearish, ...all.neutral];
        const pattern = allPatterns.find(p => p.id === patternId);
        return pattern ? pattern.name : patternId;
    }

    function hideResultModal() {
        document.getElementById('result-modal').classList.add('hidden');
    }

    function handleNextLevel() {
        hideResultModal();
        
        if (Game.isGameOver()) {
            Game.init();
        } else {
            const next = Game.nextLevel();
            if (!next) {
                alert('🎉 恭喜完成所有关卡！\n\n最终分数: ' + Game.getState().score);
                Game.init();
            }
        }
        
        updateGameDisplay();
        renderCurrentLevel();
    }

    function handleReview() {
        hideResultModal();
        if (currentTraceRecordId) {
            showSourceModal(currentTraceRecordId);
        }
    }

    function showSourceModal(recordId = null) {
        const modal = document.getElementById('source-modal');
        const content = document.getElementById('source-content');
        
        let traceData;
        if (recordId) {
            traceData = Game.getTraceData(recordId);
        } else {
            const state = Game.getState();
            if (state.currentLevelData) {
                traceData = KLine.traceDataSource(state.currentLevelData);
            }
        }
        
        if (!traceData) {
            content.innerHTML = '<p>暂无数据来源信息</p>';
            modal.classList.remove('hidden');
            return;
        }
        
        const currentKLine = traceData.rawData;
        const features = traceData.calculatedFeatures;
        const isBullish = currentKLine.close > currentKLine.open;
        
        let html = `
            <div class="source-section">
                <h4>📋 关卡信息</h4>
                <table>
                    <tr><td>关卡名称</td><td>${traceData.levelInfo.name}</td></tr>
                    <tr><td>关卡描述</td><td>${traceData.levelInfo.description}</td></tr>
                </table>
            </div>
            
            <div class="source-section">
                <h4>🔗 数据来源</h4>
                <table>
                    <tr><td>市场来源</td><td>${traceData.source.market}</td></tr>
                    <tr><td>数据源编号</td><td>${traceData.source.dataSource}</td></tr>
                    <tr><td>采集时间</td><td>${traceData.source.collectionTime}</td></tr>
                    <tr><td>预处理说明</td><td>${traceData.source.preCalculation}</td></tr>
                </table>
            </div>
            
            <div class="source-section">
                <h4>📊 原始K线数据</h4>
                <table>
                    <tr><td>开盘价 (Open)</td><td class="${isBullish ? 'kline-up' : 'kline-down'}">${currentKLine.open}</td></tr>
                    <tr><td>最高价 (High)</td><td class="kline-up">${currentKLine.high}</td></tr>
                    <tr><td>最低价 (Low)</td><td class="kline-down">${currentKLine.low}</td></tr>
                    <tr><td>收盘价 (Close)</td><td class="${isBullish ? 'kline-up' : 'kline-down'}">${currentKLine.close}</td></tr>
                    <tr><td>成交量 (Volume)</td><td>${formatVolume(currentKLine.volume)}</td></tr>
                </table>
            </div>
            
            <div class="source-section">
                <h4>🧮 特征计算过程</h4>
                <div class="calculation-detail">
实体大小 = |收盘价 - 开盘价| = |${currentKLine.close} - ${currentKLine.open}| = <strong>${features.bodySize.toFixed(2)}</strong><br>
上影线 = 最高价 - max(开盘, 收盘) = ${currentKLine.high} - ${Math.max(currentKLine.open, currentKLine.close)} = <strong>${features.upperWick.toFixed(2)}</strong><br>
下影线 = min(开盘, 收盘) - 最低价 = ${Math.min(currentKLine.open, currentKLine.close)} - ${currentKLine.low} = <strong>${features.lowerWick.toFixed(2)}</strong><br>
实体/振幅比 = ${features.bodySize.toFixed(2)} / ${features.totalRange.toFixed(2)} = <strong>${(features.bodyToRangeRatio * 100).toFixed(1)}%</strong><br>
上影线/实体比 = ${features.upperWick.toFixed(2)} / ${features.bodySize.toFixed(2)} = <strong>${features.upperWickToBodyRatio.toFixed(2)}</strong><br>
下影线/实体比 = ${features.lowerWick.toFixed(2)} / ${features.bodySize.toFixed(2)} = <strong>${features.lowerWickToBodyRatio.toFixed(2)}</strong><br>
成交量状态 = <strong>${features.volumeStatus}</strong> (均值: ${formatVolume(Math.round(features.avgVolume))})
                </div>
            </div>
            
            <div class="source-section">
                <h4>🔍 形态识别结果</h4>
                <table>
        `;
        
        traceData.patternsIdentified.forEach((p, i) => {
            const direction = getPatternDirection(p.pattern.id);
            const directionLabel = direction === 'bullish' ? '📈 看涨' : 
                                  direction === 'bearish' ? '📉 看跌' : '↔️ 中性';
            html += `
                <tr>
                    <td>${i === 0 ? '★' : ''} ${p.pattern.name}</td>
                    <td>${directionLabel}</td>
                    <td>置信度 ${Math.round(p.confidence * 100)}%</td>
                </tr>
            `;
        });
        
        html += '</table></div>';
        
        if (traceData.volumeRelation) {
            const vr = traceData.volumeRelation;
            html += `
                <div class="source-section">
                    <h4>📈 量价关系分析</h4>
                    <table>
                        <tr><td>价格变动</td><td class="${vr.priceChange > 0 ? 'kline-up' : 'kline-down'}">${vr.priceChange > 0 ? '+' : ''}${vr.priceChange.toFixed(2)} (${vr.priceChangePercent.toFixed(2)}%)</td></tr>
                        <tr><td>成交量变动</td><td class="${vr.volumeChange > 0 ? 'kline-up' : 'kline-down'}">${vr.volumeChange > 0 ? '+' : ''}${formatVolume(vr.volumeChange)} (${vr.volumeChangePercent.toFixed(2)}%)</td></tr>
                        <tr><td>量价关系</td><td class="${vr.divergence ? 'incorrect' : 'correct'}">${vr.relation} ${vr.divergence ? '⚠️ 背离' : '✅ 正常'}</td></tr>
                    </table>
                </div>
            `;
        }
        
        if (traceData.traps && traceData.traps.length > 0) {
            html += `
                <div class="source-section">
                    <h4>⚠️ 本关认知陷阱</h4>
                    <table>
            `;
            traceData.traps.forEach(trap => {
                const typeLabel = trap.type === 'wick_misjudge' ? '影线误判' : 
                                 trap.type === 'volume_divergence' ? '量价背离' :
                                 trap.type === 'trend_deviation' ? '趋势偏差' : '事件叠加';
                html += `
                    <tr>
                        <td>🔴 ${typeLabel}</td>
                        <td>${trap.description}</td>
                    </tr>
                `;
            });
            html += '</table></div>';
        }
        
        content.innerHTML = html;
        modal.classList.remove('hidden');
    }

    function getPatternDirection(patternId) {
        const all = KLine.getAllPatterns();
        if (all.bullish.find(p => p.id === patternId)) return 'bullish';
        if (all.bearish.find(p => p.id === patternId)) return 'bearish';
        return 'neutral';
    }

    function hideSourceModal() {
        document.getElementById('source-modal').classList.add('hidden');
    }

    function renderHistory() {
        const container = document.getElementById('history-list');
        const history = Game.getHistory();
        
        if (history.length === 0) {
            container.innerHTML = '<div class="history-empty">暂无战役记录</div>';
            return;
        }
        
        container.innerHTML = '';
        
        history.forEach(record => {
            const item = document.createElement('div');
            item.className = `history-item ${record.result.type}`;
            
            const resultLabel = record.result.type === 'win' ? '胜利' :
                               record.result.type === 'lose' ? '失败' : '平局';
            
            const healthChange = record.result.healthChange;
            const scoreChange = record.result.scoreChange;
            
            let detailHtml = `
                <span class="judgment-tag">判断: ${record.judgment.name}</span>
                <span class="action-tag">战术: ${record.action.name}</span>
                <br>
                <span style="color: ${healthChange >= 0 ? '#27ae60' : '#e74c3c'};">
                    耐久: ${healthChange >= 0 ? '+' : ''}${healthChange}
                </span>
                <span style="margin-left: 15px; color: ${scoreChange >= 0 ? '#27ae60' : '#e74c3c'};">
                    分数: ${scoreChange >= 0 ? '+' : ''}${scoreChange}
                </span>
            `;
            
            if (record.triggeredTraps && record.triggeredTraps.length > 0) {
                detailHtml += '<br>';
                record.triggeredTraps.forEach(trap => {
                    const typeLabel = trap.type === 'wick_misjudge' ? '影线误判' : 
                                     trap.type === 'volume_divergence' ? '量价背离' :
                                     trap.type === 'trend_deviation' ? '趋势偏差' : '事件叠加';
                    detailHtml += `<span class="error-tag">⚠️ ${typeLabel}</span>`;
                });
            }
            
            if (!record.judgmentCorrect || !record.directionCorrect) {
                detailHtml += `<br><span style="color: #ffd700;">正确答案: ${getPatternName(record.result.correctPattern)} (${record.result.correctDirection === 'bullish' ? '看涨' : record.result.correctDirection === 'bearish' ? '看跌' : '观望'})</span>`;
            }
            
            item.innerHTML = `
                <div class="history-item-header">
                    <span class="history-level">第${record.level}关 - ${record.levelName}</span>
                    <span class="history-result ${record.result.type}">${resultLabel}</span>
                </div>
                <div class="history-detail">
                    ${detailHtml}
                    <br>
                    <span style="color: #666; font-size: 11px;">
                        ${new Date(record.timestamp).toLocaleString()} | 点击查看详情
                    </span>
                </div>
            `;
            
            item.addEventListener('click', function() {
                showSourceModal(record.id);
            });
            
            container.appendChild(item);
        });
    }

    function handleClearHistory() {
        if (confirm('确定要清空所有战役记录吗？')) {
            Game.clearHistory();
            renderHistory();
        }
    }

    return {
        init,
        updateGameDisplay,
        renderCurrentLevel
    };
})();
