import { PhysicsEngine } from './physics.js';
import { DataManager } from './data.js';
import { SceneManager } from './scene.js';
import { ReportGenerator } from './report.js';
import { ExportManager } from './export.js';
import { UIManager } from './ui.js';

const app = (() => {
    let solver, scene, dataStore, exporter, ui;

    async function loadDefaultData() {
        try {
            const response = await fetch('data/solar-system.json');
            if (!response.ok) {
                throw new Error('无法加载默认数据');
            }
            const data = await response.json();
            
            const importResult = dataStore.importData(JSON.stringify(data), 'default');
            if (!importResult.success) {
                console.error('数据导入失败:', importResult.error);
                return false;
            }

            solver.loadJSON(data);
            
            for (const body of solver.bodies) {
                scene.addBody(body);
            }

            return true;
        } catch (e) {
            console.error('加载默认数据失败:', e);
            return false;
        }
    }

    function init() {
        solver = new PhysicsEngine.NBodySolver();
        scene = new SceneManager.Scene3D('main-canvas');
        dataStore = new DataManager.DataStore();
        exporter = new ExportManager.Exporter(scene, solver, dataStore);
        ui = new UIManager.UI(solver, scene, dataStore, exporter);

        loadDefaultData().then((success) => {
            ui.init();
            
            scene.startAnimation(() => {
                ui.update();
            });

            if (success) {
                console.log('🌌 天体轨道摄动教室已初始化');
            } else {
                console.warn('默认数据加载失败，请手动加载数据文件');
            }
        });
    }

    function resolveConflict(conflictId, choice) {
        if (choice === 'average') {
            const conflict = dataStore.conflicts.find(c => c.id === conflictId);
            if (conflict) {
                if (typeof conflict.valueA === 'number' && typeof conflict.valueB === 'number') {
                    const avg = (conflict.valueA + conflict.valueB) / 2;
                    conflict.valueA = avg;
                    conflict.valueB = avg;
                    dataStore.resolveConflict(conflictId, 'A');
                } else if (typeof conflict.valueA === 'object' && typeof conflict.valueB === 'object') {
                    const avg = {
                        x: (conflict.valueA.x + conflict.valueB.x) / 2,
                        y: (conflict.valueA.y + conflict.valueB.y) / 2,
                        z: (conflict.valueA.z + conflict.valueB.z) / 2
                    };
                    conflict.valueA = avg;
                    conflict.valueB = avg;
                    dataStore.resolveConflict(conflictId, 'A');
                } else {
                    alert('无法对非数值类型取平均，请选择A或B');
                    return;
                }
            }
        } else {
            dataStore.resolveConflict(conflictId, choice);
        }

        ui.showConflicts(dataStore.conflicts);
        
        if (dataStore.conflicts.length === 0) {
            const merged = dataStore.datasets['merged'];
            if (merged) {
                ui.loadDatasetToSolver(merged.data);
                alert('所有冲突已解决，数据已合并！');
            }
        }
    }

    function resolveAllConflicts(strategy) {
        dataStore.resolveAllConflicts(strategy);
        ui.showConflicts(dataStore.conflicts);
        
        if (dataStore.conflicts.length === 0) {
            const merged = dataStore.datasets['merged'];
            if (merged) {
                ui.loadDatasetToSolver(merged.data);
                alert('所有冲突已解决，数据已合并！');
            }
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        resolveConflict,
        resolveAllConflicts,
        get solver() { return solver; },
        get scene() { return scene; },
        get dataStore() { return dataStore; },
        get exporter() { return exporter; },
        get ui() { return ui; }
    };
})();
