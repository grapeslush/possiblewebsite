/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('node:child_process');

const children = [];
let stopping = false;

function startProcess(name, command, args, env) {
  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${name} received ${signal}`);
    } else if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }

    if (!stopping) {
      stopping = true;
      children.filter((proc) => proc.pid !== child.pid).forEach((proc) => proc.kill('SIGTERM'));
      process.exit(code ?? 1);
    }
  });

  children.push(child);
  return child;
}

const apiPort = process.env.API_PORT || process.env.PORT_API || '4000';
const webPort = process.env.PORT || process.env.WEB_PORT || '3000';
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || `http://localhost:${apiPort}`;

const apiEnv = { ...process.env, PORT: apiPort };
const webEnv = { ...process.env, PORT: webPort, NEXT_PUBLIC_API_BASE_URL: apiUrl };

startProcess(
  'api',
  'pnpm',
  ['--filter', 'api', 'start', '--', '-p', apiPort, '--hostname', '0.0.0.0'],
  apiEnv,
);
startProcess(
  'web',
  'pnpm',
  ['--filter', 'web', 'start', '--', '-p', webPort, '--hostname', '0.0.0.0'],
  webEnv,
);

const shutdown = (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`Received ${signal}. Stopping services...`);
  children.forEach((proc) => proc.kill(signal));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
