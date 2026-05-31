import SongRepository from '../repositories/songRepository';
import CopyrightRepository from '../repositories/copyrightRepository';
import MatchRepository from '../repositories/matchRepository';
import ConflictRepository from '../repositories/conflictRepository';
import AuditService from './auditService';
import type { Song, Copyright, MatchResult, Conflict, RiskLevel, MatchStatus } from '../../shared/types';

export class MatchService {
  private songRepo = new SongRepository();
  private copyrightRepo = new CopyrightRepository();
  private matchRepo = new MatchRepository();
  private conflictRepo = new ConflictRepository();
  private auditService = new AuditService();

  private currentUser = 'admin';

  async runMatching(): Promise<{ total: number; created: number; updated: number }> {
    const songs = this.songRepo.findAll({ pageSize: 1000 }).data;
    let created = 0;
    let updated = 0;

    this.matchRepo.deleteAll();
    this.conflictRepo.deleteAll();
    this.auditService.log('match_run', 'match', 'batch', this.currentUser, `开始批量匹配 ${songs.length} 首歌曲`);

    for (const song of songs) {
      const { result, conflicts } = this.matchSong(song);
      const existing = this.matchRepo.findByPlaylistSongId(song.id);
      
      let matchResultId: string;
      if (existing) {
        this.matchRepo.update(existing.id, result);
        matchResultId = existing.id;
        updated++;
      } else {
        const newResult = this.matchRepo.create(result);
        matchResultId = newResult.id;
        created++;
      }

      for (const conflict of conflicts) {
        this.conflictRepo.create({
          matchResultId,
          type: conflict.type,
          playlistData: conflict.playlistData,
          copyrightData: conflict.copyrightData,
        });
      }
    }

    this.auditService.log('match_complete', 'match', 'batch', this.currentUser, `批量匹配完成：新建 ${created}，更新 ${updated}`);

    return {
      total: songs.length,
      created,
      updated,
    };
  }

  matchSong(song: Song): {
    result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'>;
    conflicts: Array<{
      type: Conflict['type'];
      playlistData: Partial<Song>;
      copyrightData: Partial<Copyright>;
    }>;
  } {
    const exactMatch = this.copyrightRepo.findExactMatch(song.name, song.artist);
    
    if (exactMatch) {
      return this.createMatchResult(song, exactMatch, 'full', 1.0);
    }

    const fuzzyMatches = this.copyrightRepo.findByNameFuzzy(song.name);
    
    if (fuzzyMatches.length === 0) {
      return { result: this.createNoMatchResult(song), conflicts: [] };
    }

    const nameMatches = fuzzyMatches.filter(c => 
      this.normalizeString(c.songName) === this.normalizeString(song.name)
    );

    if (nameMatches.length > 0) {
      const artistMatch = nameMatches.find(c => 
        this.normalizeString(c.artist) === this.normalizeString(song.artist)
      );
      
      if (artistMatch) {
        return this.createMatchResult(song, artistMatch, 'partial', 0.85);
      }

      const coverMatch = nameMatches.find(c => c.isCover && c.originalArtist === song.artist);
      if (coverMatch) {
        return this.createCoverMatchResult(song, coverMatch);
      }

      return this.createArtistMismatchResult(song, nameMatches[0]);
    }

    if (fuzzyMatches.length > 0) {
      return this.createPartialMatchResult(song, fuzzyMatches[0]);
    }

    return { result: this.createNoMatchResult(song), conflicts: [] };
  }

  private createMatchResult(
    song: Song,
    copyright: Copyright,
    matchStatus: MatchStatus,
    confidence: number
  ): {
    result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'>;
    conflicts: Array<{
      type: Conflict['type'];
      playlistData: Partial<Song>;
      copyrightData: Partial<Copyright>;
    }>;
  } {
    const riskAnalysis = this.analyzeRisk(song, copyright, matchStatus, confidence);
    const conflicts = this.detectConflicts(song, copyright);

    if (conflicts.length > 0) {
      matchStatus = 'conflict';
    }

    const result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'> = {
      playlistSongId: song.id,
      copyrightId: copyright.id,
      matchStatus,
      matchConfidence: confidence,
      riskLevel: riskAnalysis.level,
      riskReasons: riskAnalysis.reasons,
      isCoverDetected: copyright.isCover,
      regionRestrictions: riskAnalysis.restrictedRegions,
    };

