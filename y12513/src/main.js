import { PhaseDiagram3D } from './phaseDiagram3D.js';
import { materials, questions, calculateProperties, validateParameters } from './data.js';

class App {
  constructor() {
    this.phaseDiagram = null;
    this.currentMaterial = 'H2O';
    this.currentT = 300;
    this.currentP = 101325;
    this.protectionEnabled = true;
    this.savedStates = [];
    this.currentQuestion = null;
    this.questionState = null;
    this.isPathPlaying = false;
    
    this.init();
  }
  
  init() {
    const container = document.getElementById('threeCanvas');
    this.phaseDiagram = new PhaseDiagram3D(container);
    
    this.setupEventListeners();
    this.loadRandomQuestion();
    this.updateAll();
    
    this.phaseDiagram.onObjectClick = (data, point) => this.handleObjectClick(data, point);
    this.phaseDiagram.onObjectHover = (data, point, isHovering) => this.handleObjectHover(data, point, isHovering);
  }
  
  setupEventListeners() {
    const tempSlider = document.getElementById('temperature');
    const pressSlider = document.getElementById('pressure');
    const materialSelect = document.getElementById('material');
    const protectionCheckbox = document.getElementById('paramProtection');
    const pathSpeed = document.getElementById('pathSpeed');
    
    tempSlider.addEventListener('input', (e) => {
      this.currentT = parseFloat(e.target.value);
      this.updateAll();
    });
    
    pressSlider.addEventListener('input', (e) => {
      this.currentP = parseFloat(e.target.value);
      this.updateAll();
    });
    
    materialSelect.addEventListener('change', (e) => {
      this.currentMaterial = e.target.value;
      this.phaseDiagram.setMaterial(this.currentMaterial);
      this.updateAll();
    });
    
    protectionCheckbox.addEventListener('change', (e) => {
      this.protectionEnabled = e.target.checked;
      this.updateAll();
    });
    
    pathSpeed.addEventListener('input', (e) => {
      this.phaseDiagram.setPlaybackSpeed(parseFloat(e.target.value));
    });
    
    document.getElementById('playPath').addEventListener('click', () => this.playCurrentQuestionPath());
    document.getElementById('pausePath').addEventListener('click', () => this.phaseDiagram.pausePlayback());
    document.getElementById('resetPath').addEventListener('click', () => this.phaseDiagram.resetPlayback());
    
    document.getElementById('newQuestion').addEventListener('click', () => this.loadRandomQuestion());
    document.getElementById('compareState').addEventListener('click', () => this.compareStates());
    document.getElementById('saveState').addEventListener('click', () => this.saveCurrentState());
  }
  
  updateAll() {
    const T = this.currentT;
    const P = this.currentP;
    const mat = materials[this.currentMaterial];
    
    if (this.protectionEnabled) {
      const Tc = mat.critical.temperature;
      const Pc = mat.critical.pressure;
      
      if (T > Tc * 1.5) {
        this.currentT = Tc * 1.5;
        document.getElementById('temperature').value = this.currentT;
      }
      if (P > Pc * 2) {
        this.currentP = Pc * 2;
        document.getElementById('pressure').value = this.currentP;
      }
    }
    
    this.phaseDiagram.setParameters(this.currentT, this.currentP);
    this.updateControlPanel();
    this.updateDataPanel();
    this.updateErrorDiagnosis();
  }
  
  updateControlPanel() {
    document.getElementById('tempValue').textContent = `${this.currentT.toFixed(1)} K`;
    document.getElementById('pressValue').textContent = this.formatPressure(this.currentP);
    document.getElementById('currentMaterial').textContent = `当前材料: ${materials[this.currentMaterial].name}`;
  }
  
