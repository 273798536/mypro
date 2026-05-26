import * as THREE from 'three'
import { SceneManager } from './SceneManager.js'
import { BridgeModel } from './BridgeModel.js'
import { FEMSolver } from './FEMSolver.js'
import { UIManager } from './UIManager.js'
import { HistoryManager } from './HistoryManager.js'
import { ErrorDetector } from './ErrorDetector.js'

class App {
  constructor() {
    this.sceneManager = new SceneManager()
    this.bridgeModel = new BridgeModel(this.sceneManager)
    this.femSolver = new FEMSolver()
    this.uiManager = new UIManager()
    this.historyManager = new HistoryManager()
    this.errorDetector = new ErrorDetector()
    
    this.currentMode = 1
    this.animScale = 1
    this.animSpeed = 1
    this.isAnimating = true
    this.showOriginal = true
    this.autoCompute = true
    
    this.modes = []
    this.eigenfrequencies = []
    this.animTime = 0
    this.lastTimestamp = 0
    this.needsRecompute = true
    
    this.init()
  }

  init() {
    this.bridgeModel.createDefaultBridge()
    this.setupEventListeners()
    this.animate = this.animate.bind(this)
    this.animate()
    this.historyManager.addRecord(this.getState(), '初始化')
    this.computeModes()
    this.updateUI()
  }

  setupEventListeners() {
    const ui = this.uiManager

    ui.on('nodeCount', (value) => {
      this.bridgeModel.setNodeCount(parseInt(value))
      this.markNeedsRecompute()
    })

    ui.on('bridgeLength', (value) => {
      this.bridgeModel.setBridgeLength(parseFloat(value))
      this.markNeedsRecompute()
    })

    ui.on('beamHeight', (value) => {
      this.bridgeModel.setBeamHeight(parseFloat(value))
      this.markNeedsRecompute()
    })

    ui.on('beamWidth', (value) => {
      this.bridgeModel.setBeamWidth(parseFloat(value))
      this.markNeedsRecompute()
    })

    ui.on('elasticMod', (value) => {
      this.femSolver.setElasticModulus(parseFloat(value) * 1e9)
      this.markNeedsRecompute()
    })

    ui.on('density', (value) => {
      this.femSolver.setDensity(parseFloat(value))
      this.markNeedsRecompute()
    })

    ui.on('poisson', (value) => {
      this.femSolver.setPoissonRatio(parseFloat(value))
    })

    ui.on('modeNum', (value) => {
      this.currentMode = parseInt(value)
      this.bridgeModel.setModeNumber(this.currentMode)
      this.updateModeDescription()
      this.updateValuePanel()
    })

    ui.on('scale', (value) => {
      this.animScale = parseFloat(value)
      this.bridgeModel.setDeformationScale(this.animScale)
      this.checkScaleWarning()
    })

    ui.on('animSpeed', (value) => {
      this.animSpeed = parseFloat(value)
    })

    ui.on('showOriginal', (checked) => {
      this.showOriginal = checked
      this.bridgeModel.setShowOriginal(checked)
    })

    ui.on('autoCompute', (checked) => {
      this.autoCompute = checked
    })

    ui.on('compute', () => {
      this.computeModes()
    })

    ui.on('addSupport', () => {
      this.bridgeModel.addSupport()
      this.updateSupportList()
    })

    ui.on('addLoad', () => {
      this.bridgeModel.addLoad()
      this.updateLoadList()
      this.markNeedsRecompute()
    })

    ui.on('exportScreenshot', () => {
      this.exportScreenshot()
    })

    ui.on('exportReport', () => {
      this.exportReport()
    })

    ui.on('exportJson', () => {
      this.exportJson()
    })

    ui.on('importJson', () => {
      this.importJson()
    })

    ui.on('clearHistory', () => {
      if (confirm('确定要清除所有历史记录吗？')) {
        this.historyManager.clear()
        this.updateHistoryList()
      }
    })

    this.bridgeModel.on('supportChanged', () => {
      this.updateSupportList()
      this.checkSupportWarnings()
    })

    this.bridgeModel.on('loadChanged', () => {
      this.updateLoadList()
      this.markNeedsRecompute()
      this.checkLoadWarnings()
    })

    this.bridgeModel.on('geometryChanged', () => {
      this.updateUI()
      this.markNeedsRecompute()
    })
  }

  markNeedsRecompute() {
    if (this.autoCompute) {
      this.needsRecompute = true
    }
  }

