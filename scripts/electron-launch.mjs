import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const defaultPort = Number(process.env.ELECTRON_APP_PORT || '51425');
const host = process.env.ELECTRON_APP_HOST || '127.0.0.1';
const buildOutputPath = 'dist/index.html';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const lockFilePath = path.resolve(process.env.ELECTRON_LOCK_FILE || '.electron-app.lock');
const settingsFilePath = path.join(
  process.env.APPDATA || path.join(os.homedir(), '.config'),
  'Slurs.tf2',
  'settings.json'
);

let rendererServer = null;
let electronProcess = null;
let shuttingDown = false;
let ownsLock = false;

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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' });

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server is ready.
    }

    await wait(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function stopChild(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGINT');
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'EPERM');
  }
}

function acquireLock() {
  if (existsSync(lockFilePath)) {
    try {
      const payload = JSON.parse(readFileSync(lockFilePath, 'utf8'));

      if (payload?.pid && isProcessAlive(payload.pid)) {
        throw new Error(
          `Slurs.tf2 Electron is already running (pid ${payload.pid}). Remove ${path.basename(lockFilePath)} only if that process is gone.`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already running')) {
        throw error;
      }
    }

    rmSync(lockFilePath, { force: true });
  }

  writeFileSync(
    lockFilePath,
    JSON.stringify(
      {
        pid: process.pid,
        mode,
        createdAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  ownsLock = true;
}

function releaseLock() {
  if (!ownsLock) {
    return;
  }

  rmSync(lockFilePath, { force: true });
  ownsLock = false;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopChild(electronProcess);
  stopChild(rendererServer);
  releaseLock();

  setTimeout(() => {
    process.exit(exitCode);
  }, 150);
}

async function ensureBuild() {
  if (mode !== 'start' || existsSync(buildOutputPath) || process.env.ELECTRON_SKIP_BUILD === '1') {
    return;
  }

  console.log('No renderer build found. Running `npm run build` first...');

  await new Promise((resolve, reject) => {
    const buildProcess = spawnProcess(npmCommand, ['run', 'build'], {
      stdio: 'inherit',
      env: process.env
    });

    buildProcess.once('error', reject);
    buildProcess.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build exited with code ${code ?? 'unknown'}.`));
    });
  });
}

async function main() {
  acquireLock();
  await ensureBuild();
  let appUrl = '';

  if (mode === 'dev') {
    appUrl = `http://${host}:${defaultPort}`;
    const rendererCommand = ['run', 'renderer:dev', '--', '--host', host, '--port', String(defaultPort)];

    console.log(`Starting Vite renderer for Electron on ${appUrl} ...`);
    rendererServer = spawnProcess(npmCommand, rendererCommand, {
      stdio: 'inherit',
      env: process.env
    });

    rendererServer.once('error', (error) => {
      console.error(`Failed to start Vite: ${error.message}`);
      shutdown(1);
    });

    rendererServer.once('exit', (code) => {
      if (!shuttingDown) {
        console.error(`Vite exited with code ${code ?? 'unknown'}.`);
        shutdown(typeof code === 'number' ? code : 1);
      }
    });

    await waitForUrl(appUrl);
  }

  const electronCli = path.resolve('node_modules', 'electron', 'cli.js');

  console.log(`Launching Electron${appUrl ? ` against ${appUrl}` : ' from the production build'} ...`);
  electronProcess = spawn(process.execPath, [electronCli, 'electron/main.cjs'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_APP: '1',
      ELECTRON_SETTINGS_FILE: settingsFilePath,
      ELECTRON_START_URL: appUrl,
      ELECTRON_IS_DEV: mode === 'dev' ? '1' : '0'
    }
  });

  electronProcess.once('error', (error) => {
    console.error(`Failed to start Electron: ${error.message}`);
    shutdown(1);
  });

  electronProcess.once('exit', (code) => {
    if (!shuttingDown) {
      shutdown(typeof code === 'number' ? code : 0);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => releaseLock());

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Failed to launch Electron.');
  shutdown(1);
});
