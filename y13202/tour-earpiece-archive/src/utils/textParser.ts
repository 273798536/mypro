import type { DataIssue, EarpieceItem, ImportResult, IssueType } from '../types';
import { extractDateFromText, parseDate, parseDateOrInvalid, looksLikeDateField } from './dateParser';
import { generateId, isEmpty, normalizeString, now } from './common';

interface ParseContext {
  existingItems: EarpieceItem[];
  lineNumber: number;
  rawText: string;
}

function makeIssue(
  ctx: ParseContext,
  type: IssueType,
  message: string,
  severity: 'warning' | 'error' | 'info' = 'warning',
  field?: keyof EarpieceItem,
): DataIssue {
  return {
    id: generateId('issue'),
    type,
    severity,
    message,
    rawLine: ctx.lineNumber,
    rawText: ctx.rawText,
    relatedField: field,
  };
}

function splitFields(line: string): string[] {
  return line
    .split(/\t|\s{2,}|[|｜]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function extractSongAliases(songField: string): { primary: string; aliases: string[] } {
  const aliasPatterns = [
    /[(（]([^)）]+)[)）]/g,
    /[""「「]([^""」」]+)[""」」]/g,
  ];
  const aliases: string[] = [];
  let cleaned = songField;
  for (const re of aliasPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(songField)) !== null) {
      const alias = m[1].trim();
      if (alias && !aliases.includes(alias)) aliases.push(alias);
      cleaned = cleaned.replace(m[0], '').trim();
    }
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return { primary: cleaned, aliases };
}

interface ParsedFields {
  songName: string;
  songAliases: string[];
  artist: string;
  authDeadline: string | null;
  authDeadlineRaw: string | null;
  authFromNote: boolean;
  note: string;
}

