<template>
  <div class="stage-viewer" ref="containerRef">
    <div class="boundary-warning" v-if="hasBoundaryWarning">
      ⚠️ 部分设备接近边界，渲染效果仅供参考
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const props = defineProps({
  stageConfig: Object,
  lightingFixtures: Array,
  riggingPoints: Array,
  actorRoutes: Array,
  stageProps: Array,
  issues: Array,
  selectedIssue: Object
})

const containerRef = ref(null)
let scene, camera, renderer, controls
let stageGroup, lightsGroup, riggingGroup, routesGroup, propsGroup
let animationId
let highlightObjects = []

const hasBoundaryWarning = ref(false)

onMounted(() => {
  initScene()
  renderStage()
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  if (renderer) {
    renderer.dispose()
  }
})

watch(() => props.selectedIssue, (issue) => {
  if (issue) {
    highlightIssue(issue)
  } else {
    clearHighlight()
  }
})

function initScene() {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(20, 15, 20)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  scene.add(dirLight)

  const gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x333333)
  scene.add(gridHelper)

  stageGroup = new THREE.Group()
  lightsGroup = new THREE.Group()
  riggingGroup = new THREE.Group()
  routesGroup = new THREE.Group()
  propsGroup = new THREE.Group()

  scene.add(stageGroup)
  scene.add(lightsGroup)
  scene.add(riggingGroup)
  scene.add(routesGroup)
  scene.add(propsGroup)

  window.addEventListener('resize', onResize)
}

function onResize() {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function renderStage() {
  if (!props.stageConfig) return

  const { width, depth, height } = props.stageConfig.dimensions

  const floorGeometry = new THREE.PlaneGeometry(width, depth)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d2d2d,
    roughness: 0.8
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  stageGroup.add(floor)

  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.1, depth))
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x666666 }))
  stageGroup.add(line)

  const backdropGeometry = new THREE.PlaneGeometry(width, height * 0.8)
  const backdropMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    side: THREE.DoubleSide
  })
  const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial)
  backdrop.position.set(0, height * 0.4, -depth / 2)
  stageGroup.add(backdrop)

  renderLightingFixtures()
  renderRiggingPoints()
  renderActorRoutes()
  renderStageProps()
  checkBoundaryWarnings()
}

function renderLightingFixtures() {
  props.lightingFixtures.forEach(light => {
    const lightGroup = new THREE.Group()
    lightGroup.position.set(light.position.x, light.position.y, light.position.z)
    lightGroup.rotation.set(
      light.rotation.x * Math.PI / 180,
      light.rotation.y * Math.PI / 180,
      light.rotation.z * Math.PI / 180
    )
    lightGroup.userData = { id: light.id, type: 'light' }

    let bodyGeometry
    let color = 0x333333

    switch (light.type) {
      case 'moving_head':
        bodyGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 16)
        color = 0x444444
        break
      case 'par':
        bodyGeometry = new THREE.ConeGeometry(0.25, 0.4, 16, 1, true)
        color = 0x222222
        break
      case 'spot':
        bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.6, 16)
        color = 0x555555
        break
      case 'led_bar':
        bodyGeometry = new THREE.BoxGeometry(2, 0.1, 0.15)
        color = 0x333333
        break
      default:
        bodyGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
    }

    const bodyMaterial = new THREE.MeshStandardMaterial({ color })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.castShadow = true
    lightGroup.add(body)

    const beamGeometry = new THREE.ConeGeometry(
      Math.tan(light.beamAngle * Math.PI / 360) * 10,
      10,
      16,
      1,
      true
    )
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: light.status === 'warning' ? 0xffaa00 : 0xffffaa,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
    const beam = new THREE.Mesh(beamGeometry, beamMaterial)
    beam.position.y = -5
    beam.rotation.x = Math.PI
    lightGroup.add(beam)

    lightsGroup.add(lightGroup)
  })
}

