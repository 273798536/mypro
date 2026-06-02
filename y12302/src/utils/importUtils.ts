import type { FileType, DataSource } from '../types';

export interface ParsedOrganResult {
  name: string;
  fileType: FileType;
  filePath: string;
  vertexCount: number;
  faceCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  size: [number, number, number];
  center: [number, number, number];
  shapeType: 'sphere' | 'box' | 'cylinder' | 'ellipsoid';
}

export interface ParsedDoseResult {
  name: string;
  fileType: FileType;
  filePath: string;
  minDose: number;
  maxDose: number;
  meanDose: number;
  threshold: number;
  gridSize: [number, number, number];
  spacing: [number, number, number];
}

export interface ImportError {
  file: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  organ?: ParsedOrganResult;
  dose?: ParsedDoseResult;
  errors: ImportError[];
  warnings: string[];
}

const ORGAN_EXTENSIONS = ['.obj', '.stl'];
const DOSE_EXTENSIONS = ['.dcm', '.nrrd'];
const ALL_EXTENSIONS = [...ORGAN_EXTENSIONS, ...DOSE_EXTENSIONS];

export const getFileExtension = (filename: string): string => {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
};

export const getFileType = (filename: string): FileType | null => {
  const ext = getFileExtension(filename);
  if (ALL_EXTENSIONS.includes(ext)) {
    return ext.replace('.', '') as FileType;
  }
  return null;
};

export const isOrganFile = (filename: string): boolean => {
  return ORGAN_EXTENSIONS.includes(getFileExtension(filename));
};

export const isDoseFile = (filename: string): boolean => {
  return DOSE_EXTENSIONS.includes(getFileExtension(filename));
};

export const isSupportedFile = (filename: string): boolean => {
  return getFileType(filename) !== null;
};

export const inferNameFromFilename = (filename: string): string => {
  const name = filename.replace(/\.[^.]+$/, '');
  return name
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

export const inferVersionFromFilename = (filename: string): string => {
  const versionMatch = filename.match(/[vV](\d+(?:\.\d+)*)/);
  if (versionMatch) return `v${versionMatch[1]}`;
  const revMatch = filename.match(/[_-]r(\d+)/i);
  if (revMatch) return `v1.${revMatch[1]}`;
  return 'v1.0';
};

export const inferSourceFromFilename = (filename: string): DataSource => {
  if (/processed|modified|corrected|edited|fix/i.test(filename)) return 'processed';
  if (/original|raw|base|primary/i.test(filename)) return 'original';
  return 'original';
};

const ORGAN_COLORS = [
  '#4299e1', '#ed8936', '#48bb78', '#9f7aea',
  '#f56565', '#38b2ac', '#d69e2e', '#e53e3e',
  '#667eea', '#ed64a6', '#48bb78', '#4fd1c5',
];

let colorIndex = 0;
export const getNextOrganColor = (): string => {
  const color = ORGAN_COLORS[colorIndex % ORGAN_COLORS.length];
  colorIndex++;
  return color;
};

export const parseOBJ = (content: string, filename: string): ParsedOrganResult => {
  const lines = content.split('\n');
  let vertexCount = 0;
  let faceCount = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('v ')) {
      vertexCount++;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }
      }
    } else if (trimmed.startsWith('f ')) {
      faceCount++;
    }
  }

  if (vertexCount === 0) {
    throw new Error(`OBJ文件 "${filename}" 不包含顶点数据`);
  }

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const maxDim = Math.max(sizeX, sizeY, sizeZ);
  const minDim = Math.min(sizeX, sizeY, sizeZ);
  const ratio = maxDim > 0 ? minDim / maxDim : 1;
  let shapeType: ParsedOrganResult['shapeType'] = 'ellipsoid';
  if (ratio > 0.85) shapeType = 'sphere';
  else if (sizeY > sizeX * 2 && sizeY > sizeZ * 2) shapeType = 'cylinder';

  return {
    name: inferNameFromFilename(filename),
    fileType: 'obj',
    filePath: filename,
    vertexCount,
    faceCount,
    boundingBox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    },
    size: [sizeX, sizeY, sizeZ],
    center: [centerX, centerY, centerZ],
    shapeType,
  };
};

