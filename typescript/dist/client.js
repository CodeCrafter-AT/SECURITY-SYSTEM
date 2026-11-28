import crypto from 'node:crypto';
import net from 'node:net';
import { mapProtocolError, MiniKVConnectionError, MiniKVError, MiniKVTimeoutError, } from './errors.js';
export class MiniKV {
    host;
    port;
    timeoutMs;
    authToken;
    socket = null;
    connectPromise = null;
    buffer = '';
    pending = new Map();
    closed = false;
    constructor(options = {}) {
        this.host = options.host ?? '127.0.0.1';
        this.port = options.port ?? 6380;
        this.timeoutMs = options.timeoutMs ?? 10_000;
        this.authToken = options.authToken;
    }
    async ensureConnected() {
        if (this.closed) {
            throw new MiniKVConnectionError('MiniKV client has been closed', 'CONNECTION_ERROR');
        }
        if (this.socket && !this.socket.destroyed) {
            return this.socket;
        }
        if (!this.connectPromise) {
            this.connectPromise = this.openConnection();
        }
        await this.connectPromise;
        if (!this.socket || this.socket.destroyed) {
            throw new MiniKVConnectionError('Failed to open TCP socket', 'CONNECTION_ERROR');
        }
        return this.socket;
    }
    async openConnection() {
        try {
            const sock = await new Promise((resolve, reject) => {
                const s = net.createConnection({ host: this.host, port: this.port });
                const timer = setTimeout(() => {
                    s.destroy();
                    reject(new MiniKVTimeoutError(`Connection timed out to ${this.host}:${this.port}`, 'TIMEOUT'));
                }, this.timeoutMs);
                s.once('connect', () => {
                    clearTimeout(timer);
                    resolve(s);
                });
                s.once('error', (err) => {
                    clearTimeout(timer);
                    reject(new MiniKVConnectionError(`Connection failed to ${this.host}:${this.port}: ${err.message}`, 'CONNECTION_ERROR'));
                });
            });
            sock.setNoDelay(true);
            sock.on('data', (chunk) => this.handleChunk(chunk));
            sock.on('error', (err) => this.failAllPending(new MiniKVConnectionError(err.message, 'CONNECTION_ERROR')));
            sock.on('close', () => {
                this.socket = null;
                this.connectPromise = null;
                this.failAllPending(new MiniKVConnectionError('Server connection closed', 'CONNECTION_ERROR'));
            });
            this.socket = sock;
            if (this.authToken !== undefined) {
                await this.sendRaw(sock, 'AUTH', { token: this.authToken });
            }
        }
        catch (err) {
            if (this.socket && !this.socket.destroyed) {
                this.socket.destroy();
            }
            this.socket = null;
            this.connectPromise = null;
            throw err;
        }
    }
    handleChunk(chunk) {
        this.buffer += chunk.toString('utf8');
        while (true) {
            const nlIdx = this.buffer.indexOf('\n');
            if (nlIdx < 0)
                break;
            const line = this.buffer.slice(0, nlIdx).trim();
            this.buffer = this.buffer.slice(nlIdx + 1);
            if (!line)
                continue;
            let resp;
            try {
                resp = JSON.parse(line);
            }
            catch (err) {
                this.failAllPending(new MiniKVError(`Malformed JSON response: ${err instanceof Error ? err.message : String(err)}`));
                continue;
            }
            const pending = this.pending.get(resp.id);
            if (!pending)
                continue;
            this.pending.delete(resp.id);
            clearTimeout(pending.timer);
            if (resp.ok) {
                pending.resolve(resp.result ?? {});
            }
            else {
                const code = resp.error?.code ?? 'INTERNAL_ERROR';
                const message = resp.error?.message ?? 'Unknown server error';
                pending.reject(mapProtocolError(code, message));
            }
        }
    }
    failAllPending(err) {
        for (const [id, entry] of this.pending.entries()) {
            clearTimeout(entry.timer);
            entry.reject(err);
            this.pending.delete(id);
        }
    }
    async request(op, args = {}) {
        const sock = await this.ensureConnected();
        return this.sendRaw(sock, op, args);
    }
    sendRaw(sock, op, args) {
        const id = crypto.randomUUID();
        const frame = { id, op, args };
        const line = `${JSON.stringify(frame)}\n`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new MiniKVTimeoutError(`Request ${op} timed out after ${this.timeoutMs}ms`, 'TIMEOUT'));
            }, this.timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            sock.write(line, 'utf8', (err) => {
                if (err) {
                    this.pending.delete(id);
                    clearTimeout(timer);
                    reject(new MiniKVConnectionError(err.message, 'CONNECTION_ERROR'));
                }
            });
        });
    }
    async ping() {
        const res = await this.request('PING');
        return Boolean(res.pong);
    }
    async set(key, value, ttlSecs) {
        const args = { key, value };
        if (ttlSecs !== undefined) {
            args.ttl_secs = ttlSecs;
        }
        const res = await this.request('SET', args);
        return Boolean(res.stored);
    }
    async get(key) {
        const res = await this.request('GET', { key });
        return String(res.value);
    }
    async delete(key) {
        const res = await this.request('DEL', { key });
        return Boolean(res.deleted);
    }
    async exists(key) {
        const res = await this.request('EXISTS', { key });
        return Boolean(res.exists);
    }
    async mset(entries) {
        const formatted = entries.map((e) => ({
            key: e.key,
            value: e.value,
            ttl_secs: e.ttlSecs ?? null,
        }));
        const res = await this.request('MSET', { entries: formatted });
        return Number(res.set_count ?? 0);
    }
    async mget(keys) {
        const res = await this.request('MGET', { keys });
        return res.values ?? {};
    }
    async incr(key, delta = 1) {
        const res = await this.request('INCR', { key, delta });
        return Number(res.value);
    }
    async expire(key, ttlSecs) {
        const res = await this.request('EXPIRE', { key, ttl_secs: ttlSecs });
        return Boolean(res.updated);
    }
    async ttl(key) {
        const res = await this.request('TTL', { key });
        return Number(res.ttl_secs);
    }
    async persist(key) {
        const res = await this.request('PERSIST', { key });
        return Boolean(res.persisted);
    }
    async info() {
        return this.request('INFO');
    }
    async stats() {
        return this.request('STATS');
    }
    async compact() {
        return this.request('COMPACT');
    }
    async close() {
        this.closed = true;
        this.failAllPending(new MiniKVConnectionError('Client closed', 'CONNECTION_ERROR'));
        if (this.socket && !this.socket.destroyed) {
            await new Promise((resolve) => {
                this.socket.end(() => resolve());
            });
        }
        this.socket = null;
    }
}
//# sourceMappingURL=client.js.map