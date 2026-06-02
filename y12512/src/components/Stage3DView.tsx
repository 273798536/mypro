import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStageStore, vec3Add, vec3Scale, vec3Normalize } from '../store/useStageStore';
import type { SmokeParticle } from '../types';
import { generateId } from '../data/sampleData';

const MAX_PARTICLES = 2000;

export const Stage3DView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const particleDataRef = useRef<SmokeParticle[]>([]);

  const {
    stage,
    smokeMachines,
    lights,
    windConfigs,
    filters,
    playback,
    updateParticles,
    runDetection,
    selectedObjectId,
    selectObject,
  } = useStageStore();

  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(15, 12, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 2, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    const floorGeometry = new THREE.PlaneGeometry(stage.dimensions.width + 10, stage.dimensions.depth + 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { type: 'floor' };
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(40, 40, 0x2d2d44, 0x1a1a2e);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    if (filters.showStage) {
      const stageFloorGeometry = new THREE.PlaneGeometry(stage.dimensions.width, stage.dimensions.depth);
      const stageFloorMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d2d44,
        roughness: 0.7,
        metalness: 0.3,
        transparent: true,
        opacity: 0.8,
      });
      const stageFloor = new THREE.Mesh(stageFloorGeometry, stageFloorMaterial);
      stageFloor.rotation.x = -Math.PI / 2;
      stageFloor.position.y = 0.02;
      stageFloor.receiveShadow = true;
      stageFloor.userData = { type: 'stage', id: stage.id };
      scene.add(stageFloor);

      const stageEdgeGeometry = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(stage.dimensions.width, 0.1, stage.dimensions.depth)
      );
      const stageEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x6366f1 });
      const stageEdges = new THREE.LineSegments(stageEdgeGeometry, stageEdgeMaterial);
      stageEdges.position.y = 0.05;
      scene.add(stageEdges);

      const axisHelper = new THREE.AxesHelper(5);
      axisHelper.position.set(-stage.dimensions.width / 2 + 1, 0.1, -stage.dimensions.depth / 2 + 1);
      scene.add(axisHelper);
    }

    if (filters.showObstacles) {
      stage.obstacles.forEach((obstacle) => {
        const obstacleColors: Record<string, number> = {
          speaker: 0x4a4a6a,
          truss: 0x5a5a7a,
          equipment: 0x3a3a5a,
          backdrop: 0x2a2a4a,
        };

        const geometry = new THREE.BoxGeometry(obstacle.size.x, obstacle.size.y, obstacle.size.z);
        const material = new THREE.MeshStandardMaterial({
          color: obstacleColors[obstacle.type] || 0x4a4a6a,
          roughness: 0.6,
          metalness: 0.4,
          transparent: true,
          opacity: 0.85,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obstacle.position.x, obstacle.position.y, obstacle.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'obstacle', id: obstacle.id, name: obstacle.name };
        scene.add(mesh);

        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: selectedObjectId === obstacle.id ? 0x6366f1 : 0x6a6a8a,
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edges.position.copy(mesh.position);
        edges.userData = { type: 'obstacle_edge', parentId: obstacle.id };
        scene.add(edges);

        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, 256, 64);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obstacle.name, 128, 40);
        }
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
        });
        const labelSprite = new THREE.Sprite(labelMaterial);
        labelSprite.position.set(
          obstacle.position.x,
          obstacle.position.y + obstacle.size.y / 2 + 1,
          obstacle.position.z
        );
        labelSprite.scale.set(4, 1, 1);
        labelSprite.userData = { type: 'label', parentId: obstacle.id };
        scene.add(labelSprite);
      });
    }

    if (filters.showMachines) {
      smokeMachines.forEach((machine) => {
        const machineGroup = new THREE.Group();
        machineGroup.position.set(machine.position.x, machine.position.y, machine.position.z);
        machineGroup.userData = { type: 'smokeMachine', id: machine.id, name: machine.name };

        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: machine.enabled ? 0x6366f1 : 0x4a4a6a,
          emissive: machine.enabled ? 0x6366f1 : 0x000000,
          emissiveIntensity: machine.enabled ? 0.3 : 0,
          roughness: 0.5,
          metalness: 0.8,
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.1;
        base.castShadow = true;
        machineGroup.add(base);

        const nozzleGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const nozzleMaterial = new THREE.MeshStandardMaterial({
          color: 0x8888aa,
          roughness: 0.3,
          metalness: 0.9,
        });
        const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        const dir = new THREE.Vector3(machine.direction.x, machine.direction.y, machine.direction.z).normalize();
        nozzle.position.copy(dir.multiplyScalar(0.3));
        nozzle.lookAt(new THREE.Vector3(
          machine.position.x + machine.direction.x * 2,
          machine.position.y + machine.direction.y * 2,
          machine.position.z + machine.direction.z * 2
        ));
        nozzle.rotateX(Math.PI / 2);
        nozzle.castShadow = true;
        machineGroup.add(nozzle);

        const dirArrow = new THREE.ArrowHelper(
          new THREE.Vector3(machine.direction.x, machine.direction.y, machine.direction.z).normalize(),
          new THREE.Vector3(0, 0.3, 0),
          1.5,
          machine.enabled ? 0x6366f1 : 0x4a4a6a,
          0.3,
          0.2
        );
        machineGroup.add(dirArrow);

        if (selectedObjectId === machine.id) {
          const ringGeometry = new THREE.RingGeometry(0.6, 0.8, 32);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.05;
          machineGroup.add(ring);
        }

        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 300;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
          ctx.fillRect(0, 0, 300, 64);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(machine.name, 150, 40);
        }
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
        });
        const labelSprite = new THREE.Sprite(labelMaterial);
        labelSprite.position.y = 1.2;
        labelSprite.scale.set(5, 1, 1);
        labelSprite.userData = { type: 'label', parentId: machine.id };
        machineGroup.add(labelSprite);

        scene.add(machineGroup);
      });
    }

    if (filters.showLights) {
      lights.forEach((light) => {
        if (!light.enabled) return;

        const lightGroup = new THREE.Group();
        lightGroup.position.set(light.position.x, light.position.y, light.position.z);
        lightGroup.userData = { type: 'stageLight', id: light.id, name: light.name };

        const fixtureGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const fixtureMaterial = new THREE.MeshStandardMaterial({
          color: light.color,
          emissive: light.color,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.7,
        });
        const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
        fixture.castShadow = true;
        lightGroup.add(fixture);

        const targetPoint = new THREE.Vector3(light.target.x, light.target.y, light.target.z);
        const lightDir = targetPoint.clone().sub(new THREE.Vector3(light.position.x, light.position.y, light.position.z)).normalize();
        const lightLength = 15;

        if (light.type === 'spot' || light.type === 'beam') {
          const coneGeometry = new THREE.ConeGeometry(
            Math.tan((light.coneAngle * Math.PI) / 360) * lightLength,
            lightLength,
            32,
            1,
            true
          );
          const coneMaterial = new THREE.MeshBasicMaterial({
            color: light.color,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const cone = new THREE.Mesh(coneGeometry, coneMaterial);
          cone.position.copy(lightDir.clone().multiplyScalar(lightLength / 2));
          cone.lookAt(targetPoint);
          cone.rotateX(Math.PI / 2);
          lightGroup.add(cone);

          const beamGeometry = new THREE.CylinderGeometry(
            0.02,
            0.02,
            lightLength,
            8
          );
          const beamMaterial = new THREE.MeshBasicMaterial({
            color: light.color,
            transparent: true,
            opacity: 0.4,
          });
          const beam = new THREE.Mesh(beamGeometry, beamMaterial);
          beam.position.copy(lightDir.clone().multiplyScalar(lightLength / 2));
          beam.lookAt(targetPoint);
          beam.rotateX(Math.PI / 2);
          lightGroup.add(beam);
        } else if (light.type === 'wash') {
          const sphereGeometry = new THREE.SphereGeometry(lightLength / 2, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({
            color: light.color,
            transparent: true,
            opacity: 0.05,
            depthWrite: false,
          });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(lightDir.clone().multiplyScalar(lightLength / 2));
          lightGroup.add(sphere);
        }

        const targetMarkerGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
        const targetMarkerMaterial = new THREE.MeshBasicMaterial({
          color: light.color,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        const targetMarker = new THREE.Mesh(targetMarkerGeometry, targetMarkerMaterial);
        targetMarker.position.set(light.target.x, 0.05, light.target.z);
        targetMarker.rotation.x = -Math.PI / 2;
        scene.add(targetMarker);

        if (selectedObjectId === light.id) {
          const ringGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.5,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = -0.3;
          lightGroup.add(ring);
        }

        scene.add(lightGroup);
      });
    }

    if (filters.showFlowArrows) {
      windConfigs.forEach((wind, idx) => {
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(wind.direction.x, wind.direction.y, wind.direction.z).normalize(),
          new THREE.Vector3(0, 4, 5),
          3,
          0x4fc3f7,
          0.5,
          0.3
        );
        arrow.userData = { type: 'windArrow', id: `wind-${idx}` };
        scene.add(arrow);
      });
    }

    if (filters.showSmoke) {
      const particlesGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(MAX_PARTICLES * 3);
      const colors = new Float32Array(MAX_PARTICLES * 3);
      const sizes = new Float32Array(MAX_PARTICLES);

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const particlesMaterial = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      particles.userData = { type: 'smokeParticles' };
      scene.add(particles);
      particlesMeshRef.current = particles;
    }

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !camera || !scene) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj.parent && !obj.userData.type) {
          obj = obj.parent;
        }
        if (obj.userData.id && obj.userData.type) {
          selectObject(obj.userData.id, obj.userData.type);
          return;
        }
      }
      selectObject(null, null);
    };

    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
    };
  }, [stage, smokeMachines, lights, filters, selectedObjectId, selectObject, windConfigs]);

  const getCurrentWind = useCallback((time: number) => {
    for (const wind of windConfigs) {
      if (time >= wind.startTime && time <= wind.endTime) {
        return wind;
      }
    }
    return { direction: { x: 0, y: 0, z: 0 }, speed: 0, turbulence: 0 };
  }, [windConfigs]);

  const emitParticles = useCallback((deltaTime: number, currentTime: number) => {
    if (!filters.showSmoke) return;

    const wind = getCurrentWind(currentTime);
    const newParticles: SmokeParticle[] = [];

    smokeMachines.forEach((machine) => {
      if (!machine.enabled || currentTime < machine.startTime || currentTime > machine.endTime) return;

      const particlesToEmit = Math.floor(machine.emissionRate * deltaTime);

      for (let i = 0; i < particlesToEmit; i++) {
        if (particleDataRef.current.length >= MAX_PARTICLES) break;

        const spread = (Math.random() - 0.5) * machine.spread;
        const spread2 = (Math.random() - 0.5) * machine.spread;

        const baseDir = vec3Normalize(machine.direction);
        const velocity = vec3Normalize({
          x: baseDir.x + spread,
          y: baseDir.y + Math.abs(spread) * 0.5,
          z: baseDir.z + spread2,
        });

        const particle: SmokeParticle = {
          id: generateId('p'),
          position: { ...machine.position },
          velocity: vec3Scale(velocity, machine.speed),
          size: machine.particleSize * (0.8 + Math.random() * 0.4),
          opacity: 0.8,
          age: 0,
          maxAge: 8 + Math.random() * 4,
          sourceMachineId: machine.id,
        };

        newParticles.push(particle);
      }
    });

    particleDataRef.current = [...particleDataRef.current, ...newParticles];

    const updatedParticles: SmokeParticle[] = [];
    for (const particle of particleDataRef.current) {
      particle.age += deltaTime;
      if (particle.age >= particle.maxAge) continue;

      const turbulence = {
        x: (Math.random() - 0.5) * wind.turbulence * deltaTime,
        y: (Math.random() - 0.5) * wind.turbulence * deltaTime,
        z: (Math.random() - 0.5) * wind.turbulence * deltaTime,
      };

      particle.velocity = vec3Add(
        particle.velocity,
        vec3Add(vec3Scale(wind.direction, wind.speed * deltaTime), turbulence)
      );
      particle.velocity = vec3Scale(particle.velocity, 0.995);
      particle.velocity.y += 0.1 * deltaTime;

      particle.position = vec3Add(particle.position, vec3Scale(particle.velocity, deltaTime));

      const lifeRatio = particle.age / particle.maxAge;
      particle.opacity = Math.max(0, 0.8 * (1 - lifeRatio * lifeRatio));
      particle.size *= 1 + deltaTime * 0.15;

      updatedParticles.push(particle);
    }

    particleDataRef.current = updatedParticles;
    updateParticles(updatedParticles);
  }, [filters.showSmoke, smokeMachines, getCurrentWind, updateParticles]);

  const updateParticleGeometry = useCallback(() => {
    if (!particlesMeshRef.current || !filters.showSmoke) return;

    const geometry = particlesMeshRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;

    const count = Math.min(particleDataRef.current.length, MAX_PARTICLES);

    for (let i = 0; i < count; i++) {
      const particle = particleDataRef.current[i];
      const machine = smokeMachines.find((m) => m.id === particle.sourceMachineId);
      const color = new THREE.Color(machine?.color || '#ffffff');

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = particle.size;
    }

    for (let i = count; i < MAX_PARTICLES; i++) {
      positions[i * 3 + 1] = -1000;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.setDrawRange(0, count);
  }, [filters.showSmoke, smokeMachines]);

  useEffect(() => {
    const cleanup = initScene();

    let lastDetectionTime = 0;

    const animate = (time: number) => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;

      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      if (playback.isPlaying) {
        const newTime = playback.currentTime + deltaTime * playback.speed;
        if (newTime >= playback.duration) {
          useStageStore.getState().setPlaybackTime(0);
          useStageStore.getState().togglePlayback();
        } else {
          useStageStore.getState().setPlaybackTime(newTime);
        }

        emitParticles(deltaTime, playback.currentTime);
        updateParticleGeometry();

        if (playback.currentTime - lastDetectionTime > 5) {
          runDetection();
          lastDetectionTime = playback.currentTime;
        }
      }

      controlsRef.current.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      if (cleanup) cleanup();
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
    };
  }, [initScene, emitParticles, updateParticleGeometry, playback, runDetection]);

  useEffect(() => {
    if (sceneRef.current) {
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
      particleDataRef.current = [];
      particlesMeshRef.current = null;
      initScene();
    }
  }, [filters.showStage, filters.showSmoke, filters.showLights, filters.showMachines, filters.showObstacles, filters.showFlowArrows, initScene]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-stage-bg relative"
      style={{ cursor: 'grab' }}
      onMouseDown={(e) => (e.currentTarget.style.cursor = 'grabbing')}
      onMouseUp={(e) => (e.currentTarget.style.cursor = 'grab')}
      onMouseLeave={(e) => (e.currentTarget.style.cursor = 'grab')}
    >
      <div className="absolute top-4 left-4 bg-stage-surface/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-stage-border">
        <div className="text-xs text-gray-400">时间</div>
        <div className="text-lg font-mono text-white">
          {Math.floor(playback.currentTime / 60)}:{String(Math.floor(playback.currentTime % 60)).padStart(2, '0')}
          <span className="text-sm text-gray-400"> / {Math.floor(playback.duration / 60)}:{String(Math.floor(playback.duration % 60)).padStart(2, '0')}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-stage-surface/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-stage-border">
        <div className="text-xs text-gray-400">烟雾颗粒</div>
        <div className="text-lg font-mono text-white">{particleDataRef.current.length.toLocaleString()}</div>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(0, 20, 0);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          className="bg-stage-surface/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-stage-border border border-stage-border transition-colors"
        >
          顶视图
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(0, 5, 25);
              controlsRef.current.target.set(0, 2, 0);
              controlsRef.current.update();
            }
          }}
          className="bg-stage-surface/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-stage-border border border-stage-border transition-colors"
        >
          正视图
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              cameraRef.current.position.set(15, 12, 18);
              controlsRef.current.target.set(0, 2, 0);
              controlsRef.current.update();
            }
          }}
          className="bg-stage-surface/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-stage-border border border-stage-border transition-colors"
        >
          透视图
        </button>
      </div>
    </div>
  );
};
