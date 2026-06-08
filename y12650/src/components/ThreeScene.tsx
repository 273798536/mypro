import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAppStore } from '../store';
import type { PipelineSegment, Obstacle, CollisionResult } from '../types';
import { convertToWorld } from '../utils/helpers';

const COLORS = {
  seabed: 0x0a2040,
  seabedGrid: 0x1a4070,
  pipelineNormal: 0x3aa0e0,
  pipelineViolation: 0xe04040,
  pipelineWarning: 0xe0a040,
  pipelineSelected: 0x80e0ff,
  pile: 0x888899,
  structure: 0x7766aa,
  rock: 0x665544,
  otherPipeline: 0x55a055,
  safeZone: 0x44ff88,
  violationZone: 0xff4444,
  collisionMarker: 0xff2020,
  axisX: 0xff4444,
  axisY: 0x44ff44,
  axisZ: 0x4444ff,
};

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  pipelinesGroup: THREE.Group;
  obstaclesGroup: THREE.Group;
  markersGroup: THREE.Group;
  animationId: number;
}

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRefs | null>(null);

  const {
    pipelines,
    obstacles,
    collisions,
    safeDistance,
    showCollisionZones,
    selectedPipelineId,
    setCurrentCamera,
    pendingRestoreCamera,
    clearPendingRestoreCamera,
    recomputeCollisions,
  } = useAppStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05101f);
    scene.fog = new THREE.Fog(0x05101f, 150, 400);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(80, 60, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 5;
    controls.maxDistance = 300;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;

    const ambient = new THREE.AmbientLight(0x4466aa, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3388ff, 0.4, 200);
    pointLight.position.set(-50, 30, -50);
    scene.add(pointLight);

    const seabedGeo = new THREE.PlaneGeometry(300, 300, 60, 60);
    const positions = seabedGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      const h = Math.sin(x * 0.03) * 0.6 + Math.cos(z * 0.04) * 0.8 + (Math.random() - 0.5) * 0.4;
      positions.setZ(i, h - 5);
    }
    seabedGeo.computeVertexNormals();
    const seabedMat = new THREE.MeshStandardMaterial({
      color: COLORS.seabed,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    const seabed = new THREE.Mesh(seabedGeo, seabedMat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.receiveShadow = true;
    scene.add(seabed);

    const gridHelper = new THREE.GridHelper(200, 40, COLORS.seabedGrid, COLORS.seabedGrid);
    gridHelper.position.y = -4.9;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(12);
    axesHelper.position.y = -4.8;
    scene.add(axesHelper);

    const pipelinesGroup = new THREE.Group();
    const obstaclesGroup = new THREE.Group();
    const markersGroup = new THREE.Group();
    scene.add(pipelinesGroup);
    scene.add(obstaclesGroup);
    scene.add(markersGroup);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      controls,
      pipelinesGroup,
      obstaclesGroup,
      markersGroup,
      animationId: 0,
    };

    const animate = () => {
      sceneRef.current!.animationId = requestAnimationFrame(animate);
      controls.update();

      const cam = sceneRef.current!.camera;
      setCurrentCamera({
        position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        up: { x: cam.up.x, y: cam.up.y, z: cam.up.z },
        fov: cam.fov,
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    recomputeCollisions();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(sceneRef.current!.animationId);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
   
  }, []);

  useEffect(() => {
    if (pendingRestoreCamera && sceneRef.current) {
      const v = pendingRestoreCamera;
      const { camera, controls } = sceneRef.current;
      camera.position.set(v.position.x, v.position.y, v.position.z);
      camera.fov = v.fov;
      camera.up.set(v.up.x, v.up.y, v.up.z);
      camera.updateProjectionMatrix();
      controls.target.set(v.target.x, v.target.y, v.target.z);
      controls.update();
      clearPendingRestoreCamera();
    }
  }, [pendingRestoreCamera, clearPendingRestoreCamera]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { pipelinesGroup } = sceneRef.current;

    while (pipelinesGroup.children.length > 0) {
      const c = pipelinesGroup.children[0];
      pipelinesGroup.remove(c);
    }

    const violationMap = new Map<string, CollisionResult[]>();
    for (const col of collisions) {
      if (!violationMap.has(col.obstacleId)) violationMap.set(col.obstacleId, []);
      violationMap.get(col.obstacleId)!.push(col);
    }

    for (const pipe of pipelines) {
      const pipeHasViolation = collisions.some(
        (c) => c.isViolation && isPipeRelatedToCollision(pipe, c, obstacles),
      );
      const pipeHasWarning = collisions.some(
        (c) => !c.isViolation && c.distance < safeDistance * 1.5 && isPipeRelatedToCollision(pipe, c, obstacles),
      );

      const mesh = buildPipelineMesh(pipe, {
        isSelected: pipe.id === selectedPipelineId,
        hasViolation: pipeHasViolation,
        hasWarning: pipeHasWarning,
      });
      pipelinesGroup.add(mesh);

      if (showCollisionZones && (pipeHasViolation || pipeHasWarning)) {
        const start = convertToWorld(pipe.start.position, pipe.start.coordinateSystem);
        const end = convertToWorld(pipe.end.position, pipe.end.coordinateSystem);
        const dir = new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z);
        const len = dir.length();
        const cylinderGeo = new THREE.CylinderGeometry(safeDistance, safeDistance, len, 24, 1, true);
        const mat = new THREE.MeshBasicMaterial({
          color: pipeHasViolation ? COLORS.violationZone : COLORS.safeZone,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
        });
        const cyl = new THREE.Mesh(cylinderGeo, mat);
        const mid = new THREE.Vector3((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
        cyl.position.copy(mid);
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        pipelinesGroup.add(cyl);
      }
    }
  }, [pipelines, collisions, safeDistance, showCollisionZones, selectedPipelineId, obstacles]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { obstaclesGroup } = sceneRef.current;

    while (obstaclesGroup.children.length > 0) {
      const c = obstaclesGroup.children[0];
      obstaclesGroup.remove(c);
    }

    for (const obs of obstacles) {
      const mesh = buildObstacleMesh(obs);
      obstaclesGroup.add(mesh);
    }
  }, [obstacles]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { markersGroup } = sceneRef.current;

    while (markersGroup.children.length > 0) {
      const c = markersGroup.children[0];
      markersGroup.remove(c);
    }

    for (const col of collisions) {
      if (!col.isViolation) continue;
      const geo = new THREE.SphereGeometry(0.6, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: COLORS.collisionMarker });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(col.closestPoint.x, col.closestPoint.y + 0.5, col.closestPoint.z);
      markersGroup.add(sphere);

      const ringGeo = new THREE.RingGeometry(0.8, 1.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: COLORS.collisionMarker,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(col.closestPoint.x, col.closestPoint.y + 0.05, col.closestPoint.z);
      markersGroup.add(ring);
    }
  }, [collisions]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

function buildPipelineMesh(
  pipe: PipelineSegment,
  opts: { isSelected: boolean; hasViolation: boolean; hasWarning: boolean },
): THREE.Object3D {
  const group = new THREE.Group();
  const start = convertToWorld(pipe.start.position, pipe.start.coordinateSystem);
  const end = convertToWorld(pipe.end.position, pipe.end.coordinateSystem);

  const startV = new THREE.Vector3(start.x, start.y, start.z);
  const endV = new THREE.Vector3(end.x, end.y, end.z);
  const dir = new THREE.Vector3().subVectors(endV, startV);
  const length = dir.length();

  let color = COLORS.pipelineNormal;
  if (opts.isSelected) color = COLORS.pipelineSelected;
  else if (opts.hasViolation) color = COLORS.pipelineViolation;
  else if (opts.hasWarning) color = COLORS.pipelineWarning;

  const geometry = new THREE.CylinderGeometry(pipe.diameter / 2, pipe.diameter / 2, length, 20);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.6,
    emissive: opts.isSelected ? color : 0x000000,
    emissiveIntensity: opts.isSelected ? 0.3 : 0,
  });
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;

  const mid = new THREE.Vector3().addVectors(startV, endV).multiplyScalar(0.5);
  cylinder.position.copy(mid);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  group.add(cylinder);

  const sphereGeo = new THREE.SphereGeometry(pipe.diameter / 2 + 0.02, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.6,
  });
  const s1 = new THREE.Mesh(sphereGeo, sphereMat);
  s1.position.copy(startV);
  const s2 = new THREE.Mesh(sphereGeo, sphereMat);
  s2.position.copy(endV);
  group.add(s1, s2);

  return group;
}

