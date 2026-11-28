export interface MiniKVOptions {
    host?: string;
    port?: number;
    timeoutMs?: number;
    authToken?: string;
}
export interface MsetEntry {
    key: string;
    value: string;
    ttlSecs?: number;
}
export declare class MiniKV {
    private readonly host;
    private readonly port;
    private readonly timeoutMs;
    private readonly authToken?;
    private socket;
    private connectPromise;
    private buffer;
    private readonly pending;
    private closed;
    constructor(options?: MiniKVOptions);
    private ensureConnected;
    private openConnection;
    private handleChunk;
    private failAllPending;
    private request;
    private sendRaw;
    ping(): Promise<boolean>;
    set(key: string, value: string, ttlSecs?: number): Promise<boolean>;
    get(key: string): Promise<string>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    mset(entries: MsetEntry[]): Promise<number>;
    mget(keys: string[]): Promise<Record<string, string | null>>;
    incr(key: string, delta?: number): Promise<number>;
    expire(key: string, ttlSecs: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    persist(key: string): Promise<boolean>;
    info(): Promise<Record<string, unknown>>;
    stats(): Promise<Record<string, unknown>>;
    compact(): Promise<Record<string, unknown>>;
    close(): Promise<void>;
}
