export declare function handleLogin(username: string, password: string): Promise<void>;
export declare function handleLogout(): Promise<void>;
export declare function handleWhoami(): Promise<void>;
export declare function requireLogin(): void;
export declare function requirePermission(action: string): void;
