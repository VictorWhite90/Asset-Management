const { spawn } = require('child_process');
const { existsSync } = require('fs');
const net = require('net');
const path = require('path');

const command = process.argv.slice(2);

if (command.length === 0) {
  console.error('Usage: node scripts/runOnFreePort.cjs <command> [...args]');
  process.exit(1);
}

const parsePort = (value) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
};

const findFreePort = (preferredPort) =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.on('error', (error) => {
      if (preferredPort && error.code === 'EADDRINUSE') {
        findFreePort(preferredPort + 1).then(resolve, reject);
        return;
      }

      reject(error);
    });

    server.listen(preferredPort || 0, () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to determine an available port.'));
          return;
        }

        resolve(address.port);
      });
    });
  });

const resolveCommand = (cmd) => {
  const localBin = path.resolve(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${cmd}.cmd` : cmd
  );

  return existsSync(localBin) ? localBin : cmd;
};

(async () => {
  // Next/Vite: without an explicit PORT, listen(0) picks a random high port. Start at 3000 and walk up.
  const startPort = parsePort(process.env.PORT) ?? 3000;
  const port = await findFreePort(startPort);
  const env = { ...process.env, PORT: String(port) };
  const executable = resolveCommand(command[0]);
  const args = command.slice(1);

  console.log(`Starting on available port ${port}`);

  const child =
    process.platform === 'win32' && executable.endsWith('.cmd')
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/c', executable, ...args], {
          stdio: 'inherit',
          env,
        })
      : spawn(executable, args, {
          stdio: 'inherit',
          env,
        });

  child.on('exit', (code) => process.exit(code || 0));
  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