  computeModes() {
    const errors = this.errorDetector.checkAll(
      this.bridgeModel.supports,
      this.bridgeModel.loads,
      this.bridgeModel.bridgeLength,
      this.femSolver.density,
      this.modes
    )

    if (errors.length > 0) {
      errors.forEach(err => {
        this.uiManager.showError(err.title, err.message)
      })
      return
    }

    const nodes = this.bridgeModel.getNodePositions()
    const supports = this.bridgeModel.getSupportData()
    const loads = this.bridgeModel.getLoadData()
    const section = this.bridgeModel.getSectionProperties()

    this.femSolver.setGeometry(nodes, section)
    this.femSolver.setSupports(supports)
    this.femSolver.setLoads(loads)

    const result = this.femSolver.solve()

    if (result.success) {
      this.modes = result.modes
      this.eigenfrequencies = result.frequencies
      this.bridgeModel.setModes(this.modes, this.eigenfrequencies)
      this.bridgeModel.setDeformations(result.staticDeformation)
      this.updateValuePanel()
      this.updateModeDescription()
      this.historyManager.addRecord(this.getState(), '计算振型')
      this.needsRecompute = false
    } else {
      this.uiManager.showError('计算失败', result.error)
    }
  }

  updateSupportList() {
    const supports = this.bridgeModel.supports
    const listEl = document.getElementById('support-list')
    listEl.innerHTML = ''

    supports.forEach((support, index) => {
      const typeNames = { pin: '铰支', roller: '滚动', fixed: '固支' }
      const typeColors = { pin: 'type-pin', roller: 'type-roller', fixed: 'type-fixed' }

      const item = document.createElement('div')
      item.className = 'support-item'
      item.innerHTML = `
        <div class="info">
          <div class="type-badge ${typeColors[support.type]}"></div>
          <span>${typeNames[support.type]} @ x=${support.x.toFixed(2)}m</span>
        </div>
        <button class="remove-btn" data-index="${index}">✕</button>
      `
      listEl.appendChild(item)
    })

    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index)
        this.bridgeModel.removeSupport(index)
        this.updateSupportList()
        this.checkSupportWarnings()
      })
    })
  }

  updateLoadList() {
    const loads = this.bridgeModel.loads
    const listEl = document.getElementById('load-list')
    listEl.innerHTML = ''

    loads.forEach((load, index) => {
      const item = document.createElement('div')
      item.className = 'load-item'
      item.innerHTML = `
        <div class="info">
          <span class="load-arrow">↓</span>
          <span>${load.magnitude.toFixed(1)}kN @ x=${load.x.toFixed(2)}m</span>
        </div>
        <button class="remove-btn" data-index="${index}">✕</button>
      `
      listEl.appendChild(item)
    })

    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index)
        this.bridgeModel.removeLoad(index)
        this.updateLoadList()
        this.markNeedsRecompute()
      })
    })
  }

  checkSupportWarnings() {
    const warnings = this.errorDetector.checkSupports(this.bridgeModel.supports)
    warnings.forEach(w => this.uiManager.showError(w.title, w.message))
  }

  checkLoadWarnings() {
    const warnings = this.errorDetector.checkLoads(this.bridgeModel.loads)
    warnings.forEach(w => this.uiManager.showError(w.title, w.message))
  }

  checkScaleWarning() {
    const warning = this.errorDetector.checkScale(this.animScale)
    if (warning) {
      this.uiManager.showError(warning.title, warning.message)
    }
  }

  updateValuePanel() {
    const panel = this.uiManager.valuePanel
    
    if (this.eigenfrequencies.length > 0) {
      panel.setFrequency(1, this.eigenfrequencies[0]?.toFixed(3) || '--')
      panel.setFrequency(2, this.eigenfrequencies[1]?.toFixed(3) || '--')
      panel.setFrequency(3, this.eigenfrequencies[2]?.toFixed(3) || '--')
      panel.setCurrentFrequency(this.eigenfrequencies[this.currentMode - 1]?.toFixed(3) || '--')
    }

    const section = this.bridgeModel.getSectionProperties()
    const fem = this.femSolver
    const nodes = this.bridgeModel.getNodePositions()

    if (fem.staticDeformation) {
      const maxDisp = fem.getMaxDisplacement()
      const maxMoment = fem.getMaxMoment()
      const maxStress = fem.getMaxStress(section.height)
      panel.setMaxDisplacement((maxDisp * 1000).toFixed(2) + ' mm')
      panel.setMaxMoment((maxMoment / 1000).toFixed(1) + ' kN·m')
      panel.setMaxStress((maxStress / 1e6).toFixed(2) + ' MPa')
    }

    const totalMass = this.bridgeModel.getTotalMass(fem.density)
    panel.setTotalMass(totalMass.toFixed(0) + ' kg')
  }

  updateModeDescription() {
    const descEl = document.getElementById('mode-description')
    const mode = this.currentMode
    const freq = this.eigenfrequencies[mode - 1]

    let description = ''
    if (mode === 1) {
      description = `
        <p><span class="highlight">第1阶振型（对称竖弯）</span></p>
        <p>频率: ${freq?.toFixed(3) || '--'} Hz</p>
        <p>桥梁以整体对称方式竖向弯曲，跨中挠度最大，两端位移最小。这是最容易被激发的振型，也是设计中最关注的。</p>
      `
    } else if (mode === 2) {
      description = `
        <p><span class="highlight">第2阶振型（反对称竖弯）</span></p>
        <p>频率: ${freq?.toFixed(3) || '--'} Hz</p>
        <p>桥梁反对称弯曲，左半跨向上时右半跨向下。此振型对偏心荷载较为敏感。</p>
      `
    } else if (mode === 3) {
      description = `
        <p><span class="highlight">第3阶振型（扭转/横向）</span></p>
        <p>频率: ${freq?.toFixed(3) || '--'} Hz</p>
        <p>可能出现扭转或横向弯曲振型，取决于桥梁的约束条件和截面特性。</p>
      `
    } else {
      description = `
        <p><span class="highlight">第${mode}阶振型</span></p>
        <p>频率: ${freq?.toFixed(3) || '--'} Hz</p>
        <p>高阶振型通常包含多个半波，参与质量系数较小，对设计影响有限，但需关注局部共振风险。</p>
      `
    }

    descEl.innerHTML = description
  }

  updateUI() {
    this.updateSupportList()
    this.updateLoadList()
    this.updateHistoryList()
  }

  updateHistoryList() {
    const history = this.historyManager.getHistory()
    const listEl = document.getElementById('history-list')
    listEl.innerHTML = ''

    history.slice().reverse().forEach((record, index) => {
      const item = document.createElement('div')
      item.className = 'history-item'
      const time = new Date(record.timestamp).toLocaleString('zh-CN')
      const summary = this.historyManager.getSummary(record)
      item.innerHTML = `
        <div class="history-time">${time}</div>
        <div class="history-summary">${summary}</div>
      `
      item.addEventListener('click', () => {
        this.restoreState(record.state)
      })
      listEl.appendChild(item)
    })
  }

  restoreState(state) {
    this.bridgeModel.restoreState(state.bridge)
    this.femSolver.restoreState(state.fem)
    this.uiManager.restoreState(state.ui)
    
    this.currentMode = state.ui.modeNum
    this.animScale = state.ui.scale
    this.animSpeed = state.ui.animSpeed
    this.showOriginal = state.ui.showOriginal
    this.autoCompute = state.ui.autoCompute
    
    this.computeModes()
    this.updateUI()
    this.updateModeDescription()
  }

  getState() {
    return {
      bridge: this.bridgeModel.getState(),
      fem: this.femSolver.getState(),
      ui: {
        nodeCount: this.bridgeModel.nodeCount,
        bridgeLength: this.bridgeModel.bridgeLength,
        beamHeight: this.bridgeModel.beamHeight,
        beamWidth: this.bridgeModel.beamWidth,
        elasticMod: this.femSolver.elasticModulus / 1e9,
        density: this.femSolver.density,
        poisson: this.femSolver.poissonRatio,
        modeNum: this.currentMode,
        scale: this.animScale,
        animSpeed: this.animSpeed,
        showOriginal: this.showOriginal,
        autoCompute: this.autoCompute
      }
    }
  }

  exportScreenshot() {
    const canvas = this.sceneManager.renderer.domElement
    const link = document.createElement('a')
    link.download = `bridge_screenshot_${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    this.historyManager.addRecord(this.getState(), '导出截图')
    this.updateHistoryList()
  }

  exportReport() {
    const report = this.generateReport()
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `bridge_report_${Date.now()}.txt`
    link.href = URL.createObjectURL(blob)
    link.click()
    this.historyManager.addRecord(this.getState(), '导出报告')
    this.updateHistoryList()
  }

  generateReport() {
    const state = this.getState()
    const nodes = this.bridgeModel.getNodePositions()
    const supports = this.bridgeModel.getSupportData()
    const loads = this.bridgeModel.getLoadData()
    const section = this.bridgeModel.getSectionProperties()

    let report = `╔══════════════════════════════════════════════╗\n`
    report += `║        桥梁振型分析课堂报告                   ║\n`
    report += `╚══════════════════════════════════════════════╝\n\n`

    report += `【报告生成时间】\n${new Date().toLocaleString('zh-CN')}\n\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【1. 几何参数】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `  节点数量: ${state.bridge.nodeCount}\n`
    report += `  桥梁长度: ${state.bridge.bridgeLength.toFixed(2)} m\n`
    report += `  截面高度: ${state.bridge.beamHeight.toFixed(2)} m\n`
    report += `  截面宽度: ${state.bridge.beamWidth.toFixed(2)} m\n`
    report += `  截面面积: ${section.area.toFixed(4)} m²\n`
    report += `  惯性矩 I: ${section.inertia.toExponential(4)} m⁴\n\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【2. 材料参数】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `  弹性模量 E: ${(state.fem.elasticModulus / 1e9).toFixed(1)} GPa\n`
    report += `  密度 ρ: ${state.fem.density.toFixed(0)} kg/m³\n`
    report += `  泊松比 ν: ${state.fem.poissonRatio.toFixed(2)}\n\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【3. 支点布置】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    const typeNames = { pin: '铰支点', roller: '滚动支座', fixed: '固定端' }
    supports.forEach((s, i) => {
      report += `  支点${i + 1}: ${typeNames[s.type]} @ x = ${s.x.toFixed(2)} m\n`
    })
    if (supports.length === 0) report += `  (无支点)\n`
    report += `\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【4. 载荷配置】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    loads.forEach((l, i) => {
      report += `  载荷${i + 1}: ${l.magnitude.toFixed(1)} kN @ x = ${l.x.toFixed(2)} m (方向: ${l.direction})\n`
    })
    if (loads.length === 0) report += `  (无外部载荷)\n`
    report += `\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【5. 自振频率分析】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    this.eigenfrequencies.forEach((f, i) => {
      const T = 1 / f
      report += `  第${i + 1}阶: f = ${f.toFixed(4)} Hz, T = ${T.toFixed(4)} s\n`
    })
    if (this.eigenfrequencies.length === 0) report += `  (未计算)\n`
    report += `\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【6. 静力学响应】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    if (this.femSolver.staticDeformation) {
      report += `  最大位移: ${(this.femSolver.getMaxDisplacement() * 1000).toFixed(2)} mm\n`
      report += `  最大弯矩: ${(this.femSolver.getMaxMoment() / 1000).toFixed(2)} kN·m\n`
      report += `  最大应力: ${(this.femSolver.getMaxStress(section.height) / 1e6).toFixed(2)} MPa\n`
    } else {
      report += `  (未计算)\n`
    }
    report += `\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【7. 节点坐标】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    nodes.forEach((n, i) => {
      report += `  节点${i + 1}: x = ${n.x.toFixed(3)} m\n`
    })
    report += `\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `【8. 修正历史】\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    const history = this.historyManager.getHistory()
    history.forEach((h, i) => {
      const time = new Date(h.timestamp).toLocaleString('zh-CN')
      report += `  ${i + 1}. [${time}] ${h.action}\n`
    })
    report += `\n`

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `  报告结束 - 桥梁振型教学器 v1.0\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

    return report
  }

  exportJson() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      state: this.getState(),
      history: this.historyManager.getHistory()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `bridge_data_${Date.now()}.json`
    link.href = URL.createObjectURL(blob)
    link.click()
    this.historyManager.addRecord(this.getState(), '导出数据')
    this.updateHistoryList()
  }

  importJson() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          if (data.state) {
            this.restoreState(data.state)
          }
          if (data.history) {
            this.historyManager.replaceHistory(data.history)
          }
          this.updateHistoryList()
          this.uiManager.showError('导入成功', '数据已成功导入并恢复状态。')
        } catch (err) {
          this.uiManager.showError('导入失败', '文件格式错误: ' + err.message)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate)

    if (this.needsRecompute && this.autoCompute) {
      this.computeModes()
    }

    const delta = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 1000 : 0.016
    this.lastTimestamp = timestamp

    if (this.isAnimating && this.modes.length > 0) {
      this.animTime += delta * this.animSpeed
      this.bridgeModel.updateDeformation(this.animTime, this.currentMode, this.animScale)
    }

    this.sceneManager.render()
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App()
})