function buildObstacleMesh(obs: Obstacle): THREE.Object3D {
  const group = new THREE.Group();
  const pos = convertToWorld(obs.position, obs.coordinateSystem);
  group.position.set(pos.x, pos.y, pos.z);

  if (obs.rotation) {
    group.rotation.set(obs.rotation.x, obs.rotation.y, obs.rotation.z);
  }

  let color = COLORS.structure;
  let geometry: THREE.BufferGeometry;

  switch (obs.type) {
    case 'pile':
      color = COLORS.pile;
      geometry = new THREE.CylinderGeometry(obs.size.x / 2, obs.size.x / 2, obs.size.y, 16);
      break;
    case 'rock':
      color = COLORS.rock;
      geometry = new THREE.DodecahedronGeometry(Math.max(obs.size.x, obs.size.y, obs.size.z) / 2, 0);
      break;
    case 'other-pipeline':
      color = COLORS.otherPipeline;
      geometry = new THREE.CylinderGeometry(obs.size.x / 2, obs.size.x / 2, obs.size.y, 16);
      break;
    case 'structure':
    default:
      color = COLORS.structure;
      geometry = new THREE.BoxGeometry(obs.size.x, obs.size.y, obs.size.z);
      break;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.2,
    flatShading: obs.type === 'rock',
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (obs.type === 'pile' || obs.type === 'other-pipeline') {
    mesh.position.y = obs.size.y / 2;
  } else {
    mesh.position.y = obs.size.y / 2;
  }

  group.add(mesh);

  const edges = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });
  const wire = new THREE.LineSegments(edges, lineMat);
  wire.position.copy(mesh.position);
  group.add(wire);

  return group;
}

function isPipeRelatedToCollision(
  pipe: PipelineSegment,
  col: CollisionResult,
  obstacles: Obstacle[],
): boolean {
  const start = convertToWorld(pipe.start.position, pipe.start.coordinateSystem);
  const end = convertToWorld(pipe.end.position, pipe.end.coordinateSystem);
  const obs = obstacles.find((o) => o.id === col.obstacleId);
  if (!obs) return false;
  const obsPos = convertToWorld(obs.position, obs.coordinateSystem);
  const dir = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
  const len2 = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z;
  if (len2 < 1e-6) return false;
  const t =
    ((obsPos.x - start.x) * dir.x + (obsPos.y - start.y) * dir.y + (obsPos.z - start.z) * dir.z) / len2;
  return t >= -0.1 && t <= 1.1;
}