export const parseSTL = (buffer: ArrayBuffer, filename: string): ParsedOrganResult => {
  const dataView = new DataView(buffer);
  const isASCII = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength))).startsWith('solid') &&
    new TextDecoder().decode(new Uint8Array(buffer)).includes('facet');

  let vertexCount = 0;
  let faceCount = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  if (isASCII) {
    const text = new TextDecoder().decode(new Uint8Array(buffer));
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('vertex')) {
        vertexCount++;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
          }
        }
      } else if (trimmed.startsWith('facet normal')) {
        faceCount++;
      }
    }
  } else {
    if (buffer.byteLength < 84) {
      throw new Error(`STL文件 "${filename}" 二进制格式数据不完整`);
    }
    faceCount = dataView.getUint32(80, true);
    const expectedSize = 84 + faceCount * 50;
    if (buffer.byteLength < expectedSize) {
      throw new Error(`STL文件 "${filename}" 二进制格式数据截断：期望 ${expectedSize} 字节，实际 ${buffer.byteLength} 字节`);
    }

    let offset = 84;
    for (let i = 0; i < faceCount && offset + 50 <= buffer.byteLength; i++) {
      offset += 12;
      for (let v = 0; v < 3; v++) {
        const x = dataView.getFloat32(offset, true); offset += 4;
        const y = dataView.getFloat32(offset, true); offset += 4;
        const z = dataView.getFloat32(offset, true); offset += 4;
        vertexCount++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      offset += 2;
    }
  }

  if (vertexCount === 0) {
    throw new Error(`STL文件 "${filename}" 不包含顶点数据`);
  }

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const maxDim = Math.max(sizeX, sizeY, sizeZ);
  const minDim = Math.min(sizeX, sizeY, sizeZ);
  const ratio = maxDim > 0 ? minDim / maxDim : 1;
  let shapeType: ParsedOrganResult['shapeType'] = 'ellipsoid';
  if (ratio > 0.85) shapeType = 'sphere';
  else if (sizeY > sizeX * 2 && sizeY > sizeZ * 2) shapeType = 'cylinder';

  return {
    name: inferNameFromFilename(filename),
    fileType: 'stl',
    filePath: filename,
    vertexCount,
    faceCount,
    boundingBox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    },
    size: [sizeX, sizeY, sizeZ],
    center: [centerX, centerY, centerZ],
    shapeType,
  };
};

