import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SurfaceModel, SamplePoint } from '../types';

interface SurfaceViewerProps {
  surface: SurfaceModel;
  showBoundaries: boolean;
}

export function SurfaceViewer({ surface, showBoundaries }: SurfaceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);

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
    camera.position.set(5, 5, 8);
    camera.lookAt(0, 0, 2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x333333);
    scene.add(gridHelper);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const rotationSpeed = 0.01;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * rotationSpeed);
      camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * rotationSpeed);
      camera.lookAt(0, 0, 2);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, -e.deltaY * 0.01);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
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
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData.isSurface || obj.userData.isSamplePoint || obj.userData.isBoundary) {
        objectsToRemove.push(obj);
      }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));

    const latestVersion = surface.versions[surface.versions.length - 1];
    const samples = latestVersion.samplePoints;

    const geometry = new THREE.PlaneGeometry(6, 6, 20, 20);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = (x * x + y * y) / 3;
      positions.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const hasBoundaryIssue = latestVersion.anomalies.some(a => a.type === 'boundary_missing');
    const material = new THREE.MeshPhongMaterial({
      color: hasBoundaryIssue ? 0xff6b6b : 0x4ecdc4,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      shininess: 100
    });

    const surfaceMesh = new THREE.Mesh(geometry, material);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.userData.isSurface = true;
    scene.add(surfaceMesh);

    const wireframe = new THREE.WireframeGeometry(geometry);
    const wireframeLine = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true }));
    wireframeLine.rotation.x = -Math.PI / 2;
    wireframeLine.userData.isSurface = true;
    scene.add(wireframeLine);

    samples.forEach((sample: SamplePoint) => {
      const sphereGeom = new THREE.SphereGeometry(sample.isBoundary ? 0.12 : 0.08, 16, 16);
      const sphereMat = new THREE.MeshPhongMaterial({
        color: sample.source === 'supplementary' ? 0xffd93d : (sample.isBoundary ? 0xff6b6b : 0x6bcb77)
      });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.set(sample.position.x, sample.position.z, sample.position.y);
      sphere.userData.isSamplePoint = true;
      scene.add(sphere);

      if (sample.normal) {
        const arrow = new THREE.ArrowHelper(
          new THREE.Vector3(sample.normal.x, sample.normal.z, sample.normal.y).normalize(),
          new THREE.Vector3(sample.position.x, sample.position.z, sample.position.y),
          0.5,
          0xffffff,
          0.1,
          0.05
        );
        arrow.userData.isSamplePoint = true;
        scene.add(arrow);
      }
    });

    if (showBoundaries) {
      const boundaryPoints = [
        { x: -2, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 0, y: -2, z: 0 },
        { x: 0, y: 2, z: 0 }
      ];
      boundaryPoints.forEach((p) => {
        const ringGeom = new THREE.RingGeometry(0.2, 0.25, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff9f43, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(p.x, p.y + 4, p.y);
        ring.rotation.x = Math.PI / 2;
        ring.userData.isBoundary = true;
        scene.add(ring);
      });
    }
  }, [surface, showBoundaries]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '500px' }} />;
}
