import * as THREE from 'three'

export class DragControls {
  constructor(objects, camera, domElement, scene) {
    this.objects = objects
    this.camera = camera
    this.domElement = domElement
    this.scene = scene
    
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    this.selected = null
    this.hovered = null
    
    this.dragPlane = new THREE.Plane()
    this.dragOffset = new THREE.Vector3()
    this.intersection = new THREE.Vector3()
    
    this.listeners = {}
    
    this.bindEvents()
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

  bindEvents() {
    this.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e))
    this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    this.domElement.addEventListener('pointerup', (e) => this.onPointerUp(e))
    this.domElement.addEventListener('pointerleave', (e) => this.onPointerUp(e))
  }

  onPointerMove(event) {
    this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1
    this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    if (this.selected) {
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
        this.selected.position.copy(this.intersection.sub(this.dragOffset))
        this.emit('drag', { object: this.selected })
      }
    } else {
      const intersects = this.raycaster.intersectObjects(this.objects, true)
      
      if (intersects.length > 0) {
        const obj = this.findDraggableParent(intersects[0].object)
        if (obj && obj !== this.hovered) {
          this.domElement.style.cursor = 'grab'
          this.hovered = obj
        }
      } else if (this.hovered) {
        this.domElement.style.cursor = ''
        this.hovered = null
      }
    }
  }

  onPointerDown(event) {
    if (event.button !== 0) return
    
    this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1
    this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.objects, true)
    
    if (intersects.length > 0) {
      const obj = this.findDraggableParent(intersects[0].object)
      if (obj) {
        this.selected = obj
        this.domElement.style.cursor = 'grabbing'
        
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          this.selected.position
        )
        
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
          this.dragOffset.copy(this.intersection).sub(this.selected.position)
        }
        
        this.emit('dragstart', { object: this.selected })
      }
    }
  }

  onPointerUp(event) {
    if (this.selected) {
      this.emit('dragend', { object: this.selected })
      this.selected = null
      this.domElement.style.cursor = ''
    }
  }

  findDraggableParent(obj) {
    let current = obj
    while (current) {
      if (current.userData && (current.userData.type === 'support' || current.userData.type === 'load')) {
        return current
      }
      current = current.parent
    }
    return null
  }

  setObjects(objects) {
    this.objects = objects
  }

  dispose() {
    this.domElement.removeEventListener('pointermove', (e) => this.onPointerMove(e))
    this.domElement.removeEventListener('pointerdown', (e) => this.onPointerDown(e))
    this.domElement.removeEventListener('pointerup', (e) => this.onPointerUp(e))
    this.domElement.removeEventListener('pointerleave', (e) => this.onPointerUp(e))
  }
}