  updateDataPanel() {
    const props = calculateProperties(this.currentMaterial, this.currentT, this.currentP);
    const mat = materials[this.currentMaterial];
    
    if (!props) return;
    
    document.getElementById('currentPhase').textContent = props.phase;
    document.getElementById('dataTemp').textContent = `${this.currentT.toFixed(1)} K`;
    document.getElementById('dataPress').textContent = this.formatPressure(this.currentP);
    document.getElementById('specificVolume').textContent = this.formatVolume(props.specificVolume);
    document.getElementById('enthalpy').textContent = `${props.enthalpy.toFixed(1)} kJ/kg`;
    document.getElementById('entropy').textContent = `${props.entropy.toFixed(3)} kJ/(kg·K)`;
    
    document.getElementById('criticalTemp').textContent = `${mat.critical.temperature.toFixed(1)} K`;
    document.getElementById('criticalPress').textContent = this.formatPressure(mat.critical.pressure);
    document.getElementById('criticalVol').textContent = this.formatVolume(mat.critical.volume);
    
    document.getElementById('tripleTemp').textContent = `${mat.triple.temperature.toFixed(2)} K`;
    document.getElementById('triplePress').textContent = this.formatPressure(mat.triple.pressure);
    
    document.getElementById('sourceMaterial').textContent = mat.name;
    document.getElementById('sourceDatabase').textContent = mat.source.database;
    document.getElementById('sourceRef').textContent = mat.source.reference;
    document.getElementById('sourceVersion').textContent = mat.source.version;
  }
  
  updateErrorDiagnosis() {
    const validation = validateParameters(
      this.currentMaterial,
      this.currentT,
      this.currentP,
      this.protectionEnabled
    );
    
    const errorIndicator = document.getElementById('errorIndicator');
    const errorSection = document.getElementById('errorDiagnosis');
    const noErrorSection = document.getElementById('noError');
    
    if (validation.allIssues.length > 0) {
      errorIndicator.classList.remove('hidden');
      errorSection.classList.remove('hidden');
      noErrorSection.classList.add('hidden');
      
      const issue = validation.allIssues[0];
      document.getElementById('errorType').textContent = issue.type;
      document.getElementById('errorDetail').textContent = issue.detail;
      document.getElementById('errorMaterialName').textContent = materials[this.currentMaterial].name;
      document.getElementById('errorLocation').textContent = issue.location;
      document.getElementById('errorSuggestion').textContent = issue.suggestion;
    } else {
      errorIndicator.classList.add('hidden');
      errorSection.classList.add('hidden');
      noErrorSection.classList.remove('hidden');
    }
  }
  
  handleObjectClick(data, point) {
    if (!data) return;
    
    let info = '';
    
    switch (data.type) {
      case 'criticalPoint':
        info = `
          <h3>${data.name}</h3>
          <p><strong>温度:</strong> ${data.T.toFixed(1)} K</p>
          <p><strong>压力:</strong> ${this.formatPressure(data.P)}</p>
          <p><strong>比容:</strong> ${this.formatVolume(data.v)}</p>
          <p><em>${data.description}</em></p>
          <p style="margin-top: 8px; color: #ff6b6b;">⚠️ 越过此点后液气两相界限消失</p>
        `;
        break;
        
      case 'triplePoint':
        info = `
          <h3>${data.name}</h3>
          <p><strong>温度:</strong> ${data.T.toFixed(2)} K</p>
          <p><strong>压力:</strong> ${this.formatPressure(data.P)}</p>
          <p><strong>比容:</strong> ${this.formatVolume(data.v)}</p>
          <p><em>${data.description}</em></p>
        `;
        break;
        
      case 'saturationCurve':
        const T = this.phaseDiagram.unscaleTemperature(point.x);
        const P = this.phaseDiagram.unscalePressure(point.y);
        info = `
          <h3>${data.name}</h3>
          <p><strong>点击位置:</strong></p>
          <p>T ≈ ${T.toFixed(1)} K</p>
          <p>P ≈ ${this.formatPressure(P)}</p>
          <p><em>${data.description}</em></p>
          <p style="margin-top: 8px; color: #ffd54f;">💡 沿此曲线液气两相共存</p>
        `;
        break;
        
      case 'phaseSurface':
        info = `
          <h3>${data.phaseName}区</h3>
          <p><strong>材料:</strong> ${materials[data.material].name}</p>
          <p><strong>数据来源:</strong> ${materials[data.material].source.database}</p>
          <p><strong>状态方程:</strong> ${materials[data.material].source.equations}</p>
          <p style="margin-top: 8px; color: #667eea;">🔒 参数保护: ${this.protectionEnabled ? '已启用' : '已禁用'}</p>
        `;
        break;
        
      case 'currentPoint':
        const props = calculateProperties(this.currentMaterial, this.currentT, this.currentP);
        info = `
          <h3>${data.name}</h3>
          <p><strong>相态:</strong> ${props.phase}</p>
          <p><strong>温度:</strong> ${this.currentT.toFixed(1)} K</p>
          <p><strong>压力:</strong> ${this.formatPressure(this.currentP)}</p>
          <p><strong>比容:</strong> ${this.formatVolume(props.specificVolume)}</p>
          <p><strong>焓:</strong> ${props.enthalpy.toFixed(1)} kJ/kg</p>
          <p><strong>熵:</strong> ${props.entropy.toFixed(3)} kJ/(kg·K)</p>
          ${props.quality !== null ? `<p><strong>干度:</strong> ${(props.quality * 100).toFixed(1)}%</p>` : ''}
          <p style="margin-top: 8px;"><strong>对比参数:</strong></p>
          <p>Tr = ${props.reducedTemperature.toFixed(3)}, Pr = ${props.reducedPressure.toFixed(3)}</p>
          ${props.isNearCritical ? '<p style="color: #ff6b6b;">⚠️ 接近临界点！</p>' : ''}
        `;
        break;
        
      case 'pathLine':
        info = `
          <h3>${data.name}</h3>
          <p><strong>路径点数:</strong> ${this.phaseDiagram.pathPoints.length}</p>
          <p><strong>播放状态:</strong> ${this.isPathPlaying ? '播放中' : '已暂停'}</p>
          <p style="margin-top: 8px; color: #667eea;">💡 使用控制面板调整播放速度</p>
        `;
        break;
        
      default:
        info = `<h3>${data.name || '未知对象'}</h3>`;
    }
    
    this.showPopup(info, data.type);
  }
  
