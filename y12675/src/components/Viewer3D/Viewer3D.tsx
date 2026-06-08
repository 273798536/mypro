import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useAppStore } from '../../store/appStore';
import { detectCollisions } from '../../utils/dataProcessing';
import type { CrystalDefect, CollisionEvent } from '../../types';

const DEFECT_COLORS: Record<string, number> = {
  vacancy: 0x00bcd4,
  interstitial: 0xff9800,
  dislocation: 0xf44336,
  grain_boundary: 0x9c27b0,
  precipitate: 0x4caf50,
};

const COLLISION_COLORS: Record<string, number> = {
  high: 0xff0000,
  medium: 0xff9800,
  low: 0xffeb3b,
};

export default function Viewer3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  
  const { 
    pointCloudData, 
    timeState, 
    slicePlane,
    selectedDefects,
    selectDefect,
    deselectDefect,
    clearSelection,
    collisions,
    measurements
  } = useAppStore();
  
  const [slicePosition, setSlicePosition] = useState(0);

  const visibleDefectsRef = useRef<CrystalDefect[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 30, 80);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(18, 18, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(15, 20, 10);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x00bcd4, 0.4);
    directionalLight2.position.set(-10, 5, -10);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x9c27b0, 0.5, 50);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    const axesHelper = new THREE.AxesHelper(25);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(40, 40, 0x1e3a5f, 0x0d1b2a);
    gridHelper.position.y = -12;
    scene.add(gridHelper);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      
      const collisionLines = scene.getObjectByName('collisionLines');
      if (collisionLines) {
        collisionLines.children.forEach((child, i) => {
          if (child instanceof THREE.Line) {
            const material = child.material as THREE.LineBasicMaterial;
            material.opacity = 0.5 + 0.3 * Math.sin(Date.now() * 0.005 + i);
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    const objectsToRemove = ['pointCloud', 'defectSpheres', 'collisionLines', 'measurementLines', 'selectedHighlight'];
    objectsToRemove.forEach(name => {
      const obj = sceneRef.current!.getObjectByName(name);
      if (obj) sceneRef.current!.remove(obj);
    });

    if (!pointCloudData) return;

    const filteredDefects = pointCloudData.points.filter((defect) => {
      if (defect.timestamp > timeState.currentTime) return false;
      if (slicePlane.active) {
        const dot = defect.position.x * slicePlane.normal.x +
                   defect.position.y * slicePlane.normal.y +
                   defect.position.z * slicePlane.normal.z;
        return dot - slicePlane.distance <= slicePosition + 3 && dot - slicePlane.distance >= slicePosition - 3;
      }
      return true;
    });

    visibleDefectsRef.current = filteredDefects;

    const allCurrentCollisions: CollisionEvent[] = collisions.length > 0
      ? collisions.filter(c => 
          filteredDefects.some(d => d.id === c.defect1) && 
          filteredDefects.some(d => d.id === c.defect2)
        )
      : detectCollisions(filteredDefects, 0.5);

    const collisionDefectIds = new Set<string>();
    allCurrentCollisions.forEach(c => {
      collisionDefectIds.add(c.defect1);
      collisionDefectIds.add(c.defect2);
    });

    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(filteredDefects.length * 3);
    const colors = new Float32Array(filteredDefects.length * 3);
    const sizes = new Float32Array(filteredDefects.length);

    filteredDefects.forEach((defect, i) => {
      positions[i * 3] = defect.position.x;
      positions[i * 3 + 1] = defect.position.y;
      positions[i * 3 + 2] = defect.position.z;

      let color: number;
      if (collisionDefectIds.has(defect.id)) {
        const collision = allCurrentCollisions.find(
          c => c.defect1 === defect.id || c.defect2 === defect.id
        );
        color = collision ? COLLISION_COLORS[collision.severity] : DEFECT_COLORS[defect.type];
      } else if (selectedDefects.includes(defect.id)) {
        color = 0x00ff88;
      } else {
        color = DEFECT_COLORS[defect.type] || 0xffffff;
      }
      
      const threeColor = new THREE.Color(color);
      colors[i * 3] = threeColor.r;
      colors[i * 3 + 1] = threeColor.g;
      colors[i * 3 + 2] = threeColor.b;

      sizes[i] = selectedDefects.includes(defect.id) ? defect.radius * 1.5 : defect.radius;
    });

    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const pointCloud = new THREE.Points(pointsGeometry, pointMaterial);
    pointCloud.name = 'pointCloud';
    sceneRef.current.add(pointCloud);

    const selectedGroup = new THREE.Group();
    selectedGroup.name = 'selectedHighlight';

    filteredDefects.forEach((defect) => {
      const isSelected = selectedDefects.includes(defect.id);
      const isCollision = collisionDefectIds.has(defect.id);
      
      if (isSelected || isCollision) {
        const collision = allCurrentCollisions.find(
          c => c.defect1 === defect.id || c.defect2 === defect.id
        );
        
        const color = isSelected 
          ? 0x00ff88 
          : collision 
            ? COLLISION_COLORS[collision.severity] 
            : DEFECT_COLORS[defect.type];

        const geometry = new THREE.SphereGeometry(defect.radius * 1.8, 24, 24);
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.15,
          wireframe: true,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(defect.position.x, defect.position.y, defect.position.z);
        sphere.userData.defectId = defect.id;
        selectedGroup.add(sphere);

        const glowGeometry = new THREE.SphereGeometry(defect.radius * 1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.25,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(defect.position.x, defect.position.y, defect.position.z);
        selectedGroup.add(glow);
      }
    });

    if (selectedGroup.children.length > 0) {
      sceneRef.current.add(selectedGroup);
    }

    const collisionLinesGroup = new THREE.Group();
    collisionLinesGroup.name = 'collisionLines';

    allCurrentCollisions.forEach((collision) => {
      const d1 = filteredDefects.find(d => d.id === collision.defect1);
      const d2 = filteredDefects.find(d => d.id === collision.defect2);
      if (!d1 || !d2) return;

      const points = [
        new THREE.Vector3(d1.position.x, d1.position.y, d1.position.z),
        new THREE.Vector3(d2.position.x, d2.position.y, d2.position.z),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: COLLISION_COLORS[collision.severity],
        transparent: true,
        opacity: 0.8,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      line.userData.collisionId = collision.id;
      collisionLinesGroup.add(line);

      const midPoint = new THREE.Vector3(
        (d1.position.x + d2.position.x) / 2,
        (d1.position.y + d2.position.y) / 2,
        (d1.position.z + d2.position.z) / 2
      );

      const arrowGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
      const arrowMaterial = new THREE.MeshBasicMaterial({
        color: COLLISION_COLORS[collision.severity],
        transparent: true,
        opacity: 0.9,
      });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.position.copy(midPoint);
      arrow.lookAt(new THREE.Vector3(d2.position.x, d2.position.y, d2.position.z));
      collisionLinesGroup.add(arrow);
    });

    if (collisionLinesGroup.children.length > 0) {
      sceneRef.current.add(collisionLinesGroup);
    }

    const measurementLinesGroup = new THREE.Group();
    measurementLinesGroup.name = 'measurementLines';

    measurements.forEach((measurement) => {
      const defects = measurement.defectIds
        .map(id => filteredDefects.find(d => d.id === id))
        .filter(Boolean) as CrystalDefect[];
      
      if (defects.length < 2) return;

      for (let i = 0; i < defects.length; i++) {
        for (let j = i + 1; j < defects.length; j++) {
          const d1 = defects[i];
          const d2 = defects[j];
          
          const points = [
            new THREE.Vector3(d1.position.x, d1.position.y, d1.position.z),
            new THREE.Vector3(d2.position.x, d2.position.y, d2.position.z),
          ];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineDashedMaterial({
            color: measurement.status === 'direct_use' ? 0x00ff88 : 0x00bcd4,
            dashSize: 0.3,
            gapSize: 0.2,
            transparent: true,
            opacity: 0.7,
          });
          const line = new THREE.Line(geometry, material);
          line.computeLineDistances();
          measurementLinesGroup.add(line);

          const midPoint = new THREE.Vector3(
            (d1.position.x + d2.position.x) / 2,
            (d1.position.y + d2.position.y) / 2 + 0.5,
            (d1.position.z + d2.position.z) / 2
          );

          const labelGeometry = new THREE.SphereGeometry(0.2, 8, 8);
          const labelMaterial = new THREE.MeshBasicMaterial({
            color: measurement.status === 'direct_use' ? 0x00ff88 : 0x00bcd4,
            transparent: true,
            opacity: 0.9,
          });
          const label = new THREE.Mesh(labelGeometry, labelMaterial);
          label.position.copy(midPoint);
          measurementLinesGroup.add(label);
        }
      }
    });

    if (measurementLinesGroup.children.length > 0) {
      sceneRef.current.add(measurementLinesGroup);
    }
  }, [pointCloudData, timeState.currentTime, selectedDefects, slicePosition, slicePlane, collisions, measurements]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const existingPlane = sceneRef.current.getObjectByName('slicePlane');
    if (existingPlane) {
      sceneRef.current.remove(existingPlane);
    }

    if (!slicePlane.active) return;

    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00bcd4,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.name = 'slicePlane';

    plane.position.set(
      slicePlane.normal.x * slicePosition,
      slicePlane.normal.y * slicePosition,
      slicePlane.normal.z * slicePosition
    );

    if (slicePlane.normal.x !== 0) {
      plane.rotation.y = Math.PI / 2;
    } else if (slicePlane.normal.z !== 0) {
      plane.rotation.x = Math.PI / 2;
    }

    const edgeGeometry = new THREE.EdgesGeometry(planeGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x00bcd4,
      transparent: true,
      opacity: 0.5,
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    plane.add(edges);

    sceneRef.current.add(plane);
  }, [slicePlane.active, slicePosition, slicePlane.normal]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !sceneRef.current || !cameraRef.current || !pointCloudData) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    raycaster.params.Points = { threshold: 0.8 };

    const pointCloud = sceneRef.current.getObjectByName('pointCloud');
    if (!pointCloud) return;

    const intersects = raycaster.intersectObject(pointCloud);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const index = intersect.index!;
      const defect = visibleDefectsRef.current[index];

      if (defect) {
        if (selectedDefects.includes(defect.id)) {
          deselectDefect(defect.id);
        } else {
          selectDefect(defect.id);
        }
      }
    } else {
      clearSelection();
    }
  };

  const handleSliceChange = (value: number) => {
    setSlicePosition(value);
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
      />
      
      <div className="absolute bottom-4 left-4 right-4 bg-gray-900 bg-opacity-90 rounded-lg p-4 backdrop-blur-sm border border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <label className="text-cyan-400 text-sm font-medium">切片位置</label>
          <span className="text-cyan-400 text-xs font-mono">{slicePosition.toFixed(2)} nm</span>
        </div>
        <input
          type="range"
          min="-15"
          max="15"
          step="0.1"
          value={slicePosition}
          onChange={(e) => handleSliceChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          disabled={!slicePlane.active}
        />
      </div>

      <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-90 rounded-lg p-3 backdrop-blur-sm border border-gray-800 space-y-3">
        <div>
          <div className="text-xs text-gray-400 mb-2">缺陷类型</div>
          <div className="space-y-1">
            {Object.entries(DEFECT_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm" 
                  style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                />
                <span className="text-xs text-gray-300 capitalize">{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-700 pt-2">
          <div className="text-xs text-gray-400 mb-2">碰撞级别</div>
          <div className="space-y-1">
            {Object.entries(COLLISION_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse" 
                  style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                />
                <span className="text-xs text-gray-300">
                  {level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-90 rounded-lg p-3 backdrop-blur-sm border border-gray-800">
        <div className="text-xs text-gray-400 mb-1">当前状态</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between space-x-4">
            <span className="text-xs text-gray-400">可见缺陷</span>
            <span className="text-xs text-cyan-400 font-mono">{visibleDefectsRef.current.length}</span>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <span className="text-xs text-gray-400">已选中</span>
            <span className="text-xs text-green-400 font-mono">{selectedDefects.length}</span>
          </div>
          {collisions.length > 0 && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-xs text-gray-400">碰撞事件</span>
              <span className="text-xs text-orange-400 font-mono">{collisions.length}</span>
            </div>
          )}
          {measurements.length > 0 && (
            <div className="flex items-center justify-between space-x-4">
              <span className="text-xs text-gray-400">测量记录</span>
              <span className="text-xs text-purple-400 font-mono">{measurements.length}</span>
            </div>
          )}
        </div>
      </div>

      {selectedDefects.length >= 2 && (
        <div className="absolute bottom-24 left-4 bg-gray-900 bg-opacity-90 rounded-lg p-3 backdrop-blur-sm border border-green-800">
          <div className="text-xs text-green-400 mb-1">已选 {selectedDefects.length} 个缺陷</div>
          <div className="text-xs text-gray-400">
            在"测量记录"面板点击"添加"创建测量
          </div>
        </div>
      )}
    </div>
  );
}
