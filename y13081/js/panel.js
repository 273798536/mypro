const SidePanel = (function() {
    let containers = [];
    let containerMap = {};
    let currentFrameData = null;
    let filteredRecords = [];
    let selectedContainerId = null;
    let badRecords = [];
    let onContainerSelectCallback = null;
    let onFilterChangeCallback = null;
    let onScreenshotCallback = null;

    let filters = {
        level: 'all',
        status: 'all',
        area: 'all'
    };

    function init(data) {
        containers = data.containers;
        badRecords = data.badRecords;
        containerMap = {};
        containers.forEach(c => {
            containerMap[c.id] = c;
        });

        setupFilterEvents();
        setupScreenshotModal();

        return {
            updateFrame: updateFrame,
            selectContainer: selectContainer,
            onContainerSelect: function(callback) {
                onContainerSelectCallback = callback;
            },
            onFilterChange: function(callback) {
                onFilterChangeCallback = callback;
            },
            onScreenshot: function(callback) {
                onScreenshotCallback = callback;
            },
            getFilterSummary: getFilterSummary,
            getStatsSummary: getStatsSummary,
            getCurrentTime: function() {
                return currentFrameData ? currentFrameData.time : '--:--:--';
            }
        };
    }

    function setupFilterEvents() {
        const applyBtn = document.getElementById('applyFilter');
        const resetBtn = document.getElementById('resetFilter');

        applyBtn.addEventListener('click', applyFilters);
        resetBtn.addEventListener('click', resetFilters);
    }

    function setupScreenshotModal() {
        const screenshotBtn = document.getElementById('screenshotBtn');
        const modal = document.getElementById('screenshotModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelScreenshot');
        const saveBtn = document.getElementById('saveScreenshot');

        screenshotBtn.addEventListener('click', openScreenshotModal);
        closeBtn.addEventListener('click', closeScreenshotModal);
        cancelBtn.addEventListener('click', closeScreenshotModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeScreenshotModal();
            }
        });

        saveBtn.addEventListener('click', () => {
            const note = document.getElementById('screenshotNote').value;
            if (onScreenshotCallback) {
                onScreenshotCallback({
                    time: getCurrentTime(),
                    filter: getFilterSummary(),
                    stats: getStatsSummary(),
                    note: note
                });
            }
            closeScreenshotModal();
        });
    }

    function openScreenshotModal() {
        const modal = document.getElementById('screenshotModal');
        const preview = document.getElementById('screenshotPreview');
        const timeEl = document.getElementById('screenshotTime');
        const filterEl = document.getElementById('screenshotFilter');
        const statsEl = document.getElementById('screenshotStats');

        timeEl.textContent = getCurrentTime();
        filterEl.textContent = getFilterSummary();
        statsEl.textContent = getStatsSummary();

        preview.innerHTML = '';
        const placeholder = document.createElement('div');
        placeholder.style.color = '#718096';
        placeholder.style.fontSize = '14px';
        placeholder.textContent = '📸 3D场景截图预览';
        preview.appendChild(placeholder);

        modal.style.display = 'flex';

        if (onScreenshotCallback) {
            setTimeout(() => {
                onScreenshotCallback({ previewOnly: true });
            }, 100);
        }
    }

    function closeScreenshotModal() {
        document.getElementById('screenshotModal').style.display = 'none';
        document.getElementById('screenshotNote').value = '';
    }

    function applyFilters() {
        filters.level = document.getElementById('filterLevel').value;
        filters.status = document.getElementById('filterStatus').value;
        filters.area = document.getElementById('filterArea').value;

        if (currentFrameData) {
            updateFrame(currentFrameData);
        }

        if (onFilterChangeCallback) {
            onFilterChangeCallback(filters);
        }
    }

    function resetFilters() {
        document.getElementById('filterLevel').value = 'all';
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterArea').value = 'all';

        filters = { level: 'all', status: 'all', area: 'all' };

        if (currentFrameData) {
            updateFrame(currentFrameData);
        }

        if (onFilterChangeCallback) {
            onFilterChangeCallback(filters);
        }
    }

    function updateFrame(frameData) {
        currentFrameData = frameData;
        applyFiltersToData();
        updateStats();
        updateDetailTable();
        checkBadData();
    }

    function applyFiltersToData() {
        if (!currentFrameData) return;

        filteredRecords = currentFrameData.records.filter(record => {
            const container = containerMap[record.containerId];
            if (!container) return false;

            if (filters.level !== 'all' && container.hazardLevel !== parseInt(filters.level)) {
                return false;
            }

            if (filters.status !== 'all' && record.status !== filters.status) {
                return false;
            }

            if (filters.area !== 'all' && container.area !== filters.area) {
                return false;
            }

            return true;
        });
    }

    function updateStats() {
        const total = filteredRecords.length;
        let normalCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        filteredRecords.forEach(record => {
            if (record.status === 'normal') normalCount++;
            else if (record.status === 'warning') warningCount++;
            else if (record.status === 'error') errorCount++;
        });

        animateNumber('statTotal', total);
        animateNumber('statNormal', normalCount);
        animateNumber('statWarning', warningCount);
        animateNumber('statError', errorCount);
    }

    function animateNumber(elementId, targetValue) {
        const el = document.getElementById(elementId);
        const currentValue = parseInt(el.textContent) || 0;
        const diff = targetValue - currentValue;
        const steps = 10;
        const stepValue = diff / steps;
        let step = 0;

        function update() {
            step++;
            const value = Math.round(currentValue + stepValue * step);
            el.textContent = value;
            if (step < steps) {
                requestAnimationFrame(update);
            } else {
                el.textContent = targetValue;
            }
        }

        update();
    }

    function updateDetailTable() {
        const tbody = document.getElementById('detailTableBody');
        const countEl = document.getElementById('detailCount');

        countEl.textContent = `${filteredRecords.length} 条`;

        tbody.innerHTML = '';

        const displayRecords = filteredRecords.slice(0, 50);

        displayRecords.forEach(record => {
            const container = containerMap[record.containerId];
            if (!container) return;

            const hasError = record.status === 'error' || record.hasError;
            const isSelected = record.containerId === selectedContainerId;

            const tr = document.createElement('tr');
            if (hasError) tr.classList.add('has-error');
            if (isSelected) tr.classList.add('selected');

            tr.innerHTML = `
                <td>${container.id}</td>
                <td>${container.area}区${container.row}排${container.col}列${container.level}层</td>
                <td><span class="level-badge level-${container.hazardLevel}">${WarehouseData.hazardLevels[container.hazardLevel].name}</span></td>
                <td><span class="status-indicator ${record.status}"></span>${WarehouseData.statusTypes[record.status].name}</td>
                <td>${record.temperature}°C</td>
            `;

            tr.addEventListener('click', () => {
                selectContainer(container.id);
            });

            tbody.appendChild(tr);
        });

        if (filteredRecords.length > 50) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" style="text-align:center;color:#718096;font-size:11px;">... 还有 ${filteredRecords.length - 50} 条记录</td>`;
            tbody.appendChild(tr);
        }
    }

    function selectContainer(containerId) {
        selectedContainerId = containerId;

        if (currentFrameData) {
            updateDetailTable();
        }

        updateCADInfo(containerId);

        if (onContainerSelectCallback) {
            onContainerSelectCallback(containerId);
        }
    }

    function updateCADInfo(containerId) {
        const cadInfoEl = document.getElementById('cadInfo');
        const container = containerMap[containerId];

        if (!container) {
            cadInfoEl.innerHTML = '<p class="cad-hint">选择记录查看CAD原始数据</p>';
            return;
        }

        const relatedBadRecords = badRecords.filter(br =>
            br.affectedContainers.includes(containerId)
        );

        let badDataHtml = '';
        if (relatedBadRecords.length > 0) {
            badDataHtml = '<div style="margin-top:8px;padding:8px;background:rgba(237,137,54,0.1);border-radius:4px;border-left:3px solid #ed8936;">';
            badDataHtml += `<div style="color:#ed8936;font-weight:600;font-size:12px;margin-bottom:4px;">⚠️ ${relatedBadRecords[0].title}</div>`;
            badDataHtml += `<div style="color:#d69e2e;font-size:11px;">${relatedBadRecords[0].description}</div>`;
            badDataHtml += '</div>';
        }

        cadInfoEl.innerHTML = `
            <div class="cad-detail-row">
                <span class="cad-label">容器名称</span>
                <span class="cad-value">${container.name}</span>
            </div>
            <div class="cad-detail-row">
                <span class="cad-label">所在区域</span>
                <span class="cad-value">${container.area}区</span>
            </div>
            <div class="cad-detail-row">
                <span class="cad-label">CAD图层</span>
                <span class="cad-value">${container.cadSource.layerName}</span>
            </div>
            <div class="cad-detail-row">
                <span class="cad-label">行号</span>
                <span class="cad-value">第 ${container.cadSource.lineNumber} 行</span>
            </div>
            <div class="cad-source-line">${container.cadSource.rawData}</div>
            ${badDataHtml}
        `;
    }

    function checkBadData() {
        if (!currentFrameData) return;

        const frameIndex = currentFrameData.index;
        const activeBadRecords = badRecords.filter(br =>
            frameIndex >= br.detectedFrame - 2 && frameIndex <= br.detectedFrame + 5
        );

        const warningEl = document.getElementById('dataQualityWarning');
        const warningBody = document.getElementById('warningBody');

        if (activeBadRecords.length > 0) {
            const br = activeBadRecords[0];

            let nextStepsHtml = '';
            if (br.nextSteps && br.nextSteps.length > 0) {
                nextStepsHtml = `
                    <div class="next-step">
                        <div class="next-step-title">下一步处理建议：</div>
                        <ol class="next-step-list">
                            ${br.nextSteps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                `;
            }

            warningBody.innerHTML = `
                <div><strong>${br.title}</strong></div>
                <div style="margin-top:4px;">${br.description}</div>
                ${nextStepsHtml}
            `;

            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    }

    function getFilterSummary() {
        const parts = [];
        if (filters.level !== 'all') {
            parts.push(`${WarehouseData.hazardLevels[filters.level].name}危险品`);
        }
        if (filters.status !== 'all') {
            parts.push(WarehouseData.statusTypes[filters.status].name);
        }
        if (filters.area !== 'all') {
            parts.push(`${filters.area}区`);
        }
        return parts.length > 0 ? parts.join(' · ') : '全部数据';
    }

    function getStatsSummary() {
        const total = filteredRecords.length;
        let normalCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        filteredRecords.forEach(record => {
            if (record.status === 'normal') normalCount++;
            else if (record.status === 'warning') warningCount++;
            else if (record.status === 'error') errorCount++;
        });

        return `共${total}条（正常${normalCount} / 预警${warningCount} / 异常${errorCount}）`;
    }

    return {
        init: init
    };
})();