  handleObjectHover(data, point, isHovering) {
    const hoverInfo = document.getElementById('hoverInfo');
    
    if (isHovering && data) {
      let text = '';
      
      switch (data.type) {
        case 'criticalPoint':
          text = `<strong>${data.name}</strong><br>T=${data.T.toFixed(1)} K, P=${this.formatPressure(data.P)}`;
          break;
        case 'triplePoint':
          text = `<strong>${data.name}</strong><br>T=${data.T.toFixed(2)} K`;
          break;
        case 'saturationCurve':
          text = `<strong>${data.name}</strong><br>点击查看详情`;
          break;
        case 'phaseSurface':
          text = `<strong>${data.phaseName}</strong><br>${materials[data.material].name}`;
          break;
        case 'currentPoint':
          const props = calculateProperties(this.currentMaterial, this.currentT, this.currentP);
          text = `<strong>当前状态</strong><br>${props.phase}<br>点击查看完整数据`;
          break;
        default:
          text = `<strong>${data.name || '对象'}</strong>`;
      }
      
      hoverInfo.innerHTML = text;
      hoverInfo.classList.remove('hidden');
      
      const canvasRect = document.getElementById('threeCanvas').getBoundingClientRect();
      const mouseX = this.phaseDiagram.mouse.x;
      const mouseY = this.phaseDiagram.mouse.y;
      
      hoverInfo.style.left = `${(mouseX + 1) / 2 * canvasRect.width + 15}px`;
      hoverInfo.style.top = `${(-mouseY + 1) / 2 * canvasRect.height - 30}px`;
    } else {
      hoverInfo.classList.add('hidden');
    }
  }
  
