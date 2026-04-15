declare module "sql.js" {
  export type BindParams = Record<string, unknown> | unknown[];

  export interface Statement {
    bind(params?: BindParams): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  export interface Database {
    prepare(sql: string): Statement;
    run(sql: string, params?: BindParams): void;
    exec(sql: string): unknown;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
