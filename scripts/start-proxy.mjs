import { existsSync } from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const host = process.env.STARTP_HOST || '127.0.0.1';
const cloudflaredBin = process.env.CLOUDFLARED_BIN || 'cloudflared';
const buildIdPath = '.next/BUILD_ID';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nextStartArgs = ['run', 'start', '--', '-H', host, '-p', port];
const buildArgs = ['run', 'build'];
const cloudflaredArgs = ['tunnel', '--url', `http://${host}:${port}`];

let nextProcess = null;
let cloudflaredProcess = null;
let shuttingDown = false;

function quoteForCmd(argument) {
  if (!/[ \t"&()^[\]{}=;!'+,`~]/.test(argument)) {
    return argument;
  }

  return `"${argument.replace(/"/g, '""')}"`;
}

function spawnProcess(command, args, options = {}) {
  if (process.platform === 'win32' && command === npmCommand) {
    return spawn(
      'cmd.exe',
      ['/d', '/s', '/c', `${command} ${args.map(quoteForCmd).join(' ')}`],
      options
    );
  }

  return spawn(command, args, options);
}

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, {
      stdio: 'inherit',
      env: process.env
    });

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function waitForPort(targetHost, targetPort, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function tryConnect() {
      const socket = net.createConnection(
        {
          host: targetHost,
          port: Number(targetPort)
        },
        () => {
          socket.end();
          resolve();
        }
      );

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for http://${targetHost}:${targetPort}`));
          return;
        }

        setTimeout(tryConnect, 500);
      });
    }

    tryConnect();
  });
}

function stopChild(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGINT');
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopChild(cloudflaredProcess);
  stopChild(nextProcess);

  setTimeout(() => {
    process.exit(exitCode);
  }, 150);
}

async function ensureBuild() {
  if (existsSync(buildIdPath) || process.env.STARTP_SKIP_BUILD === '1') {
    return;
  }

  console.log('No production build found. Running `npm run build` first...');
  await runCommand(npmCommand, buildArgs, 'Build');
}

async function main() {
  await ensureBuild();

  console.log(`Starting Next.js on http://${host}:${port} ...`);
  nextProcess = spawnProcess(npmCommand, nextStartArgs, {
    stdio: 'inherit',
    env: process.env
  });

  nextProcess.once('error', (error) => {
    console.error(`Failed to start Next.js: ${error.message}`);
    shutdown(1);
  });

  nextProcess.once('exit', (code) => {
    if (!shuttingDown) {
      console.error(`Next.js exited with code ${code ?? 'unknown'}.`);
      shutdown(typeof code === 'number' ? code : 1);
    }
  });

  await waitForPort(host, port);

  console.log(`Opening Cloudflared tunnel for http://${host}:${port} ...`);
  cloudflaredProcess = spawnProcess(cloudflaredBin, cloudflaredArgs, {
    stdio: 'inherit',
    env: process.env
  });

  cloudflaredProcess.once('error', (error) => {
    console.error(`Failed to start Cloudflared: ${error.message}`);
    console.error('Install Cloudflared or set CLOUDFLARED_BIN to the correct executable path.');
    shutdown(1);
  });

  cloudflaredProcess.once('exit', (code) => {
    if (!shuttingDown) {
      console.error(`Cloudflared exited with code ${code ?? 'unknown'}.`);
      shutdown(typeof code === 'number' ? code : 1);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Failed to start proxy.');
  shutdown(1);
});
