import type {
  VectorField,
  Path,
  PathNode,
  ImportResult,
  ImportConflict,
  Point2D,
} from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function parseNodesString(nodesStr: string): PathNode[] {
  const nodeRegex = /\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g;
  const nodes: PathNode[] = [];
  let match;
  let order = 0;

  while ((match = nodeRegex.exec(nodesStr)) !== null) {
    nodes.push({
      id: generateId(),
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      order: order++,
    });
  }

  return nodes;
}

interface ImportedVectorField {
  id?: string;
  name: string;
  expressionX: string;
  expressionY: string;
  expression_x?: string;
  expression_y?: string;
  source?: string;
  range?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  range_min_x?: number;
  range_max_x?: number;
  range_min_y?: number;
  range_max_y?: number;
}

interface ImportedPath {
  id?: string;
  name: string;
  vectorFieldId: string;
  vector_field_id?: string;
  color?: string;
  studentRemark?: string;
  student_remark?: string;
  source?: string;
  nodes: Array<{ x: number; y: number; id?: string; order?: number }> | string;
}

interface ImportData {
  version?: string;
  source?: string;
  vectorFields?: ImportedVectorField[];
  paths?: ImportedPath[];
}

export function parseJsonData(
  content: string,
  existingVectorFields: VectorField[],
  existingPaths: Path[]
): ImportResult {
  const result: ImportResult = {
    vectorFields: [],
    paths: [],
    conflicts: [],
    errors: [],
  };

  try {
    const data = JSON.parse(content) as ImportData;

    if (data.vectorFields && Array.isArray(data.vectorFields)) {
      const existingIds = new Set(existingVectorFields.map((vf) => vf.id));
      const existingNames = new Map(
        existingVectorFields.map((vf) => [vf.name, vf.id])
      );

      data.vectorFields.forEach((vf, index) => {
        const id = vf.id || `vf-imported-${Date.now()}-${index}`;
        const name = vf.name || `向量场 ${index + 1}`;

        if (existingIds.has(id)) {
          result.conflicts.push({
            type: 'vectorField',
            existingId: id,
            newId: id,
            existingName: name,
            newName: name,
          });
        }

        if (existingNames.has(name)) {
          const existingId = existingNames.get(name)!;
          if (existingId !== id) {
            result.conflicts.push({
              type: 'vectorField',
              existingId,
              newId: id,
              existingName: name,
              newName: name,
            });
          }
        }

        const now = new Date().toISOString();
        const vectorField: VectorField = {
          id,
          name,
          expressionX: vf.expressionX || vf.expression_x || '',
          expressionY: vf.expressionY || vf.expression_y || '',
          source: vf.source || data.source || 'JSON 导入',
          range: vf.range || {
            minX: vf.range_min_x || -5,
            maxX: vf.range_max_x || 5,
            minY: vf.range_min_y || -5,
            maxY: vf.range_max_y || 5,
          },
          createdAt: now,
          updatedAt: now,
        };

        result.vectorFields.push(vectorField);
      });
    }

    if (data.paths && Array.isArray(data.paths)) {
      const existingIds = new Set(existingPaths.map((p) => p.id));
      const existingNames = new Map(
        existingPaths.map((p) => [p.name, p.id])
      );

      data.paths.forEach((path, index) => {
        const id = path.id || `path-imported-${Date.now()}-${index}`;
        const name = path.name || `路径 ${index + 1}`;
        const vectorFieldId =
          path.vectorFieldId || path.vector_field_id || '';

        if (existingIds.has(id)) {
          result.conflicts.push({
            type: 'path',
            existingId: id,
            newId: id,
            existingName: name,
            newName: name,
          });
        }

        if (existingNames.has(name)) {
          const existingId = existingNames.get(name)!;
          if (existingId !== id) {
            result.conflicts.push({
              type: 'path',
              existingId,
              newId: id,
              existingName: name,
              newName: name,
            });
          }
        }

        let nodes: PathNode[] = [];
        if (typeof path.nodes === 'string') {
          nodes = parseNodesString(path.nodes);
        } else if (Array.isArray(path.nodes)) {
          nodes = path.nodes.map((node, idx) => ({
            id: node.id || generateId(),
            x: node.x,
            y: node.y,
            order: node.order ?? idx,
          }));
        }

        const now = new Date().toISOString();
        const parsedPath: Path = {
          id,
          vectorFieldId,
          name,
          color: path.color || '#3b82f6',
          studentRemark: path.studentRemark || path.student_remark || '',
          source: path.source || data.source || 'JSON 导入',
          nodes,
          createdAt: now,
          updatedAt: now,
        };

        result.paths.push(parsedPath);
      });
    }
  } catch (error) {
    result.errors.push(`JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return result;
}

export function parseCsvData(
  content: string,
  existingVectorFields: VectorField[],
  existingPaths: Path[]
): ImportResult {
  const result: ImportResult = {
    vectorFields: [],
    paths: [],
    conflicts: [],
    errors: [],
  };

  try {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      result.errors.push('CSV 文件为空或格式不正确');
      return result;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const typeIndex = headers.indexOf('type');
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const vectorFieldIdIndex = headers.indexOf('vectorFieldId');
    const expressionXIndex = headers.indexOf('expression_x');
    const expressionYIndex = headers.indexOf('expression_y');
    const nodesIndex = headers.indexOf('nodes');
    const studentRemarkIndex = headers.indexOf('studentRemark');
    const sourceIndex = headers.indexOf('source');
    const colorIndex = headers.indexOf('color');

    if (typeIndex === -1) {
      result.errors.push('CSV 缺少 "type" 列');
      return result;
    }

    const existingVfIds = new Set(existingVectorFields.map((vf) => vf.id));
    const existingPathIds = new Set(existingPaths.map((p) => p.id));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const type = values[typeIndex];

      if (type === 'vectorField') {
        const id = values[idIndex] || `vf-csv-${Date.now()}-${i}`;
        const name = values[nameIndex] || `向量场 ${i}`;

        if (existingVfIds.has(id)) {
          result.conflicts.push({
            type: 'vectorField',
            existingId: id,
            newId: id,
            existingName: name,
            newName: name,
          });
        }

        const now = new Date().toISOString();
        result.vectorFields.push({
          id,
          name,
          expressionX: values[expressionXIndex] || '',
          expressionY: values[expressionYIndex] || '',
          source: values[sourceIndex] || 'CSV 导入',
          range: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
          createdAt: now,
          updatedAt: now,
        });
      } else if (type === 'path') {
        const id = values[idIndex] || `path-csv-${Date.now()}-${i}`;
        const name = values[nameIndex] || `路径 ${i}`;

        if (existingPathIds.has(id)) {
          result.conflicts.push({
            type: 'path',
            existingId: id,
            newId: id,
            existingName: name,
            newName: name,
          });
        }

        const nodesStr = values[nodesIndex] || '';
        const nodes = parseNodesString(nodesStr);

        const now = new Date().toISOString();
        result.paths.push({
          id,
          vectorFieldId: values[vectorFieldIdIndex] || '',
          name,
          color: values[colorIndex] || '#3b82f6',
          studentRemark: values[studentRemarkIndex] || '',
          source: values[sourceIndex] || 'CSV 导入',
          nodes,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  } catch (error) {
    result.errors.push(`CSV 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return result;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function validatePointsInRange(
  points: Point2D[],
  range: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  return points.every(
    (p) =>
      p.x >= range.minX &&
      p.x <= range.maxX &&
      p.y >= range.minY &&
      p.y <= range.maxY
  );
}
