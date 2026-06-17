import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/init';
import * as RecordController from './controllers/RecordController';
import * as ImportController from './controllers/ImportController';
import * as ExportController from './controllers/ExportController';

initDatabase();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/records', RecordController.getRecords);
app.get('/api/records/:id', RecordController.getRecord);
app.post('/api/records', RecordController.createRecord);
app.put('/api/records/:id', RecordController.updateRecord);
app.delete('/api/records/:id', RecordController.deleteRecord);

app.post('/api/issues/:issueId/resolve', RecordController.resolveIssue);

app.get('/api/validate/coordinates/:id', RecordController.validateCoordinates);
app.get('/api/similar-locations', RecordController.findSimilarLocations);
app.post('/api/merge/locations', RecordController.mergeLocations);

app.get('/api/history/:recordId', RecordController.getHistory);

app.post('/api/import/excel', ImportController.upload.single('file'), ImportController.importExcel);
app.post('/api/import/preview', ImportController.upload.single('file'), ImportController.previewImport);
app.post('/api/import/manual', ImportController.manualImport);

app.post('/api/export/preview', ExportController.getExportPreview);
app.post('/api/export/excel', ExportController.exportExcel);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
