import type { Song, ValidationRule, ValidationResult, ValidationIssue } from '@/types';
import { generateId } from './helpers';

function calculateArtistScore(
  songs: Song[],
  rule: ValidationRule
): { score: number; issues: ValidationIssue[] } {
  const maxCount = (rule.params as { maxCount: number }).maxCount;
  const weight = rule.weight;

  const artistMap: Record<string, Song[]> = {};
  songs.forEach((song) => {
    const key = song.artist.trim();
    if (!artistMap[key]) artistMap[key] = [];
    artistMap[key].push(song);
  });

  let score = 100;
  const issues: ValidationIssue[] = [];

  Object.entries(artistMap).forEach(([artist, artistSongs]) => {
    if (artistSongs.length > maxCount) {
      const overCount = artistSongs.length - maxCount;
      score -= (overCount / maxCount) * weight;

      issues.push({
        id: generateId(),
        severity: 'error',
        type: 'artist_repeat',
        message: `歌手「${artist}」出现 ${artistSongs.length} 次，超出阈值 ${maxCount} 次`,
        ruleId: rule.id,
        songIds: artistSongs.map((s) => s.id),
        sourceFiles: [...new Set(artistSongs.map((s) => s.source.filename))],
        suggestion: `建议移除 ${overCount} 首「${artist}」的歌曲`,
      });
    }
  });

  return { score: Math.max(0, score), issues };
}

function calculateDecadeScore(
  songs: Song[],
  rule: ValidationRule
): { score: number; issues: ValidationIssue[] } {
  const ranges = (
    rule.params as {
      ranges: { min: number; max: number; minRatio: number; maxRatio: number }[];
    }
  ).ranges;
  const weight = rule.weight;
  const total = songs.length || 1;

  let score = 100;
  const issues: ValidationIssue[] = [];

  ranges.forEach((range) => {
    const rangeSongs = songs.filter((s) => s.year >= range.min && s.year <= range.max);
    const ratio = rangeSongs.length / total;

    if (ratio < range.minRatio) {
      const deficit = range.minRatio - ratio;
      score -= deficit * weight * 2;

      issues.push({
        id: generateId(),
        severity: 'warning',
        type: 'decade_deficit',
        message: `${range.min}-${range.max}年代占比 ${(ratio * 100).toFixed(1)}%，低于要求 ${(range.minRatio * 100).toFixed(1)}%`,
        ruleId: rule.id,
        songIds: rangeSongs.map((s) => s.id),
        sourceFiles: [...new Set(rangeSongs.map((s) => s.source.filename))],
        suggestion: `建议增加 ${Math.ceil((range.minRatio - ratio) * total)} 首 ${range.min}-${range.max} 年代的歌曲`,
      });
    } else if (ratio > range.maxRatio) {
      const excess = ratio - range.maxRatio;
      score -= excess * weight;

      issues.push({
        id: generateId(),
        severity: 'error',
        type: 'decade_excess',
        message: `${range.min}-${range.max}年代占比 ${(ratio * 100).toFixed(1)}%，高于上限 ${(range.maxRatio * 100).toFixed(1)}%`,
        ruleId: rule.id,
        songIds: rangeSongs.map((s) => s.id),
        sourceFiles: [...new Set(rangeSongs.map((s) => s.source.filename))],
        suggestion: `建议移除 ${Math.ceil((ratio - range.maxRatio) * total)} 首 ${range.min}-${range.max} 年代的歌曲`,
      });
    }
  });

  return { score: Math.max(0, score), issues };
}

