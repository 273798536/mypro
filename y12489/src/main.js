import { SceneManager } from './scene/SceneManager.js';
import { CarModel } from './scene/CarModel.js';
import { WindTunnel } from './scene/WindTunnel.js';
import { ParameterController } from './controls/ParameterController.js';
import { WarningSystem } from './controls/WarningSystem.js';
import { UIManager } from './ui/UIManager.js';
import { SnapshotExporter } from './utils/SnapshotExporter.js';

class WindTunnelApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    
    this.sceneManager = null;
    this.carModel = null;
    this.windTunnel = null;
    this.params = null;
    this.warnings = null;
    this.ui = null;
    this.exporter = null;
    
    this.selectedObject = null;
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    this.sceneManager = new SceneManager(this.container);
    this.params = new ParameterController();
    this.warnings = new WarningSystem();
    this.ui = new UIManager(this.params, this.warnings);
    this.exporter = new SnapshotExporter(this.sceneManager);
    
    this.windTunnel = new WindTunnel(this.sceneManager);
    this.carModel = new CarModel(this.sceneManager, {
      source: '车身模型 v2.1',
      maintainer: '车辆工程组 - 李工',
      lastModified: '2026-05-28'
    });
    
    this.bindInternalEvents();
    this.setInitialState();
    this.startMetricsUpdate();
    
    this.isInitialized = true;
    console.log('流体边界层风洞可视化系统已启动');
  }

  bindInternalEvents() {
    this.params.on('angleChange', (data) => {
      if (this.carModel) {
        this.carModel.updateAngleOfAttack(data.newValue);
      }
    });

    this.params.on('windChange', (data) => {
      if (this.carModel) {
        this.carModel.updateWindSpeed(data.newValue);
      }
      if (this.windTunnel) {
        this.windTunnel.updateWindSpeed(data.newValue);
      }
    });

    this.params.on('samplingChange', (data) => {
      if (this.carModel) {
        this.carModel.updateSamplingDensity(data.newValue);
      }
    });

    this.sceneManager.onObjectClick = (object, intersection) => {
      this.handleObjectClick(object, intersection);
    };

    this.ui.onSnapshotRequest = () => {
      this.handleSnapshot();
    };

    this.ui.onResetComparison = (snapshot) => {
      this.handleResetComparison(snapshot);
    };

    this.ui.onWarningClick = (id, type) => {
      this.handleWarningClick(id, type);
    };
  }

  setInitialState() {
    this.params.setAngleOfAttack(0, { source: 'initial' });
    this.params.setWindSpeed(30, { source: 'initial' });
    this.params.setSamplingDensity(50, { source: 'initial' });
    
    this.carModel.updateWindSpeed(30);
    this.windTunnel.updateWindSpeed(30);
  }

  handleObjectClick(object, intersection) {
    if (this.selectedObject) {
      this.sceneManager.highlightObject(this.selectedObject, false);
    }
    
    this.selectedObject = object;
    this.sceneManager.highlightObject(object, true);
    this.ui.showObjectInfo(object, intersection);
    
    const type = object.userData.type;
    if (type === 'sampling_point') {
      this.focusOnSamplingPoint(object);
    } else if (type === 'dense_marker') {
      this.focusOnDenseArea(object);
    }
  }

  focusOnSamplingPoint(point) {
    const area = point.userData.area;
    const pointsInArea = this.carModel.getSamplingPointsByArea(area);
    
    pointsInArea.forEach(p => {
      const originalScale = p.userData.originalScale || 1;
      p.scale.setScalar(originalScale * 2);
      setTimeout(() => p.scale.setScalar(originalScale), 1000);
    });
    
    this.ui.showToast(`已定位到 ${area} 的采样点`, 'info');
  }

  focusOnDenseArea(marker) {
    const areaName = marker.userData.area;
    
    this.sceneManager.camera.position.set(
      marker.position.x + 3,
      marker.position.y + 2,
      marker.position.z + 3
    );
    this.sceneManager.camera.lookAt(marker.position);
    
    this.ui.showToast(`已定位到过密区域: ${areaName}，请降低采样密度`, 'warning');
  }

  handleWarningClick(id, type) {
    const warning = this.warnings.warnings.find(w => w.id === id);
    if (!warning) return;
    
    if (type === 'angle') {
      this.focusOnAngleViolation(warning);
    } else if (type === 'sampling') {
      this.focusOnSamplingViolation(warning);
    }
  }

  focusOnAngleViolation(warning) {
    if (warning.location && warning.location.affectedZones) {
      this.ui.showToast(
        `迎角越界影响区域: ${warning.location.affectedZones.join(', ')}`,
        warning.level
      );
    }
    
    const windSuggestion = warning.location?.suggestedFromWind;
    if (windSuggestion) {
      this.ui.showToast(
        `风速建议: ${windSuggestion.recommendedWind} — ${windSuggestion.reason}`,
        'warning'
      );
      
      const windSlider = document.getElementById('wind-slider');
      const windControl = document.getElementById('wind-control');
      if (windControl) {
        windControl.style.transition = 'box-shadow 0.3s';
        windControl.style.boxShadow = '0 0 12px rgba(210, 153, 34, 0.6)';
        setTimeout(() => {
          windControl.style.boxShadow = 'none';
        }, 3000);
      }
      if (windSlider) {
        windSlider.focus();
      }
    }
    
    if (warning.location && warning.location.delta !== undefined) {
      const direction = this.params.angleOfAttack > 0 ? '正' : '负';
      this.ui.showToast(
        `迎角越界 ${warning.location.delta.toFixed(1)}°（${direction}向），安全范围 [${this.params.angleLimits.safeMin}°, ${this.params.angleLimits.safeMax}°]`,
        warning.level
      );
    }
  }

  focusOnSamplingViolation(warning) {
    if (warning.location && warning.location.locateOnModel) {
      const denseAreas = this.carModel.surfaceMarkers;
      if (denseAreas.length > 0) {
        this.handleObjectClick(denseAreas[0], { point: denseAreas[0].position });
        
        denseAreas.forEach(marker => {
          marker.material.opacity = 1.0;
          setTimeout(() => {
            marker.material.opacity = 0.6;
          }, 2000);
        });
      }
      
      const carGroup = this.carModel.group;
      if (carGroup) {
        this.sceneManager.camera.position.set(5, 3, 5);
        this.sceneManager.camera.lookAt(carGroup.position);
      }
      
      if (warning.location.performanceImpact) {
        const impact = warning.location.performanceImpact;
        this.ui.showToast(
          `性能影响: 计算 +${impact.computeTimeIncrease}, 内存 +${impact.memoryIncrease}`,
          'warning'
        );
      }
      
      if (warning.location.denseAreas) {
        const areaNames = warning.location.denseAreas.map(a => a.name).join(', ');
        this.ui.showToast(
          `过密区域定位: ${areaNames} — 请在3D场景中查看红色标记`,
          'warning'
        );
      }
    }
  }

  handleSnapshot() {
    const filename = this.ui.getSnapshotFilename();
    const coefficients = this.carModel.getAerodynamicCoefficients();
    
    const metadata = {
      parameters: {
        angleOfAttack: this.params.angleOfAttack,
        windSpeed: this.params.windSpeed,
        windVersion: this.params.windVersion,
        samplingDensity: this.params.samplingDensity
      },
      coefficients: {
        cd: coefficients.cd,
        cl: coefficients.cl,
        boundaryThicknessMm: coefficients.boundaryThickness,
        reynolds: coefficients.reynolds
      },
      modelInfo: {
        source: this.carModel.group.userData.source,
        maintainer: this.carModel.group.userData.maintainer,
        lastModified: this.carModel.group.userData.lastModified
      },
      warnings: this.warnings.getStatusSummary()
    };
    
    const result = this.exporter.exportWithWarnings(
      filename,
      metadata,
      this.warnings
    );
    
    this.ui.showToast(`截图已导出: ${filename}`, 'success');
    console.log('截图导出成功，元数据已保存', result.metadata);
  }

  handleResetComparison(snapshot) {
    if (this.carModel) {
      this.carModel.updateWindSpeed(snapshot.windSpeed);
      this.carModel.updateAngleOfAttack(snapshot.angleOfAttack);
      this.carModel.updateSamplingDensity(snapshot.samplingDensity);
    }
    if (this.windTunnel) {
      this.windTunnel.updateWindSpeed(snapshot.windSpeed);
    }
  }

  startMetricsUpdate() {
    const updateMetrics = () => {
      if (this.carModel) {
        const coefficients = this.carModel.getAerodynamicCoefficients();
        this.ui.updateMetrics(coefficients);
        
        const snapshot = this.params.snapshot();
        snapshot.coefficients = coefficients;
        this.ui.currentVersion = snapshot;
      }
      requestAnimationFrame(updateMetrics);
    };
    updateMetrics();
  }

  dispose() {
    if (this.carModel) this.carModel.dispose();
    if (this.windTunnel) this.windTunnel.dispose();
    if (this.sceneManager) this.sceneManager.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new WindTunnelApp();
});
