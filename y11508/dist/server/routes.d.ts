import { Router } from 'express';
import { DatabaseService } from '../db/service';
import { StatusLinkEngine } from '../engine/status-link';
import { DataImportService } from '../imports';
import { ReportService } from '../reports';
export declare function createApiRouter(dbService: DatabaseService, statusEngine: StatusLinkEngine, importService: DataImportService, reportService: ReportService): Router;