export const parseDCM = (buffer: ArrayBuffer, filename: string): ParsedDoseResult => {
  const bytes = new Uint8Array(buffer);
  const byteLength = bytes.byteLength;

  if (byteLength < 132) {
    throw new Error(`DICOM文件 "${filename}" 数据不完整（少于132字节）`);
  }

  const preamble = new TextDecoder().decode(bytes.slice(128, 132));
  if (preamble !== 'DICM') {
    const hasDicomTags = byteLength > 8 &&
      (bytes[0] === 0x08 && bytes[1] === 0x00) ||
      (bytes[0] === 0x02 && bytes[1] === 0x00);

    if (!hasDicomTags) {
      throw new Error(`文件 "${filename}" 不是有效的DICOM格式（缺少DICM前缀）`);
    }
  }

  let minDose = Infinity;
  let maxDose = -Infinity;
  let doseSum = 0;
  let doseCount = 0;
  let rows = 0;
  let columns = 0;
  let sliceCount = 1;
  let pixelSpacingX = 1.0;
  let pixelSpacingY = 1.0;
  let sliceThickness = 1.0;

  let offset = preamble === 'DICM' ? 132 : 0;

  const readTag = (): [number, number] | null => {
    if (offset + 4 > byteLength) return null;
    const group = bytes[offset] | (bytes[offset + 1] << 8);
    const element = bytes[offset + 2] | (bytes[offset + 3] << 8);
    offset += 4;
    return [group, element];
  };

  const readVR = (): string => {
    if (offset + 2 > byteLength) return 'UN';
    const vr = String.fromCharCode(bytes[offset], bytes[offset + 1]);
    offset += 2;
    return vr;
  };

  const readLength = (vr: string): number => {
    if (['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UI', 'UN', 'UR', 'UT'].includes(vr)) {
      offset += 2;
      if (offset + 4 > byteLength) return 0;
      const len = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
      offset += 4;
      return len;
    }
    if (offset + 2 > byteLength) return 0;
    const len = bytes[offset] | (bytes[offset + 1] << 8);
    offset += 2;
    return len;
  };

  let foundPixelData = false;

  while (offset < byteLength - 8) {
    const tag = readTag();
    if (!tag) break;
    const [group, element] = tag;

    if (group === 0x7FE0 && element === 0x0010) {
      foundPixelData = true;
      const vr = readVR();
      const length = readLength(vr);

      const pixelDataStart = offset;
      const pixelDataEnd = length > 0 && length < byteLength - offset ? offset + length : byteLength;

      const floatView = new Float32Array(buffer, pixelDataStart, Math.floor((pixelDataEnd - pixelDataStart) / 4));
      for (let i = 0; i < floatView.length; i++) {
        const val = floatView[i];
        if (isFinite(val)) {
          if (val < minDose) minDose = val;
          if (val > maxDose) maxDose = val;
          doseSum += val;
          doseCount++;
        }
      }

      if (floatView.length === 0) {
        const intView = new Int16Array(buffer, pixelDataStart, Math.floor((pixelDataEnd - pixelDataStart) / 2));
        for (let i = 0; i < intView.length; i++) {
          const val = intView[i];
          if (val < minDose) minDose = val;
          if (val > maxDose) maxDose = val;
          doseSum += val;
          doseCount++;
        }
      }

      break;
    }

    if (group === 0x0028) {
      const vr = readVR();
      const length = readLength(vr);
      if (element === 0x0010 && length === 2) {
        rows = bytes[offset] | (bytes[offset + 1] << 8);
      } else if (element === 0x0011 && length === 2) {
        columns = bytes[offset] | (bytes[offset + 1] << 8);
      } else if (element === 0x0030 && length > 0) {
        const spacingStr = new TextDecoder().decode(bytes.slice(offset, offset + length));
        const parts = spacingStr.split('\\');
        if (parts.length >= 2) {
          pixelSpacingY = parseFloat(parts[0]) || 1.0;
          pixelSpacingX = parseFloat(parts[1]) || 1.0;
        }
      } else if (element === 0x0050 && length > 0) {
        const thickStr = new TextDecoder().decode(bytes.slice(offset, offset + length));
        sliceThickness = parseFloat(thickStr) || 1.0;
      }
      offset += length;
    } else if (group === 0x5200 || group === 0x0002 || group === 0x0004) {
      const vr = readVR();
      const length = readLength(vr);
      offset += length;
    } else {
      const vr = readVR();
      const length = readLength(vr);
      offset += length;
    }

    if (offset > byteLength) break;
  }

  if (!foundPixelData || doseCount === 0) {
    throw new Error(`DICOM文件 "${filename}" 无法读取像素数据（未找到 (7FE0,0010) 标签或无有效剂量值）`);
  }

  if (!rows || !columns) {
    throw new Error(`DICOM文件 "${filename}" 缺少图像尺寸信息（Rows/Columns 标签）`);
  }

  const meanDose = doseSum / doseCount;

  if (!isFinite(minDose) || !isFinite(maxDose) || !isFinite(meanDose)) {
    throw new Error(`DICOM文件 "${filename}" 包含无效的剂量值（NaN 或 Infinity）`);
  }

  if (minDose < 0 || maxDose < 0 || meanDose < 0) {
    throw new Error(`DICOM文件 "${filename}" 包含负数剂量值，剂量数据必须为非负数`);
  }

  if (maxDose === 0) {
    throw new Error(`DICOM文件 "${filename}" 最大剂量为0，可能不是有效的剂量文件`);
  }

  const threshold = Math.round(maxDose * 0.9 * 10) / 10;

  return {
    name: inferNameFromFilename(filename),
    fileType: 'dcm',
    filePath: filename,
    minDose: Math.round(minDose * 10) / 10,
    maxDose: Math.round(maxDose * 10) / 10,
    meanDose: Math.round(meanDose * 10) / 10,
    threshold,
    gridSize: [columns, rows, sliceCount],
    spacing: [pixelSpacingX, pixelSpacingY, sliceThickness],
  };
};

