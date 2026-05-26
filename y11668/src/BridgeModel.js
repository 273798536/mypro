import * as THREE from 'three'
import { DragControls } from './DragControls.js'

const SupportType = {
  PIN: 'pin',
  ROLLER: 'roller',
  FIXED: 'fixed'
}

export class BridgeModel {
  constructor(sceneManager) {
    this.sceneManager = sceneManager
    this.scene = sceneManager.scene
    
    this.nodeCount = 6
    this.bridgeLength = 20
    this.beamHeight = 1.0
    this.beamWidth = 0.5
    
    this.supports = []
    this.loads = []
    
    this.modes = []
    this.frequencies = []
    this.staticDeformation = null
    
    this.deformationScale = 1
    this.currentMode = 1
    this.showOriginal = true
    
    this.bridgeGroup = null
    this.beamMesh = null
    this.nodeMeshes = []
    this.supportMeshes = []
    this.loadMeshes = []
    this.originalOutline = null
    this.deformedOutline = null
    
    this.listeners = {}
    
    this.dragControls = null
    this.dragging = null
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

  createDefaultBridge() {
    this.supports = [
      { type: SupportType.PIN, x: 0, index: 0 },
      { type: SupportType.ROLLER, x: this.bridgeLength, index: this.nodeCount - 1 }
    ]
    
    this.loads = [
      { magnitude: 50, x: this.bridgeLength * 0.5, direction: 'vertical', index: Math.floor(this.nodeCount / 2) }
    ]
    
    this.buildBridge()
  }

  buildBridge() {
    this.clearBridge()
    
    this.bridgeGroup = new THREE.Group()
    this.scene.add(this.bridgeGroup)
    
    this.nodePositions = this.calculateNodePositions()
    
    this.createBeam()
    this.createNodes()
    this.createSupports()
    this.createLoads()
    this.createOutlines()
    
    this.setupDragControls()
  }

  clearBridge() {
    if (this.bridgeGroup) {
      this.scene.remove(this.bridgeGroup)
      this.disposeGroup(this.bridgeGroup)
      this.bridgeGroup = null
    }
    this.nodeMeshes = []
    this.supportMeshes = []
    this.loadMeshes = []
    if (this.dragControls) {
      this.dragControls.dispose()
      this.dragControls = null
    }
  }

  disposeGroup(group) {
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }

  calculateNodePositions() {
    const positions = []
    for (let i = 0; i < this.nodeCount; i++) {
      const x = (i / (this.nodeCount - 1)) * this.bridgeLength - this.bridgeLength / 2
      positions.push({ x, y: 0, z: 0 })
    }
    return positions
  }

  createBeam() {
    const beamLength = this.bridgeLength
    const geometry = new THREE.BoxGeometry(beamLength, this.beamHeight, this.beamWidth)
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      roughness: 0.6,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9
    })
    
    this.beamMesh = new THREE.Mesh(geometry, material)
    this.beamMesh.position.y = this.beamHeight / 2
    this.beamMesh.castShadow = true
    this.beamMesh.receiveShadow = true
    this.bridgeGroup.add(this.beamMesh)
    