    return { result, conflicts };
  }

  private createNoMatchResult(song: Song): Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      playlistSongId: song.id,
      copyrightId: null,
      matchStatus: 'none',
      matchConfidence: 0,
      riskLevel: 'high',
      riskReasons: ['曲库中未找到匹配的版权授权记录'],
      isCoverDetected: false,
      regionRestrictions: [],
    };
  }

  private createPartialMatchResult(
    song: Song,
    copyright: Copyright
  ): {
    result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'>;
    conflicts: Array<{
      type: Conflict['type'];
      playlistData: Partial<Song>;
      copyrightData: Partial<Copyright>;
    }>;
  } {
    const confidence = this.calculateConfidence(song, copyright);
    const riskAnalysis = this.analyzeRisk(song, copyright, 'partial', confidence);
    const conflicts = this.detectConflicts(song, copyright);

    const result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'> = {
      playlistSongId: song.id,
      copyrightId: copyright.id,
      matchStatus: conflicts.length > 0 ? 'conflict' : 'partial',
      matchConfidence: confidence,
      riskLevel: riskAnalysis.level,
      riskReasons: ['歌曲名称不完全匹配，需要人工确认'] as string[],
      isCoverDetected: copyright.isCover,
      regionRestrictions: riskAnalysis.restrictedRegions,
    };

    return { result, conflicts };
  }

  private createArtistMismatchResult(
    song: Song,
    copyright: Copyright
  ): {
    result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'>;
    conflicts: Array<{
      type: Conflict['type'];
      playlistData: Partial<Song>;
      copyrightData: Partial<Copyright>;
    }>;
  } {
    const confidence = 0.6;
    const riskAnalysis = this.analyzeRisk(song, copyright, 'partial', confidence);
    const reasons = ['歌手信息不匹配，可能是同名不同人或翻唱版本'] as string[];
    reasons.push(...riskAnalysis.reasons);

    const conflicts = [
      {
        type: 'artist_mismatch' as Conflict['type'],
        playlistData: { name: song.name, artist: song.artist },
        copyrightData: { songName: copyright.songName, artist: copyright.artist },
      },
      ...this.detectConflicts(song, copyright),
    ];

    const result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'> = {
      playlistSongId: song.id,
      copyrightId: copyright.id,
      matchStatus: 'conflict',
      matchConfidence: confidence,
      riskLevel: 'medium',
      riskReasons: reasons,
      isCoverDetected: copyright.isCover,
      regionRestrictions: riskAnalysis.restrictedRegions,
    };

    return { result, conflicts };
  }

  private createCoverMatchResult(
    song: Song,
    copyright: Copyright
  ): {
    result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'>;
    conflicts: Array<{
      type: Conflict['type'];
      playlistData: Partial<Song>;
      copyrightData: Partial<Copyright>;
    }>;
  } {
    const confidence = 0.9;
    const riskAnalysis = this.analyzeRisk(song, copyright, 'partial', confidence);
    const reasons = [`检测到翻唱版本，原唱：${copyright.originalArtist}`] as string[];
    reasons.push(...riskAnalysis.reasons);

    const conflicts = [
      {
        type: 'cover_version' as Conflict['type'],
        playlistData: { name: song.name, artist: song.artist },
        copyrightData: { songName: copyright.songName, artist: copyright.artist, originalArtist: copyright.originalArtist },
      },
      ...this.detectConflicts(song, copyright),
    ];

    const result: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'> = {
      playlistSongId: song.id,
      copyrightId: copyright.id,
      matchStatus: 'partial',
      matchConfidence: confidence,
      riskLevel: 'low',
      riskReasons: reasons,
      isCoverDetected: true,
      regionRestrictions: riskAnalysis.restrictedRegions,
    };

    return { result, conflicts };
  }

  private analyzeRisk(
    song: Song,
    copyright: Copyright,
    matchStatus: MatchStatus,
    confidence: number
  ): { level: RiskLevel; reasons: string[]; restrictedRegions: string[] } {
    const reasons: string[] = [];
    let level: RiskLevel = 'none';
    const restrictedRegions: string[] = [];

    const isExpired = this.copyrightRepo.checkLicenseExpired(copyright.id);
    if (isExpired) {
      reasons.push(`授权已过期，有效期至 ${copyright.validTo}`);
      level = 'high';
    }

    if (copyright.licenseType === 'cover') {
      reasons.push('翻唱授权，需确保原唱授权同时有效');
      if (level === 'none') level = 'low';
    }

    if (copyright.licenseType === 'non-exclusive') {
      reasons.push('非独家授权，可能存在其他平台限制');
      if (level === 'none') level = 'low';
    }

    if (matchStatus === 'partial') {
      if (level === 'none') level = 'low';
    }

    if (confidence < 0.7) {
      reasons.push('匹配置信度较低，建议人工复核');
      if (level === 'none' || level === 'low') level = 'medium';
    }

    const allRegions = ['CN', 'HK', 'TW', 'US', 'CA', 'UK', 'JP', 'SG', 'MY', 'AU', 'EU'];
    for (const region of allRegions) {
      if (!copyright.authorizedRegions.includes(region)) {
        restrictedRegions.push(region);
      }
    }

    if (restrictedRegions.length > 0) {
      reasons.push(`授权地区限制：仅覆盖 ${copyright.authorizedRegions.join(', ')}`);
    }

    return { level, reasons, restrictedRegions };
  }

  private detectConflicts(song: Song, copyright: Copyright): Array<{
    type: Conflict['type'];
    playlistData: Partial<Song>;
    copyrightData: Partial<Copyright>;
  }> {
    const conflicts: Array<{
      type: Conflict['type'];
      playlistData: Partial<Song>;
      copyrightData: Partial<Copyright>;
    }> = [];

    if (this.normalizeString(song.name) !== this.normalizeString(copyright.songName)) {
      conflicts.push({
        type: 'name_mismatch',
        playlistData: { name: song.name },
        copyrightData: { songName: copyright.songName },
      });
    }

    if (this.normalizeString(song.artist) !== this.normalizeString(copyright.artist)) {
      if (!copyright.isCover || copyright.originalArtist !== song.artist) {
        conflicts.push({
          type: 'artist_mismatch',
          playlistData: { artist: song.artist },
          copyrightData: { artist: copyright.artist, originalArtist: copyright.originalArtist },
        });
      }
    }

    const isExpired = this.copyrightRepo.checkLicenseExpired(copyright.id);
    if (isExpired) {
      conflicts.push({
        type: 'license_expired',
        playlistData: { name: song.name, artist: song.artist },
        copyrightData: { validTo: copyright.validTo, songName: copyright.songName },
      });
    }

    return conflicts;
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[，。！？、,./!?]/g, '')
      .replace(/[（）()《》"']/g, '');
  }

  private calculateConfidence(song: Song, copyright: Copyright): number {
    const nameSim = this.stringSimilarity(
      this.normalizeString(song.name),
      this.normalizeString(copyright.songName)
    );
    const artistSim = this.stringSimilarity(
      this.normalizeString(song.artist),
      this.normalizeString(copyright.artist)
    );
    return nameSim * 0.6 + artistSim * 0.4;
  }

  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;
    
    if (longerLength === 0) return 1.0;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    return matches / longerLength;
  }

  getMatchById(id: string) {
    return this.matchRepo.findById(id);
  }

  getAllMatches(params: Parameters<typeof this.matchRepo.findAll>[0] = {}) {
    return this.matchRepo.findAll(params);
  }

  getStats() {
    return this.matchRepo.getStats();
  }
}

export default MatchService;