export const parseNRRD = (buffer: ArrayBuffer, filename: string): ParsedDoseResult => {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder().decode(bytes.slice(0, Math.min(4096, bytes.byteLength)));

  if (!text.startsWith('NRRD')) {
    throw new Error(`文件 "${filename}" 不是有效的NRRD格式`);
  }

  const headerEnd = text.indexOf('\n\n');
  if (headerEnd < 0) {
    throw new Error(`NRRD文件 "${filename}" 头部格式错误（缺少数据分隔符）`);
  }

  const headerText = text.slice(0, headerEnd);
  const headerLines = headerText.split('\n');

  let dataType = '';
  let sizes: number[] = [];
  let spacings = [1.0, 1.0, 1.0];

  for (const line of headerLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('NRRD')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    switch (key) {
      case 'type':
        dataType = val.toLowerCase();
        break;
      case 'sizes':
        sizes = val.split(/\s+/).map(Number);
        break;
      case 'spacings':
        spacings = val.split(/\s+/).map(Number);
        break;
    }
  }

  let dataOffset = headerEnd + 2;
  const lineSep = text.slice(headerEnd, headerEnd + 4);
  if (lineSep.includes('\r\n\r\n')) dataOffset = headerEnd + 4;

  const pixelData = buffer.slice(dataOffset);
  let minDose = Infinity;
  let maxDose = -Infinity;
  let doseSum = 0;
  let doseCount = 0;

  if (dataType === 'float' || dataType === 'float32' || dataType === 'double') {
    const view = new Float32Array(pixelData);
    for (let i = 0; i < view.length; i++) {
      const val = view[i];
      if (isFinite(val)) {
        if (val < minDose) minDose = val;
        if (val > maxDose) maxDose = val;
        doseSum += val;
        doseCount++;
      }
    }
  } else if (dataType === 'short' || dataType === 'int16' || dataType === 'int16') {
    const view = new Int16Array(pixelData);
    for (let i = 0; i < view.length; i++) {
      const val = view[i];
      if (val < minDose) minDose = val;
      if (val > maxDose) maxDose = val;
      doseSum += val;
      doseCount++;
    }
  } else {
    const view = new Float32Array(pixelData);
    for (let i = 0; i < view.length; i++) {
      const val = view[i];
      if (isFinite(val)) {
        if (val < minDose) minDose = val;
        if (val > maxDose) maxDose = val;
        doseSum += val;
        doseCount++;
      }
    }
  }

  if (sizes.length < 3) {
    throw new Error(`NRRD文件 "${filename}" 缺少尺寸信息（sizes 字段）`);
  }

  if (!dataType) {
    throw new Error(`NRRD文件 "${filename}" 缺少数据类型（type 字段）`);
  }

  if (doseCount === 0) {
    throw new Error(`NRRD文件 "${filename}" 无法读取有效剂量值（体数据为空或格式不支持）`);
  }

  const meanDose = doseSum / doseCount;

  if (!isFinite(minDose) || !isFinite(maxDose) || !isFinite(meanDose)) {
    throw new Error(`NRRD文件 "${filename}" 包含无效的剂量值（NaN 或 Infinity）`);
  }

  if (minDose < 0 || maxDose < 0 || meanDose < 0) {
    throw new Error(`NRRD文件 "${filename}" 包含负数剂量值，剂量数据必须为非负数`);
  }

  if (maxDose === 0) {
    throw new Error(`NRRD文件 "${filename}" 最大剂量为0，可能不是有效的剂量文件`);
  }

  const threshold = Math.round(maxDose * 0.9 * 10) / 10;

  return {
    name: inferNameFromFilename(filename),
    fileType: 'nrrd',
    filePath: filename,
    minDose: Math.round(minDose * 10) / 10,
    maxDose: Math.round(maxDose * 10) / 10,
    meanDose: Math.round(meanDose * 10) / 10,
    threshold,
    gridSize: sizes as [number, number, number],
    spacing: spacings as [number, number, number],
  };
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`读取文件 "${file.name}" 失败`));
    reader.readAsText(file);
  });
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`读取文件 "${file.name}" 失败`));
    reader.readAsArrayBuffer(file);
  });
};

