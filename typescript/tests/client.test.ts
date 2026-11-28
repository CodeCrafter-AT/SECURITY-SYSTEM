import net from 'node:net';
import { describe, expect, it } from 'vitest';
import { AuthenticationError, KeyNotFoundError, MiniKV } from '../src/index.js';

describe('@minikv/client TypeScript SDK', () => {
  it('supports concurrent requests, correlation IDs, and typed errors', async () => {
    const store = new Map<string, string>();
    const srv = net.createServer((sock) => {
      let buf = '';
      sock.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        while (true) {
          const idx = buf.indexOf('\n');
          if (idx < 0) break;
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          const req = JSON.parse(line) as { id: string; op: string; args: Record<string, string> };
          let resp: unknown;
          if (req.op === 'AUTH') {
            if (req.args.token === 'ok') {
              resp = { id: req.id, ok: true, result: { authenticated: true } };
            } else {
              resp = { id: req.id, ok: false, error: { code: 'AUTH_FAILED', message: 'bad token' } };
            }
          } else if (req.op === 'SET') {
            store.set(req.args.key, req.args.value);
            resp = { id: req.id, ok: true, result: { stored: true } };
          } else if (req.op === 'GET') {
            if (store.has(req.args.key)) {
              resp = { id: req.id, ok: true, result: { value: store.get(req.args.key) } };
            } else {
              resp = {
                id: req.id,
                ok: false,
                error: { code: 'NOT_FOUND', message: 'missing' },
              };
            }
          } else {
            resp = { id: req.id, ok: true, result: { pong: true } };
          }
          sock.write(`${JSON.stringify(resp)}\n`);
        }
      });
    });

    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()));
    const port = (srv.address() as net.AddressInfo).port;

    const badAuth = new MiniKV({ host: '127.0.0.1', port, authToken: 'wrong' });
    await expect(badAuth.ping()).rejects.toBeInstanceOf(AuthenticationError);
    await badAuth.close();

    const db = new MiniKV({ host: '127.0.0.1', port, authToken: 'ok' });
    try {
      expect(await db.ping()).toBe(true);
      await Promise.all([db.set('a', '1'), db.set('b', '2')]);
      const [va, vb] = await Promise.all([db.get('a'), db.get('b')]);
      expect(va).toBe('1');
      expect(vb).toBe('2');
      await expect(db.get('missing')).rejects.toBeInstanceOf(KeyNotFoundError);
    } finally {
      await db.close();
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });
});
