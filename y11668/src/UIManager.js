export class UIManager {
  constructor() {
    this.listeners = {}
    this.valuePanel = new ValuePanel()
    this.bindUIEvents()
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data))
    }
  }

  bindUIEvents() {
    const bindInput = (id, eventName, parser = parseFloat) => {
      const el = document.getElementById(id)
      if (el) {
        el.addEventListener('input', (e) => {
          const value = parser(e.target.value)
          const spanEl = document.getElementById(id + 'Val')
          if (spanEl) spanEl.textContent = e.target.value
          this.emit(eventName, value)
        })
      }
    }

    const bindCheckbox = (id, eventName) => {
      const el = document.getElementById(id)
      if (el) {
        el.addEventListener('change', (e) => {
          this.emit(eventName, e.target.checked)
        })
      }
    }

    const bindButton = (id, eventName) => {
      const el = document.getElementById(id)
      if (el) {
        el.addEventListener('click', () => this.emit(eventName))
      }
    }

    bindInput('nodeCount', 'nodeCount', parseInt)
    bindInput('bridgeLength', 'bridgeLength')
    bindInput('beamHeight', 'beamHeight')
    bindInput('beamWidth', 'beamWidth')
    bindInput('elasticMod', 'elasticMod')
    bindInput('density', 'density')
    bindInput('poisson', 'poisson')
    bindInput('modeNum', 'modeNum', parseInt)
    bindInput('scale', 'scale')
    bindInput('animSpeed', 'animSpeed')

    bindCheckbox('showOriginal', 'showOriginal')
    bindCheckbox('autoCompute', 'autoCompute')

    bindButton('btn-compute', 'compute')
    bindButton('btn-add-support', 'addSupport')
    bindButton('btn-add-load', 'addLoad')
    bindButton('btn-export-screenshot', 'exportScreenshot')
    bindButton('btn-export-report', 'exportReport')
    bindButton('btn-export-json', 'exportJson')
    bindButton('btn-import-json', 'importJson')
    bindButton('btn-clear-history', 'clearHistory')

    const dismissBtn = document.getElementById('btn-dismiss-error')
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.hideError())
    }
  }

  showError(title, message) {
    const overlay = document.getElementById('error-overlay')
    const titleEl = document.getElementById('error-title')
    const messageEl = document.getElementById('error-message')
    
    if (titleEl) titleEl.textContent = title
    if (messageEl) messageEl.textContent = message
    if (overlay) {
      overlay.classList.remove('hidden')
      setTimeout(() => this.hideError(), 5000)
    }
  }

  hideError() {
    const overlay = document.getElementById('error-overlay')
    if (overlay) {
      overlay.classList.add('hidden')
    }
  }

  showTooltip(message, x, y) {
    const tooltip = document.getElementById('info-tooltip')
    if (tooltip) {
      tooltip.textContent = message
      tooltip.style.left = x + 'px'
      tooltip.style.top = y + 'px'
      tooltip.classList.remove('hidden')
    }
  }

  hideTooltip() {
    const tooltip = document.getElementById('info-tooltip')
    if (tooltip) {
      tooltip.classList.add('hidden')
    }
  }

  restoreState(state) {
    const restoreInput = (id, value) => {
      const el = document.getElementById(id)
      if (el) {
        el.value = value
        const spanEl = document.getElementById(id + 'Val')
        if (spanEl) spanEl.textContent = value
      }
    }

    const restoreCheckbox = (id, checked) => {
      const el = document.getElementById(id)
      if (el) el.checked = checked
    }

    restoreInput('nodeCount', state.nodeCount)
    restoreInput('bridgeLength', state.bridgeLength)
    restoreInput('beamHeight', state.beamHeight)
    restoreInput('beamWidth', state.beamWidth)
    restoreInput('elasticMod', state.elasticMod)
    restoreInput('density', state.density)
    restoreInput('poisson', state.poisson)
    restoreInput('modeNum', state.modeNum)
    restoreInput('scale', state.scale)
    restoreInput('animSpeed', state.animSpeed)
    restoreCheckbox('showOriginal', state.showOriginal)
    restoreCheckbox('autoCompute', state.autoCompute)
  }
}

class ValuePanel {
  constructor() {
    this.elements = {}
  }

  setFrequency(order, value) {
    const el = document.getElementById('freq' + order)
    if (el) el.textContent = value + ' Hz'
  }

  setCurrentFrequency(value) {
    const el = document.getElementById('currentFreq')
    if (el) el.textContent = value + ' Hz'
  }

  setMaxDisplacement(value) {
    const el = document.getElementById('maxDisplacement')
    if (el) el.textContent = value
  }

  setMaxMoment(value) {
    const el = document.getElementById('maxMoment')
    if (el) el.textContent = value
  }

  setMaxStress(value) {
    const el = document.getElementById('maxStress')
    if (el) el.textContent = value
  }

  setTotalMass(value) {
    const el = document.getElementById('totalMass')
    if (el) el.textContent = value
  }
}
