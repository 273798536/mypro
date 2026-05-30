import { Router } from 'express';
import { MonitoringRepository } from '../repositories/monitoringRepository';
import { MonitoringService } from '../services/monitoringService';
export declare function createMonitoringRoutes(repository: MonitoringRepository, service: MonitoringService): Router;
