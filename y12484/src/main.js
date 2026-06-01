import { SceneManager } from './scene/SceneManager.js'
import { checkPhaseIssues, checkBoundaryConditions, formatPhaseReport, calculateDistance } from './utils/phaseChecker.js'
import { microphoneConfigs, categoryNames } from './data/micConfig.js'

class DrumMicStudio {
  constructor() {
    this.sceneManager = null
    this.projectData = {
      trackName: '',
      drumKitModel: 'standard',
      notes: '',
      createdAt: new Date().toISOString()
    }
    this.init()
  }
  
  init() {
    const canvas = document.getElementById('sceneCanvas')
    this.sceneManager = new SceneManager(canvas)
    
    this.sceneManager.onObjectSelect = (obj) => this.handleObjectSelect(obj)
    this.sceneManager.onObjectHover = (obj, x, y) => this.handleObjectHover(obj, x, y)
    this.sceneManager.onObjectsUpdate = () => this.updatePhaseCheck()
    
    this.setupEventListeners()
    this.renderMicList()
    this.updatePhaseCheck()
  }
  
  setupEventListeners() {
    document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot())
    document.getElementById('reportBtn').addEventListener('click', () => this.generateReport())
    
    document.getElementById('trackName').addEventListener('input', (e) => {
      this.projectData.trackName = e.target.value
    })
    
    document.getElementById('drumKitModel').addEventListener('change', (e) => {
      this.projectData.drumKitModel = e.target.value
    })
    
    document.getElementById('notes').addEventListener('input', (e) => {
      this.projectData.notes = e.target.value
    })
    
    const filterMappings = {
      'filterKick': 'kick',
      'filterSnare': 'snare',
      'filterToms': 'toms',
      'filterHiHat': 'hihat',
      'filterCymbals': 'cymbals',
      'filterRoom': 'room',
      'filterOverheads': 'overheads'
    }
    
