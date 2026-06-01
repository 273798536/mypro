import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { microphoneConfigs } from '../data/micConfig.js'

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.microphones = {}
    this.drumSources = []
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.selectedObject = null
    this.hoveredObject = null
    this.onObjectSelect = null
    this.onObjectHover = null
    this.onObjectsUpdate = null
    
    this.init()
  }
  
  init() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a1a)
    this.scene.fog = new THREE.Fog(0x0a0a1a, 5, 15)
    
    const container = this.canvas.parentElement
    const width = container.clientWidth
    const height = container.clientHeight
    
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    this.camera.position.set(4, 3.5, 4)
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 1.5
    this.controls.maxDistance = 10
    this.controls.maxPolarAngle = Math.PI / 2.1
    
    this.setupLighting()
    this.createFloor()
    this.createDrumKitVisualization()
    this.createMicrophones()
    
    window.addEventListener('resize', () => this.onResize())
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.canvas.addEventListener('click', (e) => this.onClick(e))
    
    this.animate()
  }
  
  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(5, 8, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 20
    mainLight.shadow.camera.left = -5
    mainLight.shadow.camera.right = 5
    mainLight.shadow.camera.top = 5
    mainLight.shadow.camera.bottom = -5
    this.scene.add(mainLight)
    
    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.3)
    fillLight.position.set(-3, 3, 3)
    this.scene.add(fillLight)
    
    const rimLight = new THREE.DirectionalLight(0xff6666, 0.2)
    rimLight.position.set(0, 3, -4)
    this.scene.add(rimLight)
  }
  
  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(10, 10)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)
    
    const gridHelper = new THREE.GridHelper(10, 20, 0x333366, 0x222244)
    this.scene.add(gridHelper)
    
    const roomMarkers = [
      { pos: new THREE.Vector3(0, 0.01, 0), radius: 3, color: 0x667eea, label: '近场' },
      { pos: new THREE.Vector3(0, 0.01, 0), radius: 5, color: 0x4a5568, label: '中场' }
    ]
    
    roomMarkers.forEach(marker => {
      const ringGeometry = new THREE.RingGeometry(marker.radius - 0.02, marker.radius, 64)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: marker.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.01
      this.scene.add(ring)
    })
  }
  
  createDrumKitVisualization() {
    const drumPositions = [
      { id: 'kick', name: '底鼓', position: new THREE.Vector3(0, 0.4, -0.8), radius: 0.4, height: 0.5, color: 0x2d3436 },
      { id: 'snare', name: '军鼓', position: new THREE.Vector3(0.5, 0.65, -0.3), radius: 0.18, height: 0.15, color: 0x636e72 },
      { id: 'tom1', name: '高音通鼓', position: new THREE.Vector3(0.25, 0.85, 0), radius: 0.15, height: 0.25, color: 0x6c5ce7 },
      { id: 'tom2', name: '中音通鼓', position: new THREE.Vector3(-0.25, 0.85, 0), radius: 0.16, height: 0.28, color: 0x6c5ce7 },
      { id: 'floorTom', name: '落地通鼓', position: new THREE.Vector3(-0.8, 0.5, -0.1), radius: 0.2, height: 0.35, color: 0x6c5ce7 },
      { id: 'hihat', name: '踩镲', position: new THREE.Vector3(0.7, 1.0, 0.1), radius: 0.2, height: 0.05, color: 0xb2bec3 },
      { id: 'ride', name: '叮叮镲', position: new THREE.Vector3(-0.7, 1.1, -0.2), radius: 0.22, height: 0.05, color: 0xb2bec3 },
      { id: 'crash1', name: '强音镲1', position: new THREE.Vector3(0.7, 1.2, -0.4), radius: 0.18, height: 0.05, color: 0xb2bec3 },
      { id: 'crash2', name: '强音镲2', position: new THREE.Vector3(-0.8, 1.2, 0.2), radius: 0.18, height: 0.05, color: 0xb2bec3 }
    ]
    
    drumPositions.forEach(drum => {
      const geometry = new THREE.CylinderGeometry(drum.radius, drum.radius, drum.height, 32)
      const material = new THREE.MeshStandardMaterial({
        color: drum.color,
        roughness: 0.4,
        metalness: 0.3
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(drum.position)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { type: 'drum', id: drum.id, name: drum.name, sourcePosition: drum.position.clone() }
      this.scene.add(mesh)
      
      this.drumSources.push({
        id: drum.id,
        name: drum.name,
        position: drum.position.clone(),
        mesh
      })
      
      const rimGeometry = new THREE.TorusGeometry(drum.radius * 0.9, 0.015, 8, 32)
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xdfe6e9,
        roughness: 0.2,
        metalness: 0.8
      })
      const rim = new THREE.Mesh(rimGeometry, rimMaterial)
      rim.position.set(drum.position.x, drum.position.y + drum.height / 2 + 0.01, drum.position.z)
      rim.rotation.x = Math.PI / 2
      rim.castShadow = true
      this.scene.add(rim)
    })
    
    const standMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3436,
      roughness: 0.5,
      metalness: 0.7
    })
    
    const standPositions = [
      { x: 0, y: 0.25, z: 0 },
      { x: 0.5, y: 0.35, z: -0.3 },
      { x: -0.8, y: 0.25, z: -0.1 }
    ]
    
    standPositions.forEach(pos => {
      const standGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 8)
      const stand = new THREE.Mesh(standGeometry, standMaterial)
      stand.position.set(pos.x, pos.y, pos.z)
      stand.castShadow = true
      this.scene.add(stand)
    })
  }
  
  createMicrophones() {
    Object.values(microphoneConfigs).forEach(config => {
      this.createMicrophone(config)
    })
  }
  
  createMicrophone(config) {
    const group = new THREE.Group()
    
    const bodyGeometry = new THREE.CylinderGeometry(0.03, 0.035, 0.15, 16)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.3,
      metalness: 0.7,
      emissive: config.color,
      emissiveIntensity: 0.1
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.rotation.x = Math.PI / 2
    body.castShadow = true
    group.add(body)
    
    const capsuleGeometry = new THREE.SphereGeometry(0.025, 16, 16)
    const capsuleMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfe6e9,
      roughness: 0.2,
      metalness: 0.9
    })
    const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial)
    capsule.position.z = 0.09
    capsule.castShadow = true
    group.add(capsule)
    
    const indicatorGeometry = new THREE.RingGeometry(0.04, 0.05, 32)
    const indicatorMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial)
    indicator.rotation.x = -Math.PI / 2
    indicator.position.y = -0.2
    group.add(indicator)
    
    const targetPos = new THREE.Vector3(
      config.targetPosition.x,
      config.targetPosition.y,
      config.targetPosition.z
    )
    
    group.position.set(
      config.defaultPosition.x,
      config.defaultPosition.y,
      config.defaultPosition.z
    )
    group.lookAt(targetPos)
    
    group.userData = {
      type: 'microphone',
      config: config,
      position: group.position.clone(),
      targetPosition: targetPos.clone()
    }
    
    this.scene.add(group)
    this.microphones[config.id] = group
    
    this.createTargetLine(group, targetPos, config.color)
  }
  
  createTargetLine(micGroup, targetPos, color) {
    const points = [micGroup.position.clone(), targetPos.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({
      color: color,
      dashSize: 0.05,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.4
    })
    const line = new THREE.Line(geometry, material)
    line.computeLineDistances()
    micGroup.userData.targetLine = line
    this.scene.add(line)
  }
  
  updateTargetLine(micGroup) {
    if (micGroup.userData.targetLine) {
      const positions = micGroup.userData.targetLine.geometry.attributes.position.array
      positions[0] = micGroup.position.x
      positions[1] = micGroup.position.y
      positions[2] = micGroup.position.z
      micGroup.userData.targetLine.geometry.attributes.position.needsUpdate = true
      micGroup.userData.targetLine.computeLineDistances()
    }
  }
  
  getMicrophonesData() {
    const data = {}
    Object.entries(this.microphones).forEach(([id, group]) => {
      data[id] = {
        config: group.userData.config,
        position: group.position.clone(),
        targetPosition: group.userData.targetPosition.clone()
      }
    })
    return data
  }
  
  getDrumSources() {
    return this.drumSources
  }
  
  onResize() {
    const container = this.canvas.parentElement
    const width = container.clientWidth
    const height = container.clientHeight
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
  
  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    const allObjects = []
    Object.values(this.microphones).forEach(mic => {
      allObjects.push(...mic.children)
    })
    this.drumSources.forEach(drum => {
      allObjects.push(drum.mesh)
    })
    
    const intersects = this.raycaster.intersectObjects(allObjects, true)
    
    if (intersects.length > 0) {
      let obj = intersects[0].object
      while (obj.parent && !obj.userData.type) {
        obj = obj.parent
      }
      
      if (obj.userData.type) {
        this.hoveredObject = obj
        if (this.onObjectHover) {
          this.onObjectHover(obj, event.clientX, event.clientY)
        }
        this.canvas.style.cursor = 'pointer'
        return
      }
    }
    
    this.hoveredObject = null
    if (this.onObjectHover) {
      this.onObjectHover(null, 0, 0)
    }
    this.canvas.style.cursor = 'grab'
  }
  
  onClick(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    const allObjects = []
    Object.values(this.microphones).forEach(mic => {
      allObjects.push(...mic.children)
    })
    this.drumSources.forEach(drum => {
      allObjects.push(drum.mesh)
    })
    
    const intersects = this.raycaster.intersectObjects(allObjects, true)
    
    if (intersects.length > 0) {
      let obj = intersects[0].object
      while (obj.parent && !obj.userData.type) {
        obj = obj.parent
      }
      
      if (obj.userData.type) {
        this.selectObject(obj)
      }
    } else {
      this.selectObject(null)
    }
  }
  
  selectObject(obj) {
    if (this.selectedObject) {
      this.setObjectEmissive(this.selectedObject, 0.1)
    }
    
    this.selectedObject = obj
    
    if (obj) {
      this.setObjectEmissive(obj, 0.5)
    }
    
    if (this.onObjectSelect) {
      this.onObjectSelect(obj)
    }
  }
  
  setObjectEmissive(obj, intensity) {
    if (obj.userData.type === 'microphone') {
      obj.traverse(child => {
        if (child.isMesh && child.material.emissive) {
          child.material.emissiveIntensity = intensity
        }
      })
    }
  }
  
  setCategoryVisibility(category, visible) {
    Object.entries(this.microphones).forEach(([id, mic]) => {
      if (mic.userData.config.category === category) {
        mic.visible = visible
        if (mic.userData.targetLine) {
          mic.userData.targetLine.visible = visible
        }
      }
    })
    
    if (this.onObjectsUpdate) {
      this.onObjectsUpdate()
    }
  }
  
  getVisibleMicrophones() {
    return Object.entries(this.microphones)
      .filter(([id, mic]) => mic.visible)
      .reduce((acc, [id, mic]) => {
        acc[id] = {
          config: mic.userData.config,
          position: mic.position.clone(),
          targetPosition: mic.userData.targetPosition.clone()
        }
        return acc
      }, {})
  }
  
  animate() {
    requestAnimationFrame(() => this.animate())
    
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
  
  captureScreenshot() {
    this.renderer.render(this.scene, this.camera)
    return this.canvas.toDataURL('image/png')
  }
  
  dispose() {
    this.renderer.dispose()
  }
}
