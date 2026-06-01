export class UIManager {
  constructor(parameterController, warningSystem) {
    this.params = parameterController;
    this.warnings = warningSystem;
    
    this.elements = {};
    this.baseVersion = null;
    this.currentVersion = null;
    
    this.initElements();
    this.bindEvents();
    this.setupListeners();
    this.initVersions();
  }

  initElements() {
    this.elements = {
      angleSlider: document.getElementById('angle-slider'),
      angleValue: document.getElementById('angle-value'),
      angleLimit: document.getElementById('angle-limit'),
      angleControl: document.getElementById('angle-control'),
      
      windSlider: document.getElementById('wind-slider'),
      windValue: document.getElementById('wind-value'),
      windVersion: document.getElementById('wind-version'),
      windControl: document.getElementById('wind-control'),
      
      samplingSlider: document.getElementById('sampling-slider'),
      samplingValue: document.getElementById('sampling-value'),
      samplingStatus: document.getElementById('sampling-status'),
      samplingControl: document.getElementById('sampling-control'),
      
      resetBtn: document.getElementById('reset-btn'),
      snapshotBtn: document.getElementById('snapshot-btn'),
      
      baseAngle: document.getElementById('base-angle'),
      baseWind: document.getElementById('base-wind'),
      baseSampling: document.getElementById('base-sampling'),
      
      currentAngle: document.getElementById('current-angle'),
      currentWind: document.getElementById('current-wind'),
      currentSampling: document.getElementById('current-sampling'),
      
      versionBase: document.getElementById('version-base'),
      versionCurrent: document.getElementById('version-current'),
      diffSummary: document.getElementById('diff-summary'),
      
      warningsContainer: document.getElementById('warnings-container'),
      statusIndicator: document.getElementById('status-indicator'),
      
      infoContent: document.getElementById('info-content'),
      
      metricCd: document.getElementById('metric-cd'),
      metricCl: document.getElementById('metric-cl'),
      metricBoundary: document.getElementById('metric-boundary'),
      metricRe: document.getElementById('metric-re'),
      
      toastContainer: document.getElementById('toast-container')
    };
  }

  bindEvents() {
    this.elements.angleSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.params.setAngleOfAttack(value, { source: 'ui' });
    });

    this.elements.windSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      const isSupplement = this.baseVersion && this.baseVersion.windSpeed !== value;
      this.params.setWindSpeed(value, { source: 'ui', isSupplement });
    });

    this.elements.samplingSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      const blockResult = this.warnings.blockIfCritical('sampling', value);
      
      if (blockResult.blocked) {
        this.showToast('采样密度已超过安全阈值，已自动拦截', 'warning');
        e.target.value = blockResult.safeValue;
        this.params.setSamplingDensity(blockResult.safeValue, { source: 'ui_blocked' });
      } else {
        this.params.setSamplingDensity(value, { source: 'ui' });
      }
    });

    this.elements.resetBtn.addEventListener('click', () => {
      this.resetComparison();
    });

    this.elements.snapshotBtn.addEventListener('click', () => {
      if (this.onSnapshotRequest) {
        this.onSnapshotRequest();
      }
    });

    this.elements.versionBase.addEventListener('click', () => {
      if (this.baseVersion) {
        this.restoreVersion(this.baseVersion);
        this.showToast('已恢复到基准版本', 'info');
      }
    });

    this.elements.versionCurrent.addEventListener('click', () => {
      this.updateVersionDisplay();
    });
  }

  setupListeners() {
    this.params.on('angleChange', (data) => {
      this.updateAngleDisplay(data);
      this.processAngleChange(data);
    });

    this.params.on('windChange', (data) => {
      this.updateWindDisplay(data);
      this.processWindChange(data);
    });

    this.params.on('samplingChange', (data) => {
      this.updateSamplingDisplay(data);
      this.processSamplingChange(data);
    });

    this.warnings.on('warningsChanged', (warnings) => {
      this.updateWarningsDisplay(warnings);
      this.updateStatusIndicator();
    });
  }

  initVersions() {
    this.baseVersion = this.params.snapshot();
    this.currentVersion = this.params.snapshot();
    this.updateVersionDisplay();
  }

  resetComparison() {
    this.baseVersion = this.params.snapshot();
    this.params.windVersion = '基础版本';
    this.updateVersionDisplay();
    this.showToast('基准版本已重置为当前状态', 'success');
    
    if (this.onResetComparison) {
      this.onResetComparison(this.baseVersion);
    }
  }

  restoreVersion(snapshot) {
    this.params.restore(snapshot);
    
    this.elements.angleSlider.value = snapshot.angleOfAttack;
    this.elements.windSlider.value = snapshot.windSpeed;
    this.elements.samplingSlider.value = snapshot.samplingDensity;
    
    this.updateAngleDisplay({ newValue: snapshot.angleOfAttack });
    this.updateWindDisplay({ newValue: snapshot.windSpeed, version: snapshot.windVersion });
    this.updateSamplingDisplay({ newValue: snapshot.samplingDensity });
    this.updateVersionDisplay();
  }

  updateAngleDisplay(data) {
    this.elements.angleValue.textContent = data.newValue.toFixed(1) + '°';
    this.elements.currentAngle.textContent = data.newValue.toFixed(1) + '°';
    
    this.elements.angleControl.classList.remove('warning', 'error');
    this.elements.angleLimit.textContent = '';
    this.elements.angleLimit.className = 'limit-badge';
    
    if (data.level === 'warning') {
      this.elements.angleControl.classList.add('warning');
      this.elements.angleLimit.textContent = '⚠ 接近边界';
      this.elements.angleLimit.classList.add('warning');
    } else if (data.level === 'error') {
      this.elements.angleControl.classList.add('error');
      this.elements.angleLimit.textContent = '✕ 越界';
      this.elements.angleLimit.classList.add('error');
    }
    
    this.updateVersionDiff();
  }

  updateWindDisplay(data) {
    this.elements.windValue.textContent = data.newValue.toFixed(1) + ' m/s';
    this.elements.currentWind.textContent = data.newValue.toFixed(1) + ' m/s';
    
    this.elements.windVersion.textContent = data.version || '基础版本';
    this.elements.windVersion.className = 'version-badge';
    
    if (data.isSupplement) {
      this.elements.windVersion.classList.add('supplement');
    }
    
    this.updateVersionDiff();
  }

  updateSamplingDisplay(data) {
    this.elements.samplingValue.textContent = data.newValue;
    this.elements.currentSampling.textContent = data.newValue;
    
    this.elements.samplingControl.classList.remove('warning', 'error');
    this.elements.samplingStatus.textContent = '';
    this.elements.samplingStatus.className = 'density-badge';
    
    if (data.level === 'warning') {
      this.elements.samplingControl.classList.add('warning');
      this.elements.samplingStatus.textContent = '⚠ 偏高';
      this.elements.samplingStatus.classList.add('warning');
    } else if (data.level === 'error') {
      this.elements.samplingControl.classList.add('error');
      this.elements.samplingStatus.textContent = '✕ 过密';
      this.elements.samplingStatus.classList.add('error');
    }
    
    this.updateVersionDiff();
  }

  processAngleChange(data) {
    if (data.source !== 'restore' && data.level !== 'normal') {
      const location = this.params.locateAngleViolation(data.newValue);
      const warningId = this.warnings.processAngleCheck(data, location);
      
      if (warningId && data.level === 'error') {
        this.showToast(`迎角越界: ${data.newValue.toFixed(1)}°，${data.suggestion}`, 'error');
      } else if (warningId && data.level === 'warning') {
        this.showToast(`迎角接近边界: ${data.newValue.toFixed(1)}°`, 'warning');
      }
    }
    
    if (data.source === 'ui') {
      this.currentVersion = this.params.snapshot();
    }
  }

  processWindChange(data) {
    if (data.source !== 'restore') {
      this.warnings.processWindVersion(data.isSupplement, data.version);
      
      if (data.isSupplement) {
        this.showToast(`风速已记录为 ${data.version}`, 'info');
      }
    }
    
    if (data.source === 'ui') {
      this.currentVersion = this.params.snapshot();
    }
  }

  processSamplingChange(data) {
    if (data.source !== 'restore' && data.level !== 'normal') {
      const location = this.params.locateSamplingViolation(data.newValue);
      const warningId = this.warnings.processSamplingCheck(data, location);
      
      if (warningId && data.level === 'error') {
        this.showToast(`采样过密: ${data.newValue}，${data.suggestion}`, 'error');
      } else if (warningId && data.level === 'warning') {
        this.showToast(`采样密度偏高: ${data.newValue}`, 'warning');
      }
    }
    
    if (data.source === 'ui' || data.source === 'ui_blocked') {
      this.currentVersion = this.params.snapshot();
    }
  }

  updateVersionDisplay() {
    if (this.baseVersion) {
      this.elements.baseAngle.textContent = this.baseVersion.angleOfAttack.toFixed(1) + '°';
      this.elements.baseWind.textContent = this.baseVersion.windSpeed.toFixed(1) + ' m/s';
      this.elements.baseSampling.textContent = this.baseVersion.samplingDensity;
    }
    
    this.currentVersion = this.params.snapshot();
    this.elements.currentAngle.textContent = this.currentVersion.angleOfAttack.toFixed(1) + '°';
    this.elements.currentWind.textContent = this.currentVersion.windSpeed.toFixed(1) + ' m/s';
    this.elements.currentSampling.textContent = this.currentVersion.samplingDensity;
    
    this.updateVersionDiff();
  }

  updateVersionDiff() {
    if (!this.baseVersion) return;
    
    const current = this.params.snapshot();
    const comparison = this.params.compare(this.baseVersion, current);
    
    this.elements.versionCurrent.classList.remove('modified');
    
    const baseCards = this.elements.versionBase.querySelectorAll('.version-data div');
    const currentCards = this.elements.versionCurrent.querySelectorAll('.version-data div');
    
    baseCards.forEach(card => card.classList.remove('modified'));
    currentCards.forEach(card => card.classList.remove('modified'));
    
    if (comparison.hasChanges) {
      this.elements.versionCurrent.classList.add('modified');
      
      if (comparison.changes.angleOfAttack) {
        currentCards[0].classList.add('modified');
      }
      if (comparison.changes.windSpeed) {
        currentCards[1].classList.add('modified');
      }
      if (comparison.changes.samplingDensity) {
        currentCards[2].classList.add('modified');
      }
      
      const changeDescriptions = [];
      if (comparison.changes.angleOfAttack) {
        const delta = comparison.changes.angleOfAttack.delta;
        changeDescriptions.push(`迎角 ${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}°`);
      }
      if (comparison.changes.windSpeed) {
        const delta = comparison.changes.windSpeed.delta;
        changeDescriptions.push(`风速 ${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)} m/s`);
      }
      if (comparison.changes.samplingDensity) {
        const delta = comparison.changes.samplingDensity.delta;
        changeDescriptions.push(`采样 ${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)}`);
      }
      
      this.elements.diffSummary.textContent = '变化: ' + changeDescriptions.join(' | ');
    } else {
      this.elements.diffSummary.textContent = '与基准版本一致';
    }
  }

  updateWarningsDisplay(warnings) {
    if (warnings.length === 0) {
      this.elements.warningsContainer.innerHTML = '<div class="no-warnings">暂无警告</div>';
      return;
    }
    
    this.elements.warningsContainer.innerHTML = warnings.map(w => `
      <div class="warning-item ${w.level}" data-id="${w.id}" data-type="${w.type}">
        <strong>${w.title}</strong>
        <p>${w.message}</p>
        ${w.suggestion ? `<p style="margin-top: 4px; color: #8b949e;">建议: ${w.suggestion}</p>` : ''}
      </div>
    `).join('');
    
    this.elements.warningsContainer.querySelectorAll('.warning-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        const type = item.dataset.type;
        if (this.onWarningClick) {
          this.onWarningClick(id, type);
        }
      });
    });
  }

  updateStatusIndicator() {
    const summary = this.warnings.getStatusSummary();
    
    this.elements.statusIndicator.className = 'status-indicator';
    const header = document.querySelector('.sidebar-header');
    header.classList.remove('has-error', 'has-warning');
    const warningsPanel = document.getElementById('warnings-panel');
    warningsPanel.classList.remove('has-errors', 'has-warnings');
    
    if (summary.overall === 'error') {
      this.elements.statusIndicator.classList.add('error');
      header.classList.add('has-error');
      warningsPanel.classList.add('has-errors');
    } else if (summary.overall === 'warning') {
      this.elements.statusIndicator.classList.add('warning');
      header.classList.add('has-warning');
      warningsPanel.classList.add('has-warnings');
    }
  }

  updateMetrics(coefficients) {
    this.elements.metricCd.textContent = coefficients.cd.toFixed(3);
    this.elements.metricCl.textContent = coefficients.cl.toFixed(3);
    this.elements.metricBoundary.textContent = coefficients.boundaryThickness.toFixed(2) + ' mm';
    this.elements.metricRe.textContent = (coefficients.reynolds / 1e6).toFixed(2) + 'e+06';
    
    const warningAngles = this.warnings.getByType('angle');
    const hasAngleError = warningAngles.some(w => w.level === 'error');
    
    this.elements.metricCd.parentElement.classList.remove('warning', 'error');
    this.elements.metricCl.parentElement.classList.remove('warning', 'error');
    
    if (hasAngleError) {
      this.elements.metricCd.parentElement.classList.add('error');
      this.elements.metricCl.parentElement.classList.add('error');
    } else if (warningAngles.some(w => w.level === 'warning')) {
      this.elements.metricCd.parentElement.classList.add('warning');
      this.elements.metricCl.parentElement.classList.add('warning');
    }
  }

  showObjectInfo(object, intersection) {
    const info = this.getObjectInfo(object, intersection);
    
    let html = `<div class="info-section">
      <h3>${info.name}</h3>`;
    
    if (info.properties) {
      Object.entries(info.properties).forEach(([key, value]) => {
        html += `<div class="info-row"><span>${key}</span><span>${value}</span></div>`;
      });
    }
    
    if (info.source) {
      html += `<div class="info-row"><span>模型来源</span><span>${info.source}</span></div>`;
      html += `<span class="source-tag">来源: ${info.source}</span>`;
    }
    
    if (info.position) {
      html += `</div><div class="info-section">
        <h3>空间位置</h3>
        <div class="info-row"><span>X</span><span>${info.position.x.toFixed(3)}</span></div>
        <div class="info-row"><span>Y</span><span>${info.position.y.toFixed(3)}</span></div>
        <div class="info-row"><span>Z</span><span>${info.position.z.toFixed(3)}</span></div>
      </div>`;
    }
    
    html += `<div class="related-controls-section">
      <h3 style="font-size: 10px; color: #8b949e; margin-bottom: 4px;">关联参数与操作</h3>`;
    
    html += `<div class="info-row"><span>迎角滑块</span><span>${this.params.angleOfAttack.toFixed(1)}°</span></div>`;
    html += `<div class="info-row"><span>风速滑块</span><span>${this.params.windSpeed.toFixed(1)} m/s</span></div>`;
    html += `<div class="info-row"><span>采样密度</span><span>${this.params.samplingDensity}</span></div>`;
    
    const angleCheck = this.params.checkAngleLimits(this.params.angleOfAttack);
    const samplingCheck = this.params.checkSamplingLimits(this.params.samplingDensity);
    
    if (angleCheck.level !== 'normal') {
      html += `<div class="info-row" style="color: ${angleCheck.level === 'error' ? '#f85149' : '#d29922'}"><span>迎角状态</span><span>${angleCheck.level === 'error' ? '✕ 越界' : '⚠ 接近边界'}</span></div>`;
      if (angleCheck.level === 'error') {
        html += `<span class="ctrl-link" onclick="document.getElementById('angle-slider').focus()">定位迎角滑块</span>`;
      }
    }
    if (samplingCheck.level !== 'normal') {
      html += `<div class="info-row" style="color: ${samplingCheck.level === 'error' ? '#f85149' : '#d29922'}"><span>采样状态</span><span>${samplingCheck.level === 'error' ? '✕ 过密' : '⚠ 偏高'}</span></div>`;
      if (samplingCheck.level === 'error') {
        html += `<span class="ctrl-link" onclick="document.getElementById('sampling-slider').focus()">定位采样滑块</span>`;
      }
    }
    
    html += `<div style="margin-top: 6px;">`;
    html += `<span class="ctrl-link" onclick="document.getElementById('angle-slider').focus()">迎角滑块</span>`;
    html += `<span class="ctrl-link" onclick="document.getElementById('wind-slider').focus()">风速滑块</span>`;
    html += `<span class="ctrl-link" onclick="document.getElementById('sampling-slider').focus()">采样滑块</span>`;
    html += `<span class="ctrl-link" onclick="document.getElementById('reset-btn').click()">重置对比</span>`;
    html += `</div>`;
    html += `</div>`;
    
    this.elements.infoContent.innerHTML = html;
  }

  getObjectInfo(object, intersection) {
    const type = object.userData.type || 'unknown';
    
    if (type === 'car') {
      const info = object.userData;
      return {
        name: '车身模型',
        properties: {
          '维护者': info.maintainer || '车辆工程组',
          '版本': info.source || '未知',
          '最后修改': info.lastModified || '未知',
          '当前迎角': this.params.angleOfAttack.toFixed(1) + '°',
          '当前风速': this.params.windSpeed.toFixed(1) + ' m/s'
        },
        source: info.source,
        position: intersection?.point || object.position,
        relatedControls: [
          { label: '迎角滑块', value: this.params.angleOfAttack.toFixed(1) + '°' },
          { label: '采样密度', value: this.params.samplingDensity.toString() },
          { label: '重置对比', value: '已启用' }
        ]
      };
    }
    
    if (type === 'sampling_point') {
      const pointData = object.userData;
      return {
        name: `采样点 #${pointData.index}`,
        properties: {
          '区域': pointData.area,
          '压力': (pointData.pressure / 1000).toFixed(2) + ' kPa',
          '速度': pointData.velocity.length().toFixed(2) + ' m/s',
          '法向': this.formatVector(pointData.surfaceNormal)
        },
        source: '采样点自动生成',
        position: intersection?.point || object.position,
        relatedControls: [
          { label: '采样密度', value: this.params.samplingDensity.toString() },
          { label: '当前迎角', value: this.params.angleOfAttack.toFixed(1) + '°' }
        ]
      };
    }
    
    if (type === 'dense_marker') {
      return {
        name: `过密标记: ${object.userData.area}`,
        properties: {
          '状态': '采样密度过高',
          '建议': '降低采样密度以优化性能'
        },
        position: intersection?.point || object.position,
        relatedControls: [
          { label: '采样密度', value: this.params.samplingDensity.toString() },
          { label: '推荐上限', value: '80' }
        ]
      };
    }
    
    return {
      name: '场景对象',
      properties: {
        '类型': type
      },
      position: intersection?.point || object.position
    };
  }

  formatVector(vec) {
    return `(${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)})`;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  getSnapshotFilename() {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') + '_' +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0');
    
    const angle = this.params.angleOfAttack.toFixed(1).replace('.', 'p');
    const wind = this.params.windSpeed.toFixed(0);
    const sampling = this.params.samplingDensity;
    
    return `wind_tunnel_AoA${angle}_V${wind}_S${sampling}_${timestamp}.png`;
  }
}
