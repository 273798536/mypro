import type {
  SceneState,
  ValidationResult,
  ValidationError,
  GeometryObject,
  SectionPlane,
  AnnotationPoint,
  RotationAxis,
} from '@/types';
import {
  doesPlaneIntersectGeometry,
  isPointNearGeometry,
  getAxisLength,
} from './geometry';
import { normalizeAngle } from './helpers';

const MAX_ANGLE = 360;
const MIN_ANGLE = 0;
const ANGLE_WARNING_THRESHOLD = 350;
const MIN_AXIS_LENGTH = 0.1;
const MAX_SCALE = 10;
const MIN_SCALE = 0.1;

const validateGeometry = (geometry: GeometryObject): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (let i = 0; i < 3; i++) {
    if (geometry.scale[i] < MIN_SCALE || geometry.scale[i] > MAX_SCALE) {
      errors.push({
        type: 'geometry_invalid',
        severity: 'warning',
        message: `几何体"${geometry.name || geometry.type}"的缩放比例${
          ['X', 'Y', 'Z'][i]
        }轴(${geometry.scale[i].toFixed(2)})超出合理范围(${MIN_SCALE}-${MAX_SCALE})`,
        objectId: geometry.id,
        suggestion: `建议将${['X', 'Y', 'Z'][i]}轴缩放比例调整到${MIN_SCALE}-${MAX_SCALE}之间`,
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    const normalized = normalizeAngle(geometry.rotation[i] * (180 / Math.PI));
    if (normalized >= ANGLE_WARNING_THRESHOLD) {
      errors.push({
        type: 'angle_out_of_bounds',
        severity: 'warning',
        message: `几何体"${geometry.name || geometry.type}"的旋转角度${
          ['X', 'Y', 'Z'][i]
        }轴(${normalized.toFixed(1)}°)接近360°边界`,
        objectId: geometry.id,
        suggestion: '角度接近边界，建议检查是否为预期设置，避免周期性混淆',
      });
    }
  }

  return errors;
};

const validateRotationAxis = (
  axis: RotationAxis,
  geometries: GeometryObject[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  const length = getAxisLength(axis);
  if (length < MIN_AXIS_LENGTH) {
    errors.push({
      type: 'axis_invalid',
      severity: 'error',
      message: `旋转轴长度过短(${length.toFixed(3)})，可能导致旋转计算错误`,
      objectId: axis.id,
      suggestion: '请调整旋转轴的起点和终点位置，确保轴有足够的长度',
    });
  }

  if (geometries.length > 0) {
    const startNearGeometry = geometries.some((g) =>
      isPointNearGeometry(axis.startPoint, g, 2)
    );
    const endNearGeometry = geometries.some((g) =>
      isPointNearGeometry(axis.endPoint, g, 2)
    );
    if (!startNearGeometry && !endNearGeometry) {
      errors.push({
        type: 'axis_invalid',
        severity: 'warning',
        message: '旋转轴距离所有几何体较远，可能不是预期的旋转中心',
        objectId: axis.id,
        suggestion: '建议将旋转轴放置在几何体附近或穿过几何体',
      });
    }
  }

  return errors;
};

const validateSectionPlane = (
  plane: SectionPlane,
  geometries: GeometryObject[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (geometries.length === 0) {
    return errors;
  }

  const intersectingGeometries = geometries.filter((g) =>
    doesPlaneIntersectGeometry(plane, g)
  );

  if (intersectingGeometries.length === 0) {
    errors.push({
      type: 'section_missing',
      severity: 'error',
      message: '截面平面未与任何几何体相交，无法生成截面',
      objectId: plane.id,
      suggestion:
        '请调整截面平面的位置或方向，使其与至少一个几何体相交。可以移动平面位置或旋转平面法向量。',
    });
  } else if (intersectingGeometries.length < geometries.length) {
    const missingNames = geometries
      .filter((g) => !doesPlaneIntersectGeometry(plane, g))
      .map((g) => g.name || g.type)
      .join('、');
    errors.push({
      type: 'section_missing',
      severity: 'warning',
      message: `截面平面未与以下几何体相交: ${missingNames}`,
      objectId: plane.id,
      suggestion: '如果需要这些几何体的截面，请调整平面位置',
    });
  }

  const normalLength = Math.sqrt(
    plane.normal[0] ** 2 + plane.normal[1] ** 2 + plane.normal[2] ** 2
  );
  if (normalLength < 0.99 || normalLength > 1.01) {
    errors.push({
      type: 'section_missing',
      severity: 'warning',
      message: '截面平面法向量未归一化，可能影响截面计算精度',
      objectId: plane.id,
      suggestion: '建议将法向量归一化为单位向量',
    });
  }

  return errors;
};

const validateAnnotation = (
  annotation: AnnotationPoint,
  geometries: GeometryObject[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (geometries.length === 0) {
    return errors;
  }

  const nearGeometry = geometries.find((g) =>
    isPointNearGeometry(annotation.position, g, 0.5)
  );

  if (!nearGeometry) {
    errors.push({
      type: 'annotation_misplaced',
      severity: 'warning',
      message: `标注"${annotation.label}"距离所有几何体较远`,
      objectId: annotation.id,
      suggestion: '建议将标注点放置在几何体表面或附近，便于学生理解标注对象',
    });
  } else if (annotation.connectedTo && annotation.connectedTo !== nearGeometry.id) {
    const connectedGeometry = geometries.find((g) => g.id === annotation.connectedTo);
    if (connectedGeometry) {
      errors.push({
        type: 'annotation_misplaced',
        severity: 'warning',
        message: `标注"${annotation.label}"关联的几何体"${
          connectedGeometry.name || connectedGeometry.type
        }"与实际位置不匹配`,
        objectId: annotation.id,
        suggestion:
          '标注位置与关联几何体不符，建议更新关联关系或调整标注位置',
      });
    }
  }

  if (!annotation.label.trim()) {
    errors.push({
      type: 'annotation_misplaced',
      severity: 'warning',
      message: '标注点缺少标签文字',
      objectId: annotation.id,
      suggestion: '建议为标注点添加有意义的标签，如"A点"、"顶点"等',
    });
  }

  return errors;
};

export const validateScene = (scene: SceneState): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  scene.geometries.forEach((geometry) => {
    if (!geometry.visible) return;
    const geometryErrors = validateGeometry(geometry);
    geometryErrors.forEach((e) => {
      if (e.severity === 'error') {
        errors.push(e);
      } else {
        warnings.push(e);
      }
    });
  });

  scene.rotationAxes.forEach((axis) => {
    if (!axis.visible) return;
    const axisErrors = validateRotationAxis(axis, scene.geometries);
    axisErrors.forEach((e) => {
      if (e.severity === 'error') {
        errors.push(e);
      } else {
        warnings.push(e);
      }
    });
  });

  scene.sectionPlanes.forEach((plane) => {
    if (!plane.visible) return;
    const planeErrors = validateSectionPlane(plane, scene.geometries);
    planeErrors.forEach((e) => {
      if (e.severity === 'error') {
        errors.push(e);
      } else {
        warnings.push(e);
      }
    });
  });

  scene.annotations.forEach((annotation) => {
    if (!annotation.visible) return;
    const annotationErrors = validateAnnotation(annotation, scene.geometries);
    annotationErrors.forEach((e) => {
      if (e.severity === 'error') {
        errors.push(e);
      } else {
        warnings.push(e);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const getErrorColor = (severity: 'error' | 'warning'): string => {
  return severity === 'error' ? '#ef4444' : '#f97316';
};

export const getErrorIcon = (type: string): string => {
  switch (type) {
    case 'section_missing':
      return '⚠️';
    case 'angle_out_of_bounds':
      return '🔄';
    case 'annotation_misplaced':
      return '📍';
    case 'axis_invalid':
      return '📏';
    case 'geometry_invalid':
      return '📦';
    default:
      return '❓';
  }
};
