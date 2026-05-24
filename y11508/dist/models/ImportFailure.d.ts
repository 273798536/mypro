import { ImportSource, Role } from '../types';
export declare class ImportFailureEntity {
    id: string;
    source: ImportSource;
    rowNumber: number;
    rawData: string;
    errorMessage: string;
    importedAt: Date;
    importedBy: string;
}
export declare class UserEntity {
    id: string;
    username: string;
    role: Role;
    department: string;
    createdAt: Date;
}
