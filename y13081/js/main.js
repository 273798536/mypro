(function() {
    let scene3D;
    let timeline;
    let sidePanel;
    let data;
    let cadLayerEnabled = false;
    let highlightEnabled = false;

    function init() {
        data = WarehouseData.init();

        scene3D = Scene3D.init('threeCanvas');
        scene3D.addContainers(data.containers);

        timeline = Timeline.init(data.timeFrames);

        sidePanel = SidePanel.init({
            containers: data.containers,
            badRecords: data.badRecords
        });

        setupBindings();

        const firstFrame = data.timeFrames[0];
        if (firstFrame) {
            scene3D.updateFrame(firstFrame);
            sidePanel.updateFrame(firstFrame);
        }

        setupToolbarEvents();
        setupWarningEvents();
    }

    function setupBindings() {
        timeline.onFrameChange(function(frame) {
            scene3D.updateFrame(frame);
            sidePanel.updateFrame(frame);
        });

        scene3D.onContainerClick(function(container) {
            sidePanel.selectContainer(container.id);
        });

        sidePanel.onContainerSelect(function(containerId) {
            scene3D.selectContainer(containerId);

            const container = data.containers.find(c => c.id === containerId);
            if (container) {
                scrollToContainerInTable(containerId);
            }
        });

        sidePanel.onFilterChange(function(filters) {
            applyFilterHighlight(filters);
        });

        sidePanel.onScreenshot(function(info) {
            if (info.previewOnly) {
                renderScreenshotPreview();
            } else {
                saveScreenshot(info);
            }
        });
    }

    function setupToolbarEvents() {
        const cadBtn = document.getElementById('cadLayerToggle');
        const highlightBtn = document.getElementById('highlightToggle');
        const resetViewBtn = document.getElementById('resetView');
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');

        cadBtn.addEventListener('click', function() {
            cadLayerEnabled = !cadLayerEnabled;
            scene3D.toggleCADLayer(cadLayerEnabled);
            cadBtn.classList.toggle('active', cadLayerEnabled);
        });

        highlightBtn.addEventListener('click', function() {
            highlightEnabled = !highlightEnabled;
            scene3D.toggleHighlight(highlightEnabled);
            highlightBtn.classList.toggle('active', highlightEnabled);
        });

        resetViewBtn.addEventListener('click', function() {
            scene3D.resetView();
        });

        zoomInBtn.addEventListener('click', function() {
            scene3D.zoomIn();
        });

        zoomOutBtn.addEventListener('click', function() {
            scene3D.zoomOut();
        });
    }

    function setupWarningEvents() {
        const dismissBtn = document.getElementById('dismissWarning');
        const viewCadBtn = document.getElementById('viewCadBtn');

        dismissBtn.addEventListener('click', function() {
            document.getElementById('dataQualityWarning').style.display = 'none';
        });

        viewCadBtn.addEventListener('click', function() {
            if (!cadLayerEnabled) {
                cadLayerEnabled = true;
                scene3D.toggleCADLayer(true);
                document.getElementById('cadLayerToggle').classList.add('active');
            }

            const badRecord = data.badRecords[0];
            if (badRecord && badRecord.affectedContainers.length > 0) {
                sidePanel.selectContainer(badRecord.affectedContainers[0]);
                scrollToCadInfo();
            }
        });
    }

    function applyFilterHighlight(filters) {
    }

    function scrollToContainerInTable(containerId) {
        const tbody = document.getElementById('detailTableBody');
        const rows = tbody.querySelectorAll('tr');
        for (let row of rows) {
            if (row.textContent.includes(containerId)) {
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                break;
            }
        }
    }

    function scrollToCadInfo() {
        const cadSection = document.querySelector('.cad-section');
        if (cadSection) {
            cadSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function renderScreenshotPreview() {
        const preview = document.getElementById('screenshotPreview');
        const dataUrl = scene3D.getScreenshot();

        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.borderRadius = '4px';
        preview.appendChild(img);
    }

    function saveScreenshot(info) {
        const dataUrl = scene3D.getScreenshot();
        const link = document.createElement('a');
        link.download = `危险品库回放_${info.time.replace(/:/g, '-')}.png`;
        link.href = dataUrl;
        link.click();

        showToast('截图已保存');
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(72, 187, 120, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 2000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideUp {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, -20px); }
        }
    `;
    document.head.appendChild(style);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