    const edges = new THREE.EdgesGeometry(geometry)
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x6ab0f0, linewidth: 2 })
    )
    edgeLines.position.copy(this.beamMesh.position)
    this.bridgeGroup.add(edgeLines)
  }

  createNodes() {
    this.nodePositions.forEach((pos, index) => {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16)
      const material = new THREE.MeshStandardMaterial({
        color: 0x60a5fa,
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0x1a4a7a,
        emissiveIntensity: 0.3
      })
      
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(pos.x, this.beamHeight / 2, 0)
      mesh.castShadow = true
      mesh.userData = { type: 'node', index }
      this.bridgeGroup.add(mesh)
      this.nodeMeshes.push(mesh)
      
      if (index === 0 || index === this.nodeCount - 1) {
        const labelGeometry = new THREE.SphereGeometry(0.08, 8, 8)
        const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial)
        labelMesh.position.set(pos.x, this.beamHeight + 0.5, 0)
        this.bridgeGroup.add(labelMesh)
      }
    })
  }

  createSupports() {
    this.supports.forEach((support, index) => {
      const supportGroup = this.createSupportMesh(support)
      supportGroup.userData = { type: 'support', index }
      this.bridgeGroup.add(supportGroup)
      this.supportMeshes.push(supportGroup)
    })
  }

  createSupportMesh(support) {
    const group = new THREE.Group()
    const x = support.x - this.bridgeLength / 2
    
    if (support.type === SupportType.PIN) {
      this.createPinSupport(group, x)
    } else if (support.type === SupportType.ROLLER) {
      this.createRollerSupport(group, x)
    } else if (support.type === SupportType.FIXED) {
      this.createFixedSupport(group, x)
    }
    
    group.position.set(x, 0, 0)
    return group
  }

  createPinSupport(group, x) {
    const triGeo = new THREE.ConeGeometry(0.4, 0.6, 3)
    const triMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.5
    })
    const triangle = new THREE.Mesh(triGeo, triMat)
    triangle.position.y = -0.3
    triangle.rotation.y = Math.PI / 2
    triangle.rotation.z = Math.PI
    triangle.castShadow = true
    group.add(triangle)
    
    const ballGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.3,
      metalness: 0.7
    })
    const ball = new THREE.Mesh(ballGeo, ballMat)
    ball.position.y = 0.05
    ball.castShadow = true
    group.add(ball)
    
    const baseGeo = new THREE.BoxGeometry(1, 0.2, 1)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.8
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = -0.7
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)
  }

  createRollerSupport(group, x) {
    const baseGeo = new THREE.BoxGeometry(1.2, 0.2, 1)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.8
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = -0.8
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)
    
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16)
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.6
    })
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.y = -0.4
    wheel.castShadow = true
    group.add(wheel)
    
    const topGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8)
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.5
    })
    const top = new THREE.Mesh(topGeo, topMat)
    top.position.y = -0.05
    top.castShadow = true
    group.add(top)
  }

  createFixedSupport(group, x) {
    const wallGeo = new THREE.BoxGeometry(0.4, this.beamHeight + 2, 1.2)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.6,
      metalness: 0.3
    })
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.y = this.beamHeight / 2
    wall.castShadow = true
    wall.receiveShadow = true
    group.add(wall)
    
    const hatchLines = new THREE.Group()
    for (let i = 0; i < 5; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.25, -1 + i * 0.5, 0.61),
        new THREE.Vector3(-0.15, -0.8 + i * 0.5, 0.61)
      ])
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x4c1d95 }))
      hatchLines.add(line)
    }
    hatchLines.position.y = this.beamHeight / 2
    group.add(hatchLines)
  }

  createLoads() {
    this.loads.forEach((load, index) => {
      const loadGroup = this.createLoadMesh(load)
      loadGroup.userData = { type: 'load', index }
      this.bridgeGroup.add(loadGroup)
      this.loadMeshes.push(loadGroup)
    })
  }

  createLoadMesh(load) {
    const group = new THREE.Group()
    const x = load.x - this.bridgeLength / 2
    
    const arrowLen = 0.5 + Math.min(load.magnitude / 100, 2)
    const arrowGeo = new THREE.ConeGeometry(0.2, arrowLen, 8)
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x7a5c00,
      emissiveIntensity: 0.3
    })
    const arrow = new THREE.Mesh(arrowGeo, arrowMat)
    arrow.position.y = this.beamHeight + arrowLen / 2 + 0.3
    arrow.rotation.x = Math.PI
    arrow.castShadow = true
    group.add(arrow)
    
    const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8)
    const shaft = new THREE.Mesh(shaftGeo, arrowMat)
    shaft.position.y = this.beamHeight + 0.2
    shaft.castShadow = true
    group.add(shaft)
    
    const textGeo = new THREE.BoxGeometry(0.8, 0.3, 0.1)
    const textMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7
    })
    const textBg = new THREE.Mesh(textGeo, textMat)
    textBg.position.y = this.beamHeight + arrowLen + 0.8
    group.add(textBg)
    
    group.position.set(x, 0, 0)
    group.userData = { type: 'load', loadIndex: this.loads.indexOf(load) }
    return group
  }

  createOutlines() {
    if (this.showOriginal) {
      const points = this.nodePositions.map(pos => 
        new THREE.Vector3(pos.x, this.beamHeight / 2, 0)
      )
      const origGeo = new THREE.BufferGeometry().setFromPoints(points)
      const origMat = new THREE.LineDashedMaterial({
        color: 0x64748b,
        dashSize: 0.3,
        gapSize: 0.2
      })
      this.originalOutline = new THREE.Line(origGeo, origMat)
      this.originalOutline.computeLineDistances()
      this.bridgeGroup.add(this.originalOutline)
    }
    
    const defPoints = this.nodePositions.map(pos =>
      new THREE.Vector3(pos.x, this.beamHeight / 2, 0)
    )
    const defGeo = new THREE.BufferGeometry().setFromPoints(defPoints)
    const defMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      linewidth: 2
    })
    this.deformedOutline = new THREE.Line(defGeo, defMat)
    this.bridgeGroup.add(this.deformedOutline)
  }

  setupDragControls() {
    const draggableObjects = [...this.supportMeshes, ...this.loadMeshes]
    
    this.dragControls = new DragControls(
      draggableObjects,
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement,
      this.scene
    )
    
    this.dragControls.on('dragstart', (event) => {
      this.sceneManager.controls.enabled = false
      this.dragging = event.object
    })
    
    this.dragControls.on('drag', (event) => {
      const obj = event.object
      if (obj.userData.type === 'support') {
        obj.position.x = THREE.MathUtils.clamp(obj.position.x, -this.bridgeLength / 2, this.bridgeLength / 2)
        obj.position.z = 0
      } else if (obj.userData.type === 'load') {
        obj.position.x = THREE.MathUtils.clamp(obj.position.x, -this.bridgeLength / 2, this.bridgeLength / 2)
        obj.position.z = 0
      }
    })
    
    this.dragControls.on('dragend', (event) => {
      this.sceneManager.controls.enabled = true
      const obj = event.object
      
      if (obj.userData.type === 'support') {
        const supportIndex = obj.userData.index
        const newX = obj.position.x + this.bridgeLength / 2
        this.supports[supportIndex].x = newX
        this.supports[supportIndex].index = this.findNearestNodeIndex(newX)
        this.emit('supportChanged')
      } else if (obj.userData.type === 'load') {
        const loadIndex = obj.userData.loadIndex
        const newX = obj.position.x + this.bridgeLength / 2
        this.loads[loadIndex].x = newX
        this.loads[loadIndex].index = this.findNearestNodeIndex(newX)
        this.emit('loadChanged')
      }
      
      this.dragging = null
    })
  }

  findNearestNodeIndex(x) {
    let minDist = Infinity
    let nearestIndex = 0
    this.nodePositions.forEach((pos, i) => {
      const actualX = pos.x + this.bridgeLength / 2
      const dist = Math.abs(actualX - x)
      if (dist < minDist) {
        minDist = dist
        nearestIndex = i
      }
    })
    return nearestIndex
  }

  setNodeCount(count) {
    this.nodeCount = count
    this.rebuildBridge()
    this.emit('geometryChanged')
  }

  setBridgeLength(length) {
    this.bridgeLength = length
    this.rebuildBridge()
    this.emit('geometryChanged')
  }

  setBeamHeight(height) {
    this.beamHeight = height
    this.rebuildBridge()
    this.emit('geometryChanged')
  }

  setBeamWidth(width) {
    this.beamWidth = width
    this.rebuildBridge()
    this.emit('geometryChanged')
  }

  rebuildBridge() {
    this.supports = this.supports.map(s => ({
      ...s,
      index: this.findNearestNodeIndex(s.x)
    }))
    this.loads = this.loads.map(l => ({
      ...l,
      index: this.findNearestNodeIndex(l.x)
    }))
    this.buildBridge()
  }

  addSupport() {
    const newX = this.bridgeLength * 0.3
    this.supports.push({
      type: SupportType.PIN,
      x: newX,
      index: this.findNearestNodeIndex(newX)
    })
    this.buildBridge()
    this.emit('supportChanged')
  }

  removeSupport(index) {
    this.supports.splice(index, 1)
    this.buildBridge()
    this.emit('supportChanged')
  }

  addLoad() {
    const newX = this.bridgeLength * 0.5
    this.loads.push({
      magnitude: 30,
      x: newX,
      direction: 'vertical',
      index: this.findNearestNodeIndex(newX)
    })
    this.buildBridge()
    this.emit('loadChanged')
  }

  removeLoad(index) {
    this.loads.splice(index, 1)
    this.buildBridge()
    this.emit('loadChanged')
  }

  setModes(modes, frequencies) {
    this.modes = modes
    this.frequencies = frequencies
  }

  setModeNumber(mode) {
    this.currentMode = mode
  }

  setDeformationScale(scale) {
    this.deformationScale = scale
  }

  setShowOriginal(show) {
    this.showOriginal = show
    if (this.originalOutline) {
      this.originalOutline.visible = show
    }
  }

  setDeformations(deformation) {
    this.staticDeformation = deformation
  }

  updateDeformation(time, modeIndex, scale) {
    if (!this.modes || this.modes.length === 0) return
    if (modeIndex > this.modes.length) return
    
    const mode = this.modes[modeIndex - 1]
    if (!mode) return
    
    const omega = this.frequencies[modeIndex - 1] * 2 * Math.PI
    const factor = Math.sin(time * omega) * scale
    
    const positions = this.deformedOutline.geometry.attributes.position
    for (let i = 0; i < this.nodePositions.length; i++) {
      const dofIndex = i * 2
      const dy = mode[dofIndex + 1] || 0
      positions.setY(i, this.beamHeight / 2 + dy * factor)
    }
    positions.needsUpdate = true
    
    if (this.beamMesh && this.beamMesh.geometry) {
      const beamPositions = this.beamMesh.geometry.attributes.position
      for (let i = 0; i < beamPositions.count; i++) {
        const x = beamPositions.getX(i)
        const localT = (x + this.bridgeLength / 2) / this.bridgeLength
        const nodeIdx = Math.floor(localT * (this.nodePositions.length - 1))
        const nextIdx = Math.min(nodeIdx + 1, this.nodePositions.length - 1)
        const frac = localT * (this.nodePositions.length - 1) - nodeIdx
        
        const dy1 = mode[nodeIdx * 2 + 1] || 0
        const dy2 = mode[nextIdx * 2 + 1] || 0
        const dy = dy1 * (1 - frac) + dy2 * frac
        
        beamPositions.setY(i, this.beamHeight / 2 + dy * factor + (beamPositions.getY(i) - this.beamHeight / 2))
      }
      beamPositions.needsUpdate = true
      this.beamMesh.geometry.computeVertexNormals()
    }
  }

  getNodePositions() {
    return this.nodePositions.map(p => ({
      x: p.x + this.bridgeLength / 2,
      y: p.y,
      z: p.z
    }))
  }

  getSupportData() {
    return this.supports.map(s => ({
      type: s.type,
      x: s.x,
      index: s.index
    }))
  }

  getLoadData() {
    return this.loads.map(l => ({
      magnitude: l.magnitude * 1000,
      x: l.x,
      direction: l.direction,
      index: l.index
    }))
  }

  getSectionProperties() {
    const A = this.beamHeight * this.beamWidth
    const I = (this.beamWidth * Math.pow(this.beamHeight, 3)) / 12
    return {
      area: A,
      inertia: I,
      height: this.beamHeight,
      width: this.beamWidth
    }
  }

  getTotalMass(density) {
    const volume = this.bridgeLength * this.beamHeight * this.beamWidth
    return density * volume
  }

  getState() {
    return {
      nodeCount: this.nodeCount,
      bridgeLength: this.bridgeLength,
      beamHeight: this.beamHeight,
      beamWidth: this.beamWidth,
      supports: JSON.parse(JSON.stringify(this.supports)),
      loads: JSON.parse(JSON.stringify(this.loads))
    }
  }

  restoreState(state) {
    this.nodeCount = state.nodeCount
    this.bridgeLength = state.bridgeLength
    this.beamHeight = state.beamHeight
    this.beamWidth = state.beamWidth
    this.supports = JSON.parse(JSON.stringify(state.supports))
    this.loads = JSON.parse(JSON.stringify(state.loads))
    this.buildBridge()
  }
}
