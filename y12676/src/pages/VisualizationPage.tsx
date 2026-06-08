import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useApp } from '../context/AppContext';
import { ShotPoint, OutlierType } from '../types';
import { getOutlierTypeLabel } from '../mockData';

const OUTLIER_COLOR: Record<OutlierType, number> = {
  drift: 0x9333ea,
  'camera-loss': 0xdc2626,
  interference: 0xf97316,
  noise: 0xeab308,
  unknown: 0x6b7280,
};

const OUTLIER_COLOR_CSS: Record<OutlierType, string> = {
  drift: 'bg-purple-500',
  'camera-loss': 'bg-red-500',
  interference: 'bg-orange-500',
  noise: 'bg-yellow-500',
  unknown: 'bg-gray-500',
};

export function VisualizationPage() {
  const { currentSession } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<ShotPoint | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const pointMeshesRef = useRef<Map<THREE.Mesh, ShotPoint>>(new Map());

  useEffect(() => {
    if (!containerRef.current || !currentSession) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(14, 10, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    createCourt(scene);

    const meshToPoint = new Map<THREE.Mesh, ShotPoint>();
    pointMeshesRef.current = meshToPoint;

    currentSession.points.forEach(point => {
      const geometry = new THREE.SphereGeometry(point.isOutlier ? 0.2 : 0.12, 20, 20);
      const color = point.isOutlier ? OUTLIER_COLOR[point.outlierType] : 0x4488ff;
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: point.isOutlier ? color : 0x000000,
        emissiveIntensity: point.isOutlier ? 0.4 : 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(point.x, point.y, point.z);
      mesh.castShadow = true;
      mesh.userData.pointId = point.id;
      scene.add(mesh);
      meshToPoint.set(mesh, point);

      if (point.isOutlier) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(point.x, point.y, point.z),
          new THREE.Vector3(point.originalX, point.originalY, point.originalZ),
        ]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xff0000,
          dashSize: 0.15,
          gapSize: 0.1,
          transparent: true,
          opacity: 0.6,
        });
        const line = new THREE.Line(lineGeom, lineMat);
        line.computeLineDistances();
        scene.add(line);
      }
    });

    renderParabola(scene, currentSession.points.filter(p => !p.isOutlier));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dom = renderer.domElement;

    const onMouseMove = (ev: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(meshToPoint.keys()));
      if (intersects.length > 0) {
        const pt = meshToPoint.get(intersects[0].object as THREE.Mesh);
        if (pt) {
          dom.style.cursor = 'pointer';
          setHoveredInfo(`${pt.id} · ${pt.isOutlier ? getOutlierTypeLabel(pt.outlierType).label : '正常'}`);
        }
      } else {
        dom.style.cursor = 'default';
        setHoveredInfo(null);
      }
    };

    const onClick = (ev: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(meshToPoint.keys()));
      if (intersects.length > 0) {
        const pt = meshToPoint.get(intersects[0].object as THREE.Mesh);
        if (pt) {
          setSelectedPoint(pt);
          const target = new THREE.Vector3(pt.x, pt.y, pt.z);
          controls.target.lerp(target, 0.3);
        }
      }
    };

    dom.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('click', onClick);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
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
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousemove', onMouseMove);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [currentSession, showOriginal]);

  if (!currentSession) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">请先选择或导入一个会话</div>
      </div>
    );
  }

  const legend = [
    { color: 'bg-blue-500', label: '正常点' },
    { color: OUTLIER_COLOR_CSS.drift, label: '设备漂移' },
    { color: OUTLIER_COLOR_CSS['camera-loss'], label: '视角丢失' },
    { color: OUTLIER_COLOR_CSS.interference, label: '信号干扰' },
    { color: OUTLIER_COLOR_CSS.noise, label: '随机噪声' },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">3D 可视化</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            点击任意数据点查看详情 · 鼠标拖动旋转视角 · 滚轮缩放
          </p>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={e => setShowOriginal(e.target.checked)}
              className="accent-primary"
            />
            显示原始参考位置
          </label>
          <div className="flex items-center gap-3 text-xs">
            {legend.map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`}></span>
                <span className="text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div ref={containerRef} className="flex-1 relative">
          {hoveredInfo && (
            <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded pointer-events-none">
              {hoveredInfo}
            </div>
          )}
        </div>

        {selectedPoint && (
          <div className="w-80 bg-white border-l overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">点详情</h3>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons text-base">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">点 ID</span>
                <span className="font-mono font-medium">{selectedPoint.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">序列位置</span>
                <span>第 {selectedPoint.index} 帧</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">状态</span>
                {selectedPoint.isOutlier ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full text-white ${
                      OUTLIER_COLOR_CSS[selectedPoint.outlierType]
                    }`}
                  >
                    {getOutlierTypeLabel(selectedPoint.outlierType).label}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">正常</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">置信度</span>
                <span>{Math.round(selectedPoint.confidence * 100)}%</span>
              </div>

              <div className="pt-3 border-t">
                <p className="text-gray-500 mb-1">当前坐标</p>
                <p className="font-mono text-gray-800">
                  X: {selectedPoint.x.toFixed(4)}<br />
                  Y: {selectedPoint.y.toFixed(4)}<br />
                  Z: {selectedPoint.z.toFixed(4)}
                </p>
              </div>

              {selectedPoint.isOutlier && (
                <div className="pt-3 border-t">
                  <p className="text-gray-500 mb-1">原始拟合参考坐标</p>
                  <p className="font-mono text-blue-700">
                    X: {selectedPoint.originalX.toFixed(4)}<br />
                    Y: {selectedPoint.originalY.toFixed(4)}<br />
                    Z: {selectedPoint.originalZ.toFixed(4)}
                  </p>
                  <p className="text-xs text-red-600 mt-2 font-mono">
                    Δ: ({(selectedPoint.x - selectedPoint.originalX).toFixed(3)},{' '}
                    {(selectedPoint.y - selectedPoint.originalY).toFixed(3)},{' '}
                    {(selectedPoint.z - selectedPoint.originalZ).toFixed(3)})
                  </p>
                </div>
              )}

              <div className="pt-3 border-t">
                <p className="text-gray-500 mb-1">来源</p>
                <p className="text-gray-800">{selectedPoint.source}</p>
              </div>

              <div className="pt-3 border-t">
                <p className="text-gray-500 mb-1">关联材料段</p>
                <p className="text-gray-800">{selectedPoint.materialName}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{selectedPoint.materialId}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function createCourt(scene: THREE.Scene) {
  const groundGeometry = new THREE.PlaneGeometry(30, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(30, 30, 0xcccccc, 0xe0e0e0);
  scene.add(gridHelper);

  const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 3.5, 12);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const pole = new THREE.Mesh(poleGeom, poleMat);
  pole.position.set(10.6, 1.75, 0);
  scene.add(pole);

  const boardGeom = new THREE.BoxGeometry(1.8, 1.05, 0.05);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const board = new THREE.Mesh(boardGeom, boardMat);
  board.position.set(10.58, 3.05, 0);
  scene.add(board);

  const hoopGeometry = new THREE.TorusGeometry(0.45, 0.05, 8, 32);
  const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
  const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
  hoop.position.set(10, 3.05, 0);
  scene.add(hoop);

  const axesHelper = new THREE.AxesHelper(2);
  axesHelper.position.set(0, 0.01, 0);
  scene.add(axesHelper);
}

function renderParabola(scene: THREE.Scene, normalPoints: ShotPoint[]) {
  if (normalPoints.length < 5) return;

  const curvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = 0.3 + 9.5 * t;
    const z = 0.2 + 4.8 * Math.sin(t * Math.PI);
    const y = -4.9 * t * t + 9.8 * t + 2.05;
    curvePoints.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const tubeGeometry = new THREE.TubeGeometry(curve, 120, 0.04, 8, false);
  const tubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.5,
  });
  const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(tube);
}
