import { CrystalViewer } from './crystalViewer.js';
import { sampleMaterials, elementColors } from '../data/samples.js';

class CrystalApp {
    constructor() {
        this.viewer = null;
        this.currentMaterialId = null;
        this.currentMaterial = null;
        this.savedViewState = null;
        this.init();
    }

    init() {
        const container = document.getElementById('threeCanvas');
        this.viewer = new CrystalViewer(container);
        
        this.initMaterialSelector();
        this.initEventListeners();
        this.loadDefaultMaterial();
    }

    initMaterialSelector() {
        const selector = document.getElementById('materialSelector');
        Object.values(sampleMaterials).forEach(material => {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = material.name;
            selector.appendChild(option);
        });
    }

    initEventListeners() {
        document.getElementById('loadMaterialBtn').addEventListener('click', () => this.loadSelectedMaterial());
        document.getElementById('saveViewBtn').addEventListener('click', () => this.saveView());
        document.getElementById('loadViewBtn').addEventListener('click', () => this.loadView());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('applyRepeatBtn').addEventListener('click', () => this.applyRepeat());
        document.getElementById('recalcBondsBtn').addEventListener('click', () => this.recalculateBonds());
        document.getElementById('loadCustomDataBtn').addEventListener('click', () => this.loadCustomData());
        document.getElementById('atomSearch').addEventListener('input', (e) => this.filterAtomList(e.target.value));

        document.getElementById('showBonds').addEventListener('change', (e) => {
            this.viewer.toggleBonds(e.target.checked);
        });
        document.getElementById('showBondLabels').addEventListener('change', (e) => {
            this.viewer.toggleBondLabels(e.target.checked);
        });
        document.getElementById('showUnitCell').addEventListener('change', (e) => {
            this.viewer.toggleUnitCell(e.target.checked);
        });
        document.getElementById('showAxes').addEventListener('change', (e) => {
            this.viewer.toggleAxes(e.target.checked);
        });
        document.getElementById('showLabels').addEventListener('change', (e) => {
            this.viewer.toggleLabels(e.target.checked);
        });

        ['paramA', 'paramB', 'paramC', 'paramAlpha', 'paramBeta', 'paramGamma'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.onUnitCellParamChange());
        });
    }

    loadDefaultMaterial() {
        this.loadMaterial('diamond');
    }

    loadSelectedMaterial() {
        const selector = document.getElementById('materialSelector');
        if (selector.value) {
            this.loadMaterial(selector.value);
        }
    }

    loadMaterial(materialId) {
        try {
            this.hideError();
            const material = sampleMaterials[materialId];
            if (!material) {
                this.showError('材料加载失败', `未找到ID为 "${materialId}" 的材料`, null);
                return;
            }

            this.currentMaterialId = materialId;
            this.currentMaterial = JSON.parse(JSON.stringify(material));

            this.updateUnitCellParams(material.unitCell);
            document.getElementById('bondThreshold').value = material.bondThreshold || 2.5;

            const repeatX = parseInt(document.getElementById('repeatX').value) || 1;
            const repeatY = parseInt(document.getElementById('repeatY').value) || 1;
            const repeatZ = parseInt(document.getElementById('repeatZ').value) || 1;
            const bondThreshold = parseFloat(document.getElementById('bondThreshold').value) || 2.5;

            const result = this.viewer.loadCrystal(material, {
                repeatX, repeatY, repeatZ, bondThreshold
            });

            this.updateMaterialInfo(material);
            this.updateStats(result);
            this.updateFilterList(result.elements);
            this.updateAtomList();
            this.updateBondList();

            document.getElementById('materialSelector').value = materialId;

        } catch (error) {
            this.showError('材料加载失败', error.message, materialId);
        }
    }

    updateUnitCellParams(unitCell) {
        document.getElementById('paramA').value = unitCell.a;
        document.getElementById('paramB').value = unitCell.b;
        document.getElementById('paramC').value = unitCell.c;
        document.getElementById('paramAlpha').value = unitCell.alpha;
        document.getElementById('paramBeta').value = unitCell.beta;
        document.getElementById('paramGamma').value = unitCell.gamma;
    }

    updateMaterialInfo(material) {
        document.getElementById('materialName').textContent = material.name;
        document.getElementById('materialFormula').textContent = material.formula;
        document.getElementById('materialDesc').textContent = material.description;
    }

    updateStats(result) {
        document.getElementById('atomCount').textContent = result.atomCount;
        document.getElementById('bondCount').textContent = result.bondCount;
        
        const atoms = this.viewer.getAllAtoms();
        if (atoms.length > 0) {
            const bonds = this.viewer.getAllBonds();
            const coordNumbers = {};
            atoms.forEach((_, i) => coordNumbers[i] = 0);
            bonds.forEach(bond => {
                coordNumbers[bond.atom1] = (coordNumbers[bond.atom1] || 0) + 1;
                coordNumbers[bond.atom2] = (coordNumbers[bond.atom2] || 0) + 1;
            });
            const avgCoord = Object.values(coordNumbers).reduce((a, b) => a + b, 0) / atoms.length;
            document.getElementById('coordNumber').textContent = avgCoord.toFixed(1);
        } else {
            document.getElementById('coordNumber').textContent = '-';
        }
    }

    updateFilterList(elements) {
        const container = document.getElementById('atomFilterList');
        container.innerHTML = '';

        elements.forEach(element => {
            const item = document.createElement('div');
            item.className = 'filter-item active';
            item.innerHTML = `
                <span class="filter-color" style="background: ${elementColors[element] || elementColors.default}"></span>
                <span>${element}</span>
            `;
            item.addEventListener('click', () => {
                item.classList.toggle('active');
                const isActive = item.classList.contains('active');
                this.viewer.filterByElement(element, isActive);
                this.updateStatsAfterFilter();
            });
            container.appendChild(item);
        });
    }

    updateStatsAfterFilter() {
        const visibleAtoms = this.viewer.atoms.filter(a => a.visible);
        const visibleBonds = this.viewer.bonds.filter(b => b.visible);
        document.getElementById('atomCount').textContent = visibleAtoms.length;
        document.getElementById('bondCount').textContent = visibleBonds.length;
    }

    updateAtomList() {
        const container = document.getElementById('atomList');
        const atoms = this.viewer.getAllAtoms();
        
        container.innerHTML = '';
        atoms.forEach((atom, index) => {
            const item = document.createElement('div');
            item.className = 'atom-item';
            item.dataset.index = index;
            item.innerHTML = `
                <div class="atom-symbol" style="background: ${elementColors[atom.element] || elementColors.default}">
                    ${atom.element}
                </div>
                <div class="atom-details">
                    <div class="name">${atom.element} #${index + 1}</div>
                    <div class="coord">(${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})</div>
                </div>
            `;
            item.addEventListener('click', () => this.selectAtomByIndex(index));
            container.appendChild(item);
        });
    }

    updateBondList() {
        const container = document.getElementById('bondList');
        const bonds = this.viewer.getAllBonds();
        const atoms = this.viewer.getAllAtoms();
        
        container.innerHTML = '';
        bonds.forEach((bond, index) => {
            const item = document.createElement('div');
            item.className = 'bond-item';
            const atom1 = atoms[bond.atom1];
            const atom2 = atoms[bond.atom2];
            item.innerHTML = `
                <span class="bond-atoms">${atom1.element}${bond.atom1 + 1} - ${atom2.element}${bond.atom2 + 1}</span>
                <span class="bond-length">${bond.distance.toFixed(3)} Å</span>
            `;
            container.appendChild(item);
        });
    }

    filterAtomList(query) {
        const items = document.querySelectorAll('#atomList .atom-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.name').textContent.toLowerCase();
            const coord = item.querySelector('.coord').textContent.toLowerCase();
            item.style.display = (name.includes(lowerQuery) || coord.includes(lowerQuery)) ? '' : 'none';
        });
    }

    selectAtomByIndex(index) {
        const result = this.viewer.selectAtomByIndex(index);
        if (result) {
            this.updateSelectedAtomInfo(result);
            
            document.querySelectorAll('#atomList .atom-item').forEach(item => {
                item.classList.toggle('selected', parseInt(item.dataset.index) === index);
            });
        }
    }

    updateSelectedAtomInfo(result) {
        const container = document.getElementById('selectedAtomInfo');
        const { atom, bondedAtoms } = result;
        
        let html = `
            <div class="info-row">
                <span class="info-label">元素</span>
                <span class="info-value">${atom.element}</span>
            </div>
            <div class="info-row">
                <span class="info-label">序号</span>
                <span class="info-value">#${atom.index + 1}</span>
            </div>
            <div class="info-row">
                <span class="info-label">绝对坐标 (Å)</span>
                <span class="info-value">(${atom.x.toFixed(3)}, ${atom.y.toFixed(3)}, ${atom.z.toFixed(3)})</span>
            </div>
            <div class="info-row">
                <span class="info-label">分数坐标</span>
                <span class="info-value">(${atom.fractionalX.toFixed(3)}, ${atom.fractionalY.toFixed(3)}, ${atom.fractionalZ.toFixed(3)})</span>
            </div>
            <div class="info-row">
                <span class="info-label">晶胞位置</span>
                <span class="info-value">(${atom.cellX}, ${atom.cellY}, ${atom.cellZ})</span>
            </div>
            <div class="info-row">
                <span class="info-label">配位数</span>
                <span class="info-value">${bondedAtoms.length}</span>
            </div>
        `;

        if (bondedAtoms.length > 0) {
            html += '<div class="bonded-list"><div class="bonded-title">成键原子：</div>';
            bondedAtoms.forEach(bonded => {
                html += `
                    <div class="bonded-item">
                        <span>${bonded.atom.element} #${bonded.atom.index + 1}</span>
                        <span>${bonded.distance.toFixed(3)} Å</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        container.innerHTML = html;
    }

    applyRepeat() {
        if (!this.currentMaterial) return;
        
        try {
            this.hideError();
            const repeatX = parseInt(document.getElementById('repeatX').value) || 1;
            const repeatY = parseInt(document.getElementById('repeatY').value) || 1;
            const repeatZ = parseInt(document.getElementById('repeatZ').value) || 1;
            const bondThreshold = parseFloat(document.getElementById('bondThreshold').value) || 2.5;

            if (repeatX < 1 || repeatY < 1 || repeatZ < 1 || repeatX > 5 || repeatY > 5 || repeatZ > 5) {
                throw new Error('晶胞复制数必须在 1-5 之间');
            }

            const result = this.viewer.loadCrystal(this.currentMaterial, {
                repeatX, repeatY, repeatZ, bondThreshold
            });

            this.updateStats(result);
            this.updateAtomList();
            this.updateBondList();

        } catch (error) {
            this.showError('晶胞复制失败', error.message, this.currentMaterialId);
        }
    }

    recalculateBonds() {
        if (!this.currentMaterial) return;

        try {
            this.hideError();
            const threshold = parseFloat(document.getElementById('bondThreshold').value);
            
            if (isNaN(threshold) || threshold <= 0) {
                throw new Error('键长阈值必须是正数');
            }

            const atoms = this.viewer.getAllAtoms();
            this.viewer.calculateBonds(atoms, threshold);
            
            const bondCount = this.viewer.bonds.length;
            document.getElementById('bondCount').textContent = bondCount;
            this.updateBondList();

            if (bondCount === 0 && atoms.length > 1) {
                this.showError('键长警告', `阈值 ${threshold} Å 过小，没有检测到化学键。建议增大阈值。`, this.currentMaterialId);
            }

        } catch (error) {
            this.showError('键长计算失败', error.message, this.currentMaterialId);
        }
    }

    onUnitCellParamChange() {
        if (!this.currentMaterial) return;

        this.currentMaterial.unitCell = {
            a: parseFloat(document.getElementById('paramA').value),
            b: parseFloat(document.getElementById('paramB').value),
            c: parseFloat(document.getElementById('paramC').value),
            alpha: parseFloat(document.getElementById('paramAlpha').value),
            beta: parseFloat(document.getElementById('paramBeta').value),
            gamma: parseFloat(document.getElementById('paramGamma').value)
        };
    }

    loadCustomData() {
        try {
            this.hideError();
            const input = document.getElementById('customDataInput').value.trim();
            if (!input) {
                throw new Error('请输入原子坐标数据');
            }

            const lines = input.split('\n').filter(line => line.trim());
            const atoms = [];

            lines.forEach((line, lineNum) => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 4) {
                    throw new Error(`第 ${lineNum + 1} 行格式错误：需要 元素 x y z`);
                }

                const element = parts[0];
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                const z = parseFloat(parts[3]);

                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    throw new Error(`第 ${lineNum + 1} 行：坐标必须是数字`);
                }

                if (x < 0 || x > 1 || y < 0 || y > 1 || z < 0 || z > 1) {
                    console.warn(`第 ${lineNum + 1} 行：建议使用分数坐标 (0-1 范围)`);
                }

                atoms.push({ element, x, y, z });
            });

            if (atoms.length === 0) {
                throw new Error('未解析到任何原子');
            }

            const customMaterial = {
                id: 'custom',
                name: '自定义晶体',
                formula: [...new Set(atoms.map(a => a.element))].join(''),
                description: '用户自定义数据',
                unitCell: {
                    a: parseFloat(document.getElementById('paramA').value) || 5.0,
                    b: parseFloat(document.getElementById('paramB').value) || 5.0,
                    c: parseFloat(document.getElementById('paramC').value) || 5.0,
                    alpha: parseFloat(document.getElementById('paramAlpha').value) || 90,
                    beta: parseFloat(document.getElementById('paramBeta').value) || 90,
                    gamma: parseFloat(document.getElementById('paramGamma').value) || 90
                },
                atoms: atoms,
                bondThreshold: parseFloat(document.getElementById('bondThreshold').value) || 2.5
            };

            this.currentMaterial = customMaterial;
            this.currentMaterialId = 'custom';

            const result = this.viewer.loadCrystal(customMaterial, {
                repeatX: 1, repeatY: 1, repeatZ: 1,
                bondThreshold: customMaterial.bondThreshold
            });

            this.updateMaterialInfo(customMaterial);
            this.updateStats(result);
            this.updateFilterList(result.elements);
            this.updateAtomList();
            this.updateBondList();

        } catch (error) {
            this.showError('自定义数据解析失败', error.message, 'custom_data');
        }
    }

    saveView() {
        this.savedViewState = this.viewer.getViewState();
        localStorage.setItem('crystalViewState', JSON.stringify(this.savedViewState));
        this.showNotification('视角已保存');
    }

    loadView() {
        const saved = localStorage.getItem('crystalViewState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.viewer.setViewState(state);
                this.showNotification('视角已恢复');
            } catch (e) {
                this.showError('视角恢复失败', '保存的视角数据损坏', null);
            }
        } else if (this.savedViewState) {
            this.viewer.setViewState(this.savedViewState);
            this.showNotification('视角已恢复');
        } else {
            this.showNotification('没有保存的视角');
        }
    }

    exportData() {
        if (!this.currentMaterial) return;

        const atoms = this.viewer.getAllAtoms();
        const bonds = this.viewer.getAllBonds();
        
        const exportData = {
            material: this.currentMaterial,
            viewState: this.viewer.getViewState(),
            atoms: atoms,
            bonds: bonds.map(b => ({
                atoms: [b.atom1, b.atom2],
                distance: b.distance,
                elements: [b.element1, b.element2]
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crystal_${this.currentMaterialId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showError(title, message, materialRef) {
        const panel = document.getElementById('errorPanel');
        let html = `<h4>⚠️ ${title}</h4><p>${message}</p>`;
        if (materialRef) {
            html += `<div class="material-ref">材料: ${materialRef}</div>`;
        }
        panel.innerHTML = html;
        panel.classList.remove('hidden');

        setTimeout(() => {
            if (title.includes('警告')) {
                panel.classList.add('hidden');
            }
        }, 5000);
    }

    hideError() {
        document.getElementById('errorPanel').classList.add('hidden');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 212, 255, 0.9);
            color: #1a1a2e;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);

window.addEventListener('DOMContentLoaded', () => {
    new CrystalApp();
});
