import { Role } from '../common/enums/role.enum';
export declare class User {
    id: string;
    username: string;
    password: string;
    name: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
