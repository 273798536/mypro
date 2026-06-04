import { ReviewTask, Annotation, ValidationError, REVIEW_LEVELS } from '@puzzle/shared';

export function validateTaskCompletion(task: ReviewTask): ValidationError[] {
  const errors: ValidationError[] = [];
  const currentLevel = REVIEW_LEVELS.find(l => l.id === task.currentLevelId);
  
  if (!currentLevel) {
    errors.push({
      field: 'currentLevelId',
      message: '无效的关卡ID',
      suggestion: '请重新选择关卡'
    });
    return errors;
  }
  
  const errorAnnotations = task.annotations.filter(a => a.type === 'error');
  const missingScreenshots = errorAnnotations.filter(a => a.screenshotRequired && !a.screenshotPath);
  
  if (missingScreenshots.length > 0) {
    errors.push({
      field: 'annotations.screenshotPath',
      message: `${missingScreenshots.length}个错误标注缺少截图`,
      suggestion: `请为以下标注补充截图：${missingScreenshots.map(a => a.content.substring(0, 15)).join('、')}`,
      missingMaterials: missingScreenshots.map(a => `标注"${a.content}"的截图`)
    });
  }
  
  const missingMaterials = task.materials.filter(m => m.missing);
  if (missingMaterials.length > 0) {
    errors.push({
      field: 'materials',
      message: `${missingMaterials.length}份素材缺失`,
      suggestion: `请上传以下素材：${missingMaterials.map(m => m.name).join('、')}`,
      missingMaterials: missingMaterials.map(m => m.name)
    });
  }
  
  if (task.annotations.length < currentLevel.minAnnotations) {
    errors.push({
      field: 'annotations',
      message: `当前关卡需要至少${currentLevel.minAnnotations}个标注，现有${task.annotations.length}个`,
      suggestion: `请至少添加${currentLevel.minAnnotations - task.annotations.length}个标注`
    });
  }
  
  if (currentLevel.requiresBoundaryFailure) {
    const hasBoundaryFailure = task.annotations.some(a => 
      a.content.includes('边界') || a.content.includes('越界') || a.content.includes('超出范围')
    );
    if (!hasBoundaryFailure) {
      errors.push({
        field: 'annotations',
        message: '当前关卡需要包含一个边界失败场景的标注',
        suggestion: '请添加一个关于边界条件失败的标注，例如"图形超出画布边界"'
      });
    }
  }
  
  if (currentLevel.requiresUndo) {
    const hasUndoAction = task.history.some(h => h.action.type === 'undo');
    if (!hasUndoAction) {
      errors.push({
        field: 'history',
        message: '当前关卡需要执行至少一次撤销操作',
        suggestion: '请使用撤销功能回退上一步操作，然后可重做恢复'
      });
    }
  }
  
  if (!task.conclusion) {
    errors.push({
      field: 'conclusion',
      message: '缺少审核结论',
      suggestion: '请填写审核结论，包括状态、摘要和建议'
    });
  } else {
    if (!task.conclusion.summary || task.conclusion.summary.length < 10) {
      errors.push({
        field: 'conclusion.summary',
        message: '结论摘要过短',
        suggestion: '请填写至少10个字符的结论摘要'
      });
    }
    if (!task.conclusion.recommendations) {
      errors.push({
        field: 'conclusion.recommendations',
        message: '缺少改进建议',
        suggestion: '请填写具体的改进建议'
      });
    }
  }
  
  return errors;
}

export function validateAnnotation(annotation: Partial<Annotation>): ValidationError | null {
  if (!annotation.content || annotation.content.trim().length === 0) {
    return {
      field: 'annotation.content',
      message: '标注内容不能为空',
      suggestion: '请输入标注描述'
    };
  }
  
  if (!annotation.position || typeof annotation.position.x !== 'number' || typeof annotation.position.y !== 'number') {
    return {
      field: 'annotation.position',
      message: '标注位置无效',
      suggestion: '请在画布上点击选择标注位置'
    };
  }
  
  return null;
}

export function validateBoundaryConditions(x: number, y: number, canvasWidth: number, canvasHeight: number): ValidationError | null {
  const margin = 10;
  if (x < margin || x > canvasWidth - margin || y < margin || y > canvasHeight - margin) {
    return {
      field: 'position',
      message: `标注位置(${x}, ${y})超出边界`,
      suggestion: `请在画布范围内(${margin}-${canvasWidth - margin}, ${margin}-${canvasHeight - margin})添加标注`,
      missingMaterials: ['边界参考线素材']
    };
  }
  return null;
}
