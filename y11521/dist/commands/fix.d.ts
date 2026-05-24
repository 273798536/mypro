export declare function handleFix(dirtyId: string | undefined, options: {
    all?: boolean;
    auto?: boolean;
}): Promise<void>;
export declare function handleApprove(dirtyId: string): Promise<void>;
export declare function handleReject(dirtyId: string, reason: string): Promise<void>;