export const importFile = async (file: File): Promise<ImportResult> => {
  const errors: ImportError[] = [];
  const warnings: string[] = [];
  const ext = getFileExtension(file.name);

  if (!isSupportedFile(file.name)) {
    errors.push({
      file: file.name,
      message: `不支持的文件格式 "${ext}"，支持格式：${ALL_EXTENSIONS.join(', ')}`,
    });
    return { success: false, errors, warnings };
  }

  if (file.size === 0) {
    errors.push({
      file: file.name,
      message: `文件 "${file.name}" 为空（0字节）`,
    });
    return { success: false, errors, warnings };
  }

  if (file.size > 500 * 1024 * 1024) {
    warnings.push(`文件 "${file.name}" 大小为 ${(file.size / 1024 / 1024).toFixed(1)}MB，可能需要较长时间处理`);
  }

  try {
    if (ext === '.obj') {
      const content = await readFileAsText(file);
      const organ = parseOBJ(content, file.name);
      if (organ.vertexCount < 3) {
        warnings.push(`OBJ文件仅包含 ${organ.vertexCount} 个顶点，模型可能不完整`);
      }
      console.log(`[导入] OBJ文件解析成功: ${file.name}`, {
        顶点数: organ.vertexCount,
        面数: organ.faceCount,
        尺寸: organ.size.map(d => d.toFixed(1)).join(' × '),
        形状推断: organ.shapeType,
      });
      return { success: true, organ, errors, warnings };
    }

    if (ext === '.stl') {
      const buffer = await readFileAsArrayBuffer(file);
      const organ = parseSTL(buffer, file.name);
      if (organ.vertexCount < 3) {
        warnings.push(`STL文件仅包含 ${organ.vertexCount} 个顶点，模型可能不完整`);
      }
      console.log(`[导入] STL文件解析成功: ${file.name}`, {
        顶点数: organ.vertexCount,
        面数: organ.faceCount,
        尺寸: organ.size.map(d => d.toFixed(1)).join(' × '),
        形状推断: organ.shapeType,
      });
      return { success: true, organ, errors, warnings };
    }

    if (ext === '.dcm') {
      const buffer = await readFileAsArrayBuffer(file);
      const dose = parseDCM(buffer, file.name);
      console.log(`[导入] DICOM文件解析成功: ${file.name}`, {
        剂量范围: `${dose.minDose.toFixed(1)} - ${dose.maxDose.toFixed(1)} Gy`,
        平均剂量: `${dose.meanDose.toFixed(1)} Gy`,
        阈值: `${dose.threshold.toFixed(1)} Gy`,
        网格尺寸: dose.gridSize.join(' × '),
      });
      if (dose.maxDose > dose.threshold) {
        warnings.push(`剂量超限: ${dose.maxDose.toFixed(1)}Gy > 阈值 ${dose.threshold.toFixed(1)}Gy`);
      }
      return { success: true, dose, errors, warnings };
    }

    if (ext === '.nrrd') {
      const buffer = await readFileAsArrayBuffer(file);
      const dose = parseNRRD(buffer, file.name);
      console.log(`[导入] NRRD文件解析成功: ${file.name}`, {
        剂量范围: `${dose.minDose.toFixed(1)} - ${dose.maxDose.toFixed(1)} Gy`,
        平均剂量: `${dose.meanDose.toFixed(1)} Gy`,
        阈值: `${dose.threshold.toFixed(1)} Gy`,
        网格尺寸: dose.gridSize.join(' × '),
      });
      if (dose.maxDose > dose.threshold) {
        warnings.push(`剂量超限: ${dose.maxDose.toFixed(1)}Gy > 阈值 ${dose.threshold.toFixed(1)}Gy`);
      }
      return { success: true, dose, errors, warnings };
    }

    errors.push({ file: file.name, message: `未实现的文件格式: ${ext}` });
    return { success: false, errors, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : `解析文件 "${file.name}" 时发生未知错误`;
    errors.push({ file: file.name, message });
    console.error(`[导入] 文件解析失败: ${file.name}`, message);
    return { success: false, errors, warnings };
  }
};

export const importFiles = async (files: File[]): Promise<ImportResult[]> => {
  const results: ImportResult[] = [];
  for (const file of files) {
    const result = await importFile(file);
    results.push(result);
  }
  return results;
};
