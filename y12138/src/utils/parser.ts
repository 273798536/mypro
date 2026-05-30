import type { LayerRow, RowStatus } from '@/types';

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('备注') || trimmed.startsWith('注');
}

function isEmptyLine(line: string): boolean {
  return line.trim() === '';
}

export function parseRawInput(rawText: string): LayerRow[] {
  const lines = rawText.split('\n');
  const rows: LayerRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawContent = lines[i];
    const status: RowStatus = {
      isEmpty: false,
      isComment: false,
      missingColumns: false,
      zeroThickness: false,
      missingRefractiveIndex: false,
      angleOutOfBounds: false,
      rawContent,
    };

    if (isEmptyLine(rawContent)) {
      status.isEmpty = true;
      rows.push({
        rowIndex: i + 1,
        material: '',
        n: null,
        k: null,
        d: null,
        note: '',
        status,
      });
      continue;
    }

    if (isCommentLine(rawContent)) {
      status.isComment = true;
      rows.push({
        rowIndex: i + 1,
        material: '',
        n: null,
        k: null,
        d: null,
        note: rawContent.trim(),
        status,
      });
      continue;
    }

    const parts = rawContent.split(/[\t,，\s]+/).filter((p) => p.trim() !== '');

    let material = '';
    let n: number | null = null;
    let k: number | null = null;
    let d: number | null = null;
    let note = '';

    if (parts.length >= 4) {
      material = parts[0];
      const nVal = parseFloat(parts[1]);
      const kVal = parseFloat(parts[2]);
      const dVal = parseFloat(parts[3]);
      n = isNaN(nVal) ? null : nVal;
      k = isNaN(kVal) ? null : kVal;
      d = isNaN(dVal) ? null : dVal;
      if (parts.length > 4) {
        note = parts.slice(4).join(' ');
      }
    } else if (parts.length === 3) {
      material = parts[0];
      const nVal = parseFloat(parts[1]);
      const dVal = parseFloat(parts[2]);
      n = isNaN(nVal) ? null : nVal;
      d = isNaN(dVal) ? null : dVal;
      status.missingColumns = true;
    } else if (parts.length === 2) {
      const nVal = parseFloat(parts[0]);
      const dVal = parseFloat(parts[1]);
      if (!isNaN(nVal) && !isNaN(dVal)) {
        n = nVal;
        d = dVal;
      } else {
        status.missingColumns = true;
      }
    } else {
      status.missingColumns = true;
    }

    if (n === null) {
      status.missingRefractiveIndex = true;
    }

    if (d !== null && d === 0) {
      status.zeroThickness = true;
    }

    rows.push({
      rowIndex: i + 1,
      material,
      n,
      k,
      d,
      note,
      status,
    });
  }

  return rows;
}

export function createEmptyRow(): LayerRow {
  return {
    rowIndex: 0,
    material: '',
    n: null,
    k: null,
    d: null,
    note: '',
    status: {
      isEmpty: false,
      isComment: false,
      missingColumns: false,
      zeroThickness: false,
      missingRefractiveIndex: false,
      angleOutOfBounds: false,
      rawContent: '',
    },
  };
}
