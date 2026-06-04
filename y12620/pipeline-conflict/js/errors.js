const ERROR_CATALOG = {
  NO_FILE: {
    title: '未选择文件',
    action: '请选择一张管网截图（PNG/JPG/BMP）后重试。'
  },
  INVALID_FORMAT: {
    title: '文件格式不支持',
    action: '请使用 PNG、JPG、BMP 或 WebP 格式的截图。'
  },
  CORRUPT_IMAGE: {
    title: '图片无法解析',
    action: '文件已损坏或不是有效的图片，请重新导出截图。'
  },
  READ_FAILED: {
    title: '文件读取失败',
    action: '浏览器无法读取该文件，请检查文件权限或换一张图片。'
  },
  NO_SCALE_BAR: {
    title: '未检测到比例尺',
    action: '可能原因：截图边缘被裁剪、比例尺颜色与背景对比度不足、或原图未标注比例尺。请在原图中添加比例尺后重新导入。'
  },
  COORDINATE_FLIP: {
    title: '坐标系疑似翻转',
    action: 'Y轴坐标出现负值，可能是绘图软件坐标系方向不同。请在导入设置中勾选"Y轴翻转"，或联系数据提供方确认坐标系。'
  },
  COORDINATE_OUT_OF_BOUNDS: {
    title: '坐标超出图纸范围',
    action: '管线坐标超出图纸边界，可能是数据录入错误或图纸尺寸参数不正确。请核实图纸尺寸设置与原始数据。'
  },
  MISSING_COLOR_RULE: {
    title: '缺少颜色规则',
    action: '请在颜色规则配置中为未知管线类型添加对应颜色和名称。当前可用类型可在"管线类型"面板中查看。'
  },
  INVALID_REPLAY: {
    title: '复盘数据格式无效',
    action: '文件不是有效的复盘记录，请确认文件来源并检查是否为 .json 格式。'
  },
  PARSE_FAILED: {
    title: '文件解析失败',
    action: '文件内容不是合法的JSON格式，请检查文件是否损坏或被篡改。'
  },
  NO_RECORD_LOADED: {
    title: '未加载记录',
    action: '请先导入管网数据或加载样例记录后，再执行此操作。'
  },
  UNKNOWN: {
    title: '未知错误',
    action: '发生了预期之外的错误，请刷新页面重试。如果问题持续，请记录操作步骤并反馈给技术支持。'
  }
};

function formatError(error) {
  if (!error) return { title: '未知错误', action: ERROR_CATALOG.UNKNOWN.action, isActionable: true };

  if (error.isActionable) {
    return error;
  }

  const code = error.code || error.name || 'UNKNOWN';
  const catalog = ERROR_CATALOG[code];
  if (catalog) {
    return { ...catalog, code, isActionable: true, detail: error.message || '' };
  }

  return {
    code,
    title: error.message || error.title || '操作失败',
    action: ERROR_CATALOG.UNKNOWN.action,
    isActionable: true
  };
}

function showError(container, error) {
  const info = formatError(error);
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'error-message';
  div.innerHTML = `
    <div class="error-icon">⚠️</div>
    <div class="error-title">${info.title}</div>
    <div class="error-action">${info.action}</div>
    ${info.detail ? `<div class="error-detail">${info.detail}</div>` : ''}
  `;
  container.appendChild(div);
  container.style.display = 'block';
}

function clearError(container) {
  container.innerHTML = '';
  container.style.display = 'none';
}

export { ERROR_CATALOG, formatError, showError, clearError };
