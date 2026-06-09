import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../stores/appStore';
import { getThicknessColor } from '../../utils/helpers';

export function PointCloud3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const outliersRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });

  const { measurements, selectedMeasurementId, selectMeasurement } = useAppStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A1628);
    scene.fog = new THREE.Fog(0x0A1628, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 40, 80);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x4A90A4, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x7AB8C9, 0.8);
    directionalLight.position.set(20, 50, 30);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(120, 24, 0x1A3A5C, 0x0F2847);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    const planeGeometry = new THREE.PlaneGeometry(120, 120);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x0F2847, transparent: true, opacity: 0.5 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -10.01;
    scene.add(plane);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (cameraRef.current) {
        camera.position.x = Math.sin(rotationVelocityRef.current.y) * 80;
        camera.position.z = Math.cos(rotationVelocityRef.current.y) * 80;
        camera.position.y = 40 + Math.sin(rotationVelocityRef.current.x) * 20;
        camera.lookAt(0, 0, 0);
      }

      if (outliersRef.current) {
        const positions = outliersRef.current.geometry.attributes.position;
        const colors = outliersRef.current.geometry.attributes.color;
        const time = Date.now() * 0.003;
        for (let i = 0; i < positions.count; i++) {
          const y = positions.getY(i);
          positions.setY(i, y + Math.sin(time + i) * 0.3);
        }
        positions.needsUpdate = true;

        const pulse = 0.7 + 0.3 * Math.sin(time * 2);
        for (let i = 0; i < colors.count; i++) {
          colors.setX(i, pulse);
        }
        colors.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;
      rotationVelocityRef.current.y += deltaX * 0.005;
      rotationVelocityRef.current.x += deltaY * 0.005;
      rotationVelocityRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationVelocityRef.current.x));
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current || !pointsRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      
      const intersects = raycaster.intersectObject(pointsRef.current);
      
      if (intersects.length > 0) {
        const index = intersects[0].index;
        if (index !== undefined) {
          const measurementIds = measurements.filter(m => !m.isOutlier || m.outlierReviewStatus === 'approved');
          if (measurementIds[index]) {
            selectMeasurement(measurementIds[index].id);
          }
        }
      }
    };

    animate();
    window.addEventListener('resize', handleResize);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('click', handleClick);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
    }
    if (outliersRef.current) {
      sceneRef.current.remove(outliersRef.current);
      outliersRef.current.geometry.dispose();
    }

    const normalMeasurements = measurements.filter(m => !m.isOutlier || m.outlierReviewStatus === 'rejected');
    const outlierMeasurements = measurements.filter(m => m.isOutlier && m.outlierReviewStatus !== 'rejected');

    const normalGeometry = new THREE.BufferGeometry();
    const normalPositions = new Float32Array(normalMeasurements.length * 3);
    const normalColors = new Float32Array(normalMeasurements.length * 3);

    const allThickness = measurements.map(m => m.thickness);
    const minThickness = Math.min(...allThickness.filter(t => t < 10));
    const maxThickness = Math.max(...allThickness.filter(t => t < 10));

    normalMeasurements.forEach((m, i) => {
      normalPositions[i * 3] = m.x;
      normalPositions[i * 3 + 1] = m.thickness * 10 - 5;
      normalPositions[i * 3 + 2] = m.y;

      const color = new THREE.Color(getThicknessColor(m.thickness, minThickness, maxThickness));
      normalColors[i * 3] = color.r;
      normalColors[i * 3 + 1] = color.g;
      normalColors[i * 3 + 2] = color.b;

      if (selectedMeasurementId === m.id) {
        normalColors[i * 3] = 1;
        normalColors[i * 3 + 1] = 1;
        normalColors[i * 3 + 2] = 0;
      }
    });

    normalGeometry.setAttribute('position', new THREE.BufferAttribute(normalPositions, 3));
    normalGeometry.setAttribute('color', new THREE.BufferAttribute(normalColors, 3));

    const normalMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const normalPoints = new THREE.Points(normalGeometry, normalMaterial);
    sceneRef.current.add(normalPoints);
    pointsRef.current = normalPoints;

    const outlierGeometry = new THREE.BufferGeometry();
    const outlierPositions = new Float32Array(outlierMeasurements.length * 3);
    const outlierColors = new Float32Array(outlierMeasurements.length * 3);

    outlierMeasurements.forEach((m, i) => {
      outlierPositions[i * 3] = m.x;
      outlierPositions[i * 3 + 1] = Math.min(m.thickness * 10 - 5, 50);
      outlierPositions[i * 3 + 2] = m.y;

      outlierColors[i * 3] = 1;
      outlierColors[i * 3 + 1] = 0.28;
      outlierColors[i * 3 + 2] = 0.34;
    });

    outlierGeometry.setAttribute('position', new THREE.BufferAttribute(outlierPositions, 3));
    outlierGeometry.setAttribute('color', new THREE.BufferAttribute(outlierColors, 3));

    const outlierMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    const outlierPoints = new THREE.Points(outlierGeometry, outlierMaterial);
    sceneRef.current.add(outlierPoints);
    outliersRef.current = outlierPoints;
  }, [measurements, selectedMeasurementId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ minHeight: '400px' }}
    />
  );
}
