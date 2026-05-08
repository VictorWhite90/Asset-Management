const { spawn } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

const [, , envFile, ...command] = process.argv;

if (!envFile || command.length === 0) {
  console.error('Usage: node scripts/withEnv.cjs <env-file> <command> [...args]');
  process.exit(1);
}

const envPath = resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  console.error(`Environment file not found: ${envFile}`);
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const rawValue = trimmed.slice(eq + 1).trim();
  env[key] = rawValue.replace(/^["']|["']$/g, '');
}

const viteToNextPublic = {
  VITE_DEPLOYMENT_ID: 'NEXT_PUBLIC_DEPLOYMENT_ID',
  VITE_GOVERNMENT_LEVEL: 'NEXT_PUBLIC_GOVERNMENT_LEVEL',
  VITE_DEPLOYMENT_NAME: 'NEXT_PUBLIC_DEPLOYMENT_NAME',
  VITE_FIREBASE_API_KEY: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  VITE_FIREBASE_AUTH_DOMAIN: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  VITE_FIREBASE_PROJECT_ID: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  VITE_FIREBASE_STORAGE_BUCKET: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  VITE_FIREBASE_APP_ID: 'NEXT_PUBLIC_FIREBASE_APP_ID',
  VITE_FIREBASE_MEASUREMENT_ID: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  VITE_USE_EMULATORS: 'NEXT_PUBLIC_USE_EMULATORS',
};

for (const [viteKey, nextKey] of Object.entries(viteToNextPublic)) {
  if (env[viteKey] && !env[nextKey]) {
    env[nextKey] = env[viteKey];
  }
}

const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code || 0));
