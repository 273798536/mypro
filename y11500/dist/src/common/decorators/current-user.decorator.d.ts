export interface CurrentUser {
    id: string;
    username: string;
    name: string;
    role: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
