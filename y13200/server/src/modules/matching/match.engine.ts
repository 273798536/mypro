export interface ParsedFileName {
  trackNo?: number;
  title?: string;
  artist?: string;
  version?: string;
  tags?: string[];
}

export interface MatchCandidate {
  id: string;
  trackNo: number;
  title: string;
  artist: string;
  expectedDuration?: number;
}

export interface MatchResult {
  materialId: string;
  trackId: string | null;
  confidence: number;
  matchType: 'auto' | 'suggest' | 'manual' | 'none';
  anomalies: string[];
}

export function parseFileName(fileName: string): ParsedFileName {
  const result: ParsedFileName = {};
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  const trackNoMatch = nameWithoutExt.match(/^(\d+)[_\-.\s]+/);
  if (trackNoMatch) {
    result.trackNo = parseInt(trackNoMatch[1], 10);
  }
  
  const versionMatch = nameWithoutExt.match(/[vV](\d+)|version\s*(\d+)|版本\s*(\d+)/i);
  if (versionMatch) {
    result.version = 'v' + (versionMatch[1] || versionMatch[2] || versionMatch[3]);
  }
  
  const tagPattern = /[\[\(]([^\]\)]+)[\]\)]/g;
  const tags: string[] = [];
  let tagMatch;
  while ((tagMatch = tagPattern.exec(nameWithoutExt)) !== null) {
    tags.push(tagMatch[1].trim());
  }
  if (tags.length > 0) {
    result.tags = tags;
  }
  
  let cleanName = nameWithoutExt
    .replace(/^(\d+)[_\-.\s]+/, '')
    .replace(/[vV]\d+|version\s*\d+|版本\s*\d+/gi, '')
    .replace(/[\[\(][^\]\)]+[\]\)]/g, '')
    .trim();
  
  const separators = /[_\-.\s]+/;
  const parts = cleanName.split(separators).filter(p => p.trim());
  
  if (parts.length >= 1) {
    result.title = parts[0];
  }
  if (parts.length >= 2) {
    result.artist = parts[1];
  }
  
  return result;
}

export function jaroWinkler(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  
  if (m === 0 || n === 0) return 0;
  if (s1 === s2) return 1;
  
  const matchDistance = Math.floor(Math.max(m, n) / 2) - 1;
  const s1Matches = new Array(m).fill(false);
  const s2Matches = new Array(n).fill(false);
  
  let matches = 0;
  for (let i = 0; i < m; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(n, i + matchDistance + 1);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }
  
  if (matches === 0) return 0;
  
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < m; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }
  
  transpositions = Math.floor(transpositions / 2);
  
  const jaro = (matches / m + matches / n + (matches - transpositions) / matches) / 3;
  
  const prefix = Math.min(4, m, n);
  let prefixMatch = 0;
  for (let i = 0; i < prefix && s1[i] === s2[i]; i++) {
    prefixMatch++;
  }
  
  const prefixScale = 0.1;
  return jaro + prefixMatch * prefixScale * (1 - jaro);
}

export function matchFileName(
  materialId: string,
  parsed: ParsedFileName,
  candidates: MatchCandidate[],
  actualDuration: number
): MatchResult {
  const anomalies: string[] = [];
  let bestMatch: MatchCandidate | null = null;
  let highestConfidence = 0;
  
  for (const candidate of candidates) {
    let score = 0;
    const weights = {
      trackNo: 0.4,
      title: 0.35,
      artist: 0.15,
      duration: 0.1
    };
    
    if (parsed.trackNo !== undefined) {
      if (parsed.trackNo === candidate.trackNo) {
        score += weights.trackNo;
      } else {
        anomalies.push(`曲目号不匹配：解析为${parsed.trackNo}，应为${candidate.trackNo}`);
      }
    } else {
      anomalies.push('文件名缺少曲目号');
    }
    
    if (parsed.title) {
      const titleSimilarity = jaroWinkler(
        parsed.title.toLowerCase(),
        candidate.title.toLowerCase()
      );
      score += titleSimilarity * weights.title;
      
      if (titleSimilarity < 0.7) {
        anomalies.push(`曲名相似度低：${(titleSimilarity * 100).toFixed(1)}%`);
      }
    }
    
    if (parsed.artist && candidate.artist) {
      const artistSimilarity = jaroWinkler(
        parsed.artist.toLowerCase(),
        candidate.artist.toLowerCase()
      );
      score += artistSimilarity * weights.artist;
    }
    
    const expectedDuration = candidate.expectedDuration || 0;
    if (expectedDuration > 0) {
      const durationDiff = Math.abs(actualDuration - expectedDuration);
      if (durationDiff <= 5) {
        score += weights.duration;
      } else if (durationDiff <= 15) {
        score += weights.duration * (1 - durationDiff / 30);
        anomalies.push(`时长偏差${durationDiff.toFixed(1)}秒`);
      } else {
        anomalies.push(`时长偏差过大：${durationDiff.toFixed(1)}秒`);
      }
    }
    
    if (score > highestConfidence) {
      highestConfidence = score;
      bestMatch = candidate;
    }
  }
  
  let matchType: MatchResult['matchType'] = 'none';
  if (highestConfidence >= 0.9) {
    matchType = 'auto';
  } else if (highestConfidence >= 0.7) {
    matchType = 'suggest';
  } else if (highestConfidence >= 0.5) {
    matchType = 'manual';
  }
  
  return {
    materialId,
    trackId: bestMatch ? bestMatch.id : null,
    confidence: Math.round(highestConfidence * 1000) / 10,
    matchType,
    anomalies: Array.from(new Set(anomalies)),
  };
}
