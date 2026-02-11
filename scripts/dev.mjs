import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      resolve(err && err.code === 'EADDRINUSE');
    });
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(false));
    });
  });
}

function looksLikeNextHtml(html) {
  return typeof html === 'string' && (html.includes('__NEXT_DATA__') || html.includes('next/static'));
}

function detectNextOnPort(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/', timeout: 600 },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > 100_000) res.destroy();
        });
        res.on('end', () => resolve(looksLikeNextHtml(data)));
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function findFreePort(startPort, maxTries = 20) {
  for (let p = startPort; p < startPort + maxTries; p++) {
    // eslint-disable-next-line no-await-in-loop
    const inUse = await isPortInUse(p);
    if (!inUse) return p;
  }
  return null;
}

const basePort = Number.parseInt(process.env.PORT || '3000', 10) || 3000;

if (await isPortInUse(basePort)) {
  const isNext = await detectNextOnPort(basePort);
  if (isNext) {
    console.log(`Dev server already running: http://localhost:${basePort}`);
    process.exit(0);
  }
}

const port = (await findFreePort(basePort)) ?? (await findFreePort(3000));
if (!port) {
  console.error('Could not find a free port to start the dev server.');
  process.exit(1);
}

try {
  fs.mkdirSync(path.join(process.cwd(), '.next'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), '.next', 'dev-port.txt'), String(port), 'utf8');
} catch {
  // ignore
}

const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) },
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number') process.exit(code);
  if (signal) process.exit(1);
  process.exit(1);
});