function parseSingleLine(ctx: ParseContext): {
  fields: ParsedFields | null;
  issues: DataIssue[];
  isLateNote: boolean;
} {
  const issues: DataIssue[] = [];
  const raw = ctx.rawText.trim();

  const isLateNote = /(后补|补录|补记|追加|备注[:：].*后补|补充)/.test(raw);
  if (isLateNote) {
    issues.push(makeIssue(ctx, 'late_note_added', '该条记录被标记为后补备注，需核对与旧版本的一致性', 'warning', 'note'));
  }

  if (raw.length === 0) {
    return { fields: null, issues, isLateNote: false };
  }

  const parts = splitFields(raw);
  let songName = '';
  let songAliases: string[] = [];
  let artist = '';
  let authDeadline: string | null = null;
  let authDeadlineRaw: string | null = null;
  let authFromNote = false;
  let note = '';
  let consumedParts = 0;

  if (parts.length >= 1) {
    const songExtract = extractSongAliases(parts[0]);
    songName = songExtract.primary;
    songAliases = songExtract.aliases;
    consumedParts = 1;
  }

  if (parts.length >= 2) {
    const part2 = parts[1];
    const looksLikeDate = looksLikeDateField(part2);
    if (looksLikeDate) {
      const maybeDate = parseDateOrInvalid(part2);
      if (maybeDate) {
        authDeadline = maybeDate.normalized;
        authDeadlineRaw = maybeDate.raw;
        if (maybeDate.formatUnclear || maybeDate.isPartial || !maybeDate.normalized) {
          issues.push(makeIssue(
            ctx,
            'date_format_unclear',
            maybeDate.normalized
              ? `授权日期格式不规范，原始值"${maybeDate.raw}"已自动规范化为"${maybeDate.normalized}"，请核对`
              : `授权日期格式不规范/非法（原始值"${maybeDate.raw}"），无法解析为有效日期，请人工确认`,
            maybeDate.normalized ? 'warning' : 'error',
            'authDeadline',
          ));
        }
        consumedParts = 2;
      } else {
        artist = part2;
        consumedParts = 2;
      }
    } else {
      artist = part2;
      consumedParts = 2;
    }
  }

  if (parts.length >= 3 && consumedParts === 2) {
    const part3 = parts[2];
    const maybeDate = parseDateOrInvalid(part3);
    if (maybeDate) {
      authDeadline = maybeDate.normalized;
      authDeadlineRaw = maybeDate.raw;
      if (maybeDate.formatUnclear || maybeDate.isPartial || !maybeDate.normalized) {
        issues.push(makeIssue(
          ctx,
          'date_format_unclear',
          maybeDate.normalized
            ? `授权日期格式不规范，原始值"${maybeDate.raw}"已自动规范化为"${maybeDate.normalized}"，请核对`
            : `授权日期格式不规范/非法（原始值"${maybeDate.raw}"），无法解析为有效日期，请人工确认`,
          maybeDate.normalized ? 'warning' : 'error',
          'authDeadline',
        ));
      }
      consumedParts = 3;
    } else if (looksLikeDateField(part3)) {
      authDeadlineRaw = part3;
      issues.push(makeIssue(
        ctx,
        'date_format_unclear',
        `第3字段"${part3}"疑似授权日期但格式无法识别，请人工确认`,
        'error',
        'authDeadline',
      ));
      consumedParts = 3;
    }
  }

  note = parts.slice(consumedParts).join('；');

  if (isEmpty(note)) {
    note = raw;
  }

  if (!authDeadline) {
    const fromNote = extractDateFromText(note);
    if (fromNote) {
      if (fromNote.normalized) {
        authDeadline = fromNote.normalized;
      }
      authDeadlineRaw = authDeadlineRaw ?? fromNote.raw;
      authFromNote = true;
      issues.push(makeIssue(ctx, 'hidden_auth_in_note', `授权期限"${fromNote.raw}"是从备注中提取的，原始记录未单独列出${fromNote.normalized ? '' : '，且无法解析为有效日期'}`, fromNote.normalized ? 'info' : 'warning', 'note'));
      if (fromNote.formatUnclear || !fromNote.normalized) {
        issues.push(makeIssue(ctx, 'date_format_unclear', `备注中提取的授权日期格式不规范：${fromNote.raw}${fromNote.normalized ? '' : '（无法解析）'}`, fromNote.normalized ? 'warning' : 'error', 'authDeadline'));
      }
    }
  }

  if (isEmpty(songName)) {
    issues.push(makeIssue(ctx, 'missing_field', '无法解析出曲名字段', 'error', 'songName'));
  }
  if (isEmpty(artist)) {
    issues.push(makeIssue(ctx, 'missing_field', '缺少艺人字段', 'warning', 'artist'));
  }
  if (!authDeadline && isEmpty(authDeadlineRaw)) {
    issues.push(makeIssue(ctx, 'missing_field', '缺少授权期限字段，请人工补录或备注说明', 'warning', 'authDeadline'));
  } else if (!authDeadline && !isEmpty(authDeadlineRaw)) {
    if (!issues.some((i) => i.relatedField === 'authDeadline')) {
      issues.push(makeIssue(ctx, 'missing_field', `提供了授权期限原始值"${authDeadlineRaw}"但无法解析为有效日期`, 'error', 'authDeadline'));
    }
  }

  const allEmpty = isEmpty(songName) && isEmpty(artist) && !authDeadline && isEmpty(authDeadlineRaw);

  return {
    fields: allEmpty ? null : { songName, songAliases, artist, authDeadline, authDeadlineRaw, authFromNote, note },
    issues,
    isLateNote,
  };
}