    Object.entries(filterMappings).forEach(([checkboxId, category]) => {
      document.getElementById(checkboxId).addEventListener('change', (e) => {
        this.sceneManager.setCategoryVisibility(category, e.target.checked)
      })
    })
  }
  
  handleObjectSelect(obj) {
    const detailContent = document.getElementById('detailContent')
    
    if (!obj) {
      detailContent.innerHTML = '<p class="placeholder">点击3D场景中的对象查看详情</p>'
      this.clearMicSelection()
      return
    }
    
    if (obj.userData.type === 'microphone') {
      const config = obj.userData.config
      const boundaryCheck = checkBoundaryConditions({
        config: config,
        position: obj.position,
        targetPosition: obj.userData.targetPosition
      })
      
      this.showMicDetails(config, boundaryCheck)
      this.selectMicInList(config.id)
    } else if (obj.userData.type === 'drum') {
      this.showDrumDetails(obj.userData)
      this.clearMicSelection()
    }
  }
  
  handleObjectHover(obj, x, y) {
    const tooltip = document.getElementById('tooltip')
    
    if (!obj) {
      tooltip.classList.add('hidden')
      return
    }
    
    tooltip.classList.remove('hidden')
    tooltip.style.left = `${x + 15}px`
    tooltip.style.top = `${y + 15}px`
    
    if (obj.userData.type === 'microphone') {
      const config = obj.userData.config
      const distance = calculateDistance(obj.position, obj.userData.targetPosition)
      
      tooltip.innerHTML = `
        <h4>${config.icon} ${config.name}</h4>
        <div class="detail-row"><span>型号:</span><span>${config.micModel}</span></div>
        <div class="detail-row"><span>指向目标:</span><span>${categoryNames[config.category] || config.category}</span></div>
        <div class="detail-row"><span>当前距离:</span><span>${(distance * 100).toFixed(1)}cm</span></div>
      `
    } else if (obj.userData.type === 'drum') {
      tooltip.innerHTML = `
        <h4>🥁 ${obj.userData.name}</h4>
        <div class="detail-row"><span>位置:</span><span>X: ${obj.position.x.toFixed(2)} Z: ${obj.position.z.toFixed(2)}</span></div>
      `
    }
  }
  
  showMicDetails(config, boundaryCheck) {
    const detailContent = document.getElementById('detailContent')
    
    const warningsHtml = boundaryCheck.warnings.length > 0 
      ? boundaryCheck.warnings.map(w => `
          <div class="warning-item" style="margin-top:8px;">
            <strong>${w.severity === 'warning' ? '⚠️' : 'ℹ️'} ${w.type === 'distance_too_close' ? '距离过近' : w.type === 'distance_too_far' ? '距离过远' : '角度异常'}</strong>
            <p>${w.message}</p>
          </div>
        `).join('')
      : ''
    
    detailContent.innerHTML = `
      <div class="detail-section">
        <h4>🎤 麦克风信息</h4>
        <div class="detail-row"><span class="label">名称</span><span class="value">${config.name}</span></div>
        <div class="detail-row"><span class="label">型号</span><span class="value">${config.micModel}</span></div>
        <div class="detail-row"><span class="label">指向性</span><span class="value">${config.polarPattern}</span></div>
        <div class="detail-row"><span class="label">典型增益</span><span class="value">${config.typicalGain}</span></div>
      </div>
      
      <div class="detail-section">
        <h4>📐 当前参数</h4>
        <div class="detail-row"><span class="label">距离</span><span class="value">${boundaryCheck.distance.toFixed(1)} cm</span></div>
        <div class="detail-row"><span class="label">角度</span><span class="value">${boundaryCheck.angle.toFixed(1)}°</span></div>
        <div class="detail-row"><span class="label">推荐距离</span><span class="value">${config.recommendedDistance.min * 100}-${config.recommendedDistance.max * 100} cm</span></div>
        <div class="detail-row"><span class="label">状态</span><span class="value" style="color:${boundaryCheck.isInBounds ? '#2ecc71' : '#f39c12'}">${boundaryCheck.isInBounds ? '✅ 正常' : '⚠️ 超出范围'}</span></div>
      </div>
      
      ${warningsHtml}
      
      <div class="detail-section">
        <h4>💡 摆位建议</h4>
        <p style="font-size:12px; color:rgba(255,255,255,0.7); line-height:1.6;">${config.notes}</p>
      </div>
    `
  }
  
  showDrumDetails(userData) {
    const detailContent = document.getElementById('detailContent')
    
    const affectedMics = this.findAffectedMicrophones(userData.sourcePosition)
    
    detailContent.innerHTML = `
      <div class="detail-section">
        <h4>🥁 鼓件信息</h4>
        <div class="detail-row"><span class="label">名称</span><span class="value">${userData.name}</span></div>
        <div class="detail-row"><span class="label">位置</span><span class="value">X: ${userData.sourcePosition.x.toFixed(2)}, Y: ${userData.sourcePosition.y.toFixed(2)}, Z: ${userData.sourcePosition.z.toFixed(2)}</span></div>
      </div>
      
      <div class="detail-section">
        <h4>🎤 相关麦克风 (${affectedMics.length})</h4>
        ${affectedMics.length > 0 
          ? affectedMics.map(mic => `
              <div class="detail-row">
                <span class="label">${mic.config.name}</span>
                <span class="value">${mic.distance.toFixed(1)}cm</span>
              </div>
            `).join('')
          : '<p style="font-size:12px; color:rgba(255,255,255,0.5);">2米范围内无麦克风</p>'
        }
      </div>
    `
  }
  
  findAffectedMicrophones(sourcePosition) {
    const mics = this.sceneManager.getVisibleMicrophones()
    const affected = []
    
    Object.values(mics).forEach(mic => {
      const dist = calculateDistance(mic.position, sourcePosition)
      if (dist < 2.0) {
        affected.push({
          config: mic.config,
          distance: dist * 100
        })
      }
    })
    
    return affected.sort((a, b) => a.distance - b.distance)
  }
  
  renderMicList() {
    const micList = document.getElementById('micList')
    const visibleMics = this.sceneManager.getVisibleMicrophones()
    
    micList.innerHTML = Object.values(visibleMics).map(mic => {
      const config = mic.config
      const colorHex = '#' + config.color.toString(16).padStart(6, '0')
      
      return `
        <div class="mic-item" data-mic-id="${config.id}" onclick="studio.focusMic('${config.id}')">
          <div class="mic-icon" style="background: ${colorHex}33; color: ${colorHex}">
            ${config.icon}
          </div>
          <div class="mic-info">
            <div class="mic-name">${config.name}</div>
            <div class="mic-target">${categoryNames[config.category] || config.category}</div>
          </div>
        </div>
      `
    }).join('')
  }
  
  focusMic(micId) {
    const mic = this.sceneManager.microphones[micId]
    if (mic) {
      this.sceneManager.selectObject(mic)
      this.selectMicInList(micId)
    }
  }
  
  selectMicInList(micId) {
    document.querySelectorAll('.mic-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.micId === micId)
    })
  }
  
  clearMicSelection() {
    document.querySelectorAll('.mic-item').forEach(item => {
      item.classList.remove('selected')
    })
  }
  
  updatePhaseCheck() {
    const mics = this.sceneManager.getVisibleMicrophones()
    const drumSources = this.sceneManager.getDrumSources()
    const issues = checkPhaseIssues(mics, drumSources)
    
    this.renderPhaseWarnings(issues)
    this.checkBoundaryWarnings(mics)
  }
  
  renderPhaseWarnings(issues) {
    const warningsContainer = document.getElementById('phaseWarnings')
    
    if (issues.length === 0) {
      warningsContainer.innerHTML = '<p class="no-warnings">✅ 未检测到明显相位问题</p>'
      return
    }
    
    warningsContainer.innerHTML = issues.map(issue => `
      <div class="warning-item">
        <strong>${issue.severity === 'high' ? '🔴' : '🟡'} ${issue.target}</strong>
        <p>${issue.mic1} ↔ ${issue.mic2}</p>
        <p style="margin-top:4px; font-size:11px;">距离差: ${issue.distanceDiff}cm | ${issue.severity === 'high' ? '高风险' : '中风险'}</p>
      </div>
    `).join('')
  }
  
  checkBoundaryWarnings(mics) {
    let hasOutOfBounds = false
    
    Object.values(mics).forEach(mic => {
      const check = checkBoundaryConditions(mic)
      if (!check.isInBounds) {
        hasOutOfBounds = true
      }
    })
    
    const boundaryWarning = document.getElementById('boundaryWarning')
    boundaryWarning.classList.toggle('hidden', !hasOutOfBounds)
  }
  
  takeScreenshot() {
    const dataUrl = this.sceneManager.captureScreenshot()
    
    const link = document.createElement('a')
    const fileName = this.projectData.trackName 
      ? `鼓组摆位_${this.projectData.trackName}_${new Date().toLocaleDateString()}.png`
      : `鼓组摆位_${new Date().toLocaleDateString()}.png`
    
    link.download = fileName
    link.href = dataUrl
    link.click()
  }
  
  generateReport() {
    const mics = this.sceneManager.getVisibleMicrophones()
    const drumSources = this.sceneManager.getDrumSources()
    const phaseIssues = checkPhaseIssues(mics, drumSources)
    
    const micCount = Object.keys(mics).length
    const visibleCategories = [...new Set(Object.values(mics).map(m => m.config.category))]
    const hasWarnings = phaseIssues.length > 0
    
    const reportWindow = window.open('', '_blank')
    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>鼓组摆位报告 - ${this.projectData.trackName || '未命名项目'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 40px;
          }
          .container { max-width: 900px; margin: 0 auto; }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .header h1 { font-size: 32px; margin-bottom: 10px; }
          .header .subtitle { color: rgba(255,255,255,0.6); font-size: 14px; }
          .section { 
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .section h2 { 
            font-size: 18px; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .info-item {
            padding: 12px 16px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
          }
          .info-item .label {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
            margin-bottom: 4px;
          }
          .info-item .value {
            font-size: 14px;
            font-weight: 500;
          }
          .mic-table {
            width: 100%;
            border-collapse: collapse;
          }
          .mic-table th, .mic-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .mic-table th {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
            font-weight: 500;
          }
          .mic-table td { font-size: 13px; }
          .warning-item {
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
          }
          .warning-item .severity {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .warning-item.high .severity { background: #e74c3c; }
          .warning-item.medium .severity { background: #f39c12; }
          .warning-item h4 { margin-bottom: 8px; }
          .warning-item p { font-size: 13px; color: rgba(255,255,255,0.8); }
          .soundfield-guide {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .guide-item {
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
          }
          .guide-item strong { display: block; margin-bottom: 4px; }
          .guide-item p { font-size: 12px; color: rgba(255,255,255,0.6); }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.5);
            font-size: 12px;
          }
          @media print {
            body { background: #fff; color: #000; padding: 20px; }
            .section { background: #f5f5f5; color: #000; border-color: #ddd; }
            .guide-item, .info-item { background: #eee; color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🥁 鼓组麦克风摆位报告</h1>
            <p class="subtitle">Drum Mic Positioning Report</p>
          </div>
          
          <div class="section">
            <h2>📋 项目信息</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="label">曲目名称</div>
                <div class="value">${this.projectData.trackName || '未命名'}</div>
              </div>
              <div class="info-item">
                <div class="label">鼓组型号</div>
                <div class="value">${this.projectData.drumKitModel === 'standard' ? '标准五鼓组' : this.projectData.drumKitModel === 'jazz' ? '爵士四鼓组' : '金属八鼓组'}</div>
              </div>
              <div class="info-item">
                <div class="label">麦克风数量</div>
                <div class="value">${micCount} 支</div>
              </div>
              <div class="info-item">
                <div class="label">生成时间</div>
                <div class="value">${new Date().toLocaleString('zh-CN')}</div>
              </div>
            </div>
            ${this.projectData.notes ? `
              <div class="info-item" style="margin-top:16px;">
                <div class="label">备注</div>
                <div class="value">${this.projectData.notes}</div>
              </div>
            ` : ''}
          </div>
          
          <div class="section">
            <h2>🎤 麦克风配置清单</h2>
            <table class="mic-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>型号</th>
                  <th>指向性</th>
                  <th>分类</th>
                  <th>增益建议</th>
                </tr>
              </thead>
              <tbody>
                ${Object.values(mics).map(mic => `
                  <tr>
                    <td>${mic.config.name}</td>
                    <td>${mic.config.micModel}</td>
                    <td>${mic.config.polarPattern}</td>
                    <td>${categoryNames[mic.config.category] || mic.config.category}</td>
                    <td>${mic.config.typicalGain}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>⚠️ 相位检测报告 ${hasWarnings ? `<span style="font-size:12px; color:#f39c12;">(${phaseIssues.length} 个潜在问题)</span>` : '<span style="font-size:12px; color:#2ecc71;">(无问题)</span>'}</h2>
            ${hasWarnings ? phaseIssues.map(issue => `
              <div class="warning-item ${issue.severity}">
                <span class="severity">${issue.severity === 'high' ? '高风险' : '中风险'}</span>
                <h4>${issue.target}</h4>
                <p><strong>涉及麦克风：</strong>${issue.mic1} ↔ ${issue.mic2}</p>
                <p><strong>距离差异：</strong>${issue.distanceDiff}cm</p>
                <p style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);">${issue.suggestion}</p>
              </div>
            `).join('') : '<p style="color:rgba(255,255,255,0.6);">✅ 未检测到明显的相位问题</p>'}
          </div>
          
          <div class="section">
            <h2>📐 声场提示口径</h2>
            <div class="soundfield-guide">
              <div class="guide-item">
                <strong>🎯 近距离 (5-15cm)</strong>
                <p>贴身收音，冲击力强，细节丰富，适合军鼓、底鼓等需要突出质感的乐器</p>
              </div>
              <div class="guide-item">
                <strong>🎯 中距离 (15-45cm)</strong>
                <p>平衡音色，兼顾质感与空间，是通鼓、镲片的常用摆位区间</p>
              </div>
              <div class="guide-item">
                <strong>🎯 远距离 (45cm+)</strong>
                <p>房间氛围，自然混响感，适合顶置麦、房间麦捕捉整体声场</p>
              </div>
              <div class="guide-item" style="background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.2);">
                <strong>⚠️ 相位危险区</strong>
                <p>两支麦克风距离同一鼓件的距离差 < 34cm 时可能产生相位抵消，需特别注意</p>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>鼓组麦克风摆位室 | Drum Mic Positioning Studio</p>
            <p>本报告由系统自动生成，建议结合实际监听进行微调</p>
          </div>
        </div>
      </body>
      </html>
    `)
    reportWindow.document.close()
  }
}

window.studio = null
window.addEventListener('DOMContentLoaded', () => {
  window.studio = new DrumMicStudio()
})
