export declare abstract class BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    isDeleted: boolean;
}