function detectDuplicates(
  ctx: ParseContext,
  parsed: ParsedFields,
  allInBatch: ParsedFields[],
): DataIssue[] {
  const issues: DataIssue[] = [];
  const normSong = normalizeString(parsed.songName);
  const normAliases = parsed.songAliases.map(normalizeString);

  for (let i = 0; i < allInBatch.length - 1; i++) {
    const other = allInBatch[i];
    if (other === parsed) continue;
    const otherNorm = normalizeString(other.songName);
    const otherAliases = other.songAliases.map(normalizeString);
    const sameSong = normSong && (normSong === otherNorm || normAliases.includes(otherNorm) || otherAliases.includes(normSong) || normAliases.some((a) => otherAliases.includes(a)));
    const sameArtist = parsed.artist && other.artist && normalizeString(parsed.artist) === normalizeString(other.artist);
    if (sameSong && sameArtist) {
      issues.push(makeIssue(ctx, 'duplicate_song_alias', `与同批次第${i + 1}行存在曲名别名重复（曲名"${parsed.songName}" / "${other.songName}"）`, 'warning', 'songName'));
      break;
    } else if (sameSong && !parsed.artist && !other.artist) {
      issues.push(makeIssue(ctx, 'duplicate_song_alias', `与同批次第${i + 1}行疑似曲名别名重复，因缺少艺人字段无法确认`, 'warning', 'songName'));
      break;
    }
  }

  for (const existing of ctx.existingItems) {
    const exNorm = normalizeString(existing.songName);
    const exAliases = existing.songAliases.map(normalizeString);
    const sameSong = normSong && (normSong === exNorm || normAliases.includes(exNorm) || exAliases.includes(normSong) || normAliases.some((a) => exAliases.includes(a)));
    const sameArtist = parsed.artist && existing.artist && normalizeString(parsed.artist) === normalizeString(existing.artist);
    if (sameSong && sameArtist) {
      issues.push(makeIssue(ctx, 'duplicate_record', `与已归档记录"${existing.songName} - ${existing.artist}"重复（曲名别名命中）`, 'warning', 'songName'));
      break;
    }
  }

  return issues;
}

export function parseRehearsalText(rawText: string, existingItems: EarpieceItem[]): ImportResult {
  const lines = rawText.split(/\r?\n/);
  const success: EarpieceItem[] = [];
  const failed: Array<{ rawText: string; lineNumber: number; reason: string }> = [];
  const allIssues: DataIssue[] = [];
  const parsedBatch: ParsedFields[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    if (!line.trim()) continue;

    const ctx: ParseContext = { existingItems, lineNumber, rawText: line };
    const { fields, issues, isLateNote } = parseSingleLine(ctx);
    allIssues.push(...issues);

    if (!fields) {
      failed.push({
        rawText: line,
        lineNumber,
        reason: issues.length > 0 ? issues[0].message : '无法识别该行为有效记录',
      });
      continue;
    }

    const hasBlockingErrors = issues.some((iss) => iss.severity === 'error');
    if (hasBlockingErrors && isEmpty(fields.songName) && isEmpty(fields.artist)) {
      failed.push({
        rawText: line,
        lineNumber,
        reason: issues.find((i) => i.severity === 'error')?.message ?? '曲名与艺人均为空，无法归档',
      });
      continue;
    }

    parsedBatch.push(fields);
    const dupIssues = detectDuplicates({ ...ctx, rawText: line }, fields, parsedBatch);
    allIssues.push(...dupIssues);

    const item: EarpieceItem = {
      id: generateId('item'),
      songName: fields.songName,
      songAliases: fields.songAliases,
      artist: fields.artist,
      authDeadline: fields.authDeadline,
      authDeadlineRaw: fields.authDeadlineRaw,
      authExtractedFromNote: fields.authFromNote,
      note: fields.note,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: null,
      withdrawnAt: null,
      version: 1,
      rawInput: line,
      rawLineNumber: lineNumber,
      issues: [...issues, ...dupIssues],
      annotations: isLateNote
        ? [
            {
              id: generateId('ann'),
              createdAt: now(),
              content: '本条记录来源于排练群后补备注，需与历史版本核对',
              author: '系统识别',
              isLateNote: true,
            },
          ]
        : [],
      deliveryListRef: null,
    };
    success.push(item);
  }

  return {
    success,
    failed,
    totalLines: lines.filter((l) => l.trim()).length,
    issues: allIssues,
  };
}
