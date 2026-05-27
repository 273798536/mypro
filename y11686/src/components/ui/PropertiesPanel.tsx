import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';
import { useStore } from '@/store';
import { radToDeg, degToRad } from '@/utils/helpers';
import type {
  GeometryObject,
  RotationAxis,
  SectionPlane,
  AnnotationPoint,
} from '@/types';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-medium">{title}</span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function SliderInput({ label, value, min, max, step = 0.1, onChange, unit = '' }: SliderInputProps) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/70">{label}</span>
        <span className="text-white/90">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="range"
          className="slider flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <input
          type="number"
          className="input-number w-20 text-center"
          value={value.toFixed(2)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
        />
      </div>
    </div>
  );
}

interface Vector3InputProps {
  label: string;
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  isAngle?: boolean;
}

function Vector3Input({ label, value, onChange, min = -10, max = 10, step = 0.1, isAngle = false }: Vector3InputProps) {
  const displayValue = isAngle
    ? ([radToDeg(value[0]), radToDeg(value[1]), radToDeg(value[2])] as [number, number, number])
    : value;

  const handleChange = (index: number, newValue: number) => {
    const newVal = [...value] as [number, number, number];
    if (isAngle) {
      newVal[index] = degToRad(newValue);
    } else {
      newVal[index] = newValue;
    }
    onChange(newVal);
  };

  return (
    <div>
      <div className="text-xs text-white/70 mb-1">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="flex items-center gap-1">
            <span className="text-[10px] text-white/50 w-3">{axis}</span>
            <input
              type="number"
              className="input-number flex-1 text-center text-xs py-1"
              value={displayValue[i].toFixed(2)}
              onChange={(e) => handleChange(i, parseFloat(e.target.value) || 0)}
              min={isAngle ? 0 : min}
              max={isAngle ? 360 : max}
              step={step}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function GeometryProperties({ geometry }: { geometry: GeometryObject }) {
  const { updateGeometry, removeGeometry } = useStore();

  return (
    <>
      <Section title="基本属性">
        <div>
          <label className="text-xs text-white/70 mb-1 block">名称</label>
          <input
            type="text"
            className="input-number"
            value={geometry.name || geometry.type}
            onChange={(e) => updateGeometry(geometry.id, { name: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary flex-1 text-xs"
            onClick={() => updateGeometry(geometry.id, { visible: !geometry.visible })}
          >
            {geometry.visible ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="ml-1">{geometry.visible ? '隐藏' : '显示'}</span>
          </button>
          <button
            className="btn btn-danger text-xs"
            onClick={() => removeGeometry(geometry.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Section>

      <Section title="位置">
        <Vector3Input
          label="坐标"
          value={geometry.position}
          onChange={(pos) => updateGeometry(geometry.id, { position: pos })}
        />
      </Section>

      <Section title="旋转">
        <Vector3Input
          label="角度 (°)"
          value={geometry.rotation}
          onChange={(rot) => updateGeometry(geometry.id, { rotation: rot })}
          isAngle
        />
      </Section>

      <Section title="缩放">
        <Vector3Input
          label="比例"
          value={geometry.scale}
          onChange={(scale) => updateGeometry(geometry.id, { scale })}
          min={0.1}
          max={10}
          step={0.1}
        />
      </Section>

      <Section title="外观">
        <div>
          <label className="text-xs text-white/70 mb-1 block flex items-center gap-2">
            <Palette size={14} /> 颜色
          </label>
          <input
            type="color"
            className="w-full h-8 rounded cursor-pointer bg-transparent"
            value={geometry.color}
            onChange={(e) => updateGeometry(geometry.id, { color: e.target.value })}
          />
        </div>
        <SliderInput
          label="透明度"
          value={geometry.opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(opacity) => updateGeometry(geometry.id, { opacity })}
        />
      </Section>
    </>
  );
}

function AxisProperties({ axis }: { axis: RotationAxis }) {
  const { updateRotationAxis, removeRotationAxis } = useStore();

  return (
    <>
      <Section title="旋转轴属性">
        <div className="flex gap-2">
          <button
            className="btn btn-secondary flex-1 text-xs"
            onClick={() => updateRotationAxis(axis.id, { visible: !axis.visible })}
          >
            {axis.visible ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="ml-1">{axis.visible ? '隐藏' : '显示'}</span>
          </button>
          <button
            className="btn btn-danger text-xs"
            onClick={() => removeRotationAxis(axis.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Section>

      <Section title="起点">
        <Vector3Input
          label="坐标"
          value={axis.startPoint}
          onChange={(pos) => updateRotationAxis(axis.id, { startPoint: pos })}
        />
      </Section>

      <Section title="终点">
        <Vector3Input
          label="坐标"
          value={axis.endPoint}
          onChange={(pos) => updateRotationAxis(axis.id, { endPoint: pos })}
        />
      </Section>

      <Section title="外观">
        <div>
          <label className="text-xs text-white/70 mb-1 block">颜色</label>
          <input
            type="color"
            className="w-full h-8 rounded cursor-pointer bg-transparent"
            value={axis.color}
            onChange={(e) => updateRotationAxis(axis.id, { color: e.target.value })}
          />
        </div>
      </Section>
    </>
  );
}

function PlaneProperties({ plane }: { plane: SectionPlane }) {
  const { updateSectionPlane, removeSectionPlane } = useStore();

  return (
    <>
      <Section title="截面属性">
        <div className="flex gap-2">
          <button
            className="btn btn-secondary flex-1 text-xs"
            onClick={() => updateSectionPlane(plane.id, { visible: !plane.visible })}
          >
            {plane.visible ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="ml-1">{plane.visible ? '隐藏' : '显示'}</span>
          </button>
          <button
            className="btn btn-danger text-xs"
            onClick={() => removeSectionPlane(plane.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="showIntersection"
            checked={plane.showIntersection}
            onChange={(e) => updateSectionPlane(plane.id, { showIntersection: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="showIntersection" className="text-sm">
            显示交线
          </label>
        </div>
      </Section>

      <Section title="位置">
        <Vector3Input
          label="平面位置"
          value={plane.position}
          onChange={(pos) => updateSectionPlane(plane.id, { position: pos })}
        />
      </Section>

      <Section title="法向量">
        <Vector3Input
          label="法线方向"
          value={plane.normal}
          onChange={(normal) => {
            const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
            if (len > 0) {
              updateSectionPlane(plane.id, {
                normal: [normal[0] / len, normal[1] / len, normal[2] / len] as [number, number, number],
              });
            }
          }}
          min={-1}
          max={1}
        />
      </Section>

      <Section title="外观">
        <div>
          <label className="text-xs text-white/70 mb-1 block">交线颜色</label>
          <input
            type="color"
            className="w-full h-8 rounded cursor-pointer bg-transparent"
            value={plane.intersectionColor}
            onChange={(e) => updateSectionPlane(plane.id, { intersectionColor: e.target.value })}
          />
        </div>
      </Section>
    </>
  );
}

function AnnotationProperties({ annotation }: { annotation: AnnotationPoint }) {
  const { updateAnnotation, removeAnnotation } = useStore();

  return (
    <>
      <Section title="标注属性">
        <div>
          <label className="text-xs text-white/70 mb-1 block">标签</label>
          <input
            type="text"
            className="input-number"
            value={annotation.label}
            onChange={(e) => updateAnnotation(annotation.id, { label: e.target.value })}
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className="btn btn-secondary flex-1 text-xs"
            onClick={() => updateAnnotation(annotation.id, { visible: !annotation.visible })}
          >
            {annotation.visible ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="ml-1">{annotation.visible ? '隐藏' : '显示'}</span>
          </button>
          <button
            className="btn btn-danger text-xs"
            onClick={() => removeAnnotation(annotation.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </Section>

      <Section title="位置">
        <Vector3Input
          label="坐标"
          value={annotation.position}
          onChange={(pos) => updateAnnotation(annotation.id, { position: pos })}
        />
      </Section>

      <Section title="外观">
        <div>
          <label className="text-xs text-white/70 mb-1 block">颜色</label>
          <input
            type="color"
            className="w-full h-8 rounded cursor-pointer bg-transparent"
            value={annotation.color}
            onChange={(e) => updateAnnotation(annotation.id, { color: e.target.value })}
          />
        </div>
      </Section>
    </>
  );
}

export function PropertiesPanel() {
  const { currentScenario, selectedObjectId } = useStore();

  if (!currentScenario) {
    return (
      <div className="absolute right-4 top-4 z-20 w-72">
        <div className="panel p-4">
          <p className="text-sm text-white/50 text-center">
            请先创建或加载一个场景
          </p>
        </div>
      </div>
    );
  }

  const selectedGeometry = currentScenario.scene.geometries.find((g) => g.id === selectedObjectId);
  const selectedAxis = currentScenario.scene.rotationAxes.find((a) => a.id === selectedObjectId);
  const selectedPlane = currentScenario.scene.sectionPlanes.find((p) => p.id === selectedObjectId);
  const selectedAnnotation = currentScenario.scene.annotations.find((a) => a.id === selectedObjectId);

  return (
    <div className="absolute right-4 top-4 z-20 w-80 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="panel">
        <div className="panel-header">属性面板</div>
        <div className="panel-content">
          {selectedGeometry && <GeometryProperties geometry={selectedGeometry} />}
          {selectedAxis && <AxisProperties axis={selectedAxis} />}
          {selectedPlane && <PlaneProperties plane={selectedPlane} />}
          {selectedAnnotation && <AnnotationProperties annotation={selectedAnnotation} />}
          {!selectedObjectId && (
            <p className="text-sm text-white/50 text-center py-4">
              点击选择场景中的对象以编辑属性
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
