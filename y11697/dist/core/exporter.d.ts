import { Schedule, Doctor, Department } from '../types';
export declare function exportToICal(schedule: Schedule, doctors: Doctor[], departments: Department[]): string;
export declare function exportDoctorICal(schedule: Schedule, doctorId: string, doctor: Doctor | undefined, departments: Department[]): string;
export declare function exportToCsv(schedule: Schedule, doctors: Doctor[], departments: Department[]): string;