  showPopup(content, type) {
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <button class="close-btn">×</button>
        ${content}
      </div>
    `;
    document.body.appendChild(popup);
    
    const closeBtn = popup.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      popup.remove();
    });
    
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove();
      }
    });
    
    const style = document.createElement('style');
    style.textContent = `
      .info-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
      }
      .popup-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid #667eea;
        border-radius: 12px;
        padding: 24px;
        max-width: 450px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
      }
      .close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: #8b95b7;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        line-height: 1;
      }
      .close-btn:hover {
        color: #ff6b6b;
      }
      .popup-content h3 {
        color: #667eea;
        margin-bottom: 16px;
        font-size: 1.1rem;
      }
      .popup-content p {
        color: #c0c8e0;
        margin: 8px 0;
        font-size: 0.9rem;
        line-height: 1.6;
      }
      .popup-content strong {
        color: #8b95b7;
        font-weight: 500;
      }
      .popup-content em {
        color: #a0a8c0;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
  
  loadRandomQuestion() {
    const randomIndex = Math.floor(Math.random() * questions.length);
    this.currentQuestion = questions[randomIndex];
    
    document.querySelector('.question-text').textContent = 
      `【${this.currentQuestion.title}】${this.currentQuestion.text}`;
    
    this.questionState = {
      material: this.currentQuestion.targetMaterial,
      startT: this.currentQuestion.startParams.temperature,
      startP: this.currentQuestion.startParams.pressure,
      endT: this.currentQuestion.endParams.temperature,
      endP: this.currentQuestion.endParams.pressure
    };
    
    document.getElementById('material').value = this.questionState.material;
    this.currentMaterial = this.questionState.material;
    this.currentT = this.questionState.startT;
    this.currentP = this.questionState.startP;
    
    document.getElementById('temperature').value = this.currentT;
    document.getElementById('pressure').value = this.currentP;
    
    this.phaseDiagram.setMaterial(this.currentMaterial);
    this.updateAll();
  }
  
  playCurrentQuestionPath() {
    if (!this.questionState) return;
    
    const pathPoints = this.generatePath(
      this.questionState.startT,
      this.questionState.startP,
      this.questionState.endT,
      this.questionState.endP,
      50
    );
    
    this.isPathPlaying = true;
    this.phaseDiagram.startPlayback(pathPoints);
  }
  
  generatePath(T1, P1, T2, P2, steps) {
    const path = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const T = T1 + t * (T2 - T1);
      let P;
      
      if (Math.abs(P2 - P1) < 1000) {
        P = P1 + t * (P2 - P1);
      } else {
        const lnP1 = Math.log(P1);
        const lnP2 = Math.log(P2);
        P = Math.exp(lnP1 + t * (lnP2 - lnP1));
      }
      
      path.push({ T, P });
    }
    
    return path;
  }
  
  saveCurrentState() {
    const props = calculateProperties(this.currentMaterial, this.currentT, this.currentP);
    const state = {
      id: Date.now(),
      material: this.currentMaterial,
      materialName: materials[this.currentMaterial].name,
      T: this.currentT,
      P: this.currentP,
      phase: props.phase,
      specificVolume: props.specificVolume,
      enthalpy: props.enthalpy,
      entropy: props.entropy,
      timestamp: new Date().toLocaleString()
    };
    
    this.savedStates.unshift(state);
    if (this.savedStates.length > 5) {
      this.savedStates.pop();
    }
    
    this.showPopup(`
      <h3>✅ 状态已保存</h3>
      <p><strong>材料:</strong> ${state.materialName}</p>
      <p><strong>温度:</strong> ${state.T.toFixed(1)} K</p>
      <p><strong>压力:</strong> ${this.formatPressure(state.P)}</p>
      <p><strong>相态:</strong> ${state.phase}</p>
      <p><strong>保存时间:</strong> ${state.timestamp}</p>
      <p style="margin-top: 12px; color: #8b95b7;">已保存 ${this.savedStates.length}/5 个状态</p>
    `, 'save');
  }
  
  compareStates() {
    if (this.savedStates.length < 2) {
      this.showPopup(`
        <h3>⚠️ 无法对比</h3>
        <p>至少需要保存 2 个状态才能进行对比。</p>
        <p>当前已保存: ${this.savedStates.length} 个状态</p>
        <p style="margin-top: 12px; color: #667eea;">💡 点击"保存当前状态"按钮保存状态</p>
      `, 'warning');
      return;
    }
    
    const state1 = this.savedStates[0];
    const state2 = this.savedStates[1];
    
    const diffContainer = document.getElementById('stateDiff');
    diffContainer.classList.remove('hidden');
    
    diffContainer.innerHTML = `
      <h3>状态对比 (${state1.materialName})</h3>
      <div class="diff-item">
        <span class="label">温度</span>
        <span><span class="diff-value-before">${state1.T.toFixed(1)} K</span> → <span class="diff-value-after">${state2.T.toFixed(1)} K</span></span>
      </div>
      <div class="diff-item">
        <span class="label">压力</span>
        <span><span class="diff-value-before">${this.formatPressure(state1.P)}</span> → <span class="diff-value-after">${this.formatPressure(state2.P)}</span></span>
      </div>
      <div class="diff-item">
        <span class="label">相态</span>
        <span><span class="diff-value-before">${state1.phase}</span> → <span class="diff-value-after">${state2.phase}</span></span>
      </div>
      <div class="diff-item">
        <span class="label">比容变化</span>
        <span>${((state2.specificVolume - state1.specificVolume) / state1.specificVolume * 100).toFixed(1)}%</span>
      </div>
      <div class="diff-item">
        <span class="label">焓变</span>
        <span>${(state2.enthalpy - state1.enthalpy).toFixed(1)} kJ/kg</span>
      </div>
      <div class="diff-item">
        <span class="label">熵变</span>
        <span>${(state2.entropy - state1.entropy).toFixed(3)} kJ/(kg·K)</span>
      </div>
      <div class="diff-item">
        <span class="label">ΔT</span>
        <span>${(state2.T - state1.T).toFixed(1)} K</span>
      </div>
      <div class="diff-item">
        <span class="label">材料</span>
        <span>${state1.material}</span>
      </div>
      <p style="margin-top: 12px; font-size: 0.8rem; color: #8b95b7;">
        ${state1.material !== state2.material ? '⚠️ 两次状态材料不同！' : '✓ 材料一致'}
      </p>
    `;
    
    this.showPopup(`
      <h3>📊 详细对比报告</h3>
      <p><strong>状态 #1 (${state1.timestamp}):</strong></p>
      <p>T=${state1.T.toFixed(1)} K, P=${this.formatPressure(state1.P)}, ${state1.phase}</p>
      <p>v=${this.formatVolume(state1.specificVolume)}, h=${state1.enthalpy.toFixed(1)} kJ/kg, s=${state1.entropy.toFixed(3)} kJ/(kg·K)</p>
      
      <p style="margin-top: 12px;"><strong>状态 #2 (${state2.timestamp}):</strong></p>
      <p>T=${state2.T.toFixed(1)} K, P=${this.formatPressure(state2.P)}, ${state2.phase}</p>
      <p>v=${this.formatVolume(state2.specificVolume)}, h=${state2.enthalpy.toFixed(1)} kJ/kg, s=${state2.entropy.toFixed(3)} kJ/(kg·K)</p>
      
      <p style="margin-top: 12px;"><strong>差异分析:</strong></p>
      <p>ΔT = ${(state2.T - state1.T).toFixed(1)} K (${((state2.T - state1.T) / state1.T * 100).toFixed(1)}%)</p>
      <p>ΔP = ${this.formatPressure(Math.abs(state2.P - state1.P))} (${((state2.P - state1.P) / state1.P * 100).toFixed(1)}%)</p>
      ${state1.phase !== state2.phase ? '<p style="color: #ffd54f;">⚠️ 发生了相变！</p>' : '<p style="color: #51cf66;">✓ 无相变</p>'}
      ${state1.material !== state2.material ? '<p style="color: #ff6b6b;">⚠️ 材料不同，对比需谨慎！</p>' : ''}
      
      <p style="margin-top: 12px; color: #8b95b7;"><em>两次状态的差异已完整保留在侧边面板中</em></p>
    `, 'compare');
  }
  
  formatPressure(P) {
    if (P >= 1e6) {
      return `${(P / 1e6).toFixed(2)} MPa`;
    } else if (P >= 1e3) {
      return `${(P / 1e3).toFixed(2)} kPa`;
    } else {
      return `${P.toFixed(1)} Pa`;
    }
  }
  
  formatVolume(v) {
    if (v >= 0.01) {
      return `${v.toFixed(4)} m³/kg`;
    } else if (v >= 1e-4) {
      return `${(v * 1000).toFixed(2)} × 10⁻³ m³/kg`;
    } else {
      return `${v.toExponential(2)} m³/kg`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
