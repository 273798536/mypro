import { Router } from 'express';
import {
  getSongs,
  getSong,
  createSong,
  importSongs,
  deleteSong,
  getArtists,
  upload,
} from '../controllers/songController';

const router = Router();

router.get('/', getSongs);
router.get('/artists', getArtists);
router.get('/:id', getSong);
router.post('/', createSong);
router.post('/import', upload.single('file'), importSongs);
router.delete('/:id', deleteSong);

export default router;