function calculateTagScore(
  songs: Song[],
  rule: ValidationRule
): { score: number; issues: ValidationIssue[] } {
  const params = rule.params as {
    requiredTags: string[];
    minRatio: number;
    maxRatio: number;
  };
  const total = songs.length || 1;
  let score = 100;
  const issues: ValidationIssue[] = [];

  params.requiredTags.forEach((tag) => {
    const tagSongs = songs.filter((s) => s.tags.includes(tag));
    const ratio = tagSongs.length / total;

    if (ratio < params.minRatio) {
      score -= (params.minRatio - ratio) * rule.weight;
      issues.push({
        id: generateId(),
        severity: 'warning',
        type: 'tag_deficit',
        message: `标签「${tag}」占比 ${(ratio * 100).toFixed(1)}%，低于要求 ${(params.minRatio * 100).toFixed(1)}%`,
        ruleId: rule.id,
        songIds: tagSongs.map((s) => s.id),
        sourceFiles: [...new Set(tagSongs.map((s) => s.source.filename))],
        suggestion: `建议增加 ${Math.ceil((params.minRatio - ratio) * total)} 首标签为「${tag}」的歌曲`,
      });
    } else if (ratio > params.maxRatio) {
      score -= (ratio - params.maxRatio) * rule.weight;
      issues.push({
        id: generateId(),
        severity: 'error',
        type: 'tag_excess',
        message: `标签「${tag}」占比 ${(ratio * 100).toFixed(1)}%，高于上限 ${(params.maxRatio * 100).toFixed(1)}%`,
        ruleId: rule.id,
        songIds: tagSongs.map((s) => s.id),
        sourceFiles: [...new Set(tagSongs.map((s) => s.source.filename))],
        suggestion: `建议移除 ${Math.ceil((ratio - params.maxRatio) * total)} 首标签为「${tag}」的歌曲`,
      });
    }
  });

  return { score: Math.max(0, score), issues };
}

function calculateGenreScore(
  songs: Song[],
  rule: ValidationRule
): { score: number; issues: ValidationIssue[] } {
  const maxGenreRatio = (rule.params as { maxGenreRatio: number }).maxGenreRatio;
  const total = songs.length || 1;
  let score = 100;
  const issues: ValidationIssue[] = [];

  const genreMap: Record<string, Song[]> = {};
  songs.forEach((s) => {
    const key = s.genre || '未分类';
    if (!genreMap[key]) genreMap[key] = [];
    genreMap[key].push(s);
  });

  Object.entries(genreMap).forEach(([genre, genreSongs]) => {
    const ratio = genreSongs.length / total;
    if (ratio > maxGenreRatio) {
      score -= (ratio - maxGenreRatio) * rule.weight;
      issues.push({
        id: generateId(),
        severity: 'warning',
        type: 'genre_excess',
        message: `流派「${genre}」占比 ${(ratio * 100).toFixed(1)}%，高于上限 ${(maxGenreRatio * 100).toFixed(1)}%`,
        ruleId: rule.id,
        songIds: genreSongs.map((s) => s.id),
        sourceFiles: [...new Set(genreSongs.map((s) => s.source.filename))],
        suggestion: `建议减少 ${Math.ceil((ratio - maxGenreRatio) * total)} 首「${genre}」流派的歌曲`,
      });
    }
  });

  return { score: Math.max(0, score), issues };
}

export function calculateBalanceScore(
  songs: Song[],
  rules: ValidationRule[]
): ValidationResult {
  const enabledRules = rules.filter((r) => r.enabled);

  let artistScore = 100;
  let decadeScore = 100;
  let tagScore = 100;
  let genreScore = 100;
  const allIssues: ValidationIssue[] = [];

  enabledRules.forEach((rule) => {
    switch (rule.type) {
      case 'artist_max_count': {
        const r = calculateArtistScore(songs, rule);
        artistScore = r.score;
        allIssues.push(...r.issues);
        break;
      }
      case 'decade_range': {
        const r = calculateDecadeScore(songs, rule);
        decadeScore = r.score;
        allIssues.push(...r.issues);
        break;
      }
      case 'tag_ratio': {
        const r = calculateTagScore(songs, rule);
        tagScore = r.score;
        allIssues.push(...r.issues);
        break;
      }
      case 'genre_balance': {
        const r = calculateGenreScore(songs, rule);
        genreScore = r.score;
        allIssues.push(...r.issues);
        break;
      }
    }
  });

  const totalScore = (artistScore * 30 + decadeScore * 30 + tagScore * 20 + genreScore * 20) / 100;

  return {
    score: Math.round(totalScore),
    details: { artistScore, decadeScore, tagScore, genreScore },
    issues: allIssues.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
  };
}
