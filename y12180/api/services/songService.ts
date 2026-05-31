import SongRepository from '../repositories/songRepository';
import MatchRepository from '../repositories/matchRepository';
import ConflictRepository from '../repositories/conflictRepository';
import AuditService from './auditService';
import type { Song } from '../../shared/types';
import * as XLSX from 'xlsx';

export class SongService {
  private songRepo = new SongRepository();
  private matchRepo = new MatchRepository();
  private conflictRepo = new ConflictRepository();
  private auditService = new AuditService();

  private currentUser = 'admin';

  getAll(params: Parameters<typeof this.songRepo.findAll>[0] = {}) {
    return this.songRepo.findAll(params);
  }

  getById(id: string) {
    return this.songRepo.findById(id);
  }

  create(song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = this.songRepo.create(song);
    this.auditService.log('song_create', 'song', created.id, this.currentUser, `添加歌曲：${song.name} - ${song.artist}`);
    return created;
  }

  async importFromExcel(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;

    const errors: string[] = [];
    const validSongs: Array<Omit<Song, 'id' | 'createdAt' | 'updatedAt'>> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = String(row['歌曲名称'] || row['name'] || row['歌名'] || '').trim();
      const artist = String(row['歌手'] || row['artist'] || row['演唱者'] || '').trim();
      const duration = Number(row['时长'] || row['duration'] || 0);

      if (!name || !artist) {
        errors.push(`第 ${i + 2} 行：缺少歌曲名称或歌手信息`);
        continue;
      }

      validSongs.push({
        name,
        artist,
        duration,
        source: 'playlist',
      });
    }

    let imported = 0;
    if (validSongs.length > 0) {
      const created = this.songRepo.bulkCreate(validSongs);
      imported = created.length;
      this.auditService.log('songs_import', 'song', 'batch', this.currentUser, `批量导入 ${imported} 首歌曲`);
    }

    return { imported, errors };
  }

  delete(id: string): boolean {
    const song = this.songRepo.findById(id);
    if (!song) return false;

    this.conflictRepo.deleteByMatchResultId(id);
    this.matchRepo.deleteByPlaylistSongId(id);
    
    const deleted = this.songRepo.delete(id);
    if (deleted) {
      this.auditService.log('song_delete', 'song', id, this.currentUser, `删除歌曲：${song.name} - ${song.artist}`);
    }
    return deleted;
  }

  getAllArtists() {
    return this.songRepo.getAllArtists();
  }
}

export default SongService;
