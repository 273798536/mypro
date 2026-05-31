import { Request, Response } from 'express';
import SongService from '../services/songService';
import multer from 'multer';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

const songService = new SongService();

export const getSongs = async (req: Request, res: Response) => {
  try {
    const { page, pageSize, search, artist } = req.query;
    const params = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search as string | undefined,
      artist: artist as string | undefined,
    };
    const result = songService.getAll(params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取歌曲列表失败', message: (error as Error).message });
  }
};

export const getSong = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const song = songService.getById(id);
    if (!song) {
      return res.status(404).json({ error: '歌曲不存在' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: '获取歌曲详情失败', message: (error as Error).message });
  }
};

export const createSong = async (req: Request, res: Response) => {
  try {
    const { name, artist, duration } = req.body;
    if (!name || !artist) {
      return res.status(400).json({ error: '歌曲名称和歌手不能为空' });
    }
    const song = songService.create({
      name,
      artist,
      duration: duration || 0,
      source: 'playlist',
    });
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: '创建歌曲失败', message: (error as Error).message });
  }
};

export const importSongs = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传Excel文件' });
    }
    const result = await songService.importFromExcel(req.file.buffer);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '导入失败', message: (error as Error).message });
  }
};

export const deleteSong = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = songService.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: '歌曲不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除失败', message: (error as Error).message });
  }
};

export const getArtists = async (_req: Request, res: Response) => {
  try {
    const artists = songService.getAllArtists();
    res.json(artists);
  } catch (error) {
    res.status(500).json({ error: '获取歌手列表失败', message: (error as Error).message });
  }
};
