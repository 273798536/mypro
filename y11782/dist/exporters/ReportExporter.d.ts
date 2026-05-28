import { CheckReport } from '../models/types';
export declare class ReportExporter {
    private report;
    private explainer;
    constructor(report: CheckReport);
    exportToJSON(): string;
    exportToHTML(): string;
    private getStyles;
    private renderSummary;
    private renderTopology;
    private renderAnomalies;
    private renderAnomalyCard;
    private renderRecommendations;
    private renderDataSource;
    private getSeverityText;
    exportToText(): string;
}
