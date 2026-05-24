import { Model, Optional } from 'sequelize';
import { UserRole } from './types';
interface UserAttributes {
    id: number;
    username: string;
    password: string;
    realName: string;
    email: string;
    role: UserRole;
    department: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'isActive'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: number;
    username: string;
    password: string;
    realName: string;
    email: string;
    role: UserRole;
    department: string;
    isActive: boolean;
    lastLoginAt?: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default User;
