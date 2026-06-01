import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useProjectStore } from '../store/projectStore';

const Scene3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const objectsRef = useRef<{
    buildings: THREE.Mesh[];
    soundSources: THREE.Mesh[];
    windParticles: THREE.Points | null;
    heatmap: THREE.Mesh | null;
  }>({
    buildings: [],
    soundSources: [],
    windParticles: null,
    heatmap: null,
  });

  const {
    buildings,
    soundSources,
    windData,
    heatmap,
    currentTime,
    selectedFilters,
  } = useProjectStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x333333);
    scene.add(gridHelper);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    objectsRef.current.buildings.forEach(mesh => scene.remove(mesh));
    objectsRef.current.buildings = [];

    const filteredBuildings = buildings.filter(b =>
      selectedFilters.buildingTypes.includes(b.type)
    );

    filteredBuildings.forEach(building => {
      const geometry = new THREE.BoxGeometry(
        building.dimensions.width,
        building.dimensions.height,
        building.dimensions.depth
      );

      const colorMap: Record<string, number> = {
        residential: 0x4a90d9,
        commercial: 0xe74c3c,
        stage: 0xf39c12,
        other: 0x95a5a6,
      };

      const material = new THREE.MeshPhongMaterial({
        color: colorMap[building.type] || 0x95a5a6,
        transparent: true,
        opacity: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        building.position.x,
        building.dimensions.height / 2,
        building.position.z
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { building };
      scene.add(mesh);
      objectsRef.current.buildings.push(mesh);

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.position.copy(mesh.position);
      scene.add(wireframe);
    });
  }, [buildings, selectedFilters.buildingTypes]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    objectsRef.current.soundSources.forEach(mesh => scene.remove(mesh));
    objectsRef.current.soundSources = [];

    const filteredSources = soundSources.filter(s =>
      selectedFilters.soundTypes.includes(s.type) &&
      currentTime >= s.activeTime.start &&
      currentTime <= s.activeTime.end
    );

    filteredSources.forEach(source => {
      const geometry = new THREE.SphereGeometry(1 + source.decibels / 40, 16, 16);

      const colorMap: Record<string, number> = {
        stage: 0xff6b6b,
        traffic: 0xffd93d,
        wind: 0x6bcfff,
        complaint: 0xff4757,
        other: 0xa29bfe,
      };

      const material = new THREE.MeshBasicMaterial({
        color: colorMap[source.type] || 0xa29bfe,
        transparent: true,
        opacity: 0.7,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(source.position.x, source.position.y, source.position.z);
      mesh.userData = { source };
      scene.add(mesh);
      objectsRef.current.soundSources.push(mesh);

      const waveGeometry = new THREE.RingGeometry(2, 3, 32);
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: colorMap[source.type] || 0xa29bfe,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const wave = new THREE.Mesh(waveGeometry, waveMaterial);
      wave.position.copy(mesh.position);
      wave.rotation.x = Math.PI / 2;
      scene.add(wave);
    });
  }, [soundSources, currentTime, selectedFilters.soundTypes]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (objectsRef.current.windParticles) {
      scene.remove(objectsRef.current.windParticles);
      objectsRef.current.windParticles = null;
    }

    if (!selectedFilters.showWind || windData.length === 0) return;

    const currentWind = windData.find(w =>
      Math.abs(w.timestamp - currentTime) < 1
    ) || windData[0];

    if (!currentWind) return;

    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (currentWind.direction * Math.PI) / 180;
      const distance = Math.random() * 50;
      const height = Math.random() * 30;

      positions[i * 3] = Math.cos(angle) * distance + (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * distance + (Math.random() - 0.5) * 20;

      const intensity = Math.min(currentWind.speed / 20, 1);
      colors[i * 3] = 0.4 + intensity * 0.6;
      colors[i * 3 + 1] = 0.8 + intensity * 0.2;
      colors[i * 3 + 2] = 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    objectsRef.current.windParticles = particles;
  }, [windData, currentTime, selectedFilters.showWind]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (objectsRef.current.heatmap) {
      scene.remove(objectsRef.current.heatmap);
      objectsRef.current.heatmap = null;
    }

    if (!selectedFilters.showHeatmap || heatmap.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;

    for (let i = 0; i < heatmap.length; i++) {
      const point = heatmap[i];
      const x = Math.floor((point.position.x + 50) * 2.56);
      const y = Math.floor((point.position.z + 50) * 2.56);

      for (let dx = -10; dx <= 10; dx++) {
        for (let dy = -10; dy <= 10; dy++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < 256 && py >= 0 && py < 256) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            const falloff = Math.max(0, 1 - dist / 10);
            const idx = (py * 256 + px) * 4;
            const intensity = point.value * falloff * 255;
            data[idx] = Math.min(255, data[idx] + intensity);
            data[idx + 1] = Math.min(255, data[idx + 1] + intensity * 0.5);
            data[idx + 3] = Math.min(255, data[idx + 3] + intensity * 0.5);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    const heatmapMesh = new THREE.Mesh(geometry, material);
    heatmapMesh.rotation.x = -Math.PI / 2;
    heatmapMesh.position.y = 0.1;
    scene.add(heatmapMesh);
    objectsRef.current.heatmap = heatmapMesh;
  }, [heatmap, selectedFilters.showHeatmap]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  );
};

export default Scene3D;
