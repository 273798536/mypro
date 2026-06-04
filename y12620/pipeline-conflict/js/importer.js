import { COLOR_RULES, MIN_SAFE_DISTANCE_MM } from './sample-data.js';

class Importer {
  constructor() {
    this.colorRules = { ...COLOR_RULES };
  }

  importImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(this._makeError('NO_FILE', '未选择文件', '请选择一张管网截图（PNG/JPG/BMP）后重试。'));
        return;
      }
      const validTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        reject(this._makeError('INVALID_FORMAT', '文件格式不支持', `当前文件格式为 "${file.type}"，请使用 PNG、JPG、BMP 或 WebP 格式的截图。`));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: e.target.result,
            width: img.naturalWidth,
            height: img.naturalHeight,
            fileName: file.name
          });
        };
        img.onerror = () => {
          reject(this._makeError('CORRUPT_IMAGE', '图片无法解析', '文件已损坏或不是有效的图片，请重新导出截图。'));
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(this._makeError('READ_FAILED', '文件读取失败', '浏览器无法读取该文件，请检查文件权限或换一张图片。'));
      };
      reader.readAsDataURL(file);
    });
  }

  validateColorRules(record) {
    const missing = [];
    const unknown = [];
    record.pipelines.forEach(pipe => {
      if (!this.colorRules[pipe.type]) {
        unknown.push(pipe.type);
      }
    });
    const allTypes = Object.keys(this.colorRules);
    if (unknown.length > 0) {
      missing.push({
        rule: 'color',
        message: `以下管线类型缺少颜色规则：${unknown.join('、')}。请在颜色规则配置中添加对应条目。`,
        availableTypes: allTypes,
        missingTypes: unknown
      });
    }
    return missing;
  }

  detectScale(imageData, width, height) {
    const barRegion = this._findScaleBarRegion(imageData, width, height);
    if (!barRegion) {
      return {
        detected: false,
        valid: false,
        error: '未检测到比例尺标尺。可能原因：截图边缘被裁剪、比例尺颜色与背景对比度不足、或原图未标注比例尺。请在原图中添加比例尺后重新导入。'
      };
    }
    return {
      detected: true,
      barPixels: barRegion.length,
      barRealMm: 5000,
      ratio: 5000 / barRegion.length,
      unit: 'mm/px',
      valid: true
    };
  }

  validateCoordinates(record) {
    const issues = [];
    const w = record.source.imageWidth || 2400;
    const h = record.source.imageHeight || 1600;
    record.pipelines.forEach(pipe => {
      pipe.points.forEach((pt, idx) => {
        if (pt[0] < 0 || pt[1] < 0) {
          issues.push({
            pipeline: pipe.label,
            pointIndex: idx,
            coord: pt,
            issue: 'coordinate_negative',
            message: `${pipe.label} 第${idx + 1}个点坐标为负值 (${pt[0]}, ${pt[1]})，疑似坐标系翻转或数据录入错误。`
          });
        }
        if (pt[0] > w || pt[1] > h) {
          issues.push({
            pipeline: pipe.label,
            pointIndex: idx,
            coord: pt,
            issue: 'coordinate_out_of_bounds',
            message: `${pipe.label} 第${idx + 1}个点坐标 (${pt[0]}, ${pt[1]}) 超出图纸范围 (${w}×${h})，数据异常。`
          });
        }
      });
    });
    return issues;
  }

  checkProximity(record) {
    const conflicts = [];
    const pipes = record.pipelines;
    for (let i = 0; i < pipes.length; i++) {
      for (let j = i + 1; j < pipes.length; j++) {
        const minDist = this._minDistanceBetweenPipes(pipes[i], pipes[j], record.scale);
        if (minDist !== null && minDist.distance < MIN_SAFE_DISTANCE_MM) {
          conflicts.push({
            id: `CF-PROX-${i}-${j}`,
            pipelines: [pipes[i].label, pipes[j].label],
            type: 'proximity',
            severity: 'warning',
            location: minDist.midpoint,
            message: `${pipes[i].label} 与 ${pipes[j].label} 间距仅 ${minDist.distance.toFixed(0)}mm，低于安全距离 ${MIN_SAFE_DISTANCE_MM}mm，需确认。`
          });
        }
      }
    }
    return conflicts;
  }

  _minDistanceBetweenPipes(p1, p2, scale) {
    let minDist = Infinity;
    let midpoint = null;
    const ratio = scale && scale.ratio ? scale.ratio : 1;
    for (let i = 0; i < p1.points.length - 1; i++) {
      for (let j = 0; j < p2.points.length - 1; j++) {
        const d = this._segmentDist(p1.points[i], p1.points[i + 1], p2.points[j], p2.points[j + 1]);
        if (d.distance < minDist) {
          minDist = d.distance;
          midpoint = d.midpoint;
        }
      }
    }
    if (minDist === Infinity) return null;
    return { distance: minDist * ratio, midpoint };
  }

  _segmentDist(a1, a2, b1, b2) {
    const d1 = this._pointToSegmentDist(a1, b1, b2);
    const d2 = this._pointToSegmentDist(a2, b1, b2);
    const d3 = this._pointToSegmentDist(b1, a1, a2);
    const d4 = this._pointToSegmentDist(b2, a1, a2);
    let best = d1;
    if (d2.distance < best.distance) best = d2;
    if (d3.distance < best.distance) best = d3;
    if (d4.distance < best.distance) best = d4;
    return best;
  }

  _pointToSegmentDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
    }
    const projX = a[0] + t * dx;
    const projY = a[1] + t * dy;
    const dist = Math.sqrt((p[0] - projX) ** 2 + (p[1] - projY) ** 2);
    return {
      distance: dist,
      midpoint: [(p[0] + projX) / 2, (p[1] + projY) / 2]
    };
  }

  _findScaleBarRegion(imageData, width, height) {
    return null;
  }

  _makeError(code, title, action) {
    return { code, title, action, isActionable: true };
  }
}

export default Importer;
