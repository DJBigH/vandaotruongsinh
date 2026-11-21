import http from 'node:http';
import type { ServiceName } from '../shared/types';

type Readiness = 'identified' | 'degraded' | 'unidentified' | 'unavailable';

export function probeGameService(service: ServiceName, port: number): Promise<Readiness> {
  const endpoint = service === 'server' ? '/api/health' : '/';
  return new Promise((resolve) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: endpoint }, (res) => {
      const mime = res.headers['content-type']?.split(';')[0].trim().toLowerCase();
      const expected = service === 'server' ? 'application/json' : 'text/html';
      if ((res.statusCode !== 200 && !(service === 'server' && res.statusCode === 503)) || mime !== expected) {
        resolve('unidentified');
        res.destroy();
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 256 * 1024) { resolve('unidentified'); res.destroy(); }
        else chunks.push(chunk);
      });
      res.on('error', () => resolve('unidentified'));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (service === 'client') {
          resolve(/<html\b[^>]*\sdata-vandao-game="van-dao-truong-sinh"(?=[\s>])/i.test(body) ? 'identified' : 'unidentified');
          return;
        }
        try {
          const health = JSON.parse(body);
          resolve(health?.game === 'Vạn Đạo Trường Sinh' && health.status === 'ok' && res.statusCode === 200
            ? 'identified' : health?.game === 'Vạn Đạo Trường Sinh' && health.status === 'degraded' && res.statusCode === 503
              ? 'degraded' : 'unidentified');
        } catch { resolve('unidentified'); }
      });
    });
    const deadline = setTimeout(() => { resolve('unidentified'); request.destroy(); }, 1200);
    request.once('close', () => clearTimeout(deadline));
    request.once('error', () => resolve('unavailable'));
  });
}
