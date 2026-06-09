declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: typeof Database;
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    run(sql: string, params?: any[]): this;
    exec(sql: string, params?: any[]): QueryResults[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
    create_function(name: string, func: (...args: any[]) => any): void;
    create_aggregate(name: string, functions: {
      init?: () => any;
      step: (state: any, ...args: any[]) => any;
      finalize?: (state: any) => any;
    }): void;
  }

  export interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    get(params?: any[]): any[];
    getAsObject(params?: Record<string, any>): Record<string, any>;
    getColumnNames(): string[];
    free(): boolean;
    reset(): this;
    run(params?: any[]): void;
  }

  export interface QueryResults {
    columns: string[];
    values: any[][];
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