function renderRiggingPoints() {
  props.riggingPoints.forEach(rig => {
    const rigGroup = new THREE.Group()
    rigGroup.position.set(rig.position.x, rig.position.y, rig.position.z)
    rigGroup.userData = { id: rig.id, type: 'rigging' }

    const barGeometry = new THREE.BoxGeometry(rig.length, 0.15, 0.15)
    const barMaterial = new THREE.MeshStandardMaterial({
      color: rig.status === 'warning' ? 0xff6600 : 0x666666
    })
    const bar = new THREE.Mesh(barGeometry, barMaterial)
    bar.castShadow = true
    rigGroup.add(bar)

    for (let i = -1; i <= 1; i += 2) {
      const cableGeometry = new THREE.CylinderGeometry(0.02, 0.02, rig.position.y, 8)
      const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 })
      const cable = new THREE.Mesh(cableGeometry, cableMaterial)
      cable.position.set(i * rig.length / 2 - i * 0.5, -rig.position.y / 2, 0)
      rigGroup.add(cable)
    }

    riggingGroup.add(rigGroup)
  })
}

function renderActorRoutes() {
  props.actorRoutes.forEach(route => {
    const points = route.waypoints.map(wp =>
      new THREE.Vector3(wp.x, wp.y + 0.1, wp.z)
    )

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: route.color,
      linewidth: 3
    })
    const line = new THREE.Line(lineGeometry, lineMaterial)
    line.userData = { id: route.id, type: 'route' }
    routesGroup.add(line)

    route.waypoints.forEach((wp, idx) => {
      const markerGeometry = new THREE.SphereGeometry(0.15, 16, 16)
      const markerMaterial = new THREE.MeshBasicMaterial({ color: route.color })
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.set(wp.x, wp.y + 0.1, wp.z)
      routesGroup.add(marker)
    })
  })
}

function renderStageProps() {
  props.stageProps.forEach(prop => {
    const propGroup = new THREE.Group()
    propGroup.position.set(prop.position.x, prop.position.y, prop.position.z)
    propGroup.userData = { id: prop.id, type: 'prop' }

    let geometry
    let color = 0x555555

    switch (prop.type) {
      case 'mic_stand':
        geometry = new THREE.CylinderGeometry(0.05, 0.15, prop.size.y, 8)
        color = 0x333333
        break
      case 'amp':
        geometry = new THREE.BoxGeometry(prop.size.x, prop.size.y, prop.size.z)
        color = 0x444444
        break
      case 'drum_set':
        geometry = new THREE.CylinderGeometry(prop.size.x / 2, prop.size.x / 2, prop.size.y, 16)
        color = 0x664422
        break
      default:
        geometry = new THREE.BoxGeometry(prop.size.x, prop.size.y, prop.size.z)
    }

    const material = new THREE.MeshStandardMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = prop.size.y / 2
    mesh.castShadow = true
    propGroup.add(mesh)

    propsGroup.add(propGroup)
  })
}

function checkBoundaryWarnings() {
  const boundaryIssues = props.issues.filter(i => i.type === 'boundary_warning')
  hasBoundaryWarning.value = boundaryIssues.length > 0
}

function highlightIssue(issue) {
  clearHighlight()

  const colorMap = {
    critical: 0xff0000,
    high: 0xff6600,
    medium: 0xffaa00,
    warning: 0xffff00,
    low: 0x00ff00
  }
  const highlightColor = colorMap[issue.severity] || 0xffff00

  const allGroups = [lightsGroup, riggingGroup, routesGroup, propsGroup, stageGroup]

  allGroups.forEach(group => {
    group.traverse((obj) => {
      if (obj.userData.id === issue.source || obj.userData.id === issue.target) {
        if (obj.material) {
          obj.userData.originalColor = obj.material.color ? obj.material.color.clone() : null
          if (obj.material.color) {
            obj.material.color.setHex(highlightColor)
          }
          obj.material.emissive = new THREE.Color(highlightColor)
          obj.material.emissiveIntensity = 0.5
          highlightObjects.push(obj)
        }
      }
    })
  })

  if (issue.location) {
    camera.position.set(
      issue.location.x + 10,
      issue.location.y + 8,
      issue.location.z + 10
    )
    controls.target.set(issue.location.x, issue.location.y, issue.location.z)
    controls.update()
  }
}

function clearHighlight() {
  highlightObjects.forEach(obj => {
    if (obj.material && obj.userData.originalColor) {
      obj.material.color.copy(obj.userData.originalColor)
      obj.material.emissiveIntensity = 0
    }
  })
  highlightObjects = []
}

function animate() {
  animationId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
</script>

<style scoped>
.stage-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  background: #1a1a2e;
}

.boundary-warning {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 170, 0, 0.9);
  color: #333;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 100;
}
</style>
